'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import type { Ticket } from '@/app/dashboard/data-table'
import type { Agent } from '@/hooks/use-agents'

export interface Message {
  id: string
  body: string
  sender_role: string
  created_at: string
}

export interface TicketEvent {
  id: string
  ticket_id: string
  actor_id: string
  event_type: string
  old_value: string | null
  new_value: string | null
  metadata: Record<string, any> | null
  created_at: string
  actor?: { full_name: string } | null
}

export interface Attachment {
  id: string
  file_name: string
  file_size: number
  file_type: string
  url: string
  message_id: string
}

export interface Category {
  id: string
  name: string
  color: string
}

export function useTicketDetails(
  ticket: Ticket | null,
  open: boolean,
  onOpenChange: (open: boolean) => void,
) {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [isLoadingDetails, setIsLoadingDetails] = useState(false)
  const [events, setEvents] = useState<TicketEvent[]>([])
  const [assignedProfile, setAssignedProfile] = useState<{ id: string; full_name: string; avatar_url?: string | null } | null>(ticket?.assigned_to_profile || null)
  const [ticketCategories, setTicketCategories] = useState<Category[]>(ticket?.categories || [])

  const [replyContent, setReplyContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false)

  // ─── Fetch events separately so we can refresh them independently ────────────
  const refreshEvents = useCallback(async (ticketId: string) => {
    // Uses left join (no !inner) so events without a profile still appear
    const { data, error } = await supabase
      .from('ticket_events')
      .select('*, actor:profiles(full_name)')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: false })

    if (!error && data) setEvents(data as TicketEvent[])
  }, [])

  // ─── Fetch everything for the ticket ─────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    if (!ticket?.id || !open) return

    setIsLoadingDetails(true)
    try {
      const fetchMessagesPromise = async () => {
        const { data: messagesData, error: messagesError } = await supabase
          .from('messages')
          .select('id, body, sender_role, created_at')
          .eq('ticket_id', ticket.id)
          .order('created_at', { ascending: true })

        if (messagesError && messagesError.code !== 'PGRST116') {
          console.error('Erro ao buscar mensagens:', messagesError)
        } else if (messagesData && messagesData.length > 0) {
          setMessages(messagesData)

          const messageIds = messagesData.map(m => m.id)
          const { data: attachmentsData } = await supabase
            .from('attachments')
            .select('id, file_name, file_size, file_type, file_path, message_id')
            .in('message_id', messageIds)

          if (attachmentsData && attachmentsData.length > 0) {
            const parsed = attachmentsData.map(att => {
              const { data: urlData } = supabase.storage
                .from('attachments')
                .getPublicUrl(att.file_path)
              return {
                id: att.id,
                file_name: att.file_name,
                file_size: att.file_size,
                file_type: att.file_type,
                url: urlData.publicUrl,
                message_id: att.message_id,
              }
            })
            setAttachments(parsed)
          }
        }
      }

      await Promise.all([
        fetchMessagesPromise(),
        refreshEvents(ticket.id)
      ])
    } finally {
      setIsLoadingDetails(false)
    }
  }, [ticket?.id, open, refreshEvents])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  // Sync internal state with ticket prop for immediate updates from parent (Master view)
  useEffect(() => {
    if (ticket) {
      if (ticket.categories) setTicketCategories(ticket.categories)
      if (ticket.assigned_to_profile) setAssignedProfile(ticket.assigned_to_profile)
    }
  }, [ticket])

  useEffect(() => {
    if (!ticket?.id || !open) return

    const ticketsChannel = supabase
      .channel(`ticket-details-${ticket.id}-tickets`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets', filter: `id=eq.${ticket.id}` }, () => {
        fetchAll()
      })
      .subscribe()

    const categoriesChannel = supabase
      .channel(`ticket-details-${ticket.id}-ticket_categories`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ticket_categories', filter: `ticket_id=eq.${ticket.id}` }, () => {
        fetchAll()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(ticketsChannel)
      supabase.removeChannel(categoriesChannel)
    }
  }, [ticket?.id, open, fetchAll])

  const handleSubmitResponse = async () => {
    if (!replyContent.trim() || !ticket) return

    setIsSubmitting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: newMessage, error } = await supabase
        .from('messages')
        .insert([{
          ticket_id: ticket.id,
          body: replyContent,
          sender_role: 'agent',
          sender_id: user.id,
        }])
        .select('id, body, sender_role, created_at')
        .single()

      if (error) throw error

      setMessages(prev => [...prev, newMessage])
      setReplyContent('')
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdateStatus = async (newStatus: string, agentId?: string | null) => {
    if (!ticket) return

    setIsUpdatingStatus(true)
    try {
      const updates: any = { status: newStatus }
      if (agentId !== undefined) {
        updates.assigned_to = agentId
      }

      const { error } = await supabase
        .from('tickets')
        .update(updates)
        .eq('id', ticket.id)

      if (error) throw error

      // Refresh events to show status change
      await refreshEvents(ticket.id)
      
      // If we assigned someone, we might need to refresh assignedProfile too
      if (agentId !== undefined) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .eq('id', agentId as string)
          .single()
        setAssignedProfile(profile)
      }

      router.refresh()
    } catch (error) {
      console.error('Erro ao atualizar status:', error)
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  // Called after AssignSelect performs the DB update
  const handleAssignmentChanged = async (newProfile: Agent | null) => {
    setAssignedProfile(newProfile)
    if (ticket?.id) {
      await refreshEvents(ticket.id)
    }
    router.refresh()
  }

  return {
    messages,
    attachments,
    events,
    assignedProfile,
    isLoadingDetails,
    replyContent,
    setReplyContent,
    isSubmitting,
    isUpdatingStatus,
    isHistoryExpanded,
    setIsHistoryExpanded,
    ticketCategories,
    setTicketCategories,
    handleSubmitResponse,
    handleUpdateStatus,
    handleAssignmentChanged,
  }
}
