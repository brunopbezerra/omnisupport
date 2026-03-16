'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useWorkspace } from '@/components/providers/workspace-provider'
import type { Category } from '@/app/dashboard/data-table'

export function useCategories() {
  const { activeOrgId } = useWorkspace()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  const fetchCategories = useCallback(async () => {
    if (!activeOrgId) {
      setCategories([])
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('org_id', activeOrgId)
        .order('name', { ascending: true })

      if (!error && data) {
        setCategories(data)
      }
    } finally {
      setLoading(false)
    }
  }, [activeOrgId])

  useEffect(() => {
    fetchCategories()

    if (!activeOrgId) return

    const channel = supabase
      .channel(`categories-all-changes-${activeOrgId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories', filter: `org_id=eq.${activeOrgId}` }, fetchCategories)
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchCategories, activeOrgId])

  return { categories, loading, refresh: fetchCategories }
}
