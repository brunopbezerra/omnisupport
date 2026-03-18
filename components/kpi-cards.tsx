'use client'

import * as React from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Alert01Icon,
  ArrowDown01Icon,
  ArrowUp01Icon,
  CheckmarkCircle01Icon,
  Clock01Icon,
  CustomerService01Icon,
  HourglassIcon,
  Tick02Icon,
  UserRemove01Icon,
} from '@hugeicons/core-free-icons'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { Metrics, Trend } from '@/hooks/use-metrics'

// ─── Public helpers ───────────────────────────────────────────────────────────

export function formatAvgTime(minutes: number | null | undefined): string {
  if (!minutes || minutes === 0) return '—'
  if (minutes < 60) return `${Math.round(minutes)}m`
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

// ─── TrendBadge ───────────────────────────────────────────────────────────────

type Polarity = 'higher-is-better' | 'lower-is-better' | 'neutral'

function TrendBadge({ trend, polarity }: { trend: Trend | null; polarity: Polarity }) {
  if (!trend || trend.direction === 'flat' || trend.pct === 0) return null

  const isGood =
    polarity === 'neutral' ? null
    : polarity === 'higher-is-better' ? trend.direction === 'up'
    : trend.direction === 'down'

  const colorClass =
    isGood === null  ? 'text-muted-foreground bg-muted'
    : isGood         ? 'text-success bg-success/10'
    :                  'text-destructive bg-destructive/10'

  return (
    <span className={cn('inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full', colorClass)}>
      <HugeiconsIcon icon={trend.direction === 'up' ? ArrowUp01Icon : ArrowDown01Icon} className="size-2.5" />
      {trend.pct}%
    </span>
  )
}

// ─── KPICard (count-based) ────────────────────────────────────────────────────

interface KPICardProps {
  label: string
  value: string | number
  icon: any
  iconClass: string
  iconBgClass: string
  trend?: Trend | null
  polarity?: Polarity
  highlight?: boolean
  loading?: boolean
}

function KPICard({ label, value, icon, iconClass, iconBgClass, trend, polarity = 'neutral', highlight, loading }: KPICardProps) {
  return (
    <Card className={cn('gap-0 py-0 transition-all duration-200 hover:-translate-y-1 hover:shadow-xl flex flex-col rounded-xl', highlight && 'border-destructive/50 bg-destructive/5')}>
      <CardContent className="p-4 flex flex-col gap-3 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground font-medium leading-none">{label}</span>
          <div className={cn(
            'flex size-9 shrink-0 items-center justify-center rounded-lg',
            highlight ? 'bg-destructive/10 text-destructive' : iconBgClass,
          )}>
            <HugeiconsIcon icon={icon} className={cn('size-4', highlight ? 'text-destructive' : iconClass)} />
          </div>
        </div>
        {loading ? (
          <Skeleton className="h-8 w-10" />
        ) : (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={cn('text-3xl font-bold leading-none tabular-nums', highlight && 'text-destructive')}>
              {value}
            </span>
            <TrendBadge trend={trend ?? null} polarity={polarity} />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ─── TargetedKPICard (response time with progress bar) ───────────────────────

interface TargetedKPICardProps {
  label: string
  actual: number
  target: number
  trend?: Trend | null
  icon: any
  iconClass: string
  iconBgClass: string
  loading?: boolean
}

function TargetedKPICard({ label, actual, target, trend, icon, iconClass, iconBgClass, loading }: TargetedKPICardProps) {
  const hasData = actual > 0
  const pct = hasData && target > 0 ? Math.min((actual / target) * 100, 100) : 0
  const isBreached = hasData && actual > target
  const isAtRisk   = hasData && !isBreached && actual >= target * 0.9

  const progressColor = isBreached ? 'bg-destructive' : isAtRisk ? 'bg-warning' : 'bg-success'
  const statusIcon    = isBreached || isAtRisk ? Alert01Icon : CheckmarkCircle01Icon
  const statusColor   = isBreached ? 'text-destructive' : isAtRisk ? 'text-warning' : 'text-success'
  const statusText    = isBreached ? 'Meta ultrapassada' : isAtRisk ? 'Próximo da meta' : `${Math.round(pct)}% da meta`

  return (
    <Card className="gap-0 py-0 flex flex-col rounded-xl">
      <CardContent className="p-4 flex flex-col gap-3 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground font-medium leading-none">{label}</span>
          <div className={cn('flex size-9 shrink-0 items-center justify-center rounded-lg', iconBgClass)}>
            <HugeiconsIcon icon={icon} className={cn('size-4', iconClass)} />
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-1.5 w-full rounded-full" />
          </div>
        ) : (
          <div className="flex flex-col lg:grid lg:grid-cols-2 lg:items-center gap-4 lg:gap-6">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-3xl font-bold tabular-nums leading-none">
                {formatAvgTime(actual)}
              </span>
              <TrendBadge trend={trend ?? null} polarity="lower-is-better" />
            </div>

            <div className="flex flex-col gap-2 justify-center">
              {hasData ? (
                <>
                  <div className="w-full bg-muted rounded-full h-1.5">
                    <div className={cn('h-1.5 rounded-full transition-all duration-500', progressColor)} style={{ width: `${pct}%` }} />
                  </div>
                  <div className="flex items-center justify-between gap-1.5 text-[10px]">
                    <span className="text-muted-foreground leading-none">Meta: {formatAvgTime(target)}</span>
                    <span className={cn('flex items-center gap-0.5 font-semibold shrink-0 leading-none', statusColor)}>
                      <HugeiconsIcon icon={statusIcon} className="size-2.5" />
                      {statusText}
                    </span>
                  </div>
                </>
              ) : (
                <span className="text-[10px] text-muted-foreground">
                  Meta: {formatAvgTime(target)} · Sem dados ainda
                </span>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Grid ─────────────────────────────────────────────────────────────────────

interface KPICardsProps {
  metrics: Metrics
  targetFirstResponseMinutes?: number
  loading?: boolean
  onStatusFilterClick?: (status: 'open' | 'in_progress' | 'resolved' | 'unassigned') => void
}

export function KPICards({ metrics, targetFirstResponseMinutes = 240, loading, onStatusFilterClick }: KPICardsProps) {
  const { trends } = metrics
  const [expanded, setExpanded] = React.useState(false)

  React.useEffect(() => {
    const mql = window.matchMedia('(min-width: 1281px)')
    setExpanded(mql.matches)
    const handler = (e: MediaQueryListEvent) => setExpanded(e.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])

  return (
    <div className="shrink-0 flex flex-col gap-2">
      <button
        type="button"
        onClick={() => setExpanded(prev => !prev)}
        className="flex items-center justify-between w-full text-sm py-0.5 min-[1281px]:hidden"
      >
        <span className="text-muted-foreground font-medium">Métricas</span>
        <HugeiconsIcon
          icon={ArrowDown01Icon}
          className={cn('size-4 text-muted-foreground transition-transform duration-200', expanded && 'rotate-180')}
        />
      </button>
      <div className={cn(
        'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3',
        expanded ? 'grid' : 'hidden min-[1281px]:grid',
      )}>
      <button
        type="button"
        onClick={() => onStatusFilterClick?.('open')}
        className={cn('text-left', onStatusFilterClick && 'cursor-pointer')}
      >
      <KPICard
        label="Abertos"
        value={metrics.open}
        icon={HourglassIcon}
        iconClass="text-warning"
        iconBgClass="bg-warning/10"
        trend={trends.open}
        polarity="lower-is-better"
        loading={loading}
      />
      </button>
      <button
        type="button"
        onClick={() => onStatusFilterClick?.('in_progress')}
        className={cn('text-left', onStatusFilterClick && 'cursor-pointer')}
      >
      <KPICard
        label="Em andamento"
        value={metrics.in_progress}
        icon={CustomerService01Icon}
        iconClass="text-info"
        iconBgClass="bg-info/10"
        trend={trends.in_progress}
        polarity="neutral"
        loading={loading}
      />
      </button>
      <button
        type="button"
        onClick={() => onStatusFilterClick?.('resolved')}
        className={cn('text-left', onStatusFilterClick && 'cursor-pointer')}
      >
      <KPICard
        label="Resolvidos"
        value={metrics.resolved}
        icon={Tick02Icon}
        iconClass="text-success"
        iconBgClass="bg-success/10"
        trend={trends.resolved}
        polarity="higher-is-better"
        loading={loading}
      />
      </button>
      <button
        type="button"
        onClick={() => onStatusFilterClick?.('unassigned')}
        className={cn('text-left', onStatusFilterClick && 'cursor-pointer')}
      >
      <KPICard
        label="Sem responsável"
        value={metrics.unassigned}
        icon={UserRemove01Icon}
        iconClass="text-muted-foreground"
        iconBgClass="bg-muted"
        trend={trends.unassigned}
        polarity="lower-is-better"
        highlight={!loading && metrics.unassigned > 0}
        loading={loading}
      />
      </button>
      <div className="lg:col-span-2">
        <TargetedKPICard
          label="T.M. de Resposta"
          actual={metrics.avgFirstResponseMinutes ?? 0}
          target={targetFirstResponseMinutes}
          trend={trends.avgFirstResponse}
          icon={Clock01Icon}
          iconClass="text-primary-foreground"
          iconBgClass="bg-primary"
          loading={loading}
        />
      </div>
      </div>
    </div>
  )
}
