import { useCallback, type Dispatch, type MutableRefObject, type SetStateAction } from 'react'

import type { WorkflowExecutionFile } from '@/types/api'
import { timestamp, uid } from '@/utils/helpers'

import { reduceGenerationState, type GenerationStatus } from './generation-state'
import type { SessionTrackingContext } from './session-tracking-context'

export function useGenerationAsyncCompletion({
  addVersion,
  emitSessionTrackingHint,
  latestSessionTrackingContextRef,
  notify,
  setGenerated,
  setGeneratedFiles,
  setGenerationStatus,
}: {
  addVersion: (version: { id: string; time: string; text: string }) => void
  emitSessionTrackingHint: (hint: SessionTrackingContext & { phase: 'completed' }) => void
  latestSessionTrackingContextRef: MutableRefObject<SessionTrackingContext | null>
  notify: (message: string) => void
  setGenerated: (content: string) => void
  setGeneratedFiles: Dispatch<SetStateAction<WorkflowExecutionFile[]>>
  setGenerationStatus: Dispatch<SetStateAction<GenerationStatus>>
}) {
  return useCallback(
    (payload: { text: string; files: WorkflowExecutionFile[] }) => {
      const normalizedText =
        typeof payload.text === 'string' && payload.text.trim().length > 0
          ? payload.text
          : '生成完成，结果已就绪。'

      const normalizedFiles = Array.isArray(payload.files)
        ? payload.files.filter((file): file is WorkflowExecutionFile => Boolean(file))
        : []

      setGenerated(normalizedText)
      setGeneratedFiles(normalizedFiles)
      setGenerationStatus(
        (current) => reduceGenerationState({ status: current }, { type: 'SUCCESS' }).status,
      )
      addVersion({ id: uid(), time: timestamp(), text: normalizedText })
      notify('生成完成')

      if (latestSessionTrackingContextRef.current) {
        emitSessionTrackingHint({
          ...latestSessionTrackingContextRef.current,
          phase: 'completed',
        })
      }
    },
    [
      addVersion,
      emitSessionTrackingHint,
      latestSessionTrackingContextRef,
      notify,
      setGenerated,
      setGeneratedFiles,
      setGenerationStatus,
    ],
  )
}
