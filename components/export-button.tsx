'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowDown01Icon, FileEditIcon, Table01Icon, File01Icon } from '@hugeicons/core-free-icons'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { exportToCSV, exportToMarkdown, exportToPDF } from '@/lib/export-utils'
import type { Ticket } from '@/app/dashboard/data-table'
import type { Metrics } from '@/hooks/use-metrics'

interface ExportButtonProps {
  tickets: Ticket[]
  metrics: Metrics
  orgName: string
  orgSlug: string
  orgLogoUrl: string | null
  primaryColor: string
  healthScore: number
  start: Date
  end: Date
  categories: Array<{ id: string; name: string; color: string }>
  disabled?: boolean
}

export function ExportButton({
  tickets,
  metrics,
  orgName,
  orgSlug,
  orgLogoUrl,
  primaryColor,
  healthScore,
  start,
  end,
  categories,
  disabled,
}: ExportButtonProps) {
  const [busy, setBusy] = useState(false)

  async function run(fn: () => void) {
    if (busy) return
    setBusy(true)
    const toastId = tickets.length > 200
      ? toast.loading(`Gerando arquivo (${tickets.length} chamados)…`)
      : undefined
    try {
      // Yield to the browser for one frame so the toast renders before blocking work
      await new Promise(r => requestAnimationFrame(r))
      fn()
    } catch (err: any) {
      toast.error(err.message ?? 'Erro ao exportar.')
    } finally {
      if (toastId !== undefined) toast.dismiss(toastId)
      setBusy(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 rounded-full px-3 text-xs"
          disabled={disabled || busy}
        >
          <HugeiconsIcon icon={ArrowDown01Icon} className="size-3.5" />
          Exportar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
          {tickets.length} chamado{tickets.length !== 1 ? 's' : ''} visíveis
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => run(() => exportToCSV(tickets, metrics, orgSlug))}
          className="gap-2 text-sm"
        >
          <HugeiconsIcon icon={Table01Icon} className="size-3.5 text-muted-foreground" />
          CSV (Excel / Sheets)
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() =>
            run(() =>
              exportToMarkdown({
                tickets,
                metrics,
                orgName,
                orgSlug,
                healthScore,
                start,
                end,
                categories,
              }),
            )
          }
          className="gap-2 text-sm"
        >
          <HugeiconsIcon icon={FileEditIcon} className="size-3.5 text-muted-foreground" />
          Markdown (Notion / Docs)
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() =>
            run(() =>
              exportToPDF({
                tickets,
                metrics,
                orgName,
                orgSlug,
                orgLogoUrl,
                primaryColor,
                start,
                end,
              }),
            )
          }
          className="gap-2 text-sm"
        >
          <HugeiconsIcon icon={File01Icon} className="size-3.5 text-muted-foreground" />
          PDF (imprimir / salvar)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
