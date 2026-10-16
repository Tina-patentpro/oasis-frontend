import { useCallback, useEffect, useRef, useState } from 'react'

import { isAbortLikeError } from '@/api/core/error-utils'
import { sessionService } from '@/api/services'
import type { WorkflowListItem } from '@/types/api'

import type { HistoryWorkflowItem } from './workspace-layout-types'

interface UseWorkspaceWorkflowListParams {
  fastBootEnabled: boolean
  downloadDialogOpen: boolean
}

function normalizeWorkflowItem(item: HistoryWorkflowItem): WorkflowListItem {
  return {
    ...item,
    inputs: item.inputs || {},
    response: item.response ?? {
      data: {} as Record<string, unknown>,
      task_id: '',
      workflow_run_id: '',
    },
  } as WorkflowListItem
}

export function useWorkspaceWorkflowList({
  fastBootEnabled,
  downloadDialogOpen,
}: UseWorkspaceWorkflowListParams): {
  workflows: WorkflowListItem[]
  loadWorkflows: (force?: boolean) => Promise<void>
} {
  const [workflows, setWorkflows] = useState<WorkflowListItem[]>([])
  const workflowAbortRef = useRef<AbortController | null>(null)
  const workflowLoadedRef = useRef(false)
  const workflowLoadingRef = useRef(false)

  const loadWorkflows = useCallback(async (force = false) => {
    if (workflowLoadingRef.current) {
      return
    }
    if (workflowLoadedRef.current && !force) {
      return
    }

    workflowLoadingRef.current = true
    workflowAbortRef.current?.abort()
    const controller = new AbortController()
    workflowAbortRef.current = controller

    try {
      const response = await sessionService.getWorkflowList(1, 50, {
        signal: controller.signal,
      })

      if (controller.signal.aborted) {
        return
      }

      workflowLoadedRef.current = true
      setWorkflows((response.item || []).map(normalizeWorkflowItem))
    } catch (error) {
      if (controller.signal.aborted || isAbortLikeError(error)) {
        return
      }
      workflowLoadedRef.current = false
      setWorkflows([])
    } finally {
      workflowLoadingRef.current = false
      if (workflowAbortRef.current === controller) {
        workflowAbortRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (fastBootEnabled) {
      return
    }
    void loadWorkflows()
  }, [fastBootEnabled, loadWorkflows])

  useEffect(() => {
    if (!downloadDialogOpen) {
      return
    }
    void loadWorkflows()
  }, [downloadDialogOpen, loadWorkflows])

  useEffect(() => {
    return () => {
      workflowAbortRef.current?.abort()
    }
  }, [])

  return {
    workflows,
    loadWorkflows,
  }
}
