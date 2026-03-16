'use client'

import React, { useState } from 'react'
import { HugeiconsIcon } from "@hugeicons/react"
import { Loading03Icon, UserRemove01Icon } from "@hugeicons/core-free-icons"
import { supabase } from '@/lib/supabase/client'

import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { Agent } from '@/hooks/use-agents'

interface AssignSelectProps {
  ticketId: string
  ticketStatus?: string
  assignedProfile?: { id: string; full_name: string; avatar_url?: string | null } | null
  agents: Agent[]
  currentUserId?: string
  onAssigned?: (agentId: string | null, profile: Agent | null) => void
  size?: 'sm' | 'xs'
}

export function AssignSelect({
  ticketId,
  ticketStatus,
  assignedProfile,
  agents,
  currentUserId,
  onAssigned,
  size = 'sm',
}: AssignSelectProps) {
  const [isUpdating, setIsUpdating] = useState(false)

  const handleChange = async (val: string) => {
    const newAssignedTo = val === 'unassigned' ? null : val
    setIsUpdating(true)
    try {
      const updates: any = { assigned_to: newAssignedTo }
      
      // Auto-transition to in_progress if assigning someone to an open ticket
      if (newAssignedTo && ticketStatus === 'open') {
        updates.status = 'in_progress'
      }
      
      // Auto-transition to open if unassigning someone from an in_progress ticket
      if (!newAssignedTo && ticketStatus === 'in_progress') {
        updates.status = 'open'
      }

      const { error } = await supabase
        .from('tickets')
        .update(updates)
        .eq('id', ticketId)

      if (error) throw error

      const profile = newAssignedTo ? (agents.find(a => a.id === newAssignedTo) ?? null) : null
      onAssigned?.(newAssignedTo, profile)
    } catch (err) {
      console.error('Erro ao atribuir ticket:', err)
    } finally {
      setIsUpdating(false)
    }
  }

  const triggerHeight = size === 'xs' ? 'h-7 text-xs px-2 rounded-full' : 'h-8 px-3 rounded-full'

  return (
    <div className="relative flex items-center" onClick={e => e.stopPropagation()}>
      {isUpdating && (
        <HugeiconsIcon icon={Loading03Icon} className="absolute left-2.5 size-3 animate-spin text-muted-foreground z-10 pointer-events-none" />
      )}
      <Select
        value={assignedProfile?.id ?? 'unassigned'}
        onValueChange={handleChange}
        disabled={isUpdating}
      >
        <SelectTrigger
          className={`${triggerHeight} border-input bg-background shadow-sm w-fit min-w-[100px] gap-1.5 ${isUpdating ? 'opacity-60' : ''}`}
        >
          {isUpdating ? (
            <span className="text-muted-foreground">Atualizando...</span>
          ) : (
            <SelectValue placeholder="Atribuir..." />
          )}
        </SelectTrigger>
        <SelectContent align="end">
          <SelectGroup>
            <SelectItem value="unassigned">
              <div className="flex items-center gap-2 text-muted-foreground">
                <HugeiconsIcon icon={UserRemove01Icon} className="size-3" />
                <span className="italic">Ninguém</span>
              </div>
            </SelectItem>
            {agents.map(agent => (
              <SelectItem key={agent.id} value={agent.id}>
                <div className="flex items-center gap-2">
                  <Avatar className="h-4 w-4">
                    <AvatarImage src={agent.avatar_url ?? ''} />
                    <AvatarFallback className="text-[8px]">
                      {agent.full_name?.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{agent.full_name}</span>
                  {currentUserId === agent.id && (
                    <span className="text-[10px] text-muted-foreground">(Você)</span>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  )
}
