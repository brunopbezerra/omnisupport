'use client'

import * as React from 'react'
import { ColumnDef, flexRender, RowData } from '@tanstack/react-table'
import { format } from 'date-fns'
import { HugeiconsIcon } from "@hugeicons/react"
import { FilterIcon, FilterRemoveIcon, InboxIcon } from "@hugeicons/core-free-icons"

declare module '@tanstack/react-table' {
  interface ColumnMeta<TData extends RowData, TValue> {
    className?: string
  }
}

import { Filters, type FilterFieldConfig } from '@/components/reui/filters'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useTheme } from 'next-themes'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from '@/components/ui/empty'
import { TicketDetailsSheet } from '@/components/ticket-details-sheet'
import { AssignSelect } from '@/components/assign-select'
import { CategorySelector, getCategoryStyles } from '@/components/category-selector'
import type { Agent } from '@/hooks/use-agents'

import { PT_BR_I18N, filterFields, statusMap } from './constants'
import { useTicketTable } from './use-ticket-table'

// --- Sub-components for better performance and hooks support ---
const CategoryBadges = ({ categories }: { categories: Category[] }) => {
  const { theme } = useTheme()
  if (!categories || categories.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1">
      {categories.map((cat) => {
        const styles = getCategoryStyles(cat.color, theme)
        return (
          <Badge
            key={cat.id}
            variant="outline"
            className="text-[10px] px-1.5 py-0 border-none pointer-events-none font-semibold"
            style={styles}
          >
            {cat.name}
          </Badge>
        )
      })}
    </div>
  )
}

const ClientSafeDate = ({ date, formatStr = 'dd/MM/yyyy' }: { date: string; formatStr?: string }) => {
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])
  if (!mounted) return <span className="invisible">--/--/----</span>
  return <span>{format(new Date(date), formatStr)}</span>
}

export interface TicketProfile {
  id: string
  full_name: string
  avatar_url?: string | null
}

export interface Category {
  id: string
  name: string
  color: string
}

export interface Ticket {
  id: string
  ref_token: string
  customer_email: string
  subject: string
  status: string
  assigned_to?: string | null
  assigned_to_profile?: TicketProfile | null
  created_at: string
  categories?: Category[]
}

// ─── Columns factory ─────────────────────────────────────────────────────────
// Accepts agents + currentUserId so the inline Select has what it needs.

