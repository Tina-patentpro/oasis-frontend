import { useCallback, type Dispatch, type SetStateAction } from 'react'

import { ApiError } from '@/api/errors'
import type { ApiDetail, WorkflowExecutionFile } from '@/types/api'

import { reduceGenerationState, type GenerationStatus } from './generation-state'
import { getMissingRequiredFieldLabels } from './input-sections'

type GenerationRequestState = {
  isLoading: boolean
  execute: (preloadedApiDetail?: ApiDetail | null) => Promise<unknown>
}

export function useGenerationSubmitAction({
  apiDetail,
  ensureApiDetailLoaded,
  generationRequestState,
  generationStatus,
  hasAnyInput,
  inputSections,
  isPreflightingGenerate,
  missingRequiredFieldLabels,
  notify,
  setGenerated,
  setGeneratedFiles,
  setGenerationStatus,
  setIsPreflightingGenerate,
}: {
  apiDetail: ApiDetail | null
  ensureApiDetailLoaded?: () => Promise<ApiDetail | null>
  generationRequestState: GenerationRequestState
  generationStatus: GenerationStatus
  hasAnyInput: boolean
  inputSections: Record<string, string>
  isPreflightingGenerate: boolean
  missingRequiredFieldLabels: string[]
  notify: (message: string) => void
  setGenerated: (content: string) => void
  setGeneratedFiles: Dispatch<SetStateAction<WorkflowExecutionFile[]>>
  setGenerationStatus: Dispatch<SetStateAction<GenerationStatus>>
  setIsPreflightingGenerate: Dispatch<SetStateAction<boolean>>
}) {
  return useCallback((): void => {
    if (!hasAnyInput) {
      notify('请输入标题或材料')
      return
    }
    if (
      isPreflightingGenerate ||
      generationRequestState.isLoading ||
      generationStatus === 'queued' ||
      generationStatus === 'running'
    ) {
      return
    }

    if (missingRequiredFieldLabels.length > 0) {
      notify(`请先补充必填项：${missingRequiredFieldLabels.join('、')}`)
      return
    }

    setIsPreflightingGenerate(true)
    void (async () => {
      try {
        let resolvedApiDetail = apiDetail
        if (!resolvedApiDetail && ensureApiDetailLoaded) {
          resolvedApiDetail = await ensureApiDetailLoaded()
        }

        const resolvedMissingRequiredFieldLabels = getMissingRequiredFieldLabels(
          resolvedApiDetail?.input_schema,
          inputSections,
        )
        if (resolvedMissingRequiredFieldLabels.length > 0) {
          notify(`请先补充必填项：${resolvedMissingRequiredFieldLabels.join('、')}`)
          return
        }

        setGenerationStatus(
          (current) => reduceGenerationState({ status: current }, { type: 'START' }).status,
        )
        setGenerated('')
        setGeneratedFiles([])
        await generationRequestState.execute(resolvedApiDetail)
      } catch (error) {
        const isGatewayTimeout = error instanceof ApiError && error.statusCode === 504
        if (isGatewayTimeout) {
          console.warn('[useGenerationActions] 提交通道超时，任务继续后台轮询', error)
        } else {
          console.error('生成失败:', error)
        }
      } finally {
        setIsPreflightingGenerate(false)
      }
    })()
  }, [
    apiDetail,
    ensureApiDetailLoaded,
    generationRequestState,
    generationStatus,
    hasAnyInput,
    inputSections,
    isPreflightingGenerate,
    missingRequiredFieldLabels,
    notify,
    setGenerated,
    setGeneratedFiles,
    setGenerationStatus,
    setIsPreflightingGenerate,
  ])
}
