'use client'

import { ReactNode, CSSProperties } from "react"
import { HeaderGroup, Row } from "@tanstack/react-table"
import { useDataGrid } from "./data-grid"
import { cn } from "@/lib/utils"

export function DataGridTableHeadRow<TData>({ children, headerGroup }: { children: ReactNode, headerGroup: HeaderGroup<TData> }) {
  const { props } = useDataGrid()
  return (
    <tr className={cn("bg-muted/40", props.tableLayout?.headerBorder && "[&>th]:border-b", props.tableClassNames?.headerRow)}>
      {children}
    </tr>
  )
}

export function DataGridTableBodyRow<TData>({ children, row, dndRef, dndStyle }: { children: ReactNode, row: Row<TData>, dndRef?: React.Ref<HTMLTableRowElement>, dndStyle?: CSSProperties }) {
  const { props, table } = useDataGrid()
  return (
    <tr
      ref={dndRef}
      style={dndStyle}
      data-state={row.getIsSelected() ? "selected" : undefined}
      onClick={() => props.onRowClick && props.onRowClick(row.original)}
      className={cn("hover:bg-muted/40 data-[state=selected]:bg-muted/50", props.onRowClick && "cursor-pointer", props.tableLayout?.rowBorder && "border-b", props.tableClassNames?.bodyRow)}
    >
      {children}
    </tr>
  )
}

export function DataGridTableBodyRowSkeleton({ children }: { children: ReactNode }) {
  const { props } = useDataGrid()
  return (
    <tr className={cn("hover:bg-muted/40 border-b", props.tableClassNames?.bodyRow)}>
      {children}
    </tr>
  )
}