export function makeColumns(
  agents: Agent[],
  currentUserId: string | undefined,
): ColumnDef<Ticket>[] {
  return [
    {
      accessorKey: 'ref_token',
      header: 'Ticket ID',
      meta: { className: 'w-[140px] font-medium' },
      cell: ({ row }) => <div>{row.getValue('ref_token')}</div>,
    },
    {
      accessorKey: 'customer_email',
      header: 'E-mail do remetente',
      meta: { className: 'w-[200px] xl:w-[250px] truncate' },
      cell: ({ row }) => <div className="truncate">{row.getValue('customer_email')}</div>,
    },
    {
      accessorKey: 'subject',
      header: 'Assunto',
      meta: { className: 'min-w-[150px] max-w-[300px]' },
      cell: ({ row }) => <div className="truncate font-medium">{row.getValue('subject')}</div>,
    },
    {
      id: 'categories',
      accessorFn: (row) => row.categories?.map(c => c.name).join(', ') || '',
      header: 'Categorias',
      meta: { className: 'w-[250px]' },
      filterFn: (row, columnId, filterValue) => {
        if (!filterValue || (Array.isArray(filterValue) && filterValue.length === 0)) return true
        // Important: we use row.original to get the actual objects, 
        // regardless of what accessorFn returns for display/sorting.
        const ticketCategories = (row.original as Ticket).categories?.map((c: any) => c.id) || []
        const values = Array.isArray(filterValue) ? filterValue : [filterValue]
        return values.some(id => id && ticketCategories.includes(id))
      },
      cell: ({ row, table }) => (
        <CategorySelector 
          ticketId={row.original.id} 
          selectedCategories={row.original.categories || []}
          overflowLimit={1}
          onCategoriesChange={(cats) => {
            (table.options.meta as any)?.onUpdateTicket(row.original.id, { categories: cats })
          }}
        />
      ),
    },
    {
      id: 'assigned_to',
      accessorKey: 'assigned_to',
      header: 'Responsável',
      meta: { className: 'w-[180px] xl:w-[220px]' },
      filterFn: (row, columnId, filterValue) => {
        if (!filterValue || (Array.isArray(filterValue) && filterValue.length === 0)) return true
        const value = row.original.assigned_to
        const values = Array.isArray(filterValue) ? filterValue : [filterValue]
        return values.includes(value)
      },
      cell: ({ row, table }) => {
        const ticket = row.original
        return (
          <AssignSelect
            ticketId={ticket.id}
            ticketStatus={ticket.status}
            assignedProfile={ticket.assigned_to_profile}
            agents={agents}
            currentUserId={currentUserId}
            size="xs"
            onAssigned={(id, profile) => {
              (table.options.meta as any)?.onUpdateTicket(ticket.id, { 
                assigned_to: id ?? null,
                assigned_to_profile: profile ?? null,
                status: (id && ticket.status === 'open') ? 'in_progress' : (!id && ticket.status === 'in_progress') ? 'open' : ticket.status
              })
            }}
          />
        )
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      meta: { className: 'w-[140px]' },
      cell: ({ row }) => {
        const val = row.getValue('status') as string
        const config = statusMap[val] || { label: val, icon: null, variant: 'default' }
        return (
          <Badge variant={config.variant} className="rounded-full px-2.5 py-0.5 gap-1.5 font-medium transition-all group">
            <span className="shrink-0">{config.icon}</span>
            <span>{config.label}</span>
          </Badge>
        )
      },
    },
    {
      accessorKey: 'created_at',
      header: 'Data',
      meta: { className: 'w-[120px]' },
      filterFn: (row, columnId, filterValue) => {
        if (!filterValue || (Array.isArray(filterValue) && filterValue.length === 0)) return true
        
        const rowDateStr = row.getValue(columnId) as string
        if (!rowDateStr) return false
        
        const rowDate = new Date(rowDateStr)
        rowDate.setHours(0, 0, 0, 0)

        // filterValue comes from our customRenderer as ['YYYY-MM-DD', 'YYYY-MM-DD'] (for range) 
        // or ['YYYY-MM-DD'] (for single)
        const values = Array.isArray(filterValue) ? filterValue : [filterValue]
        
        // We need to know the operator to apply correctly. 
        // Since TanStack Table filterValue is just the value, we might need a sneaky way 
        // to pass the operator or just guess based on length.
        // Actually, in use-ticket-table.ts, we pass the filter object.
        // Wait, TanStack Table column.setFilterValue(val) only sets the value.
        // But our custom `filterFn` can handle it if we structure the filterValue.
        
        // Let's assume filterValue is { operator, values } if we wrap it.
        // But currently use-ticket-table.ts passes only values.
        
        // Let's assume:
        // 1 value -> "is" or "after"
        // 2 values -> "between"
        
        const parse = (s: string) => {
          if (!s) return null
          const d = new Date(s)
          d.setHours(0, 0, 0, 0)
          return isNaN(d.getTime()) ? null : d
        }

        if (values.length === 2) {
          const start = parse(values[0])
          const end = parse(values[1])
          if (start && end) return rowDate >= start && rowDate <= end
          if (start) return rowDate >= start
          if (end) return rowDate <= end
          return true
        } else {
          const target = parse(values[0])
          if (!target) return true
          // Just as a helper, if we can't get the operator, "is" is the default.
          return rowDate.getTime() === target.getTime()
        }
      },
      cell: ({ row }) => <ClientSafeDate date={row.getValue('created_at')} />,
    },
  ]
}

// Keep a static `columns` export for compatibility
export const columns: ColumnDef<Ticket>[] = makeColumns([], undefined)

// ─── DataTable ────────────────────────────────────────────────────────────────

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  onOpenTicket?: (ticket: Ticket) => void
  onUpdateTicket?: (ticketId: string, updates: Partial<Ticket>) => void
  layout?: 'table' | 'list'
  selectedId?: string
  // Passed from page for inline assign
  agents?: Agent[]
  currentUserId?: string
  filterFields?: FilterFieldConfig[]
}

