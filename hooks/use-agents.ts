'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useWorkspace } from '@/components/providers/workspace-provider'

export interface Agent {
  id: string
  full_name: string
  avatar_url?: string | null
}

export function useAgents() {
  const { activeOrgId } = useWorkspace()
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!activeOrgId) {
      setAgents([])
      setLoading(false)
      return
    }

    async function fetch() {
      try {
        const { data: agentsData } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .eq('org_id', activeOrgId)
          .in('role', ['agent', 'admin', 'super-admin'])
          .order('full_name', { ascending: true })

        if (agentsData) setAgents(agentsData)
      } finally {
        setLoading(false)
      }
    }

    fetch()
  }, [activeOrgId])

  return { agents, loading }
}
