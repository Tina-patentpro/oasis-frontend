import { useCallback } from 'react'

import { historyService } from '@/api/services'
import type {
  FileUrl,
  InputSection as InputSectionDefinition,
  WorkflowExecutionFile,
} from '@/types/api'

import { buildFinalResult } from './async-result-hydrator'
import {
  getUploadSelectionState,
  mergeUploadInputValue,
  parseUploadInputValue,
  type UploadInputFileItem,
} from './upload-input-value'

interface UseHistoryActionsParams {
  notify: (message: string) => void
  openHistoryDialog: (options?: { projectId?: number; type?: string; title?: string }) => void
  openLocalHistoryDialog: (options?: {
    projectId?: number
    title?: string
    sessions?: import('@/types/api').Session[]
  }) => void
  setHistoryConfirmCallback: (
    callback: (data: string[], rawItems?: Record<string, unknown>[]) => void,
  ) => void
  sessions: import('@/types/api').Session[]
  selectedProjectId: number | null
  activePages: Array<{ key: string; label: string }>
  inputPage: string
  inputSections: Record<string, string>
  sectionDefinitions: Record<string, InputSectionDefinition | undefined>
  setInputSection: (page: string, value: string) => void
  setInputPage: (page: string) => void
  setGenerated: (content: string) => void
  saveInputHistory: () => void
  setGeneratedFiles: (files: WorkflowExecutionFile[]) => void
}

interface UseHistoryActionsResult {
  readHistoryToInput: (targetKey?: string) => void
  autoReadHistory: () => Promise<void>
  loadSessionFiles: (params: {
    fileUrl?: FileUrl
    fileOutput?: Array<Record<string, unknown>>
    sessionId: number
  }) => void
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const pickString = (...values: unknown[]): string => {
  for (const value of values) {
    if (typeof value !== 'string') {
      continue
    }

    const trimmed = value.trim()
    if (trimmed.length > 0) {
      return trimmed
    }
  }

  return ''
}

function normalizeSessionId(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }
  return undefined
}

function hasRecoverableHistoryFiles(item: {
  id?: unknown
  file_url?: FileUrl
  file_output?: Array<Record<string, unknown>>
}): boolean {
  return (
    (buildFinalResult({
      answerText: '',
      fileOutput: item.file_output,
      fileUrl: item.file_url,
      sessionId: normalizeSessionId(item.id),
    })?.files.length ?? 0) > 0
  )
}

function resolveTargetFieldType(
  definition: InputSectionDefinition | undefined,
): string | undefined {
  if (!definition) {
    return undefined
  }

  if (definition.inputMode === 'image' || definition.supportsImageUpload) {
    return 'image'
  }

  if (definition.supportsFileUpload) {
    return definition.isMultiFile ? 'file_list' : 'file'
  }

  return undefined
}

function stringifyFilesForInput(
  fieldType: string | undefined,
  files: UploadInputFileItem[],
): string {
  if (files.length === 0) {
    return ''
  }

  if (fieldType === 'file') {
    return JSON.stringify(files[0])
  }

  return JSON.stringify(files)
}

function normalizeSelectedHistoryFile(item: unknown): UploadInputFileItem | null {
  if (!isRecord(item)) {
    return null
  }

  const url = pickString(item.url)
  if (!url) {
    return null
  }

  return {
    url,
    mimeType: pickString(item.mimeType, item.mime_type) || 'application/octet-stream',
    name: pickString(item.name, item.fileName, item.filename) || undefined,
  }
}

function extractHistoryFiles(rawItems: Record<string, unknown>[]): UploadInputFileItem[] {
  const selectedFiles = rawItems
    .map((item) => normalizeSelectedHistoryFile(item))
    .filter((item): item is UploadInputFileItem => item !== null)

  if (selectedFiles.length > 0) {
    return selectedFiles
  }

  return rawItems
    .filter((item) => hasRecoverableHistoryFiles(item ?? {}))
    .flatMap((item) => {
      const fileOutput = item.file_output as Array<Record<string, unknown>> | undefined
      const fileUrl = item.file_url as string | string[] | undefined
      const title = typeof item.title === 'string' ? item.title : ''
      const apiName = typeof item.api_name === 'string' ? item.api_name : ''

      const finalResult = buildFinalResult({
        answerText: '',
        fileOutput,
        fileUrl,
        sessionId: typeof item.id === 'number' ? item.id : undefined,
      })

      return (finalResult?.files ?? []).map((file) => ({
        url: file.url ?? '',
        mimeType: file.mimeType || 'application/octet-stream',
        name: file.fileName || title || apiName || '项目下载文件',
      }))
    })
}

