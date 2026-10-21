'use client'

import * as React from 'react'
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, ChevronsUpDown, RotateCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './button'
import { EmptyState } from './empty-state'
import { SkeletonTable } from './skeleton'

export type Column<T> = {
  /** Stable identifier, also used as the React key. */
  id: string
  header: React.ReactNode
  /** Cell renderer. */
  cell: (row: T) => React.ReactNode
  /** Enables sorting by returning a primitive for the row. */
  sortValue?: (row: T) => string | number | null | undefined
  align?: 'left' | 'right' | 'center'
  className?: string
  headerClassName?: string
  /** Hide below the `md` breakpoint to keep mobile tables readable. */
  hideOnMobile?: boolean
}

type DataTableProps<T> = {
  data: T[]
  columns: Column<T>[]
  getRowId: (row: T) => string
  loading?: boolean
  error?: string | null
  onRetry?: () => void
  emptyTitle?: string
  emptyDescription?: string
  emptyAction?: React.ReactNode
  onRowClick?: (row: T) => void
  /** Enables client-side pagination. Omit to render every row. */
  pageSize?: number
  /** Rendered above the table (filters, search, actions). */
  toolbar?: React.ReactNode
  caption?: string
  dense?: boolean
  className?: string
}

const alignClass = {
  left: 'text-left',
  right: 'text-right',
  center: 'text-center',
}

type SortState = { columnId: string; direction: 'asc' | 'desc' } | null

export function DataTable<T>({
  data,
  columns,
  getRowId,
  loading = false,
  error = null,
  onRetry,
  emptyTitle = 'Nothing here yet',
  emptyDescription = 'Records will appear here once data is available.',
  emptyAction,
  onRowClick,
  pageSize,
  toolbar,
  caption,
  dense = false,
  className,
}: DataTableProps<T>) {
  const [sort, setSort] = React.useState<SortState>(null)
  const [page, setPage] = React.useState(0)

  React.useEffect(() => {
    setPage(0)
  }, [data.length, pageSize])

  const sorted = React.useMemo(() => {
    if (!sort) return data
    const column = columns.find((candidate) => candidate.id === sort.columnId)
    if (!column?.sortValue) return data
    const factor = sort.direction === 'asc' ? 1 : -1
    return [...data].sort((a, b) => {
      const left = column.sortValue!(a)
      const right = column.sortValue!(b)
      if (left === right) return 0
      if (left === null || left === undefined) return 1
      if (right === null || right === undefined) return -1
      if (typeof left === 'number' && typeof right === 'number') return (left - right) * factor
      return String(left).localeCompare(String(right), undefined, { numeric: true }) * factor
    })
  }, [data, sort, columns])

  const pageCount = pageSize ? Math.max(1, Math.ceil(sorted.length / pageSize)) : 1
  const currentPage = Math.min(page, pageCount - 1)
  const visible = pageSize
    ? sorted.slice(currentPage * pageSize, currentPage * pageSize + pageSize)
    : sorted

  const toggleSort = (column: Column<T>) => {
    if (!column.sortValue) return
    setSort((previous) => {
      if (previous?.columnId !== column.id) return { columnId: column.id, direction: 'asc' }
      if (previous.direction === 'asc') return { columnId: column.id, direction: 'desc' }
      return null
    })
  }

  const rowPadding = dense ? 'px-3 py-2' : 'px-4 py-3'

  return (
    <div className={cn('overflow-hidden rounded-xl border border-border bg-card shadow-card', className)}>
      {toolbar ? <div className="border-b border-border p-3">{toolbar}</div> : null}

      {loading ? (
        <div className="p-4">
          <SkeletonTable rows={6} columns={Math.min(columns.length, 5)} />
        </div>
      ) : error ? (
        <div className="p-4">
          <EmptyState
            icon={RotateCw}
            title="Could not load data"
            description={error}
            compact
            action={
              onRetry ? (
                <Button size="sm" variant="outline" onClick={onRetry}>
                  <RotateCw className="h-3.5 w-3.5" />
                  Retry
                </Button>
              ) : null
            }
          />
        </div>
      ) : visible.length === 0 ? (
        <div className="p-4">
          <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} compact />
        </div>
      ) : (
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            {caption ? <caption className="sr-only">{caption}</caption> : null}
            <thead>
              <tr className="border-b border-border bg-muted/40">
                {columns.map((column) => {
                  const isSorted = sort?.columnId === column.id
                  const SortIcon = !isSorted ? ChevronsUpDown : sort?.direction === 'asc' ? ArrowUp : ArrowDown
                  return (
                    <th
                      key={column.id}
                      scope="col"
                      aria-sort={
                        column.sortValue
                          ? isSorted
                            ? sort?.direction === 'asc'
                              ? 'ascending'
                              : 'descending'
                            : 'none'
                          : undefined
                      }
                      className={cn(
                        'whitespace-nowrap px-4 py-2.5 text-2xs font-semibold uppercase tracking-[0.08em] text-muted-foreground',
                        alignClass[column.align ?? 'left'],
                        column.hideOnMobile && 'hidden md:table-cell',
                        column.headerClassName,
                      )}
                    >
                      {column.sortValue ? (
                        <button
                          type="button"
                          onClick={() => toggleSort(column)}
                          className={cn(
                            'inline-flex items-center gap-1 rounded transition-colors hover:text-foreground',
                            isSorted && 'text-foreground',
                            column.align === 'right' && 'flex-row-reverse',
                          )}
                        >
                          {column.header}
                          <SortIcon className="h-3 w-3 opacity-50" aria-hidden="true" />
                        </button>
                      ) : (
                        column.header
                      )}
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => (
                <tr
                  key={getRowId(row)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  onKeyDown={
                    onRowClick
                      ? (event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault()
                            onRowClick(row)
                          }
                        }
                      : undefined
                  }
                  tabIndex={onRowClick ? 0 : undefined}
                  role={onRowClick ? 'button' : undefined}
                  className={cn(
                    'border-b border-border/70 last:border-0 transition-colors',
                    onRowClick && 'cursor-pointer hover:bg-accent/50 focus-visible:bg-accent/50',
                  )}
                >
                  {columns.map((column) => (
                    <td
                      key={column.id}
                      className={cn(
                        rowPadding,
                        'align-middle text-foreground',
                        alignClass[column.align ?? 'left'],
                        column.hideOnMobile && 'hidden md:table-cell',
                        column.className,
                      )}
                    >
                      {column.cell(row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pageSize && !loading && !error && sorted.length > pageSize ? (
        <div className="flex items-center justify-between gap-2 border-t border-border px-4 py-2.5">
          <p className="text-2xs text-muted-foreground tabular">
            {currentPage * pageSize + 1}–{Math.min((currentPage + 1) * pageSize, sorted.length)} of{' '}
            {sorted.length}
          </p>
          <div className="flex items-center gap-1">
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={() => setPage((value) => Math.max(0, value - 1))}
              disabled={currentPage === 0}
              aria-label="Previous page"
            >
              <ChevronLeft />
            </Button>
            <span className="px-1 text-2xs text-muted-foreground tabular">
              {currentPage + 1} / {pageCount}
            </span>
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={() => setPage((value) => Math.min(pageCount - 1, value + 1))}
              disabled={currentPage >= pageCount - 1}
              aria-label="Next page"
            >
              <ChevronRight />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
