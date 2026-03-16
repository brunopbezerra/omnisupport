'use client'

import { useMemo } from 'react'
import { Pie, PieChart, Cell, Tooltip } from 'recharts'
import { ChartContainer, ChartLegend, ChartLegendContent, type ChartConfig } from '@/components/ui/chart'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { Ticket } from '@/app/dashboard/data-table'
import type { Metrics } from '@/hooks/use-metrics'
import { formatAvgTime } from '@/components/kpi-cards'

// ─── Types ────────────────────────────────────────────────────────────────────

interface CategoryEntry {
  id: string
  name: string
  color: string
  count: number
  pct: number
}

interface AnalyticsViewProps {
  tickets: Ticket[]
  metrics: Metrics
  loading: boolean
  onDrillCategory: (id: string, name: string) => void
  onDrillStatus: (status: string, label: string) => void
}

// ─── Distribution helpers ─────────────────────────────────────────────────────

function useCategoryDistribution(tickets: Ticket[]): CategoryEntry[] {
  return useMemo(() => {
    const counts = new Map<string, { name: string; color: string; count: number }>()
    for (const t of tickets) {
      for (const c of t.categories ?? []) {
        const entry = counts.get(c.id)
        if (entry) entry.count++
        else counts.set(c.id, { name: c.name, color: c.color, count: 1 })
      }
    }
    const total = [...counts.values()].reduce((s, e) => s + e.count, 0)
    return [...counts.entries()]
      .map(([id, e]) => ({ id, ...e, pct: total > 0 ? Math.round((e.count / total) * 100) : 0 }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
  }, [tickets])
}

// ─── Category Pie Chart ───────────────────────────────────────────────────────

function CategoryPareto({
  distribution,
  loading,
  onDrillCategory,
}: {
  distribution: CategoryEntry[]
  loading: boolean
  onDrillCategory: (id: string, name: string) => void
}) {
  const top3Pct = useMemo(() => {
    const top3 = distribution.slice(0, 3).reduce((s, e) => s + e.count, 0)
    const total = distribution.reduce((s, e) => s + e.count, 0)
    return total > 0 ? Math.round((top3 / total) * 100) : 0
  }, [distribution])

  // ChartContainer requires a config object keyed by dataKey values
  const chartConfig = useMemo<ChartConfig>(() => {
    const cfg: ChartConfig = { count: { label: 'Chamados' } }
    for (const entry of distribution) {
      cfg[entry.id] = { label: entry.name, color: entry.color }
    }
    return cfg
  }, [distribution])

  const pieData = distribution.map(e => ({ ...e, fill: e.color }))

  return (
    <Card className="flex flex-col">
      <CardHeader className="items-center pb-0">
        <CardTitle className="text-base">Categorias com mais chamados</CardTitle>
        {!loading && distribution.length > 0 && (
          <CardDescription>
            Top 3 representam {top3Pct}% do volume · clique para filtrar
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        {loading ? (
          <div className="flex flex-col items-center gap-3 pt-4">
            <Skeleton className="size-40 rounded-full" />
            <div className="space-y-2 w-full">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-4 w-full" />
              ))}
            </div>
          </div>
        ) : distribution.length === 0 ? (
          <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
            Nenhum chamado com categoria no período.
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[260px]">
            <PieChart>
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  const d = payload[0].payload as CategoryEntry
                  return (
                    <div className="rounded-lg border bg-popover px-3 py-2 text-sm shadow-md">
                      <p className="font-semibold">{d.name}</p>
                      <p className="text-muted-foreground">
                        {d.count} chamado{d.count !== 1 ? 's' : ''} · {d.pct}%
                      </p>
                    </div>
                  )
                }}
              />
              <Pie
                data={pieData}
                dataKey="count"
                nameKey="id"
                cursor="pointer"
                onClick={(data: any) => onDrillCategory(data.id, data.name)}
                strokeWidth={2}
              >
                {pieData.map(entry => (
                  <Cell key={entry.id} fill={entry.color} fillOpacity={0.9} />
                ))}
              </Pie>
              <ChartLegend
                content={<ChartLegendContent nameKey="id" />}
                className="-translate-y-2 flex-wrap gap-2 [&>*]:basis-1/3 [&>*]:justify-center"
              />
            </PieChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Status Distribution ──────────────────────────────────────────────────────

function StatusCard({
  metrics,
  loading,
  onDrillStatus,
}: {
  metrics: Metrics
  loading: boolean
  onDrillStatus: (status: string, label: string) => void
}) {
  const total = metrics.open + metrics.in_progress + metrics.resolved
  const items = [
    { status: 'open', label: 'Abertos', count: metrics.open, color: 'bg-warning', textColor: 'text-warning' },
    { status: 'in_progress', label: 'Em andamento', count: metrics.in_progress, color: 'bg-info', textColor: 'text-info' },
    { status: 'resolved', label: 'Resolvidos', count: metrics.resolved, color: 'bg-success', textColor: 'text-success' },
  ]

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Distribuição por status</CardTitle>
        <CardDescription>Clique em um status para filtrar os chamados.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)
          : items.map(item => {
              const pct = total > 0 ? Math.round((item.count / total) * 100) : 0
              return (
                <button
                  key={item.status}
                  onClick={() => onDrillStatus(item.status, item.label)}
                  className="w-full group text-left"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{item.label}</span>
                    <span className={cn('text-sm font-bold tabular-nums', item.textColor)}>
                      {item.count}
                      <span className="text-xs text-muted-foreground font-normal ml-1">({pct}%)</span>
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn('h-2 rounded-full transition-all duration-500 group-hover:opacity-80', item.color)}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </button>
              )
            })}
      </CardContent>
    </Card>
  )
}

// ─── Avg Response Card ────────────────────────────────────────────────────────

function AvgResponseCard({
  metrics,
  targetMinutes,
  loading,
}: {
  metrics: Metrics
  targetMinutes: number
  loading: boolean
}) {
  const avg = metrics.avgFirstResponseMinutes ?? 0
  const hasData = avg > 0
  const pct = hasData && targetMinutes > 0 ? Math.min((avg / targetMinutes) * 100, 100) : 0
  const isBreached = hasData && avg > targetMinutes
  const statusColor = isBreached ? 'text-destructive' : 'text-success'
  const barColor = isBreached ? 'bg-destructive' : 'bg-success'

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">T.M. de Resposta</CardTitle>
        <CardDescription>Tempo médio da primeira resposta no período.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <>
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-2 w-full rounded-full" />
          </>
        ) : (
          <>
            <span className={cn('text-3xl font-bold tabular-nums', statusColor)}>
              {hasData ? formatAvgTime(avg) : '—'}
            </span>
            {hasData && (
              <>
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn('h-2 rounded-full transition-all duration-500', barColor)}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Meta: {formatAvgTime(targetMinutes)} · {Math.round(pct)}% utilizado
                </p>
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function AnalyticsView({
  tickets,
  metrics,
  loading,
  onDrillCategory,
  onDrillStatus,
}: AnalyticsViewProps) {
  const distribution = useCategoryDistribution(tickets)

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-4">
      <CategoryPareto
        distribution={distribution}
        loading={loading}
        onDrillCategory={onDrillCategory}
      />
      <StatusCard
        metrics={metrics}
        loading={loading}
        onDrillStatus={onDrillStatus}
      />
      <AvgResponseCard
        metrics={metrics}
        targetMinutes={240}
        loading={loading}
      />
    </div>
  )
}
