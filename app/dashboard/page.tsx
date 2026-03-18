'use client'

import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { HugeiconsIcon } from "@hugeicons/react"
import { Loading03Icon, Cancel01Icon, ListViewIcon, BarChartIcon } from "@hugeicons/core-free-icons"
import { toast } from 'sonner'
import { format, subDays } from 'date-fns'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { DataTable, type Ticket, makeColumns } from './data-table'
import type { Filter } from '@/components/reui/filters'
import { TicketDetailsContent } from '@/components/ticket-details-content'
import { KPICards } from '@/components/kpi-cards'
import { AnalyticsView } from '@/components/analytics-view'
import { ExportButton } from '@/components/export-button'
import { DatePickerWithRange } from '@/components/date-range-picker'
import { useTickets } from '@/hooks/use-tickets'
import { useAgents } from '@/hooks/use-agents'
import { useCategories } from '@/hooks/use-categories'
import { useMetrics, type TimeFrame } from '@/hooks/use-metrics'
import { useWorkspace } from '@/components/providers/workspace-provider'
import { useWorkspaceHealth } from '@/hooks/use-workspace-health'
import { supabase } from '@/lib/supabase/client'
import { filterFields } from './constants'

// ─── Drill-down filter types ──────────────────────────────────────────────────

interface DrillFilter {
  type: 'category' | 'status'
  id: string
  label: string
}

function parseDrill(param: string | null): DrillFilter | null {
  if (!param) return null
  const [type, id, ...rest] = param.split(':')
  if (type !== 'category' && type !== 'status') return null
  return { type: type as 'category' | 'status', id, label: rest.join(':') }
}

// ─── ViewToggle ───────────────────────────────────────────────────────────────

type View = 'operacional' | 'insights'

