'use client'

import {
  Timeline,
  TimelineContent,
  TimelineDate,
  TimelineHeader,
  TimelineIndicator,
  TimelineItem,
  TimelineSeparator,
  TimelineTitle,
} from "@/components/reui/timeline"
import { useRef, useEffect, useState } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { HugeiconsIcon } from "@hugeicons/react"
import { 
  Tick02Icon, 
  ArrowTurnBackwardIcon,
  HourglassIcon,
  ArrowRightDoubleIcon,
  Calendar03Icon,
  InformationCircleIcon,
  Loading03Icon,
  UserIcon,
  LegalDocumentIcon,
  Image02Icon,
  File02Icon,
  Clock02Icon,
  CheckmarkCircle02Icon,
  CircleIcon,
  UserAdd01Icon,
  UserRemove01Icon,
  Ticket01Icon,
  Attachment01Icon,
  ArrowUp01Icon,
  CustomerService01Icon,
  Cancel01Icon,
  ExpandIcon,
  CollapseIcon
} from "@hugeicons/core-free-icons"

import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import { useSidebar } from '@/components/ui/sidebar'

import { AssignSelect } from './assign-select'
import { CategorySelector } from './category-selector'
import type { Ticket, Category } from '@/app/dashboard/data-table'
import { useTicketDetails, type Message, type Attachment, type TicketEvent } from '@/hooks/use-ticket-details'
import { useAgents } from '@/hooks/use-agents'
import type { Agent } from '@/hooks/use-agents'

// ─── Status map ──────────────────────────────────────────────────────────────

