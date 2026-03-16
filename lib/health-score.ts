export interface HealthSnapshot {
  avg_first_response_minutes: number
  sla_compliance_pct: number
  active_total: number
  unassigned_count: number
  target_first_response_minutes: number
}

export type HealthLevel = 'excellent' | 'stable' | 'critical'

export interface HealthResult {
  score: number
  level: HealthLevel
  /** Individual component scores, each 0–1 */
  components: {
    sla: number
    responsiveness: number
    backlog: number
  }
  insight: string
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function calculateHealthScore(snapshot: HealthSnapshot): HealthResult {
  const { avg_first_response_minutes: avg, target_first_response_minutes: target,
          sla_compliance_pct, active_total, unassigned_count } = snapshot

  const sla           = clamp(sla_compliance_pct / 100, 0, 1)
  const responsiveness = avg === 0 ? 1 : clamp(target / avg, 0, 1)
  const backlog        = active_total === 0 ? 1 : clamp(1 - unassigned_count / active_total, 0, 1)

  const score = Math.round((sla * 0.5 + responsiveness * 0.3 + backlog * 0.2) * 100)
  const level: HealthLevel = score >= 90 ? 'excellent' : score >= 70 ? 'stable' : 'critical'

  const dims = [
    { key: 'sla',           label: 'conformidade com SLA',       ratio: sla },
    { key: 'responsiveness', label: 'tempo de resposta',          ratio: responsiveness },
    { key: 'backlog',        label: 'tickets sem responsável',    ratio: backlog },
  ]
  const weakest = dims.reduce((a, b) => (a.ratio < b.ratio ? a : b))

  let insight: string
  if (score >= 90) {
    insight = 'Todos os indicadores estão dentro das metas.'
  } else if (weakest.ratio < 0.6) {
    const label = weakest.label.charAt(0).toUpperCase() + weakest.label.slice(1)
    insight = `${label} está comprometendo o score.`
  } else {
    insight = `Fique de olho no ${weakest.label} para manter o score.`
  }

  return { score, level, components: { sla, responsiveness, backlog }, insight }
}

export const HEALTH_LEVEL_LABEL: Record<HealthLevel, string> = {
  excellent: 'Excelente',
  stable:    'Estável',
  critical:  'Crítico',
}
