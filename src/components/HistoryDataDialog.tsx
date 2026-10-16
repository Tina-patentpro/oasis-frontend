import { useCallback, useEffect, useId, useMemo, useState } from 'react'

import { historyService } from '@/api/services'
import { useAsyncState } from '@/hooks/useAsyncState'
import type { HistoryDataItem, PaginatedResponse, HistorySearchParams } from '@/types/api'

import { Pagination } from './ui/Pagination'
import { SearchInput } from './ui/SearchInput'
import { AccessibleDialog } from './ui/feedback/AccessibleDialog'

interface HistoryDataDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (selectedData: string[], rawItems?: HistoryDataItem[]) => void
  themeColor: string
  fixedProjectId?: number | null
  fixedType?: string
  titleOverride?: string
}

export const HistoryDataDialog = ({
  isOpen,
  onClose,
  onConfirm,
  themeColor,
  fixedProjectId,
  fixedType,
  titleOverride,
}: HistoryDataDialogProps) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [keyword, setKeyword] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | string>(fixedType || 'all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const titleId = useId()
  const descriptionId = useId()
  const tableCaptionId = useId()

  const buildQueryParams = useCallback(
    (override?: HistorySearchParams): HistorySearchParams => ({
      keyword:
        override && Object.prototype.hasOwnProperty.call(override, 'keyword')
          ? override.keyword
          : keyword || undefined,
      type:
        override && Object.prototype.hasOwnProperty.call(override, 'type')
          ? override.type
          : fixedType || (typeFilter !== 'all' ? typeFilter : undefined),
      page: override?.page ?? page,
      pageSize: override?.pageSize ?? pageSize,
      projectId: fixedProjectId ?? undefined,
    }),
    [keyword, typeFilter, page, pageSize, fixedProjectId, fixedType],
  )

  const loadHistoryData = useCallback(
    async (...args: unknown[]): Promise<PaginatedResponse<HistoryDataItem>> => {
      const [params] = args as [HistorySearchParams | undefined]
      const effectiveParams = buildQueryParams(params)

      return await historyService.getHistoryData(effectiveParams)
    },
    [buildQueryParams],
  )

  const historyState = useAsyncState<PaginatedResponse<HistoryDataItem>>(loadHistoryData, {
    initialData: undefined,
  })
  const { data: stateData, isLoading: stateLoading, error: stateError, execute } = historyState

  // 组合查询参数
  const queryParams = useMemo<HistorySearchParams>(() => buildQueryParams(), [buildQueryParams])

  const safeExecuteHistory = useCallback(
    (params: HistorySearchParams) => {
      void execute(params).catch(() => undefined)
    },
    [execute],
  )

  // 打开弹窗或参数变化时加载数据
  useEffect(() => {
    if (!isOpen) {
      return
    }
    safeExecuteHistory(queryParams)
  }, [isOpen, queryParams, safeExecuteHistory])

  // 关闭时重置选择与分页
  useEffect(() => {
    if (isOpen) {
      return
    }
    let canceled = false
    queueMicrotask(() => {
      if (canceled) return
      setSelectedIds(new Set())
      setPage(1)
      setPageSize(10)
      setKeyword('')
      setTypeFilter(fixedType || 'all')
    })
    return () => {
      canceled = true
    }
  }, [isOpen, fixedType])

  // 当数据变化时过滤掉已删除的选择项
  useEffect(() => {
    if (!stateData) {
      return
    }
    let canceled = false
    queueMicrotask(() => {
      if (canceled) return
      setSelectedIds((prev) => {
        const validIds = new Set(stateData.items.map((item) => item.id))
        const next = new Set<string>()
        prev.forEach((id) => {
          if (validIds.has(id)) {
            next.add(id)
          }
        })
        return next
      })
    })
    return () => {
      canceled = true
    }
  }, [stateData])

  const currentData = stateData
  const items = currentData ? currentData.items : []
  const pagination = currentData?.pagination ?? {
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 0,
  }

  const typeOptions = useMemo(() => {
    // 固定只显示 workflow 和 chatflow 两种类型
    return ['all', 'workflow', 'chatflow']
  }, [])

  const dialogTitle = titleOverride || '历史资料'
  const dialogDescription =
    fixedType === 'workflow'
      ? '查询并勾选本项目下各个工作流生成的文件内容。'
      : '查询并勾选需要回填的历史内容，可一次导入多条。'

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const toggleAll = () => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(items.map((item) => item.id)))
    }
  }

  const handleConfirm = async () => {
    const selectedItems = items.filter((item) => selectedIds.has(item.id))
    if (selectedItems.length === 0) {
      onConfirm([])
      onClose()
      setSelectedIds(new Set())
      return
    }

    let dataSource = selectedItems

    // 直接使用列表数据，不再调用详情接口
    // 因为列表接口已经包含了 file_url 等必要信息
    // 且后端没有提供批量获取详情的接口，逐个获取详情的接口也不存在

    const combinedContent = dataSource
      .map(
        (item) =>
          `【${item.type ?? '未分类'}】${item.title}\n${item.content}\n日期：${item.date ?? '未知日期'}`,
      )
      .join('\n\n---\n\n')

    // 确保传递 dataSource 作为第二个参数
    onConfirm([combinedContent], dataSource)
    setSelectedIds(new Set())
    onClose()
  }

  const allSelected = selectedIds.size > 0 && selectedIds.size === items.length
  const someSelected = selectedIds.size > 0 && selectedIds.size < items.length

  const isLoading = stateLoading && isOpen
  const hasError = Boolean(stateError)

  const handleRetry = useCallback(() => {
    safeExecuteHistory(queryParams)
  }, [queryParams, safeExecuteHistory])

  return (
    <AccessibleDialog
      isOpen={isOpen}
      onClose={onClose}
      labelledBy={titleId}
      describedBy={descriptionId}
      wrapperClassName="items-start justify-center overflow-y-auto p-4"
      className="relative flex max-h-[calc(100dvh-2rem)] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
    >
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <div>
          <h2 id={titleId} className="text-lg font-semibold text-gray-900">
            {dialogTitle}
          </h2>
          <p id={descriptionId} className="text-xs text-gray-500 mt-1">
            {dialogDescription}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="h-8 w-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          aria-label="关闭历史资料弹窗"
        >
          ×
        </button>
      </div>

      <div className="px-6 py-4 border-b border-gray-100 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <SearchInput
            value={keyword}
            onChange={(value) => setKeyword(value)}
            onSearch={(value) => {
              setKeyword(value)
              setPage(1)
            }}
            aria-label="搜索历史资料"
            placeholder="按标题、内容或标签搜索"
            disabled={isLoading}
            debounceMs={400}
          />

          <div className="flex items-center gap-3">
            {!fixedType && (
              <select
                value={typeFilter}
                onChange={(event) => {
                  setTypeFilter(event.target.value)
                  setPage(1)
                }}
                aria-label="筛选历史资料类型"
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
              >
                {typeOptions.map((type) => (
                  <option key={type} value={type}>
                    {type === 'all' ? '全部类型' : type}
                  </option>
                ))}
              </select>
            )}
            {hasError && (
              <div
                role="alert"
                className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
              >
                <span>历史资料加载失败，请稍后重试。</span>
                <button
                  type="button"
                  onClick={handleRetry}
                  disabled={isLoading}
                  aria-label="重试加载历史资料"
                  className="rounded-md border border-red-200 bg-white px-2 py-1 font-medium text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  重试
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div
        className="relative min-h-0 flex-1 overflow-y-auto px-6 py-4"
        role="region"
        aria-labelledby={tableCaptionId}
        aria-busy={isLoading}
      >
        <table className="w-full text-left border-collapse">
          <caption id={tableCaptionId} className="sr-only">
            历史资料列表
          </caption>
          <thead>
            <tr className="text-xs text-gray-500 uppercase">
              <th className="w-10">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(ref) => {
                    if (ref) {
                      ref.indeterminate = someSelected
                    }
                  }}
                  onChange={toggleAll}
                  disabled={isLoading || items.length === 0}
                  aria-label={items.length === 0 ? '当前页没有可选历史资料' : '全选当前页历史资料'}
                  className="accent-blue-500"
                />
              </th>
              <th className="py-2">标题</th>
              <th className="py-2">日期</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr
                key={item.id}
                className="border-t border-gray-100 text-sm text-gray-700 hover:bg-gray-50 transition"
              >
                {(() => {
                  const checkboxId = `history-data-${item.id.replace(/[^A-Za-z0-9_-]/g, '_')}`

                  return (
                    <>
                      <td className="py-3 align-top">
                        <input
                          id={checkboxId}
                          type="checkbox"
                          checked={selectedIds.has(item.id)}
                          onChange={() => toggleSelection(item.id)}
                          aria-label={`选择历史资料：${item.title}`}
                          className="accent-blue-500"
                        />
                      </td>
                      <td className="py-3 pr-4">
                        <label htmlFor={checkboxId} className="block max-w-md cursor-pointer">
                          <span
                            className="block truncate font-medium text-gray-900"
                            title={item.title}
                          >
                            {item.title}
                          </span>
                          {item.type && (
                            <span className="mt-1 block text-xs text-gray-500">
                              <span className="inline-block rounded-full bg-blue-50 px-2 py-0.5 text-blue-600">
                                {item.type}
                              </span>
                            </span>
                          )}
                        </label>
                      </td>
                    </>
                  )
                })()}
                <td className="py-3 text-xs text-gray-600 whitespace-nowrap">{item.date}</td>
              </tr>
            ))}

            {items.length === 0 && !isLoading && (
              <tr>
                <td colSpan={3} className="py-8 text-center text-sm text-gray-500">
                  暂无符合条件的历史数据
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {isLoading && (
          <div
            className="absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur-sm"
            role="status"
            aria-live="polite"
          >
            <div
              className="h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"
              aria-hidden="true"
            />
            <span className="ml-3 text-sm font-medium text-blue-700">正在加载历史资料…</span>
          </div>
        )}
      </div>

      <div className="px-6 py-4 border-t border-gray-100 flex flex-col md:flex-row md:items-center md:justify-between gap-3 bg-gray-50">
        <Pagination
          currentPage={pagination.page}
          totalPages={pagination.totalPages}
          pageSize={pagination.pageSize}
          total={pagination.total}
          onPageChange={(nextPage) => setPage(nextPage)}
          onPageSizeChange={(nextSize) => {
            setPageSize(nextSize)
            setPage(1)
          }}
          className="w-full md:w-auto"
        />

        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500">
            已选择 {selectedIds.size} / {items.length} 条
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={selectedIds.size === 0}
            className="px-4 py-2 rounded-lg text-sm text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed"
            style={{
              backgroundColor: selectedIds.size === 0 ? '#9CA3AF' : themeColor,
              opacity: selectedIds.size === 0 ? 0.6 : 1,
            }}
          >
            导入所选
          </button>
        </div>
      </div>
    </AccessibleDialog>
  )
}

HistoryDataDialog.displayName = 'HistoryDataDialog'
