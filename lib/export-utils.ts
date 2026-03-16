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

export function exportToCSV(tickets: Ticket[], orgSlug: string) {
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

  const csv = [headers, ...rows].map(row => row.map(csvCell).join(',')).join('\n')
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
  orgName: string
  orgSlug: string
  orgLogoUrl: string | null
  primaryColor: string
  start: Date
  end: Date
}

export function exportToPDF({
  tickets,
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
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 12px; color: #111; padding: 32px; }
    header { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px solid ${primaryColor}; padding-bottom: 16px; margin-bottom: 24px; }
    header .meta { text-align: right; font-size: 11px; color: #666; }
    h1 { font-size: 18px; color: ${primaryColor}; margin-bottom: 4px; }
    h2 { font-size: 13px; color: ${primaryColor}; margin: 20px 0 10px; border-bottom: 1px solid #eee; padding-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th { background: ${primaryColor}; color: #fff; padding: 6px 10px; text-align: left; font-size: 11px; }
    td { padding: 6px 10px; border-bottom: 1px solid #eee; font-size: 11px; }
    tr:nth-child(even) td { background: #f9f9f9; }
    footer { margin-top: 32px; font-size: 10px; color: #aaa; text-align: center; }
  </style>
</head>
<body>
  <header>
    ${logoHtml}
    <div class="meta">
      <div><strong>Período:</strong> ${formatDate(start.toISOString())} — ${formatDate(end.toISOString())}</div>
      <div><strong>Gerado em:</strong> ${format(new Date(), "dd/MM/yyyy HH:mm")}</div>
    </div>
  </header>

  <h1>Relatório de Atendimento</h1>

  <h2>Lista de Chamados (${tickets.length})</h2>
  <table>
    <thead>
      <tr>
        <th>ID</th><th>Assunto</th><th>Categoria</th><th>Status</th><th>Criado em</th><th>Responsável</th>
      </tr>
    </thead>
    <tbody>${rows || '<tr><td colspan="6" style="text-align:center;color:#999">Nenhum chamado no período</td></tr>'}</tbody>
  </table>

  <footer>Gerado automaticamente pelo Produtools SaaS</footer>
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
