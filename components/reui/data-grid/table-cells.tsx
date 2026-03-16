'use client'

import { ReactNode, CSSProperties } from "react"
import { Header, Column, Cell, Row } from "@tanstack/react-table"
import { useDataGrid } from "./data-grid"
import { cn } from "@/lib/utils"
import { Checkbox } from "@/components/ui/checkbox"
import { getPinningStyles, headerCellSpacingVariants, bodyCellSpacingVariants } from "./utils"

export function DataGridTableHeadRowCell<TData>({
  children,
  header,
  dndRef,
  dndStyle,
}: {
  children: ReactNode
  header: Header<TData, unknown>
  dndRef?: React.Ref<HTMLTableCellElement>
  dndStyle?: CSSProperties
}) {
  const { props } = useDataGrid()
  const { column } = header
  const isPinned = column.getIsPinned()
  const isLastLeftPinned = isPinned === "left" && column.getIsLastColumn("left")
  const isFirstRightPinned = isPinned === "right" && column.getIsFirstColumn("right")
  
  return (
    <th
      ref={dndRef}
      style={{
        ...((props.tableLayout?.width === "fixed" || props.tableLayout?.columnsResizable) && { width: header.getSize() }),
        ...(props.tableLayout?.columnsPinnable && column.getCanPin() && getPinningStyles(column)),
        ...dndStyle
      }}
      data-pinned={isPinned || undefined}
      className={cn(
        "text-secondary-foreground/80 h-10 relative text-left align-middle font-normal [&:has([role=checkbox])]:pe-0",
        headerCellSpacingVariants({ size: props.tableLayout?.dense ? "dense" : "default" }),
        props.tableLayout?.cellBorder && "border-e",
        props.tableLayout?.columnsResizable && column.getCanResize() && "truncate",
        header.column.columnDef.meta?.headerClassName
      )}
    >
      {children}
    </th>
  )
}

export function DataGridTableBodyRowCell<TData>({
  children,
  cell,
  dndRef,
  dndStyle,
}: {
  children: ReactNode
  cell: Cell<TData, unknown>
  dndRef?: React.Ref<HTMLTableCellElement>
  dndStyle?: CSSProperties
}) {
  const { props } = useDataGrid()
  const { column, row } = cell
  const isPinned = column.getIsPinned()

  return (
    <td
      ref={dndRef}
      style={{
        ...(props.tableLayout?.columnsResizable && { width: column.getSize() }),
        ...(props.tableLayout?.columnsPinnable && column.getCanPin() && getPinningStyles(column)),
        ...dndStyle
      }}
      data-pinned={isPinned || undefined}
      className={cn(
        "align-middle",
        bodyCellSpacingVariants({ size: props.tableLayout?.dense ? "dense" : "default" }),
        props.tableLayout?.cellBorder && "border-e",
        props.tableLayout?.columnsResizable && column.getCanResize() && "truncate",
        cell.column.columnDef.meta?.cellClassName
      )}
    >
      {children}
    </td>
  )
}

export function DataGridTableRowSelect<TData>({ row }: { row: Row<TData> }) {
  return (
    <>
      <div className={cn("bg-primary absolute start-0 top-0 bottom-0 hidden w-[2px]", row.getIsSelected() && "block")} />
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(v) => row.toggleSelected(!!v)}
        aria-label="Select row"
      />
    </>
  )
}

export function DataGridTableRowSelectAll() {
  const { table, recordCount, isLoading } = useDataGrid()
  return (
    <Checkbox
      checked={table.getIsSomePageRowsSelected() && !table.getIsAllPageRowsSelected() ? "indeterminate" : table.getIsAllPageRowsSelected()}
      disabled={isLoading || recordCount === 0}
      onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
      aria-label="Select all"
    />
  )
}
