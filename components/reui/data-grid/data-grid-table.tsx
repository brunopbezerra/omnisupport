"use client"

import { Fragment, ReactNode } from "react"
import { useDataGrid } from "@/components/reui/data-grid/data-grid"
import { flexRender, HeaderGroup, Row, Cell } from "@tanstack/react-table"
import { DataGridTableBase, DataGridTableHead, DataGridTableBody, DataGridTableRowSpacer } from "./table-parts"
import { DataGridTableHeadRow, DataGridTableBodyRow, DataGridTableBodyRowSkeleton } from "./table-rows"
import { DataGridTableHeadRowCell, DataGridTableBodyRowCell } from "./table-cells"
import { DataGridTableEmpty } from "./table-loader-empty"

export function DataGridTable<TData>() {
  const { table, isLoading, props } = useDataGrid()
  const pagination = table.getState().pagination

  return (
    <DataGridTableBase>
      <DataGridTableHead>
        {table.getHeaderGroups().map((headerGroup: HeaderGroup<TData>) => (
          <DataGridTableHeadRow headerGroup={headerGroup} key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <DataGridTableHeadRowCell header={header} key={header.id}>
                {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                {props.tableLayout?.columnsResizable && header.column.getCanResize() && (
                   <div onMouseDown={header.getResizeHandler()} onTouchStart={header.getResizeHandler()} className="absolute top-0 h-full w-4 cursor-col-resize -end-2 z-10 flex justify-center before:absolute before:w-px before:inset-y-0 before:bg-border" />
                )}
              </DataGridTableHeadRowCell>
            ))}
          </DataGridTableHeadRow>
        ))}
      </DataGridTableHead>

      {(props.tableLayout?.stripped || !props.tableLayout?.rowBorder) && <DataGridTableRowSpacer />}

      <DataGridTableBody>
        {isLoading && props.loadingMode === "skeleton" && pagination?.pageSize ? (
          Array.from({ length: pagination.pageSize }).map((_, i) => (
            <DataGridTableBodyRowSkeleton key={i}>
              {table.getVisibleFlatColumns().map((column) => (
                <DataGridTableBodyRowCell key={column.id} cell={{ column, row: {} } as any}>
                  {column.columnDef.meta?.skeleton}
                </DataGridTableBodyRowCell>
              ))}
            </DataGridTableBodyRowSkeleton>
          ))
        ) : table.getRowModel().rows.length ? (
          table.getRowModel().rows.map((row: Row<TData>) => (
            <Fragment key={row.id}>
              <DataGridTableBodyRow row={row}>
                {row.getVisibleCells().map((cell: Cell<TData, unknown>) => (
                  <DataGridTableBodyRowCell cell={cell} key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </DataGridTableBodyRowCell>
                ))}
              </DataGridTableBodyRow>
              {row.getIsExpanded() && (
                <tr className="border-b">
                  <td colSpan={row.getVisibleCells().length}>
                    {table.getAllColumns().find(c => c.columnDef.meta?.expandedContent)?.columnDef.meta?.expandedContent?.(row.original)}
                  </td>
                </tr>
              )}
            </Fragment>
          ))
        ) : (
          <DataGridTableEmpty />
        )}
      </DataGridTableBody>
    </DataGridTableBase>
  )
}

export * from "./table-parts"
export * from "./table-rows"
export * from "./table-cells"
export * from "./table-loader-empty"