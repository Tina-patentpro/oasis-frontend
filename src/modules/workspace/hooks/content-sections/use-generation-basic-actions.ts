import { useCallback, type Dispatch, type MutableRefObject, type SetStateAction } from 'react'

import type { WorkflowExecutionFile } from '@/types/api'

import { reduceGenerationState, type GenerationStatus } from './generation-state'
import type { SessionTrackingContext } from './session-tracking-context'

type CreateTimingState = {
  token: string
  requestStartedAt: number
  createResponseAt: number
}

export function useGenerationBasicActions({
  combinedInput,
  createTimingRef,
  generated,
  latestSessionTrackingContextRef,
  latestTaskKeyRef,
  notify,
  resetInputSections,
  saveInputHistory,
  setGenerated,
  setGeneratedFiles,
  setGenerationStatus,
  setSelectedSessionId,
  stopPolling,
  undoInputSections,
}: {
  combinedInput: string
  createTimingRef: MutableRefObject<CreateTimingState | null>
  generated: string
  latestSessionTrackingContextRef: MutableRefObject<SessionTrackingContext | null>
  latestTaskKeyRef: MutableRefObject<string | null>
  notify: (message: string) => void
  resetInputSections: () => void
  saveInputHistory: () => void
  setGenerated: (content: string) => void
  setGeneratedFiles: Dispatch<SetStateAction<WorkflowExecutionFile[]>>
  setGenerationStatus: Dispatch<SetStateAction<GenerationStatus>>
  setSelectedSessionId: (id: number | null) => void
  stopPolling: () => void
  undoInputSections: () => void
}) {
  const copyInput = useCallback((): void => {
    if (!combinedInput.trim()) {
      notify('暂无可复制内容')
      return
    }
    navigator.clipboard?.writeText(combinedInput).then(() => notify('已复制输入文本'))
  }, [combinedInput, notify])

  const clearAllInputs = useCallback((): void => {
    saveInputHistory()
    resetInputSections()
    notify('已清空所有章节内容，使用 Ctrl+Z 可恢复')
  }, [notify, resetInputSections, saveInputHistory])

  const startNewSession = useCallback((): void => {
    saveInputHistory()
    resetInputSections()
    setSelectedSessionId(null)
    setGenerated('')
    setGeneratedFiles([])
    latestTaskKeyRef.current = null
    latestSessionTrackingContextRef.current = null
    createTimingRef.current = null
    stopPolling()
    setGenerationStatus(
      (current) => reduceGenerationState({ status: current }, { type: 'RESET' }).status,
    )
    notify('已开启新会话，输入与输出已清空')
  }, [
    createTimingRef,
    latestSessionTrackingContextRef,
    latestTaskKeyRef,
    notify,
    resetInputSections,
    saveInputHistory,
    setGenerated,
    setGeneratedFiles,
    setGenerationStatus,
    setSelectedSessionId,
    stopPolling,
  ])

  const undoInputs = useCallback((): void => {
    undoInputSections()
    notify('已撤销')
  }, [notify, undoInputSections])

  const copyGenerated = useCallback((): void => {
    if (!generated) {
      return
    }
    navigator.clipboard?.writeText(generated).then(() => notify('已复制生成内容'))
  }, [generated, notify])

  return {
    clearAllInputs,
    copyGenerated,
    copyInput,
    startNewSession,
    undoInputs,
  }
}