export function DataTable<TData, TValue>({
  columns,
  data,
  onOpenTicket,
  layout = 'table',
  selectedId,
  agents = [],
  currentUserId,
  filterFields: passedFilterFields,
  onUpdateTicket,
}: DataTableProps<TData, TValue>) {
  const { table, filters, handleFiltersChange, selectedTicket, isSheetOpen, setIsSheetOpen, columnFilters } =
    useTicketTable({ data, columns, onOpenTicket, onUpdateTicket })

  const noResults = table.getRowModel().rows.length === 0
  const isFiltered = columnFilters.length > 0

  return (
    <>
      <TicketDetailsSheet ticket={selectedTicket} open={isSheetOpen} onOpenChange={setIsSheetOpen} />
      <div className={cn(
        "flex flex-col min-h-0 min-w-0",
        layout === 'list' || noResults ? "flex-1" : "h-fit"
      )}>
        <div className="flex items-center py-4 px-1 gap-2.5 shrink-0 overflow-x-auto no-scrollbar">
          <Filters
            filters={filters}
            fields={passedFilterFields || filterFields}
            onChange={handleFiltersChange}
            i18n={PT_BR_I18N}
            size="sm"
            trigger={
              <Button variant="outline" size="sm" className="h-8 gap-2 rounded-full px-4">
                <HugeiconsIcon icon={FilterIcon} className="size-3.5" />Filtrar
              </Button>
            }
          />
          {isFiltered && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleFiltersChange([])}
              className="h-8 gap-2 rounded-full px-4 text-muted-foreground hover:text-foreground"
            >
              <HugeiconsIcon icon={FilterRemoveIcon} className="size-3.5" />Limpar filtros
            </Button>
          )}
        </div>

        {noResults ? (
          <EmptyState 
            isSearch={isFiltered} 
            onClear={() => handleFiltersChange([])} 
          />
        ) : (
          <>
            {layout === 'table'
              ? <TableView table={table} columnsCount={columns.length} />
              : <ListView table={table} selectedId={selectedId} agents={agents} currentUserId={currentUserId} />
            }
            <PaginationControls table={table} />
          </>
        )}
      </div>
    </>
  )
}

// ─── TableView ────────────────────────────────────────────────────────────────

