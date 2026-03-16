'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useWorkspace } from '@/components/providers/workspace-provider'
import type { Ticket } from '@/app/dashboard/data-table'

export function useTickets() {
  const { activeOrgId } = useWorkspace()
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!activeOrgId) {
      setTickets([])
      setLoading(false)
      return
    }

    async function fetchTickets() {
      try {
        const { data, error } = await supabase
          .from('tickets')
          .select(`
            id, ref_token, customer_email, subject, status, assigned_to, created_at,
            assigned_to_profile:profiles!tickets_assigned_to_fkey(id, full_name, avatar_url),
            categories:ticket_categories(category:categories(id, name, color))
          `)
          .eq('org_id', activeOrgId)
          .order('created_at', { ascending: false })

        if (error) {
          console.error('Erro ao buscar tickets:', error)
          return
        }

        if (data) {
          const ticketsWithCategories = (data as any[]).map(ticket => ({
            ...ticket,
            categories: ticket.categories?.map((tc: any) => tc.category) || [],
          }))
          setTickets(ticketsWithCategories as Ticket[])
        }
      } finally {
        setLoading(false)
      }
    }

    fetchTickets()

    const ticketsChannel = supabase
      .channel(`tickets-changes-${activeOrgId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets', filter: `org_id=eq.${activeOrgId}` }, fetchTickets)
      .subscribe()

    const categoriesChannel = supabase
      .channel(`ticket-categories-changes-${activeOrgId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ticket_categories' }, fetchTickets)
      .subscribe()

    return () => {
      supabase.removeChannel(ticketsChannel)
      supabase.removeChannel(categoriesChannel)
    }
  }, [activeOrgId])

  return { tickets, setTickets, loading }
}
