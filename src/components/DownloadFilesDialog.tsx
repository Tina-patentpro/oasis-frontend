import { useState, useCallback, useEffect, useRef, useId, type ReactElement } from 'react'

import { AccessibleDialog } from '@/components/ui/feedback/AccessibleDialog'
import { EXPORT_FORMATS, type DownloadProgress } from '@/utils/download'
import type { ExportOptions } from '@/utils/exportUtils'
import type { Instruction } from '@/api/services/instruction.service'
import { instructionService } from '@/api/services/instruction.service'
import {
  buildFileListFromData,
  resolveExportErrorMessage,
} from './download-files-dialog/DownloadFilesDialog.helpers'
import {
  buildExportTaskOutcome,
  runSelectedDownload,
} from './download-files-dialog/DownloadFilesDialog.export-actions'
import {
  DownloadDialogFooter,
  DownloadDialogHeader,
  DownloadExportOptions,
  DownloadItemsList,
  DownloadProgressPanel,
} from './download-files-dialog/DownloadFilesDialog.sections'
import type {
  DownloadFilesDialogProps,
  FileItem,
} from './download-files-dialog/DownloadFilesDialog.types'

export function DownloadFilesDialog({
  isOpen,
  onClose,
  onDownload,
  themeColor,
  backgroundColor,
  exportType = 'files',
  isLoading = false,
  data,
}: DownloadFilesDialogProps): ReactElement | null {
  // Note: sessionId and projectId are reserved for future use
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set())
  const [selectedFormat, setSelectedFormat] = useState<keyof typeof EXPORT_FORMATS>('json')
  const [compressFiles, setCompressFiles] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState<DownloadProgress | null>(null)
  const [exportSuccessHint, setExportSuccessHint] = useState<string | null>(null)
  const [fileList, setFileList] = useState<FileItem[]>([])
  const [includeAttachments, setIncludeAttachments] = useState(true)
  const [instructions, setInstructions] = useState<Instruction[]>([])
  const [instructionsLoading, setInstructionsLoading] = useState(false)
  const [instructionsError, setInstructionsError] = useState<string | null>(null)
  const [instructionsReloadToken, setInstructionsReloadToken] = useState(0)
  const previousFormatRef = useRef<keyof typeof EXPORT_FORMATS>('json')
  const forcedZipRef = useRef(false)
  const hasAutoSelectedOnOpenRef = useRef(false)
  const autoCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const exportRunIdRef = useRef(0)
  const isOpenRef = useRef(isOpen)
  const titleId = useId()
  const descriptionId = useId()

  const clearAutoCloseTimer = useCallback(() => {
    if (autoCloseTimerRef.current) {
      clearTimeout(autoCloseTimerRef.current)
      autoCloseTimerRef.current = null
    }
  }, [])

  useEffect(() => {
    isOpenRef.current = isOpen
    if (!isOpen) {
      exportRunIdRef.current += 1
      clearAutoCloseTimer()
    }
  }, [clearAutoCloseTimer, isOpen])

  useEffect(
    () => () => {
      isOpenRef.current = false
      exportRunIdRef.current += 1
      clearAutoCloseTimer()
    },
    [clearAutoCloseTimer],
  )

  // 根据导出类型生成文件列表
  useEffect(() => {
    if (!isOpen) {
      hasAutoSelectedOnOpenRef.current = false
      return
    }

    const files = buildFileListFromData(exportType, data)
    setFileList(files)
    if (exportType === 'files' && files.length > 0 && !hasAutoSelectedOnOpenRef.current) {
      setSelectedFiles(new Set(files.map((file) => file.id)))
      hasAutoSelectedOnOpenRef.current = true
    }
  }, [isOpen, exportType, data])

  // 加载指令库数据
  useEffect(() => {
    if (!isOpen || exportType !== 'instructions') return

    const controller = new AbortController()
    const loadInstructions = async () => {
      setInstructionsLoading(true)
      setInstructionsError(null)
      try {
        const allInstructions = await instructionService.getAllInstructionsForDownload({
          signal: controller.signal,
        })
        if (controller.signal.aborted) return
        // 合并所有类型的指令
        const merged = [
          ...(allInstructions[1] || []),
          ...(allInstructions[2] || []),
          ...(allInstructions[3] || []),
        ]
        // 按创建时间倒序排序
        merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        setInstructions(merged)
      } catch (error) {
        if (controller.signal.aborted) return
        console.error('加载指令库失败:', error)
        setInstructions([])
        setInstructionsError('加载指令库失败，请重试')
      } finally {
        if (!controller.signal.aborted) {
          setInstructionsLoading(false)
        }
      }
    }

    void loadInstructions()
    return () => {
      controller.abort()
    }
  }, [isOpen, exportType, instructionsReloadToken])

  useEffect(() => {
    if (!isOpen || exportType === 'files') {
      return
    }

    if (compressFiles && selectedFormat !== 'zip') {
      previousFormatRef.current = selectedFormat
      forcedZipRef.current = true
      setSelectedFormat('zip')
      return
    }

    if (!compressFiles && forcedZipRef.current && selectedFormat === 'zip') {
      forcedZipRef.current = false
      setSelectedFormat(previousFormatRef.current ?? 'json')
    }
  }, [compressFiles, exportType, isOpen, selectedFormat])

  const handleClose = useCallback(() => {
    exportRunIdRef.current += 1
    clearAutoCloseTimer()
    setSelectedFiles(new Set())
    setExportProgress(null)
    setExportSuccessHint(null)
    setIsExporting(false)
    setCompressFiles(false)
    setIncludeAttachments(true)
    setSelectedFormat('json')
    previousFormatRef.current = 'json'
    forcedZipRef.current = false
    onClose()
  }, [clearAutoCloseTimer, onClose])

  const handleDownload = useCallback(async () => {
    if (selectedFiles.size === 0) return

    clearAutoCloseTimer()
    const runId = exportRunIdRef.current + 1
    exportRunIdRef.current = runId
    const isCurrentRun = () => exportRunIdRef.current === runId && isOpenRef.current

    setIsExporting(true)
    setExportSuccessHint(null)
    let shouldAutoClose = false
    let successHint: string | null = null

    try {
      const exportOptions: ExportOptions = {
        format: selectedFormat,
        compress: compressFiles,
        includeAttachments,
        onProgress: (progress: DownloadProgress) => {
          if (isCurrentRun()) {
            setExportProgress(progress)
          }
        },
      }

      const downloadResult = await runSelectedDownload({
        exportType,
        data,
        fileList,
        selectedFiles,
        exportOptions,
        setExportProgress: (progress) => {
          if (isCurrentRun()) {
            setExportProgress(progress)
          }
        },
      })

      if (!isCurrentRun()) return

      if (downloadResult.exportTask) {
        const taskOutcome = buildExportTaskOutcome(
          downloadResult.exportTask,
          downloadResult.successHint,
        )

        if (taskOutcome.failed) {
          setExportProgress(taskOutcome.progress)
          return
        }

        if (taskOutcome.completed) {
          setExportProgress(taskOutcome.progress)
          successHint = taskOutcome.successHint
          if (successHint) {
            setExportSuccessHint(successHint)
          }
          onDownload?.(downloadResult.completedSelectedFiles)
          shouldAutoClose = true
        }
      }

      if (downloadResult.shouldNotifyFilesDownload) {
        onDownload?.(selectedFiles)
      }

      if (downloadResult.shouldAutoClose) {
        shouldAutoClose = true
      }
    } catch (error) {
      if (!isCurrentRun()) return
      setExportProgress({
        loaded: 0,
        total: 0,
        percentage: 0,
        status: 'error',
        error: resolveExportErrorMessage(error),
      })
    } finally {
      if (isCurrentRun()) {
        setIsExporting(false)
        // 仅成功时延迟关闭对话框，失败时保留重试入口
        if (shouldAutoClose) {
          autoCloseTimerRef.current = setTimeout(
            () => {
              autoCloseTimerRef.current = null
              if (isCurrentRun()) {
                handleClose()
              }
            },
            successHint ? 4000 : 2000,
          )
        }
      }
    }
  }, [
    selectedFiles,
    selectedFormat,
    compressFiles,
    includeAttachments,
    exportType,
    data,
    fileList,
    onDownload,
    handleClose,
    clearAutoCloseTimer,
  ])

  const toggleFileSelection = useCallback(
    (fileId: string, checked: boolean) => {
      const newSet = new Set(selectedFiles)
      if (checked) {
        newSet.add(fileId)
      } else {
        newSet.delete(fileId)
      }
      setSelectedFiles(newSet)
    },
    [selectedFiles],
  )

  const selectAllFiles = useCallback(() => {
    if (isExporting) return
    setSelectedFiles(new Set(fileList.map((file) => file.id)))
  }, [fileList, isExporting])

  const deselectAllFiles = useCallback(() => {
    if (isExporting) return
    setSelectedFiles(new Set())
  }, [isExporting])

  const retryExport = useCallback(async () => {
    setExportProgress(null)
    await handleDownload()
  }, [handleDownload])

  return (
    <AccessibleDialog
      isOpen={isOpen}
      onClose={handleClose}
      labelledBy={titleId}
      describedBy={descriptionId}
      closeOnOverlayClick={false}
      closeOnEscape={!isExporting}
      className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl mx-4 overflow-hidden"
    >
      <DownloadDialogHeader
        exportType={exportType}
        titleId={titleId}
        descriptionId={descriptionId}
        backgroundColor={backgroundColor}
        onClose={handleClose}
      />
      <DownloadExportOptions
        exportType={exportType}
        selectedFormat={selectedFormat}
        compressFiles={compressFiles}
        includeAttachments={includeAttachments}
        isExporting={isExporting}
        onSelectedFormatChange={setSelectedFormat}
        onCompressFilesChange={setCompressFiles}
        onIncludeAttachmentsChange={setIncludeAttachments}
      />
      <DownloadItemsList
        exportType={exportType}
        fileList={fileList}
        selectedFiles={selectedFiles}
        isLoading={isLoading}
        isExporting={isExporting}
        instructions={instructions}
        instructionsLoading={instructionsLoading}
        instructionsError={instructionsError}
        themeColor={themeColor}
        onSelectAll={selectAllFiles}
        onDeselectAll={deselectAllFiles}
        onToggleFileSelection={toggleFileSelection}
        onRetryInstructions={() => setInstructionsReloadToken((current) => current + 1)}
      />
      <DownloadProgressPanel
        exportProgress={exportProgress}
        exportSuccessHint={exportSuccessHint}
        onRetryExport={() => {
          void retryExport()
        }}
      />
      <DownloadDialogFooter
        exportType={exportType}
        instructionsCount={instructions.length}
        selectedCount={selectedFiles.size}
        fileCount={fileList.length}
        isExporting={isExporting}
        themeColor={themeColor}
        onClose={handleClose}
        onDownload={() => {
          void handleDownload()
        }}
      />
    </AccessibleDialog>
  )
}
