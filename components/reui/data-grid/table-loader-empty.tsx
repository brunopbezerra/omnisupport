'use client'

import { useDataGrid } from "./data-grid"

export function DataGridTableEmpty() {
  const { table, props } = useDataGrid()
  return (
    <tr>
      <td colSpan={table.getAllColumns().length} className="text-muted-foreground py-6 text-center text-sm">
        {props.emptyMessage || "Sem dados disponíveis"}
      </td>
    </tr>
  )
}

export function DataGridTableLoader() {
  const { props } = useDataGrid()
  return (
    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
      <div className="bg-card flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-medium">
        <svg className="h-5 w-5 animate-spin text-muted-foreground" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        {props.loadingMessage || "Carregando..."}
      </div>
    </div>
  )
}