const statusMap: Record<string, { label: string; icon: any; variant: any }> = {
  open: { label: 'Aberto', icon: <HugeiconsIcon icon={HourglassIcon} className="size-3" />, variant: 'warning-muted' },
  in_progress: { label: 'Em Andamento', icon: <HugeiconsIcon icon={ArrowRightDoubleIcon} className="size-3" />, variant: 'info-muted' },
  resolved: { label: 'Resolvido', icon: <HugeiconsIcon icon={Tick02Icon} className="size-3" />, variant: 'success-muted' },
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface TicketDetailsContentProps {
  ticket: Ticket | null
  onClose?: () => void
  onUpdateTicket?: (ticketId: string, updates: Partial<Ticket>) => void
}

export function TicketDetailsContent({ ticket, onClose, onUpdateTicket }: TicketDetailsContentProps) {
  const { agents, currentUser } = useAgents()
  const { open: sidebarOpen, setOpen: setSidebarOpen } = useSidebar()
  const [sidebarWasOpen, setSidebarWasOpen] = useState(false)

  const {
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
  } = useTicketDetails(ticket, !!ticket, (open) => !open && onClose?.())

  if (!ticket) return null

  const statusConfig = statusMap[ticket.status] || { label: ticket.status, icon: null, variant: 'default' }

  const toggleHistory = () => {
    if (!isHistoryExpanded) {
      // Opening...
      setSidebarWasOpen(sidebarOpen)
      setSidebarOpen(false)
    } else {
      // Closing...
      if (sidebarWasOpen) {
        setSidebarOpen(true)
      }
    }
    setIsHistoryExpanded(!isHistoryExpanded)
  }

  // Restore sidebar on unmount if it was collapsed by history
  useEffect(() => {
    return () => {
      // We use the variables from the closure. 
      // Note: isHistoryExpanded and sidebarWasOpen here will be from the LAST RENDER before unmount.
      if (isHistoryExpanded && sidebarWasOpen) {
        setSidebarOpen(true)
      }
    }
  }, [isHistoryExpanded, sidebarWasOpen, setSidebarOpen])

  return (
    <div className="flex-1 flex gap-4 min-w-0 min-h-0 h-full">

      {/* ── Main Details Card ── */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0 border rounded-xl bg-card shadow-sm relative overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Close Button placed at top-right inside the details card */}
        {onClose && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="absolute right-4 top-4 z-10 text-muted-foreground hover:bg-muted rounded-full"
                >
                   <HugeiconsIcon icon={Cancel01Icon} className="size-4" strokeWidth={2} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">Fechar detalhe</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        <div className="flex-1 flex flex-col p-6 overflow-hidden">
          <div className="flex flex-1 flex-col gap-5 overflow-hidden">

            {/* ── Header ── */}
              <div className="flex flex-col gap-3 shrink-0">
                <div className="flex flex-col gap-1 pr-8">
                  <h2 className="text-xl font-bold leading-tight line-clamp-2">{ticket.subject}</h2>
                </div>

                <div className="flex flex-col gap-2 shrink-0">
                  <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                    <span className="font-semibold text-foreground/70 text-xs">Ticket ID:</span>
                    <span className="text-xs">{ticket.ref_token}</span>
                  </div>
                  {ticket.id && (
                    <div className="flex flex-col gap-1.5 mt-1 border-t pt-3">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Categorias:</span>
                      <CategorySelector 
                        ticketId={ticket.id} 
                        selectedCategories={ticketCategories} 
                        onCategoriesChange={(cats) => {
                          setTicketCategories(cats)
                          onUpdateTicket?.(ticket.id, { categories: cats })
                        }} 
                      />
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between flex-wrap gap-2 mt-1">
                  <Badge variant={statusConfig.variant} className="text-xs rounded-full gap-1.5 px-2.5 py-0.5 font-medium">
                    {statusConfig.icon}
                    {statusConfig.label}
                  </Badge>

                  <div className="flex items-center gap-2">
                    <AssignSelect
                      ticketId={ticket.id}
                      ticketStatus={ticket.status}
                      assignedProfile={assignedProfile}
                      agents={agents}
                      currentUserId={currentUser?.id}
                      onAssigned={(id: string | null, profile: Agent | null) => {
                        handleAssignmentChanged(profile)
                        onUpdateTicket?.(ticket.id, { 
                          assigned_to: id, 
                          assigned_to_profile: profile,
                          status: (id && ticket.status === 'open') ? 'in_progress' : ticket.status
                        })
                      }}
                    />

                    <StatusActions
                      status={ticket.status}
                      onUpdateStatus={(newStatus) => {
                        const agentId = newStatus === 'in_progress' ? currentUser?.id : undefined
                        handleUpdateStatus(newStatus, agentId)
                        onUpdateTicket?.(ticket.id, { 
                          status: newStatus,
                          ...(agentId ? { assigned_to: agentId, assigned_to_profile: currentUser } : {})
                        })
                      }}
                      isLoading={isUpdatingStatus}
                    />
                  </div>
                </div>
              </div>

            <Separator />

            {/* ── Ticket Info ── */}
            <TicketInfo customerEmail={ticket.customer_email} createdAt={ticket.created_at} />

            <Separator />

            {/* ── Message History ── */}
            <div className="flex flex-col gap-2 min-h-0 flex-1">
              <h3 className="font-semibold text-sm text-foreground shrink-0">Histórico de Conversa</h3>
              <div className="flex-1 relative min-h-0">
                <MessageHistory messages={messages} isLoading={isLoadingDetails} />
              </div>
            </div>

            {/* ── Activity Timeline ── */}
            <div className="flex flex-col gap-2 shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                   <HugeiconsIcon icon={Clock02Icon} className="size-3.5 text-muted-foreground" />
                  <h3 className="font-semibold text-sm text-foreground">Histórico de Atividade</h3>
                </div>
                
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="size-6 rounded-full text-muted-foreground hover:text-foreground" onClick={toggleHistory}>
                        {isHistoryExpanded ? <HugeiconsIcon icon={CollapseIcon} className="size-3.5" /> : <HugeiconsIcon icon={ExpandIcon} className="size-3.5" />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {isHistoryExpanded ? 'Minimizar histórico' : 'Expandir histórico'}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              {!isHistoryExpanded && <ActivityHistory events={events} isLoading={isLoadingDetails} />}
            </div>

            {/* ── Attachments ── */}
            {attachments.length > 0 && <AttachmentList attachments={attachments} />}

            {/* ── Reply Form ── */}
            <ReplyForm
              content={replyContent}
              onChange={setReplyContent}
              onSubmit={handleSubmitResponse}
              isSubmitting={isSubmitting}
            />
          </div>
        </div>
      </div>

      {/* ── Expanded History Panel ── */}
      {isHistoryExpanded && (
        <div className="w-[300px] lg:w-[350px] shrink-0 border rounded-xl bg-card shadow-sm relative overflow-hidden animate-in slide-in-from-right-4 duration-200 flex flex-col min-h-0 h-full">
          <div className="flex items-center justify-between p-4 border-b shrink-0 bg-muted/30">
             <div className="flex items-center gap-2">
                <HugeiconsIcon icon={Clock02Icon} className="size-4 text-muted-foreground" />
               <h3 className="font-semibold text-sm text-foreground">Histórico de Atividade</h3>
             </div>
             <TooltipProvider>
               <Tooltip>
                 <TooltipTrigger asChild>
                   <Button variant="ghost" size="icon" className="size-7 rounded-full text-muted-foreground hover:bg-muted" onClick={toggleHistory}>
                     <HugeiconsIcon icon={CollapseIcon} className="size-4" />
                   </Button>
                 </TooltipTrigger>
                 <TooltipContent>Minimizar histórico</TooltipContent>
               </Tooltip>
             </TooltipProvider>
          </div>
          <div className="flex-1 overflow-y-auto min-h-0">
            <div className="p-4">
              <ActivityHistory events={events} isLoading={isLoadingDetails} expanded={true} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function StatusActions({ status, onUpdateStatus, isLoading }: {
  status: string
  onUpdateStatus: (s: string) => void
  isLoading: boolean
}) {
  return (
    <div className="flex items-center gap-2">
      {status !== 'in_progress' && status !== 'resolved' && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => onUpdateStatus('in_progress')}
          disabled={isLoading}
          className="rounded-full border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300 gap-1.5"
        >
           <HugeiconsIcon icon={CustomerService01Icon} className="size-3.5" strokeWidth={2} />
          Atender
        </Button>
      )}
      {status !== 'resolved' && (
        <Button
          size="sm"
          onClick={() => onUpdateStatus('resolved')}
          disabled={isLoading}
          className="rounded-full border-green-200 bg-green-50 text-green-700 hover:bg-green-100 hover:text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-300"
        >
          {isLoading ? (
            <HugeiconsIcon icon={Loading03Icon} className="size-3 animate-spin" />
          ) : (
            <HugeiconsIcon icon={Tick02Icon} className="size-3.5" strokeWidth={2.5} />
          )}
          Resolver
        </Button>
      )}
      {status === 'resolved' && (
        <Button
          size="sm"
          onClick={() => onUpdateStatus('open')}
          disabled={isLoading}
          className="rounded-full border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100 hover:text-orange-800 dark:border-orange-800 dark:bg-orange-950 dark:text-orange-300"
        >
          {isLoading ? (
            <HugeiconsIcon icon={Loading03Icon} className="size-3 animate-spin" />
          ) : (
            <HugeiconsIcon icon={ArrowTurnBackwardIcon} className="size-3.5" strokeWidth={2.5} />
          )}
          Reabrir
        </Button>
      )}
    </div>
  )
}

function TicketInfo({ customerEmail, createdAt }: { customerEmail: string; createdAt: string }) {
  return (
    <div className="flex flex-col gap-3 text-sm shrink-0">
      <div className="flex items-center gap-3">
        <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
           <HugeiconsIcon icon={UserIcon} className="size-3.5" />
        </div>
        <span className="font-semibold text-foreground truncate">{customerEmail}</span>
      </div>
      <div className="flex items-center gap-3 text-muted-foreground">
        <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted">
           <HugeiconsIcon icon={Calendar03Icon} className="size-3.5" />
        </div>
        <span className="font-medium">{format(new Date(createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
      </div>
    </div>
  )
}

function MessageHistory({ messages, isLoading }: { messages: Message[]; isLoading: boolean }) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="absolute inset-0 rounded-lg border bg-muted/20 overflow-y-auto flex flex-col">
      {isLoading ? (
        <div className="space-y-3 p-5 animate-pulse">
          {[...Array(4)].map((_, i) => <div key={i} className="h-4 rounded bg-muted w-full" />)}
        </div>
      ) : messages.length > 0 ? (
        <div className="flex flex-col gap-4 p-5">
          {messages.map(msg => (
            <div
              key={msg.id}
              className={`flex flex-col gap-1 max-w-[85%] ${msg.sender_role === 'agent' ? 'ml-auto items-end' : 'mr-auto items-start'}`}
            >
              <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                {msg.sender_role === 'agent' ? 'Você' : 'Cliente'} • {format(new Date(msg.created_at), 'dd/MM HH:mm', { locale: ptBR })}
              </span>
              <div className={`p-3 text-sm leading-relaxed rounded-2xl ${
                msg.sender_role === 'agent'
                  ? 'bg-primary text-primary-foreground rounded-tr-sm'
                  : 'bg-muted/60 text-foreground border rounded-tl-sm'
              }`}>
                <p className="whitespace-pre-wrap">{msg.body}</p>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      ) : (
        <div className="flex h-full flex-col items-center justify-center text-muted-foreground py-10">
          <span className="text-sm">Sem mensagens.</span>
        </div>
      )}
    </div>
  )
}
function ActivityHistory({ events, isLoading, expanded }: { events: TicketEvent[]; isLoading: boolean; expanded?: boolean }) {
  if (isLoading) {
    return (
      <div className="space-y-2 animate-pulse">
        {[...Array(2)].map((_, i) => <div key={i} className="h-3 rounded bg-muted w-3/4" />)}
      </div>
    )
  }

  if (events.length === 0) {
    return <span className="text-xs text-muted-foreground italic">Nenhuma atividade registrada ainda.</span>
  }

  const statusToPtBr = (s: string) => {
    const map: Record<string, string> = {
      open: 'Aberto', pending: 'Pendente', in_progress: 'Em Andamento', resolved: 'Resolvido', closed: 'Fechado'
    }
    return map[s] || s
  }

  const getIcon = (e: TicketEvent) => {
    switch (e.event_type) {
       case 'ticket_created': return <HugeiconsIcon icon={Ticket01Icon} className="size-4 text-indigo-500" />
      case 'assignment_changed': return e.metadata?.is_unassign ? <HugeiconsIcon icon={UserRemove01Icon} className="size-4 text-muted-foreground" /> : <HugeiconsIcon icon={UserAdd01Icon} className="size-4 text-blue-500" />
      case 'status_changed': 
        const status = e.metadata?.new_status || e.new_value || '';
        if (status === 'resolved') {
          return <HugeiconsIcon icon={Tick02Icon} className="size-4 text-green-600" />
        }
        if (status === 'open') {
          if (e.metadata?.old_status === 'resolved') {
            return <HugeiconsIcon icon={ArrowTurnBackwardIcon} className="size-4 text-orange-500" />
          }
          return <HugeiconsIcon icon={HourglassIcon} className="size-4 text-amber-500" />
        }
        if (status === 'in_progress') {
          return <HugeiconsIcon icon={ArrowRightDoubleIcon} className="size-4 text-blue-500" />
        }
        return <HugeiconsIcon icon={CheckmarkCircle02Icon} className="size-4 text-green-600" />
      case 'priority_changed': return <HugeiconsIcon icon={ArrowUp01Icon} className="size-4 text-orange-500" />
      case 'attachment_added': return <HugeiconsIcon icon={Attachment01Icon} className="size-4 text-primary" />
      default: return <HugeiconsIcon icon={CircleIcon} className="size-4 text-muted-foreground" />
    }
  }

  const formatMsg = (e: TicketEvent) => {
    // metadata is the primary source of truth, but we fallback to actor?.full_name or 'Sistema'
    const name = e.metadata?.actor_name || e.actor?.full_name || 'Sistema'
    const nameElement = <strong>{name}</strong>
    
    switch (e.event_type) {
      case 'ticket_created':
        return <>{nameElement} abriu o chamado.</>
        
      case 'assignment_changed':
        if (e.metadata?.is_unassign) {
          return <>{nameElement} removeu a atribuição.</>
        }
        if (e.metadata?.is_self_assign) {
          return <>{nameElement} atribuiu o chamado a <strong>si mesmo(a)</strong>.</>
        }
        return <>{nameElement} atribuiu o chamado a <strong>{e.metadata?.target_name || 'um agente'}</strong>.</>
        
      case 'status_changed':
        return <>{nameElement} alterou o status: {e.metadata?.old_status ? `${statusToPtBr(e.metadata.old_status)} → ` : ''}<strong>{statusToPtBr(e.metadata?.new_status || e.new_value || '')}</strong>.</>
        
      case 'priority_changed':
        return <>{nameElement} alterou a prioridade para <strong>{e.metadata?.new_priority || e.new_value}</strong>.</>
        
      case 'attachment_added':
        return <>{nameElement} anexou o arquivo <strong>{e.metadata?.file_name || e.new_value}</strong>.</>
        
      default:
        return <>{nameElement} realizou a ação <em>{e.event_type}</em>.</>
    }
  }

  return (
    <Timeline className={`pr-1 ${expanded ? '' : 'max-h-[110px] overflow-y-auto'}`}>
      {events.map((event, idx) => (
        <TimelineItem key={event.id} step={idx + 1}>
          <TimelineSeparator />
          <TimelineIndicator className="bg-background flex items-center justify-center border-none size-4">
            {getIcon(event)}
          </TimelineIndicator>
          
          <TimelineHeader>
            <TimelineTitle className="text-[11px] font-medium text-foreground/80 leading-snug">
               {formatMsg(event)}
            </TimelineTitle>
            <TimelineDate className="text-[10px] text-muted-foreground tabular-nums mb-0">
               {format(new Date(event.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
            </TimelineDate>
          </TimelineHeader>
        </TimelineItem>
      ))}
    </Timeline>
  )
}

function AttachmentList({ attachments }: { attachments: Attachment[] }) {
  const formatSize = (bytes: number) => {
    if (!bytes) return '0 B'
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${['B', 'KB', 'MB'][i]}`
  }
  const getIcon = (type: string) => {
    if (type.startsWith('image/')) return <HugeiconsIcon icon={Image02Icon} className="size-5 text-blue-500" />
    if (type.includes('pdf') || type.startsWith('text/')) return <HugeiconsIcon icon={LegalDocumentIcon} className="size-5 text-orange-500" />
    return <HugeiconsIcon icon={File02Icon} className="size-5" />
  }
  return (
    <div className="flex flex-col gap-2 shrink-0">
      <h3 className="font-semibold text-sm">Anexos</h3>
      <div className="flex flex-col gap-2">
        {attachments.map(att => (
          <a key={att.id} href={att.url} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-xl border p-2 hover:bg-muted/50 transition-colors">
            <div className="flex size-9 shrink-0 items-center justify-center rounded bg-muted">{getIcon(att.file_type)}</div>
            <div className="flex flex-1 flex-col overflow-hidden text-xs">
              <span className="truncate font-medium">{att.file_name}</span>
              <span className="text-muted-foreground">{formatSize(att.file_size)}</span>
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}

function ReplyForm({ content, onChange, onSubmit, isSubmitting }: {
  content: string
  onChange: (v: string) => void
  onSubmit: () => void
  isSubmitting: boolean
}) {
  return (
    <div className="flex flex-col gap-3 pt-2 pb-1 px-1 shrink-0">
      <Textarea
        placeholder="Escreva sua resposta..."
        value={content}
        onChange={e => onChange(e.target.value)}
        className="min-h-[80px] resize-none text-sm"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault()
            if (content.trim() && !isSubmitting) onSubmit()
          }
        }}
      />
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground">Ctrl + Enter para enviar</span>
         <Button size="sm" onClick={onSubmit} disabled={!content.trim() || isSubmitting} className="rounded-full gap-2">
          {isSubmitting && <HugeiconsIcon icon={Loading03Icon} className="size-3 animate-spin" />}
          Responder
        </Button>
      </div>
    </div>
  )
}
