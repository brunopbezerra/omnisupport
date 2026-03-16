'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useWorkspace } from '@/components/providers/workspace-provider'
import type { Ticket } from '@/app/dashboard/data-table'

// ─── Public types ─────────────────────────────────────────────────────────────

export type TimeFrame = '7d' | '30d' | '90d' | 'mtd'

export interface Trend {
  pct: number               // absolute value of % change
  direction: 'up' | 'down' | 'flat'
}

export interface Metrics {
  open: number
  in_progress: number
  resolved: number
  unassigned: number
  avgFirstResponseMinutes: number | null
  trends: {
    open: Trend | null
    in_progress: Trend | null
    resolved: Trend | null
    unassigned: Trend | null
    avgFirstResponse: Trend | null
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

interface Bounds { start: Date; end: Date; prevStart: Date; prevEnd: Date }

function getPeriodBounds(tf: TimeFrame): Bounds {
  const now = new Date()

  if (tf === 'mtd') {
    const start    = new Date(now.getFullYear(), now.getMonth(), 1)
    const pm       = now.getMonth() === 0 ? 11 : now.getMonth() - 1
    const py       = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()
    const prevStart = new Date(py, pm, 1)
    return { start, end: now, prevStart, prevEnd: start }
  }

  const days      = tf === '7d' ? 7 : tf === '30d' ? 30 : 90
  const start     = new Date(now.getTime() - days * 86_400_000)
  const prevStart = new Date(start.getTime() - days * 86_400_000)
  return { start, end: now, prevStart, prevEnd: start }
}

function filterPeriod(tickets: Ticket[], start: Date, end: Date) {
  return tickets.filter(t => {
    const d = new Date(t.created_at)
    return d >= start && d < end
  })
}

function calcTrend(current: number, prev: number): Trend | null {
  if (prev === 0) return null
  const diff = current - prev
  if (diff === 0) return { pct: 0, direction: 'flat' }
  return { pct: Math.round(Math.abs((diff / prev) * 100)), direction: diff > 0 ? 'up' : 'down' }
}

const POLL_MS = 5 * 60 * 1000

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useMetrics(tickets: Ticket[], timeFrame: TimeFrame = '30d'): Metrics {
  const { activeOrgId } = useWorkspace()
  const [avgCurrent, setAvgCurrent] = useState<number | null>(null)
  const [avgPrev,    setAvgPrev]    = useState<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const bounds = useMemo(() => getPeriodBounds(timeFrame), [timeFrame])

  useEffect(() => {
    if (!activeOrgId) return

    async function fetchAvg() {
      const [curr, prev] = await Promise.all([
        supabase.rpc('get_period_avg_response', {
          p_org_id: activeOrgId,
          p_start:  bounds.start.toISOString(),
          p_end:    bounds.end.toISOString(),
        }),
        supabase.rpc('get_period_avg_response', {
          p_org_id: activeOrgId,
          p_start:  bounds.prevStart.toISOString(),
          p_end:    bounds.prevEnd.toISOString(),
        }),
      ])
      if (!curr.error && curr.data !== null) setAvgCurrent(curr.data as number)
      if (!prev.error && prev.data !== null) setAvgPrev(prev.data as number)
    }

    fetchAvg()
    timerRef.current = setInterval(fetchAvg, POLL_MS)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [activeOrgId, bounds])

  const current = useMemo(() => filterPeriod(tickets, bounds.start, bounds.end),     [tickets, bounds])
  const prev    = useMemo(() => filterPeriod(tickets, bounds.prevStart, bounds.prevEnd), [tickets, bounds])

  const currOpen       = current.filter(t => t.status === 'open').length
  const currInProgress = current.filter(t => t.status === 'in_progress').length
  const currResolved   = current.filter(t => t.status === 'resolved').length
  const currUnassigned = current.filter(t => !t.assigned_to && t.status !== 'resolved').length

  const prevOpen       = prev.filter(t => t.status === 'open').length
  const prevInProgress = prev.filter(t => t.status === 'in_progress').length
  const prevResolved   = prev.filter(t => t.status === 'resolved').length
  const prevUnassigned = prev.filter(t => !t.assigned_to && t.status !== 'resolved').length

  return {
    open:                    currOpen,
    in_progress:             currInProgress,
    resolved:                currResolved,
    unassigned:              currUnassigned,
    avgFirstResponseMinutes: avgCurrent,
    trends: {
      open:            calcTrend(currOpen,       prevOpen),
      in_progress:     calcTrend(currInProgress, prevInProgress),
      resolved:        calcTrend(currResolved,   prevResolved),
      unassigned:      calcTrend(currUnassigned, prevUnassigned),
      avgFirstResponse: avgCurrent !== null && avgPrev !== null
        ? calcTrend(avgCurrent, avgPrev)
        : null,
    },
  }
}
