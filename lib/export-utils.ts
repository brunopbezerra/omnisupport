import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Ticket } from '@/app/dashboard/data-table'
import type { Metrics } from '@/hooks/use-metrics'

// ─── Shared helpers ────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  open: 'Aberto',
  in_progress: 'Em andamento',
  resolved: 'Resolvido',
}

function formatDate(iso: string) {
  return format(new Date(iso), 'dd/MM/yyyy', { locale: ptBR })
}

function triggerDownload(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function buildFilename(orgSlug: string, ext: string) {
  const ts = format(new Date(), 'yyyyMMdd_HHmm')
  return `relatorio_${orgSlug}_${ts}.${ext}`
}

// ─── CSV ───────────────────────────────────────────────────────────────────────

function csvCell(val: string) {
  const escaped = val.replace(/"/g, '""')
  return escaped.includes(',') || escaped.includes('"') || escaped.includes('\n')
    ? `"${escaped}"`
    : escaped
}

export function exportToCSV(tickets: Ticket[], metrics: Metrics, orgSlug: string) {
  const metricHeaders = ['Abertos', 'Em andamento', 'Resolvidos', 'Sem responsável', 'T.M. de Resposta (min)']
  const metricValues = [
    String(metrics.open),
    String(metrics.in_progress),
    String(metrics.resolved),
    String(metrics.unassigned),
    metrics.avgFirstResponseMinutes ? String(Math.round(metrics.avgFirstResponseMinutes)) : '—'
  ]

  const headers = ['ID', 'Assunto', 'E-mail do cliente', 'Status', 'Categorias', 'Responsável', 'Criado em']
  const rows = tickets.map(t => [
    t.ref_token,
    t.subject,
    t.customer_email,
    STATUS_LABELS[t.status] ?? t.status,
    (t.categories ?? []).map(c => c.name).join(' | '),
    t.assigned_to_profile?.full_name ?? '',
    formatDate(t.created_at),
  ])

  const csv = [
    ['Resumo de Métricas'],
    metricHeaders,
    metricValues,
    [],
    ['Lista de Chamados'],
    headers,
    ...rows
  ].map(row => row.map(val => csvCell(val)).join(',')).join('\n')

  triggerDownload(csv, buildFilename(orgSlug, 'csv'), 'text/csv;charset=utf-8;')
}

// ─── Markdown ─────────────────────────────────────────────────────────────────

interface MarkdownExportOptions {
  tickets: Ticket[]
  metrics: Metrics
  orgName: string
  orgSlug: string
  healthScore: number
  start: Date
  end: Date
  categories: Array<{ id: string; name: string; color: string }>
}

export function exportToMarkdown({
  tickets,
  metrics,
  orgName,
  orgSlug,
  healthScore,
  start,
  end,
}: MarkdownExportOptions) {
  const total = tickets.length
  const resolved = tickets.filter(t => t.status === 'resolved').length
  const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0

  // Top category by ticket count
  const catCounts = new Map<string, { name: string; count: number }>()
  for (const t of tickets) {
    for (const c of t.categories ?? []) {
      const entry = catCounts.get(c.id)
      if (entry) entry.count++
      else catCounts.set(c.id, { name: c.name, count: 1 })
    }
  }
  const topCat = [...catCounts.values()].sort((a, b) => b.count - a.count)[0]
  const topCatPct = topCat && total > 0 ? Math.round((topCat.count / total) * 100) : 0

  // Avg response time (from metrics)
  const avgSla = metrics.avgFirstResponseMinutes
    ? formatMinutes(metrics.avgFirstResponseMinutes)
    : '—'

  // Trend
  const openTrend = metrics.trends.open
  const trendText = openTrend
    ? `${openTrend.pct}% ${openTrend.direction === 'up' ? '↑' : openTrend.direction === 'down' ? '↓' : '→'}`
    : '—'

  // Ticket table rows
  const tableRows = tickets
    .map(t =>
      `| #${t.ref_token} | ${t.subject} | ${(t.categories ?? []).map(c => c.name).join(', ') || '—'} | ${STATUS_LABELS[t.status] ?? t.status} | ${formatDate(t.created_at)} | ${t.assigned_to_profile?.full_name ?? '—'} |`
    )
    .join('\n')

  const md = `# Relatório de Atendimento: ${orgName}
> **Gerado em:** ${format(new Date(), "dd 'de' MMMM 'de' yyyy, HH:mm", { locale: ptBR })}
> **Período do Relatório:** ${formatDate(start.toISOString())} até ${formatDate(end.toISOString())}

---

## 📊 Resumo Executivo
- **Total de Chamados no Período:** ${total}
- **Abertos:** ${metrics.open}
- **Em andamento:** ${metrics.in_progress}
- **Resolvidos:** ${metrics.resolved}
- **Sem responsável:** ${metrics.unassigned}
- **SLA Médio de Resposta:** ${avgSla}
- **Categoria Predominante:** ${topCat ? `${topCat.name} (${topCatPct}%)` : '—'}
- **Taxa de Resolução:** ${resolutionRate}%

---

## 📑 Lista Detalhada de Chamados
| ID | Assunto | Categoria | Status | Criado em | Responsável |
|:---|:---|:---|:---:|:---|:---|
${tableRows || '| — | Nenhum chamado no período | — | — | — | — |'}

---

## 💡 Insights de Produto (Analytics)
- **Status do Health Score:** ${healthScore}/100
- **Volume vs. Período Anterior:** ${trendText}

---
*Gerado automaticamente pelo Produtools SaaS.*
`

  triggerDownload(md, buildFilename(orgSlug, 'md'), 'text/markdown;charset=utf-8;')
}

// ─── PDF (browser print) ───────────────────────────────────────────────────────

interface PDFExportOptions {
  tickets: Ticket[]
  metrics: Metrics
  orgName: string
  orgSlug: string
  orgLogoUrl: string | null
  primaryColor: string
  start: Date
  end: Date
}

export function exportToPDF({
  tickets,
  metrics,
  orgName,
  orgSlug,
  orgLogoUrl,
  primaryColor,
  start,
  end,
}: PDFExportOptions) {
  const rows = tickets
    .map(
      t => `
      <tr>
        <td>#${t.ref_token}</td>
        <td>${t.subject}</td>
        <td>${(t.categories ?? []).map(c => c.name).join(', ') || '—'}</td>
        <td>${STATUS_LABELS[t.status] ?? t.status}</td>
        <td>${formatDate(t.created_at)}</td>
        <td>${t.assigned_to_profile?.full_name ?? '—'}</td>
      </tr>`,
    )
    .join('')

  const logoHtml = orgLogoUrl
    ? `<img src="${orgLogoUrl}" alt="${orgName}" style="height:40px;object-fit:contain;" />`
    : `<span style="font-size:20px;font-weight:700;color:${primaryColor}">${orgName}</span>`

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Relatório — ${orgName}</title>
  <style>
    @page { size: landscape; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 13px; color: #1e293b; background: #f8fafc; padding: 20mm; }
    .page { max-width: 257mm; margin: 0 auto; background: #fff; padding: 12mm; border-radius: 16px; border: 1px solid #e2e8f0; min-height: 170mm; }
    header { display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #e2e8f0; padding-bottom: 24px; margin-bottom: 32px; }
    header .meta { text-align: right; font-size: 11px; color: #64748b; line-height: 1.6; }
    h1 { font-size: 24px; color: #0f172a; margin-bottom: 8px; font-weight: 800; letter-spacing: -0.025em; }
    h2 { font-size: 16px; color: #0f172a; margin: 32px 0 16px; font-weight: 700; }
    .metrics-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; margin: 24px 0 32px 0; }
    .metric-card { padding: 16px; border: 1px solid #e2e8f0; border-radius: 12px; background: #fff; text-align: left; }
    .metric-label { font-size: 10px; color: #64748b; margin-bottom: 6px; text-transform: uppercase; font-weight: 600; letter-spacing: 0.05em; }
    .metric-value { font-size: 22px; font-weight: 800; color: ${primaryColor}; }
    table { width: 100%; border-collapse: separate; border-spacing: 0; margin-top: 8px; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; }
    th { background: #f8fafc; color: #64748b; padding: 12px 16px; text-align: left; font-size: 11px; font-weight: 600; border-bottom: 1px solid #e2e8f0; text-transform: uppercase; letter-spacing: 0.05em; }
    td { padding: 12px 16px; border-bottom: 1px solid #f1f5f9; font-size: 12px; color: #334155; }
    tr:last-child td { border-bottom: 0; }
    tr:hover td { background: #f8fafc; }
    .badge { display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 9999px; font-size: 10px; font-weight: 600; background: #f1f5f9; color: #475569; }
    footer { margin-top: 48px; font-size: 11px; color: #94a3b8; text-align: center; font-weight: 500; }
  </style>
</head>
<body>
  <div class="page">
    <header>
      ${logoHtml}
      <div class="meta">
        <div><strong>Período:</strong> ${formatDate(start.toISOString())} — ${formatDate(end.toISOString())}</div>
        <div><strong>Gerado em:</strong> ${format(new Date(), "dd/MM/yyyy HH:mm")}</div>
      </div>
    </header>

    <h1>Relatório de Atendimento</h1>

    <div class="metrics-grid">
      <div class="metric-card">
        <div class="metric-label">Abertos</div>
        <div class="metric-value">${metrics.open}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Em andamento</div>
        <div class="metric-value">${metrics.in_progress}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Resolvidos</div>
        <div class="metric-value">${metrics.resolved}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Sem responsável</div>
        <div class="metric-value">${metrics.unassigned}</div>
      </div>
      <div class="metric-card" style="border-right: 0;">
        <div class="metric-label">T.M. de Resposta</div>
        <div class="metric-value">${metrics.avgFirstResponseMinutes ? formatMinutes(metrics.avgFirstResponseMinutes) : '—'}</div>
      </div>
    </div>

    <h2>Lista de Chamados (${tickets.length})</h2>
    <table>
      <thead>
        <tr>
          <th>ID</th><th>Assunto</th><th>Categoria</th><th>Status</th><th>Criado em</th><th>Responsável</th>
        </tr>
      </thead>
      <tbody>${rows || '<tr><td colspan="6" style="text-align:center;color:#94a3b8">Nenhum chamado no período</td></tr>'}</tbody>
    </table>

    <footer>Gerado automaticamente pelo Produtools SaaS</footer>
  </div>
</body>
</html>`

  const win = window.open('', `_relatorio_${orgSlug}`, 'width=900,height=700')
  if (!win) return
  win.document.write(html)
  win.document.close()
  win.onload = () => win.print()
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function formatMinutes(minutes: number) {
  if (minutes < 60) return `${Math.round(minutes)}m`
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}
