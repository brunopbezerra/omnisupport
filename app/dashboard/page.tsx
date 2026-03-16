'use client'

import { useState, useMemo } from 'react'
import { HugeiconsIcon } from "@hugeicons/react"
import { Loading03Icon } from "@hugeicons/core-free-icons"

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { DataTable, type Ticket, makeColumns } from './data-table'
import { TicketDetailsContent } from '@/components/ticket-details-content'
import { useTickets } from '@/hooks/use-tickets'
import { useAgents } from '@/hooks/use-agents'
import { useCategories } from '@/hooks/use-categories'
import { filterFields } from './constants'

export default function DashboardPage() {
  const { tickets, setTickets, loading } = useTickets()
  const { agents, currentUser } = useAgents()
  const { categories } = useCategories()
  // Store only the selected ID — derive the actual ticket from the live array
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const handleUpdateTicket = (ticketId: string, updates: Partial<Ticket>) => {
    setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, ...updates } : t))
  }

  // Always reflects the latest data from Realtime (assignee, status, etc.)
  const selectedTicket = useMemo(
    () => tickets.find(t => t.id === selectedId) ?? null,
    [tickets, selectedId],
  )

  // Re-build columns whenever agents list loads so inline assigns are populated
  const columns = useMemo(
    () => makeColumns(agents, currentUser?.id),
    [agents, currentUser?.id],
  )

  // Build dynamic filter fields with options for agents and categories
  const dynamicFilterFields = useMemo(() => {
    return filterFields.map(field => {
      if (field.key === 'assigned_to') {
        return {
          ...field,
          options: agents.map(agent => ({
            label: agent.full_name,
            value: agent.id,
            icon: (
              <Avatar className="h-4 w-4">
                <AvatarImage src={agent.avatar_url || ''} />
                <AvatarFallback className="text-[8px]">
                  {agent.full_name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            )
          }))
        }
      }
      if (field.key === 'categories') {
        return {
          ...field,
          options: categories.map(cat => ({
            label: cat.name,
            value: cat.id,
            icon: (
              <div 
                className="size-2.5 rounded-full border border-black/10 dark:border-white/20 shrink-0" 
                style={{ backgroundColor: cat.color }} 
              />
            )
          }))
        }
      }
      return field
    })
  }, [agents, categories])

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-4">
      <h1 className="text-2xl font-bold tracking-tight shrink-0">Caixa de Entrada</h1>

      <div className="flex-1 flex gap-4 min-h-0">
        {/* MASTER: Lista de Tickets */}
        <div className={cn(
          'transition-all duration-300 min-w-0 flex flex-col',
          selectedTicket ? 'w-[35%] lg:w-[40%] hidden md:flex' : 'w-full',
        )}>
          {loading ? (
            <div className="flex flex-1 items-center justify-center border rounded-xl bg-card/10">
              <HugeiconsIcon icon={Loading03Icon} className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={tickets}
              onOpenTicket={(ticket) => setSelectedId(selectedId === ticket.id ? null : ticket.id)}
              onUpdateTicket={handleUpdateTicket}
              layout={selectedTicket ? 'list' : 'table'}
              selectedId={selectedTicket?.id}
              agents={agents}
              currentUserId={currentUser?.id}
              filterFields={dynamicFilterFields}
            />
          )}
        </div>

        {/* DETAIL: Conteúdo do Ticket */}
        {selectedTicket && (
          <TicketDetailsContent
            ticket={selectedTicket}
            onClose={() => setSelectedId(null)}
            onUpdateTicket={handleUpdateTicket}
          />
        )}
      </div>
    </div>
  )
}