function TableView({ table, columnsCount }: { table: any; columnsCount: number }) {
  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((group: any) => (
            <TableRow key={group.id}>
              {group.headers.map((header: any) => (
                <TableHead key={header.id} className={(header.column.columnDef.meta as any)?.className}>
                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows?.length
            ? table.getRowModel().rows.map((row: any) => (
              <TableRow
                key={row.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => (table.options.meta as any)?.onOpenTicket(row.original)}
              >
                {row.getVisibleCells().map((cell: any) => (
                  <TableCell key={cell.id} className={`py-4 ${(cell.column.columnDef.meta as any)?.className || ''}`}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
            : (
              <TableRow>
                <TableCell colSpan={columnsCount} className="h-24 text-center">Nenhum resultado.</TableCell>
              </TableRow>
            )}
        </TableBody>
      </Table>
    </div>
  )
}

// ─── ListView ─────────────────────────────────────────────────────────────────

function ListView({ table, selectedId, agents, currentUserId }: {
  table: any
  selectedId?: string
  agents?: Agent[]
  currentUserId?: string
}) {
  return (
    <div className="flex-1 overflow-auto border rounded-xl bg-card/30">
      <div className="flex flex-col">
        {table.getRowModel().rows?.length
          ? table.getRowModel().rows.map((row: any) => {
            const ticket = row.original as Ticket
            const config = statusMap[ticket.status] || { label: ticket.status, icon: null, variant: 'default' }
            const isSelected = selectedId === ticket.id
            return (
              <button
                key={row.id}
                onClick={() => (table.options.meta as any)?.onOpenTicket(ticket)}
                className={`flex flex-col items-start gap-2 border-b p-4 transition-colors hover:bg-muted/50 w-full text-left ${isSelected ? 'bg-muted/50 border-l-4 border-l-primary' : 'border-l-4 border-l-transparent'
                  }`}
              >
                <div className="flex w-full justify-between gap-2 items-start">
                    <div className="flex flex-col gap-1.5 min-w-0 flex-1 text-left">
                      <span className="font-semibold truncate text-foreground">{ticket.subject}</span>
                      <CategoryBadges categories={ticket.categories || []} />
                    </div>
                  <Badge variant={config.variant} className="text-[10px] px-2 py-0.5 shrink-0 font-semibold gap-1 rounded-full">
                    {config.icon && <span className="scale-75 shrink-0">{config.icon}</span>}
                    {config.label}
                  </Badge>
                </div>
                <div className="flex w-full items-center justify-between gap-4 mt-1">
                  <span className="text-xs text-muted-foreground truncate flex-1">{ticket.customer_email}</span>
                  
                  <div className="flex items-center gap-3 shrink-0">
                    {/* Inline agent display */}
                    {ticket.assigned_to_profile ? (
                      <div className="flex items-center gap-1.5">
                        <Avatar className="h-4 w-4">
                          <AvatarImage src={ticket.assigned_to_profile.avatar_url || ''} />
                          <AvatarFallback className="text-[8px]">
                            {ticket.assigned_to_profile.full_name?.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-[11px] font-medium text-muted-foreground">
                          {ticket.assigned_to_profile.full_name.split(' ')[0]}
                        </span>
                      </div>
                    ) : (
                      <span className="text-[10px] text-muted-foreground/60 italic">Não atribuído</span>
                    )}
                    <div className="text-[11px] text-muted-foreground font-medium">
                      <ClientSafeDate date={ticket.created_at} formatStr="dd/MM" />
                    </div>
                  </div>
                </div>
              </button>
            )
          })
          : <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">Nenhum resultado.</div>}
      </div>
    </div>
  )
}

// ─── PaginationControls ───────────────────────────────────────────────────────

function PaginationControls({ table }: { table: any }) {
  return (
    <div className="flex items-center justify-end space-x-2 py-4 px-1">
      <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} className="rounded-full h-8">
        Anterior
      </Button>
      <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} className="rounded-full h-8">
        Próximo
      </Button>
    </div>
  )
}

// ─── EmptyState ───────────────────────────────────────────────────────────────

function EmptyState({ isSearch, onClear }: { isSearch?: boolean; onClear?: () => void }) {
  return (
    <div className="flex flex-1 items-center justify-center p-8 min-h-[400px]">
      <Empty className="max-w-md">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <HugeiconsIcon 
              icon={isSearch ? FilterRemoveIcon : InboxIcon} 
              className="h-10 w-10 text-muted-foreground/40" 
            />
          </EmptyMedia>
          <EmptyTitle>{isSearch ? "Nenhum resultado encontrado" : "Caixa de entrada limpa"}</EmptyTitle>
          <EmptyDescription>
            {isSearch 
              ? "Não encontramos tickets com os filtros aplicados. Tente mudar os termos ou limpe para ver tudo."
              : "Não há novos chamados por aqui. Tudo em ordem!"}
          </EmptyDescription>
        </EmptyHeader>
        {isSearch && onClear && (
          <div className="flex justify-center mt-6">
            <Button variant="outline" onClick={onClear} className="rounded-full px-6">
              Limpar filtros
            </Button>
          </div>
        )}
      </Empty>
    </div>
  )
}
