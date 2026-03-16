'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'

export interface Agent {
  id: string
  full_name: string
  avatar_url?: string | null
}

export function useAgents() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetch() {
      try {
        const [{ data: { user } }, { data: agentsData }] = await Promise.all([
          supabase.auth.getUser(),
          supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .in('role', ['agent', 'admin'])
            .order('full_name', { ascending: true })
        ])
        setCurrentUser(user)
        if (agentsData) setAgents(agentsData)
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [])

  return { agents, currentUser, loading }
}
