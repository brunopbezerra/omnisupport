'use client'

import * as React from 'react'
import {
  ColumnFiltersState,
  SortingState,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  ColumnDef,
} from '@tanstack/react-table'
import { Filter } from '@/components/reui/filters'
import type { Ticket } from './data-table'

interface UseTicketTableProps<TData> {
  data: TData[]
  columns: ColumnDef<TData, any>[]
  onOpenTicket?: (ticket: Ticket) => void
  onUpdateTicket?: (ticketId: string, updates: Partial<Ticket>) => void
  initialFilters?: Filter[]
}

export function useTicketTable<TData>({ 
  data, 
  columns, 
  onOpenTicket, 
  onUpdateTicket,
  initialFilters = []
}: UseTicketTableProps<TData>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [selectedTicket, setSelectedTicket] = React.useState<Ticket | null>(null)
  const [isSheetOpen, setIsSheetOpen] = React.useState(false)
  const [filters, setFilters] = React.useState<Filter[]>(initialFilters)

  const handleFiltersChange = React.useCallback((newFilters: Filter[]) => {
    setFilters(newFilters)
    
    const tableFilters: ColumnFiltersState = newFilters
      .filter(f => f.values && f.values.length > 0 && f.values[0] !== '')
      .map(f => {
        const value = f.values[0]
        if (f.operator === 'is_any_of' || f.operator === 'isAnyOf') {
          return { id: f.field, value: f.values }
        }
        return { id: f.field, value }
      })
    
    setColumnFilters(tableFilters)
  }, [])

  // Sync initial filters
  React.useEffect(() => {
    if (initialFilters.length > 0) {
      handleFiltersChange(initialFilters)
    }
  }, [initialFilters, handleFiltersChange])

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      columnFilters,
    },
    globalFilterFn: 'includesString',
    meta: {
      onOpenTicket: (ticket: Ticket) => {
        if (onOpenTicket) {
          onOpenTicket(ticket)
        } else {
          setSelectedTicket(ticket)
          setIsSheetOpen(true)
        }
      },
      onUpdateTicket,
    }
  })

  return {
    table,
    filters,
    handleFiltersChange,
    selectedTicket,
    isSheetOpen,
    setIsSheetOpen,
    columnFilters
  }
}
