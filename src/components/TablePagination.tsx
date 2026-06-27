import { useState, useMemo } from 'react'

interface TablePaginationProps {
  page: number
  totalItems: number
  itemsPerPage: number
  onPageChange: (page: number) => void
  showInfo?: boolean
}

export function TablePagination({ page, totalItems, itemsPerPage, onPageChange, showInfo = true }: TablePaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage))

  const pages = useMemo(() => {
    const result: (number | '...')[] = []
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) result.push(i)
    } else {
      result.push(1)
      if (page > 3) result.push('...')
      const start = Math.max(2, page - 1)
      const end = Math.min(totalPages - 1, page + 1)
      for (let i = start; i <= end; i++) result.push(i)
      if (page < totalPages - 2) result.push('...')
      result.push(totalPages)
    }
    return result
  }, [page, totalPages])

  if (totalPages <= 1) return null

  return (
    <div className="tp-pagination">
      {showInfo && (
        <span className="tp-info">
          {totalItems} registro{totalItems !== 1 ? 's' : ''}
        </span>
      )}
      <div className="tp-pages">
        <button className="tp-btn" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          <i className="icon-chevron-left icon-xs" />
        </button>
        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`dots-${i}`} className="tp-dots">...</span>
          ) : (
            <button
              key={p}
              className={`tp-page-btn ${p === page ? 'active' : ''}`}
              onClick={() => onPageChange(p)}
            >
              {p}
            </button>
          )
        )}
        <button className="tp-btn" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
          <i className="icon-chevron-right icon-xs" />
        </button>
      </div>
    </div>
  )
}

export function useClientPagination<T>(items: T[], itemsPerPage: number) {
  const [page, setPage] = useState(1)

  const paginatedItems = useMemo(() => {
    const start = (page - 1) * itemsPerPage
    return items.slice(start, start + itemsPerPage)
  }, [items, page, itemsPerPage])

  const totalItems = items.length

  return { page, setPage, paginatedItems, totalItems }
}
