import { sessionService } from '@/api/services'
import type { WorkflowListItem } from '@/types/api'

type WorkflowExportPageItem = {
  id: number
  api_name: string
  user_id: number
  folder_id: number
  created_at: string
}

type WorkflowExportPageResponse = {
  total: number
  item: WorkflowExportPageItem[]
}

type FetchWorkflowPage = (
  page: number,
  limit: number,
  options?: { signal?: AbortSignal },
) => Promise<WorkflowExportPageResponse>

interface LoadWorkflowExportItemsOptions {
  pageSize?: number
  maxPages?: number
  signal?: AbortSignal
  fetchPage?: FetchWorkflowPage
}

const DEFAULT_PAGE_SIZE = 50
const DEFAULT_MAX_PAGES = 100

function createAbortError(): Error {
  const error = new Error('Aborted')
  error.name = 'AbortError'
  return error
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw createAbortError()
  }
}

function toWorkflowListItem(item: WorkflowExportPageItem): WorkflowListItem {
  return {
    ...item,
    inputs: {},
    response: {
      data: {} as WorkflowListItem['response']['data'],
      task_id: '',
      workflow_run_id: '',
    },
  }
}

export async function loadWorkflowExportItems({
  pageSize = DEFAULT_PAGE_SIZE,
  maxPages = DEFAULT_MAX_PAGES,
  signal,
  fetchPage = sessionService.getWorkflowList.bind(sessionService),
}: LoadWorkflowExportItemsOptions = {}): Promise<WorkflowListItem[]> {
  const workflowsById = new Map<number, WorkflowListItem>()

  for (let page = 1; page <= maxPages; page += 1) {
    throwIfAborted(signal)

    const response = await fetchPage(page, pageSize, signal ? { signal } : undefined)

    throwIfAborted(signal)

    const pageItems = Array.isArray(response.item) ? response.item : []
    let newItemCount = 0

    pageItems.forEach((item) => {
      if (workflowsById.has(item.id)) {
        return
      }

      workflowsById.set(item.id, toWorkflowListItem(item))
      newItemCount += 1
    })

    if (pageItems.length < pageSize || newItemCount === 0) {
      break
    }
  }

  return Array.from(workflowsById.values())
}
