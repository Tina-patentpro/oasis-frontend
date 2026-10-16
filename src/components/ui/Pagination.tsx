import React from 'react'
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'

interface PaginationProps {
  currentPage: number
  totalPages: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
  onPageSizeChange?: (pageSize: number) => void
  pageSizeOptions?: number[]
  showPageSizeSelector?: boolean
  showTotalCount?: boolean
  className?: string
}

const DEFAULT_PAGE_SIZE_OPTIONS = [10, 20, 50, 100]

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  showPageSizeSelector = true,
  showTotalCount = true,
  className = '',
}) => {
  const startItem = total === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const endItem = Math.min(currentPage * pageSize, total)

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      onPageChange(page)
    }
  }

  const handlePageSizeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newSize = Number(event.target.value)
    onPageSizeChange?.(newSize)
  }

  const getPageNumbers = (): Array<number | string> => {
    const delta = 2
    const pages: Array<number | string> = [1]

    for (
      let i = Math.max(2, currentPage - delta);
      i <= Math.min(totalPages - 1, currentPage + delta);
      i += 1
    ) {
      pages.push(i)
    }

    if (currentPage - delta > 2) {
      pages.splice(1, 0, '…')
    }

    if (currentPage + delta < totalPages - 1) {
      pages.push('…')
    }

    if (totalPages > 1) {
      pages.push(totalPages)
    }

    return Array.from(new Set(pages))
  }

  const pageNumbers = getPageNumbers()
  const containerClassName = className
    ? `flex items-center justify-between gap-4 ${className}`
    : 'flex items-center justify-between gap-4'

  return (
    <div className={containerClassName}>
      <div className="flex items-center gap-3">
        {showTotalCount && (
          <span className="text-sm text-gray-600">
            共 {total} 条，显示第 {startItem}-{endItem} 条
          </span>
        )}

        {showPageSizeSelector && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">每页</span>
            <select
              aria-label="每页条数"
              value={pageSize}
              onChange={handlePageSizeChange}
              className="rounded-md border border-gray-300 px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {pageSizeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <span className="text-sm text-gray-600">条</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => handlePageChange(1)}
          disabled={currentPage === 1}
          className="p-2 text-gray-600 transition-colors enabled:hover:text-emerald-600 disabled:opacity-40"
          aria-label="第一页"
        >
          <ChevronLeftIcon className="h-4 w-4" />
          <ChevronLeftIcon className="h-4 w-4 -ml-3" />
        </button>

        <button
          type="button"
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-2 text-gray-600 transition-colors enabled:hover:text-emerald-600 disabled:opacity-40"
          aria-label="上一页"
        >
          <ChevronLeftIcon className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-1">
          {pageNumbers.map((page, index) =>
            typeof page === 'number' ? (
              <button
                type="button"
                key={page}
                onClick={() => handlePageChange(page)}
                className={`h-9 w-9 rounded-md border text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                  page === currentPage
                    ? 'border-emerald-500 bg-emerald-500 text-white'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {page}
              </button>
            ) : (
              <span key={`ellipsis-${index}`} className="px-2 text-gray-500">
                {page}
              </span>
            ),
          )}
        </div>

        <button
          type="button"
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-2 text-gray-600 transition-colors enabled:hover:text-emerald-600 disabled:opacity-40"
          aria-label="下一页"
        >
          <ChevronRightIcon className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => handlePageChange(totalPages)}
          disabled={currentPage === totalPages}
          className="p-2 text-gray-600 transition-colors enabled:hover:text-emerald-600 disabled:opacity-40"
          aria-label="最后一页"
        >
          <ChevronRightIcon className="h-4 w-4" />
          <ChevronRightIcon className="h-4 w-4 ml-3" />
        </button>
      </div>
    </div>
  )
}

Pagination.displayName = 'Pagination'