export function useHistoryActions({
  notify,
  openHistoryDialog: _openHistoryDialog,
  openLocalHistoryDialog,
  setHistoryConfirmCallback,
  sessions,
  selectedProjectId,
  activePages,
  inputPage,
  inputSections,
  sectionDefinitions,
  setInputSection,
  setInputPage,
  setGenerated: _setGenerated,
  saveInputHistory,
  setGeneratedFiles,
}: UseHistoryActionsParams): UseHistoryActionsResult {
  const readHistoryToInput = useCallback(
    (targetKey?: string) => {
      const handleConfirm = async (
        _selectedData: string[],
        rawItems?: Record<string, unknown>[],
      ) => {
        if (rawItems && rawItems.length > 0) {
          const fileItems = extractHistoryFiles(rawItems)

          if (fileItems.length > 0) {
            let targetPageKey = targetKey || inputPage
            let targetDef = sectionDefinitions[targetPageKey]
            let targetFieldType = resolveTargetFieldType(targetDef)

            if (!targetDef || !targetFieldType) {
              const foundPage = activePages.find((page) => {
                const def = sectionDefinitions[page.key]
                return !!resolveTargetFieldType(def)
              })

              if (foundPage) {
                targetPageKey = foundPage.key
                targetDef = sectionDefinitions[targetPageKey]
                targetFieldType = resolveTargetFieldType(targetDef)
              }
            }

            if (!targetPageKey || !targetFieldType) {
              notify('未找到可接收项目下载文件的输入项')
              return
            }

            const existingValue = inputSections[targetPageKey] ?? ''
            const existingFiles = parseUploadInputValue(existingValue)
            const uploadSelectionState = getUploadSelectionState(
              targetFieldType,
              existingFiles.length,
            )
            const limitedFiles = fileItems.slice(0, uploadSelectionState.selectionLimit)
            const clippedCount = Math.max(0, fileItems.length - limitedFiles.length)
            const shouldReplace =
              targetFieldType === 'file' || uploadSelectionState.nextMode === 'replace'

            const nextValue = shouldReplace
              ? stringifyFilesForInput(targetFieldType, limitedFiles)
              : stringifyFilesForInput(
                  targetFieldType,
                  mergeUploadInputValue(existingValue, limitedFiles).slice(
                    0,
                    uploadSelectionState.maxFiles,
                  ),
                )

            if (!nextValue) {
              notify('所选项目未包含有效的下载文件')
              return
            }

            setInputSection(targetPageKey, nextValue)
            if (targetPageKey !== inputPage) {
              setInputPage(targetPageKey)
            }

            const baseMessage = shouldReplace
              ? '已替换当前参数中的项目下载文件'
              : '已导入项目下载文件'
            notify(
              clippedCount > 0
                ? `${baseMessage}，超出上限的 ${clippedCount} 个文件已忽略`
                : baseMessage,
            )
          }
        }
      }

      if (!selectedProjectId) {
        notify('请先选择项目')
        return
      }

      const projectFiles = sessions.filter(
        (session) => session.projectId === selectedProjectId && hasRecoverableHistoryFiles(session),
      )

      if (projectFiles.length === 0) {
        notify('当前项目暂无可读取的项目下载文件')
        return
      }

      setHistoryConfirmCallback(() => handleConfirm)

      openLocalHistoryDialog({
        projectId: selectedProjectId,
        title: '读取本项目下载文件',
        sessions: projectFiles,
      })
    },
    [
      activePages,
      inputPage,
      inputSections,
      notify,
      openLocalHistoryDialog,
      sectionDefinitions,
      selectedProjectId,
      sessions,
      setHistoryConfirmCallback,
      setInputPage,
      setInputSection,
    ],
  )

  const autoReadHistory = useCallback(async () => {
    if (!selectedProjectId) {
      notify('请先选择项目，再自动读取文件')
      return
    }

    try {
      const data = await historyService.getHistoryDataItem(String(selectedProjectId))
      const finalResult = buildFinalResult({
        answerText: '',
        fileOutput: data?.file_output,
        fileUrl: data?.file_url,
        sessionId: normalizeSessionId(data?.id),
      })

      if (!finalResult || finalResult.files.length === 0) {
        notify('暂无文件')
        return
      }

      saveInputHistory()

      const filePage = activePages.find((page) => {
        const def = sectionDefinitions[page.key]
        return def && (def.supportsFileUpload || def.supportsImageUpload)
      })

      if (!filePage) {
        notify('未找到文件输入项')
        return
      }

      setInputSection(
        filePage.key,
        JSON.stringify(
          finalResult.files.map((file) => ({
            url: file.url,
            mimeType: file.mimeType || 'application/octet-stream',
            name: file.fileName || '历史文件',
          })),
        ),
      )
      notify('已自动填充文件')
    } catch (error) {
      console.error('[useWorkspaceContentSections] 自动读取失败', error)
      notify('读取失败，请稍后重试')
    }
  }, [
    activePages,
    notify,
    saveInputHistory,
    sectionDefinitions,
    selectedProjectId,
    setInputSection,
  ])

  const loadSessionFiles = useCallback(
    ({
      fileUrl,
      fileOutput,
      sessionId,
    }: {
      fileUrl?: FileUrl
      fileOutput?: Array<Record<string, unknown>>
      sessionId: number
    }) => {
      const finalResult = buildFinalResult({
        answerText: '',
        fileOutput,
        fileUrl: fileUrl ?? '',
        sessionId,
      })

      if (!finalResult || finalResult.files.length === 0) {
        setGeneratedFiles([])
        return
      }

      try {
        setGeneratedFiles(finalResult.files)
      } catch (error) {
        console.error('[loadSessionFiles] ✗ 处理 file_url 失败:', error)
      }
    },
    [setGeneratedFiles],
  )

  return {
    readHistoryToInput,
    autoReadHistory,
    loadSessionFiles,
  }
}
