import { useCallback, type MutableRefObject } from 'react'

import type { WorkflowExecutionFile } from '@/types/api'
import { triggerDownload } from '@/utils/download'

export function useGenerationDownloadAction({
  generatedFilesRef,
  notify,
  onOpenDownloadSelector,
}: {
  generatedFilesRef: MutableRefObject<WorkflowExecutionFile[]>
  notify: (message: string) => void
  onOpenDownloadSelector?: () => void
}) {
  return useCallback(async (): Promise<void> => {
    const files = generatedFilesRef.current

    if (files.length === 0) {
      notify('暂无可下载文件')
      return
    }

    if (onOpenDownloadSelector) {
      onOpenDownloadSelector()
      return
    }

    for (const file of files) {
      if (file.url) {
        try {
          await triggerDownload(file.url, file.fileName)
        } catch (error) {
          console.error('[handleDownload] ✗ 下载失败:', file.fileName, error)
        }
      }
    }

    notify(`已开始下载 ${files.length} 个文件`)
  }, [generatedFilesRef, notify, onOpenDownloadSelector])
}
