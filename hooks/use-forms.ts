'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useWorkspace } from '@/components/providers/workspace-provider'
import type { Form, FormWithStats } from '@/types/forms'

export function useForms() {
  const { activeOrgId } = useWorkspace()
  const [forms, setForms] = useState<FormWithStats[]>([])
  const [loading, setLoading] = useState(true)

  const fetchForms = useCallback(async () => {
    if (!activeOrgId) {
      setForms([])
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from('forms')
        .select('*, ticket_count:tickets!tickets_form_id_fkey(count)')
        .eq('org_id', activeOrgId)
        .order('created_at', { ascending: false })

      if (!error && data) {
        setForms(
          data.map(row => ({
            ...row,
            ticket_count: parseInt(row.ticket_count?.[0]?.count ?? '0', 10),
          }))
        )
      }
    } finally {
      setLoading(false)
    }
  }, [activeOrgId])

  useEffect(() => {
    fetchForms()

    if (!activeOrgId) return

    const channel = supabase
      .channel(`forms-changes-${activeOrgId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'forms', filter: `org_id=eq.${activeOrgId}` },
        fetchForms
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchForms, activeOrgId])

  const createForm = useCallback(
    async (title: string, slug: string): Promise<Form> => {
      const { data, error } = await supabase
        .from('forms')
        .insert({ org_id: activeOrgId, title, slug })
        .select()
        .single()

      if (error) throw new Error(error.message)
      return data as Form
    },
    [activeOrgId]
  )

  const updateForm = useCallback(
    async (id: string, patch: Partial<Pick<Form, 'title' | 'slug' | 'status' | 'settings'>>) => {
      const { error } = await supabase.from('forms').update(patch).eq('id', id)
      if (error) throw new Error(error.message)
    },
    []
  )

  const deleteForm = useCallback(async (id: string) => {
    const { error } = await supabase.from('forms').delete().eq('id', id)
    if (error) throw new Error(error.message)
  }, [])

  return { forms, loading, createForm, updateForm, deleteForm }
}
