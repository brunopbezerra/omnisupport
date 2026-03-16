'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { type HealthLevel, type HealthResult, HEALTH_LEVEL_LABEL } from '@/lib/health-score'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

// ─── Color map ────────────────────────────────────────────────────────────────

const LEVEL: Record<HealthLevel, { ring: string; text: string; bar: string }> = {
  excellent: { ring: 'text-success',     text: 'text-success',     bar: 'bg-success'     },
  stable:    { ring: 'text-warning',     text: 'text-warning',     bar: 'bg-warning'     },
  critical:  { ring: 'text-destructive', text: 'text-destructive', bar: 'bg-destructive' },
}

// ─── SVG ring ─────────────────────────────────────────────────────────────────

interface HealthRingProps {
  score: number
  level: HealthLevel
  size?: number
  strokeWidth?: number
  className?: string
}

export function HealthRing({ score, level, size = 44, strokeWidth = 4, className }: HealthRingProps) {
  const r = (size - strokeWidth) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  const colors = LEVEL[level]

  return (
    <div
      className={cn('relative flex items-center justify-center shrink-0', className)}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className={cn('-rotate-90', colors.ring)}
        aria-hidden
      >
        <circle
          cx={size / 2} cy={size / 2} r={r}
          className="fill-none stroke-muted"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          className="fill-none stroke-current transition-all duration-700"
          strokeWidth={strokeWidth}
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <span className={cn('absolute text-[9px] font-bold tabular-nums leading-none', colors.text)}>
        {score}
      </span>
    </div>
  )
}

// ─── Mini ring (workspace switcher) ──────────────────────────────────────────

export function HealthRingMini({ score, level }: { score: number; level: HealthLevel }) {
  return <HealthRing score={score} level={level} size={28} strokeWidth={3} />
}

// ─── Sidebar health meter ─────────────────────────────────────────────────────

function BreakdownBar({ value, label }: { value: number; label: string }) {
  const level: HealthLevel = value >= 0.9 ? 'excellent' : value >= 0.7 ? 'stable' : 'critical'
  const pct = Math.round(value * 100)
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px]">
        <span className="text-muted-foreground">{label}</span>
        <span className={cn('font-semibold', LEVEL[level].text)}>{pct}%</span>
      </div>
      <div className="h-1 w-full rounded-full bg-muted">
        <div
          className={cn('h-1 rounded-full transition-all', LEVEL[level].bar)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

interface SidebarHealthMeterProps {
  health: HealthResult
}

export function SidebarHealthMeter({ health }: SidebarHealthMeterProps) {
  const { score, level, components, insight } = health
  const colors = LEVEL[level]

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-sidebar-accent cursor-default transition-colors">
            <HealthRing score={score} level={level} size={36} strokeWidth={3.5} />
            <div className="flex flex-col min-w-0">
              <span className="text-xs text-muted-foreground font-medium leading-none mb-0.5">
                Saúde do workspace
              </span>
              <span className={cn('text-sm font-semibold leading-none', colors.text)}>
                {HEALTH_LEVEL_LABEL[level]}
              </span>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="right" className="w-52 space-y-3 p-3">
          <p className="text-xs text-muted-foreground leading-snug">{insight}</p>
          <div className="space-y-2">
            <BreakdownBar value={components.sla}            label="SLA" />
            <BreakdownBar value={components.responsiveness} label="Tempo de resposta" />
            <BreakdownBar value={components.backlog}        label="Backlog" />
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
