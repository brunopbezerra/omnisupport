"use client"

import { CSSProperties, Fragment, useId, useRef } from "react"
import { useDataGrid } from "@/components/reui/data-grid/data-grid"
import {
  DataGridTableBase,
  DataGridTableBody,
  DataGridTableBodyRow,
  DataGridTableBodyRowCell,
  DataGridTableBodyRowSkeleton,
  DataGridTableEmpty,
  DataGridTableHead,
  DataGridTableHeadRow,
  DataGridTableHeadRowCell,
  DataGridTableRowSpacer,
} from "@/components/reui/data-grid/data-grid-table"
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  Modifier,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  horizontalListSortingStrategy,
  SortableContext,
  useSortable,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  Cell,
  flexRender,
  Header,
  HeaderGroup,
  Row,
} from "@tanstack/react-table"

import { Button } from "@/components/ui/button"
import { GripVerticalIcon } from "lucide-react"

function DataGridTableDndHeader<TData>({
  header,
}: {
  header: Header<TData, unknown>
}) {
  const { props } = useDataGrid()
  const { column } = header

  // Check if column ordering is enabled for this column
  const canOrder =
    (column.columnDef as { enableColumnOrdering?: boolean })
      .enableColumnOrdering !== false

  const {
    attributes,
    isDragging,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({
    id: header.column.id,
  })

  const style: CSSProperties = {
    opacity: isDragging ? 0.8 : 1,
    position: "relative",
    transform: CSS.Translate.toString(transform),
    transition,
    whiteSpace: "nowrap",
    width: header.column.getSize(),
    zIndex: isDragging ? 1 : 0,
  }

  return (
    <DataGridTableHeadRowCell
      header={header}
      dndStyle={style}
      dndRef={setNodeRef}
    >
      <div className="flex items-center justify-start gap-0.5">
        {canOrder && (
          <Button
            size="icon-sm"
            variant="ghost"
            className="-ms-2 size-6 cursor-move"
            {...attributes}
            {...listeners}
            aria-label="Drag to reorder"
          >
            <GripVerticalIcon className="opacity-60 hover:opacity-100" aria-hidden="true" />
          </Button>
        )}
        <span className="grow truncate">
          {header.isPlaceholder
            ? null
            : flexRender(header.column.columnDef.header, header.getContext())}
        </span>
        {props.tableLayout?.columnsResizable && column.getCanResize() && (
          <div
            onMouseDown={header.getResizeHandler()}
            onTouchStart={header.getResizeHandler()}
            className="absolute top-0 h-full w-4 cursor-col-resize -end-2 z-10 flex justify-center before:absolute before:w-px before:inset-y-0 before:bg-border"
          />
        )}
      </div>
    </DataGridTableHeadRowCell>
  )
}

function DataGridTableDndCell<TData>({ cell }: { cell: Cell<TData, unknown> }) {
  const { isDragging, setNodeRef, transform, transition } = useSortable({
    id: cell.column.id,
  })

  const style: CSSProperties = {
    opacity: isDragging ? 0.8 : 1,
    position: "relative",
    transform: CSS.Translate.toString(transform),
    transition,
    width: cell.column.getSize(),
    zIndex: isDragging ? 1 : 0,
  }

  return (
    <DataGridTableBodyRowCell cell={cell} dndStyle={style} dndRef={setNodeRef}>
      {flexRender(cell.column.columnDef.cell, cell.getContext())}
    </DataGridTableBodyRowCell>
  )
}

function DataGridTableDnd<TData>({
  handleDragEnd,
}: {
  handleDragEnd: (event: DragEndEvent) => void
}) {
  const { table, isLoading, props } = useDataGrid()
  const pagination = table.getState().pagination
  const containerRef = useRef<HTMLDivElement>(null)

  const sensors = useSensors(
    useSensor(MouseSensor, {}),
    useSensor(TouchSensor, {}),
    useSensor(KeyboardSensor, {})
  )

  // Custom modifier to restrict dragging within table bounds with edge offset
  const restrictToTableBounds: Modifier = ({ draggingNodeRect, transform }) => {
    if (!draggingNodeRect || !containerRef.current) {
      return { ...transform, y: 0 }
    }

    const containerRect = containerRef.current.getBoundingClientRect()
    const edgeOffset = 0

    const minX = containerRect.left - draggingNodeRect.left - edgeOffset
    const maxX =
      containerRect.right -
      draggingNodeRect.left -
      draggingNodeRect.width +
      edgeOffset

    return {
      ...transform,
      x: Math.min(Math.max(transform.x, minX), maxX),
      y: 0, // Lock vertical movement
    }
  }

  return (
    <DndContext
      collisionDetection={closestCenter}
      id={useId()}
      modifiers={[restrictToTableBounds]}
      onDragEnd={handleDragEnd}
      sensors={sensors}
    >
      <div ref={containerRef}>
        <DataGridTableBase>
          <DataGridTableHead>
            {table
              .getHeaderGroups()
              .map((headerGroup: HeaderGroup<TData>, index) => {
                return (
                  <DataGridTableHeadRow headerGroup={headerGroup} key={index}>
                    <SortableContext
                      items={table.getState().columnOrder}
                      strategy={horizontalListSortingStrategy}
                    >
                      {headerGroup.headers.map((header) => (
                        <DataGridTableDndHeader
                          header={header}
                          key={header.id}
                        />
                      ))}
                    </SortableContext>
                  </DataGridTableHeadRow>
                )
              })}
          </DataGridTableHead>

          {(props.tableLayout?.stripped || !props.tableLayout?.rowBorder) && (
            <DataGridTableRowSpacer />
          )}

          <DataGridTableBody>
            {props.loadingMode === "skeleton" &&
            isLoading &&
            pagination?.pageSize ? (
              Array.from({ length: pagination.pageSize }).map((_, rowIndex) => (
                <DataGridTableBodyRowSkeleton key={rowIndex}>
                  {table.getVisibleFlatColumns().map((column, colIndex) => {
                    return (
                      <DataGridTableBodyRowCell
                        key={colIndex}
                        cell={{ column, row: {} } as any}
                      >
                        {column.columnDef.meta?.skeleton}
                      </DataGridTableBodyRowCell>
                    )
                  })}
                </DataGridTableBodyRowSkeleton>
              ))
            ) : table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row: Row<TData>) => {
                return (
                  <Fragment key={row.id}>
                    <DataGridTableBodyRow row={row}>
                      {row
                        .getVisibleCells()
                        .map((cell: Cell<TData, unknown>) => {
                          return (
                            <SortableContext
                              key={cell.id}
                              items={table.getState().columnOrder}
                              strategy={horizontalListSortingStrategy}
                            >
                              <DataGridTableDndCell cell={cell} />
                            </SortableContext>
                          )
                        })}
                    </DataGridTableBodyRow>
                    {row.getIsExpanded() && (
                      <tr className="border-b">
                        <td colSpan={row.getVisibleCells().length}>
                          {table.getAllColumns().find(c => c.columnDef.meta?.expandedContent)?.columnDef.meta?.expandedContent?.(row.original)}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })
            ) : (
              <DataGridTableEmpty />
            )}
          </DataGridTableBody>
        </DataGridTableBase>
      </div>
    </DndContext>
  )
}

export { DataGridTableDnd }