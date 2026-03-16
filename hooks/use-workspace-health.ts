'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useWorkspace } from '@/components/providers/workspace-provider'
import {
  calculateHealthScore,
  type HealthResult,
  type HealthSnapshot,
} from '@/lib/health-score'

const POLL_MS = 5 * 60 * 1000

// ─── Single-org hook (used in the dashboard sidebar) ─────────────────────────

export function useWorkspaceHealth(): HealthResult | null {
  const { activeOrgId } = useWorkspace()
  const [result, setResult] = useState<HealthResult | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!activeOrgId) return

    async function fetchSnapshot() {
      const { data, error } = await supabase.rpc('get_org_health_snapshot', {
        p_org_id: activeOrgId,
      })
      if (!error && data) setResult(calculateHealthScore(data as HealthSnapshot))
    }

    fetchSnapshot()
    timerRef.current = setInterval(fetchSnapshot, POLL_MS)

    // Re-fetch whenever a ticket changes (resolved, assigned, etc.)
    const channel = supabase
      .channel(`health-watch-${activeOrgId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'tickets',
        filter: `org_id=eq.${activeOrgId}`,
      }, fetchSnapshot)
      .subscribe()

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      supabase.removeChannel(channel)
    }
  }, [activeOrgId])

  return result
}

// ─── All-orgs hook (super-admin workspace switcher) ──────────────────────────

export function useAllOrgsHealth(): Record<string, HealthResult> {
  const { currentUser, allOrgs } = useWorkspace()
  const [scores, setScores] = useState<Record<string, HealthResult>>({})
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const isSuperAdmin = currentUser?.role === 'super-admin'

  useEffect(() => {
    if (!isSuperAdmin || allOrgs.length === 0) return

    async function fetchAll() {
      const { data, error } = await supabase.rpc('get_all_orgs_health_snapshots')
      if (error || !Array.isArray(data)) return

      const map: Record<string, HealthResult> = {}
      for (const row of data) {
        map[row.org_id] = calculateHealthScore(row as HealthSnapshot)
      }
      setScores(map)
    }

    fetchAll()
    timerRef.current = setInterval(fetchAll, POLL_MS)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isSuperAdmin, allOrgs.length])

  return scores
}
