'use client'

import { ReactNode } from "react"
import { useDataGrid } from "./data-grid"
import { cn } from "@/lib/utils"

export function DataGridTableBase({ children }: { children: ReactNode }) {
  const { props, table } = useDataGrid()
  return (
    <table
      data-slot="data-grid-table"
      className={cn(
        "text-foreground text-sm w-full min-w-full caption-bottom text-left align-middle font-normal rtl:text-right",
        props.tableLayout?.width === "auto" ? "table-auto" : "table-fixed",
        props.tableClassNames?.base
      )}
      style={props.tableLayout?.columnsResizable ? { width: table.getTotalSize() } : undefined}
    >
      {children}
    </table>
  )
}

export function DataGridTableHead({ children }: { children: ReactNode }) {
  const { props } = useDataGrid()
  return (
    <thead className={cn(props.tableClassNames?.header, props.tableLayout?.headerSticky && props.tableClassNames?.headerSticky)}>
      {children}
    </thead>
  )
}

export function DataGridTableBody({ children }: { children: ReactNode }) {
  const { props } = useDataGrid()
  return (
    <tbody className={cn("[&_tr:last-child]:border-0", props.tableClassNames?.body)}>
      {children}
    </tbody>
  )
}

export function DataGridTableRowSpacer() {
  return <tbody aria-hidden="true" className="h-2"></tbody>
}