function ViewToggle({ view, onChange }: { view: View; onChange: (v: View) => void }) {
  return (
    <div className="flex rounded-full border overflow-hidden shrink-0">
      {([
        { value: 'operacional', label: 'Operacional', icon: ListViewIcon },
        { value: 'insights', label: 'Insights', icon: BarChartIcon },
      ] as const).map(({ value, label, icon }, i) => (
        <button
          key={value}
          type="button"
          onClick={() => onChange(value)}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors',
            i > 0 && 'border-l',
            view === value
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted',
          )}
        >
          <HugeiconsIcon icon={icon} className="size-3.5" />
          {label}
        </button>
      ))}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { tickets, setTickets, loading } = useTickets()
  const { agents } = useAgents()
  const { currentUser, activeOrg } = useWorkspace()
  const { categories } = useCategories()
  const health = useWorkspaceHealth()
  
  // Persistence for timeFrame
  const [timeFrame, setTimeFrame] = useState<TimeFrame>(() => {
    if (typeof window === 'undefined') return { from: subDays(new Date(), 30), to: new Date() }
    const saved = localStorage.getItem('omnisupport_dashboard_timeframe')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (typeof parsed === 'object') {
          if (parsed.from) parsed.from = new Date(parsed.from)
          if (parsed.to)   parsed.to   = new Date(parsed.to)
        }
        return parsed
      } catch (e) {
        console.error('Failed to parse saved timeframe', e)
      }
    }
    return { from: subDays(new Date(), 30), to: new Date() }
  })

  useEffect(() => {
    localStorage.setItem('omnisupport_dashboard_timeframe', JSON.stringify(timeFrame))
  }, [timeFrame])

  const metrics = useMetrics(tickets, timeFrame)

  const searchParams = useSearchParams()
  const router = useRouter()

  // View: operacional | insights
  const view = (searchParams.get('view') ?? 'operacional') as View

  // Drill-down filter (from chart clicks)
  const initialTableFilters = useMemo(() => {
    const drillParam = searchParams.get('drill')
    if (!drillParam) return []

    const drillFilter = parseDrill(drillParam)
    if (!drillFilter) return []

    if (drillFilter.type === 'category') {
      return [{ id: 'drill-category', field: 'categories', operator: 'contains', values: [drillFilter.id], label: drillFilter.label }]
    }
    if (drillFilter.type === 'status') {
      const isUnassigned = drillFilter.id === 'unassigned'
      return [{ 
        id: 'drill-status', 
        field: isUnassigned ? 'assigned_to' : 'status', 
        operator: 'is', 
        values: [isUnassigned ? '__unassigned__' : drillFilter.id],
        label: drillFilter.label
      }]
    }
    return []
  }, [searchParams])

  // Update URL helpers
  const setView = useCallback((v: View) => {
    const p = new URLSearchParams(searchParams.toString())
    p.set('view', v)
    router.push(`?${p.toString()}`)
  }, [searchParams, router])

  const drillTo = useCallback((type: 'category' | 'status', id: string, label: string) => {
    const p = new URLSearchParams()
    p.set('view', 'operacional')
    p.set('drill', `${type}:${id}:${label}`)
    router.push(`?${p.toString()}`)
  }, [router])

  const handleFiltersChange = useCallback((filters: Filter[]) => {
    const p = new URLSearchParams()
    // Preserve view parameter
    const currentView = searchParams.get('view')
    if (currentView) {
      p.set('view', currentView)
    }

    // Convert filters to URL parameters
    const drillFilter = filters.find(f => f.id === 'drill-category' || f.id === 'drill-status')
    if (drillFilter) {
      let type: 'category' | 'status'
      let id: string
      if (drillFilter.id === 'drill-category') {
        type = 'category'
        id = drillFilter.values[0] as string
      } else { // drillFilter.id === 'drill-status'
        type = 'status'
        id = drillFilter.values[0] as string
        if (id === '__unassigned__') id = 'unassigned'
      }
      p.set('drill', `${type}:${id}:${drillFilter.label}`)
    } else {
      p.delete('drill')
    }
    
    // Add other filters if needed, though for now only 'drill' is managed this way
    // For a more robust solution, all DataTable filters would be serialized to URL params.

    router.push(`?${p.toString()}`)
  }, [searchParams, router])

  // Filtered rows from DataTable internal filters (for export)
  const [exportableTickets, setExportableTickets] = useState<Ticket[]>([])

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isConversationExpanded, setIsConversationExpanded] = useState(false)
  const toastShownRef = useRef(false)
  const applyStatusFilterRef = useRef<((status: string) => void) | null>(null)

  // Session toast: alert agents about new tickets opened since their last login
  useEffect(() => {
    if (loading || toastShownRef.current || tickets.length === 0) return
    toastShownRef.current = true

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user?.last_sign_in_at) return
      const lastSignIn = new Date(user.last_sign_in_at)
      const newCount = tickets.filter(
        t => t.status !== 'resolved' && new Date(t.created_at) > lastSignIn,
      ).length
      if (newCount > 0) {
        const s = newCount > 1 ? 's' : ''
        toast.info(`${newCount} chamado${s} aberto${s} desde seu último acesso.`)
      }
    })
  }, [loading, tickets])

  const handleUpdateTicket = (ticketId: string, updates: Partial<Ticket>) => {
    setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, ...updates } : t))
  }

  const selectedTicket = useMemo(
    () => tickets.find(t => t.id === selectedId) ?? null,
    [tickets, selectedId],
  )

  const columns = useMemo(
    () => makeColumns(agents, currentUser?.id),
    [agents, currentUser?.id],
  )

  const dynamicFilterFields = useMemo(() => {
    return filterFields.map(field => {
      if (field.key === 'assigned_to') {
        return {
          ...field,
          options: [
            {
              label: 'Sem responsável',
              value: '__unassigned__',
              icon: <Avatar className="h-4 w-4"><AvatarFallback className="text-[8px]">-</AvatarFallback></Avatar>
            },
            ...agents.map(agent => ({
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
          ]
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

  // Period bounds (mirrors useMetrics logic, for export date labels)
  const periodBounds = useMemo(() => {
    const now = new Date()
    if (timeFrame === 'mtd') {
      return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: now }
    }
    const days = timeFrame === '7d' ? 7 : timeFrame === '30d' ? 30 : 90
    return { start: new Date(now.getTime() - days * 86_400_000), end: now }
  }, [timeFrame])

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-4">

      {/* ── Header row ───────────────────────────────────────────── */}
      <div className="flex items-center justify-between shrink-0 gap-3 flex-wrap">
        <h1 className="text-2xl font-bold tracking-tight">Caixa de Entrada</h1>
        <div className="flex items-center gap-2 ml-auto">
          <DatePickerWithRange 
            date={typeof timeFrame === 'string' ? undefined : timeFrame} 
            setDate={(newRange) => {
              if (newRange) setTimeFrame(newRange)
            }} 
          />

          <ExportButton
            tickets={exportableTickets}
            metrics={metrics}
            orgName={activeOrg?.name ?? ''}
            orgSlug={activeOrg?.slug ?? 'workspace'}
            orgLogoUrl={activeOrg?.logo_url ?? null}
            primaryColor={activeOrg?.primary_color ?? '#0f172a'}
            healthScore={health?.score ?? 0}
            start={periodBounds.start}
            end={periodBounds.end}
            categories={categories}
            disabled={loading}
          />

          <ViewToggle view={view} onChange={setView} />
        </div>
      </div>

      {/* ── KPI Cards ─────────────────────────────────────────────── */}
      <KPICards
        metrics={metrics}
        targetFirstResponseMinutes={activeOrg?.target_first_response_time}
        loading={loading}
        onStatusFilterClick={(status) => applyStatusFilterRef.current?.(status)}
      />

      {/* ── Main content area ─────────────────────────────────────── */}
      {view === 'insights' ? (
        <div className="flex-1 overflow-y-auto px-0.5 pt-2 pb-4">
          <AnalyticsView
            tickets={tickets}
            metrics={metrics}
            loading={loading}
            onDrillCategory={(id, name) => drillTo('category', id, name)}
            onDrillStatus={(status, label) => drillTo('status', status, label)}
          />
        </div>
      ) : (
        <div className="flex-1 flex gap-4 min-h-0">
          {/* MASTER: Lista de Tickets */}
          <div className={cn(
            'transition-all duration-300 min-w-0 flex flex-col',
            isConversationExpanded ? 'hidden' :
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
                  selectedId={selectedId ?? undefined}
                  onOpenTicket={ticket => setSelectedId(ticket.id)}
                  onUpdateTicket={handleUpdateTicket}
                  onFilteredRowsChange={setExportableTickets}
                  onFiltersChange={handleFiltersChange}
                  initialFilters={initialTableFilters}
                  onFiltersInitialized={fn => {
                    applyStatusFilterRef.current = fn
                  }}
                  agents={agents}
                  currentUserId={currentUser?.id}
                  filterFields={dynamicFilterFields}
                  layout={selectedId ? 'list' : view === 'operacional' ? 'table' : 'list'}
                />
            )}
          </div>

          {/* DETAIL: Conteúdo do Ticket */}
          {selectedTicket && (
            <TicketDetailsContent
              ticket={selectedTicket}
              onClose={() => { setSelectedId(null); setIsConversationExpanded(false) }}
              onUpdateTicket={handleUpdateTicket}
              onConversationExpand={setIsConversationExpanded}
            />
          )}
        </div>
      )}
    </div>
  )
}
