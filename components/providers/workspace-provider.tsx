'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { getContrastColor, getPrimaryHover } from '@/lib/utils'

export type UserRole = 'agent' | 'admin' | 'super-admin'

export interface CurrentUser {
  id: string
  full_name: string
  avatar_url: string | null
  email: string
  role: UserRole
  org_id: string | null
}

export type SlaMode = 'calendar' | 'business'

export interface Organization {
  id: string
  name: string
  slug: string
  primary_color: string | null
  logo_url: string | null
  target_first_response_time: number
  target_resolution_time: number
  sla_mode: SlaMode
}

interface WorkspaceContextValue {
  currentUser: CurrentUser | null
  activeOrgId: string | null
  activeOrg: Organization | null
  allOrgs: Organization[]
  setActiveOrgId: (orgId: string) => void
  loading: boolean
  refetchUser: () => Promise<void>
  refetchOrg: () => Promise<void>
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null)

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext)
  if (!ctx) throw new Error('useWorkspace must be used inside <WorkspaceProvider>')
  return ctx
}

// Re-export so pages that import from this module keep working
export { getContrastColor } from '@/lib/utils'

const ORG_SELECT = 'id, name, slug, primary_color, logo_url, target_first_response_time, target_resolution_time, sla_mode'

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)
  const [activeOrgId, setActiveOrgIdState] = useState<string | null>(null)
  const [allOrgs, setAllOrgs] = useState<Organization[]>([])
  // Holds the single org for non-super-admin users (not stored in allOrgs)
  const [singleOrg, setSingleOrg] = useState<Organization | null>(null)
  const [loading, setLoading] = useState(true)

  // ─── Derived synchronously — no useEffect, no race condition ────────────
  // Super-admin:     activeOrg = allOrgs.find(activeOrgId)
  // Non-super-admin: activeOrg = singleOrg (fetched inline in fetchUser)
  // Switching org:   if not in allOrgs yet, falls back to singleOrg during fetch
  const activeOrg = useMemo<Organization | null>(
    () => allOrgs.find(o => o.id === activeOrgId) ?? singleOrg ?? null,
    [activeOrgId, allOrgs, singleOrg],
  )

  // ─── Primary data fetch ──────────────────────────────────────────────────
  const fetchUser = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, role, org_id')
        .eq('id', user.id)
        .single()

      if (profileError) {
        console.error('[WorkspaceProvider] profile fetch error:', profileError)
        return
      }
      if (!profile) return

      console.debug('[WorkspaceProvider] loaded user:', user.email, '| role:', profile.role, '| org_id:', profile.org_id)

      setCurrentUser({
        id: profile.id,
        full_name: profile.full_name,
        avatar_url: profile.avatar_url,
        email: user.email ?? '',
        role: profile.role as UserRole,
        org_id: profile.org_id,
      })

      if (profile.role === 'super-admin') {
        // Fetch all orgs in one request
        const { data: orgs, error: orgsError } = await supabase
          .from('organizations')
          .select(ORG_SELECT)
          .order('name', { ascending: true })

        if (orgsError) {
          console.error('[WorkspaceProvider] organizations fetch error (super-admin):', orgsError)
        }

        const orgList = (orgs ?? []) as Organization[]
        const defaultOrgId = profile.org_id ?? orgList[0]?.id ?? null

        console.debug('[WorkspaceProvider] super-admin — user:', user.email, '| orgs:', orgList.length, '| defaultOrgId:', defaultOrgId)

        // One batch: allOrgs + activeOrgId set together →
        // useMemo immediately resolves activeOrg on next render, no flash
        setAllOrgs(orgList)
        setActiveOrgIdState(defaultOrgId)
      } else {
        // Fetch the single org inline so it's batched with setActiveOrgIdState
        const orgId = profile.org_id
        if (orgId) {
          const { data: orgData, error: orgError } = await supabase
            .from('organizations')
            .select(ORG_SELECT)
            .eq('id', orgId)
            .single()

          if (orgError) {
            console.error('[WorkspaceProvider] org fetch error:', orgError, 'org_id:', orgId)
          }

          setSingleOrg(orgData ? (orgData as Organization) : null)
        }
        setActiveOrgIdState(orgId)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  // ─── Re-fetches the active org after branding saves ──────────────────────
  const refetchOrg = useCallback(async () => {
    if (!activeOrgId) return
    const { data } = await supabase
      .from('organizations')
      .select(ORG_SELECT)
      .eq('id', activeOrgId)
      .single()
    if (!data) return
    const org = data as Organization

    // Update whichever list actually holds this org
    setAllOrgs(prev => {
      const idx = prev.findIndex(o => o.id === org.id)
      if (idx === -1) return prev
      const next = [...prev]
      next[idx] = org
      return next
    })
    setSingleOrg(prev => (prev?.id === org.id ? org : prev))
  }, [activeOrgId])

  useEffect(() => {
    fetchUser()
  }, [fetchUser])

  // ─── Org switcher support ─────────────────────────────────────────────────
  // When a super-admin switches to an org not yet loaded, fetch it on demand.
  // (Normal case: org is already in allOrgs, useMemo resolves it instantly.)
  useEffect(() => {
    if (!activeOrgId) return
    if (allOrgs.some(o => o.id === activeOrgId)) return
    if (singleOrg?.id === activeOrgId) return

    supabase
      .from('organizations')
      .select(ORG_SELECT)
      .eq('id', activeOrgId)
      .single()
      .then(({ data }) => {
        if (data) setSingleOrg(data as Organization)
      })
  }, [activeOrgId, allOrgs, singleOrg?.id])

  // ─── CSS variable injection ───────────────────────────────────────────────
  useEffect(() => {
    const root = document.documentElement.style
    const color = activeOrg?.primary_color

    if (color) {
      const fg = getContrastColor(color)
      const hover = getPrimaryHover(color)
      root.setProperty('--primary', color)
      root.setProperty('--primary-foreground', fg)
      root.setProperty('--primary-hover', hover)
      root.setProperty('--ring', color)
      root.setProperty('--sidebar-primary', color)
      root.setProperty('--sidebar-primary-foreground', fg)
    } else {
      root.removeProperty('--primary')
      root.removeProperty('--primary-foreground')
      root.removeProperty('--primary-hover')
      root.removeProperty('--ring')
      root.removeProperty('--sidebar-primary')
      root.removeProperty('--sidebar-primary-foreground')
    }
  }, [activeOrg?.primary_color])

  const setActiveOrgId = useCallback((orgId: string) => {
    setActiveOrgIdState(orgId)
  }, [])

  return (
    <WorkspaceContext.Provider
      value={{
        currentUser,
        activeOrgId,
        activeOrg,
        allOrgs,
        setActiveOrgId,
        loading,
        refetchUser: fetchUser,
        refetchOrg,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  )
}
