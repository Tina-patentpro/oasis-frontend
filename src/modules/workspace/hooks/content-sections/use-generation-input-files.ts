import { useCallback, useMemo } from 'react'

import { aiService } from '@/api/services'
import { DESTS } from '@/constants'
import type { ApiDetail } from '@/types/api'

import {
  buildRejectedUploadFileMessage,
  filterSupportedUploadFiles,
} from './generation-upload-validation'
import {
  buildUploadedInputValue,
  getUploadSelectionState,
  parseUploadInputValue,
  type UploadActionMode,
} from './upload-input-value'

export function useGenerationInputFiles({
  apiDetail,
  ensureApiDetailLoaded,
  inputSections,
  notify,
  setInputSection,
}: {
  apiDetail: ApiDetail | null
  ensureApiDetailLoaded?: () => Promise<ApiDetail | null>
  inputSections: Record<string, string>
  notify: (message: string) => void
  setInputSection: (page: string, value: string) => void
}) {
  const destinationLabels = useMemo(() => {
    const map = new Map<string, string>()
    DESTS.forEach((dest) => map.set(dest.key, dest.title))
    return map
  }, [])

  return useCallback(
    async (
      files: FileList,
      destKey: string,
      type: 'file' | 'image',
      options?: { mode?: UploadActionMode },
    ) => {
      if (!files.length) {
        return
      }

      const label = destinationLabels.get(destKey) ?? '输入材料'

      let resolvedApiDetail = apiDetail
      if (!resolvedApiDetail && ensureApiDetailLoaded) {
        resolvedApiDetail = await ensureApiDetailLoaded()
      }

      try {
        const targetFieldType =
          resolvedApiDetail?.input_schema?.find((field) => field.en_name === destKey)?.type ??
          (type === 'image' ? 'image' : 'file')
        const existingValue = inputSections[destKey] ?? ''
        const existingFiles = parseUploadInputValue(existingValue)
        const uploadSelectionState = getUploadSelectionState(targetFieldType, existingFiles.length)
        const uploadMode = options?.mode ?? uploadSelectionState.nextMode

        if (files.length > uploadSelectionState.selectionLimit) {
          notify(`最多只能选择 ${uploadSelectionState.selectionLimit} 个文件`)
          return
        }

        const { acceptedFiles: filteredFiles, rejectedFiles } = filterSupportedUploadFiles(
          Array.from(files),
          type,
        )
        rejectedFiles.forEach((file) => {
          notify(buildRejectedUploadFileMessage(file))
        })

        if (filteredFiles.length === 0) {
          return
        }

        // 串行上传：降低后端在多文件场景下的瞬时并发压力，减少 500 失败概率
        const uploadedFiles: Array<{ url: string; mimeType: string }> = []
        for (const file of filteredFiles) {
          const url = await aiService.uploadFile(file)
          uploadedFiles.push({
            url,
            mimeType: file.type || '',
          })
        }

        setInputSection(
          destKey,
          buildUploadedInputValue({
            targetFieldType,
            existingValue,
            uploadedFiles,
            selectionLimit: uploadSelectionState.selectionLimit,
            maxFiles: uploadSelectionState.maxFiles,
            uploadMode,
          }),
        )

        notify(
          uploadMode === 'replace'
            ? `${type === 'image' ? '图片' : '文件'}已替换${label}`
            : `${type === 'image' ? '图片' : '文件'}已添加到${label}`,
        )
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : '未知错误'
        console.error('[useWorkspaceContentSections] 文件上传失败详情:', {
          error,
          destKey,
          apiDetailId: resolvedApiDetail?.id,
          inputSchema: resolvedApiDetail?.input_schema,
        })
        notify(`${type === 'image' ? '图片' : '文件'}上传失败: ${errorMsg}`)
      }
    },
    [apiDetail, destinationLabels, ensureApiDetailLoaded, inputSections, notify, setInputSection],
  )
}
