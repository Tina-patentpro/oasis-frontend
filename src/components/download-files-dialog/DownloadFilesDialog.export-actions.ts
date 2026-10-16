import { sessionService } from '@/api/services'
import { triggerDownload, type DownloadProgress } from '@/utils/download'
import {
  exportHistory,
  exportProjects,
  exportSessions,
  type ExportOptions,
  type ExportTask,
} from '@/utils/exportUtils'
import type { Session } from '@/types/api'

import {
  buildWorkflowDetailFailureHint,
  resolveDownloadNameFromRecord,
  resolveDownloadUrlFromRecord,
  resolveExportErrorMessage,
} from './DownloadFilesDialog.helpers'
import type {
  DownloadExportType,
  DownloadFilesDialogProps,
  FileItem,
} from './DownloadFilesDialog.types'

type ExportProgressSetter = (progress: DownloadProgress) => void

export interface RunDownloadRequest {
  exportType: DownloadExportType
  data: DownloadFilesDialogProps['data']
  fileList: FileItem[]
  selectedFiles: Set<string>
  exportOptions: ExportOptions
  setExportProgress: ExportProgressSetter
}

export interface RunDownloadResult {
  exportTask: ExportTask | null
  completedSelectedFiles: Set<string>
  successHint: string | null
  shouldAutoClose: boolean
  shouldNotifyFilesDownload: boolean
}

interface ExportTaskOutcome {
  completed: boolean
  failed: boolean
  progress: DownloadProgress
  successHint: string | null
}

const emptyDownloadResult = (selectedFiles: Set<string>): RunDownloadResult => ({
  exportTask: null,
  completedSelectedFiles: selectedFiles,
  successHint: null,
  shouldAutoClose: false,
  shouldNotifyFilesDownload: false,
})

export async function runSelectedDownload({
  exportType,
  data,
  fileList,
  selectedFiles,
  exportOptions,
  setExportProgress,
}: RunDownloadRequest): Promise<RunDownloadResult> {
  switch (exportType) {
    case 'session':
      return {
        ...emptyDownloadResult(selectedFiles),
        exportTask: await exportSelectedSessions(data, selectedFiles, exportOptions),
      }
    case 'project':
      return {
        ...emptyDownloadResult(selectedFiles),
        exportTask: await exportSelectedProjects(data, selectedFiles, exportOptions),
      }
    case 'history':
      return {
        ...emptyDownloadResult(selectedFiles),
        exportTask: await exportSelectedHistory(data, selectedFiles, exportOptions),
      }
    case 'workflow':
      return exportSelectedWorkflow(data, selectedFiles, exportOptions)
    case 'files':
      await downloadSelectedFiles(fileList, selectedFiles, setExportProgress)
      return {
        ...emptyDownloadResult(selectedFiles),
        shouldAutoClose: true,
        shouldNotifyFilesDownload: true,
      }
    case 'instructions':
      return emptyDownloadResult(selectedFiles)
    default:
      return emptyDownloadResult(selectedFiles)
  }
}

export function buildExportTaskOutcome(
  exportTask: ExportTask,
  partialSuccessHint: string | null,
): ExportTaskOutcome {
  if (exportTask.status === 'failed') {
    return {
      completed: false,
      failed: true,
      progress: {
        loaded: 0,
        total: 0,
        percentage: 0,
        status: 'error',
        error: resolveExportErrorMessage(exportTask.error || '导出失败'),
      },
      successHint: null,
    }
  }

  const successHints = collectExportSuccessHints(exportTask, partialSuccessHint)
  const successHint = successHints.length > 0 ? `主压缩包已导出，${successHints.join('；')}` : null

  return {
    completed: exportTask.status === 'completed' && Boolean(exportTask.result),
    failed: false,
    progress: {
      loaded: 100,
      total: 100,
      percentage: 100,
      status: 'success',
    },
    successHint,
  }
}

async function exportSelectedSessions(
  data: DownloadFilesDialogProps['data'],
  selectedFiles: Set<string>,
  exportOptions: ExportOptions,
): Promise<ExportTask | null> {
  const selectedSessions = data?.sessions?.filter((session) =>
    selectedFiles.has(session.id.toString()),
  )
  return selectedSessions ? exportSessions(selectedSessions, exportOptions) : null
}

async function exportSelectedProjects(
  data: DownloadFilesDialogProps['data'],
  selectedFiles: Set<string>,
  exportOptions: ExportOptions,
): Promise<ExportTask | null> {
  const selectedProjects = data?.projects?.filter((project) =>
    selectedFiles.has(project.id.toString()),
  )
  return selectedProjects ? exportProjects(selectedProjects, exportOptions) : null
}

async function exportSelectedHistory(
  data: DownloadFilesDialogProps['data'],
  selectedFiles: Set<string>,
  exportOptions: ExportOptions,
): Promise<ExportTask | null> {
  const selectedHistory = data?.history?.filter((item) => selectedFiles.has(item.id))
  return selectedHistory ? exportHistory(selectedHistory, exportOptions) : null
}

async function exportSelectedWorkflow(
  data: DownloadFilesDialogProps['data'],
  selectedFiles: Set<string>,
  exportOptions: ExportOptions,
): Promise<RunDownloadResult> {
  const selectedWorkflows =
    data?.workflows?.filter((workflow) => selectedFiles.has(workflow.id.toString())) ?? []
  const workflowSessions: Session[] = []
  const detailFailures: string[] = []
  const exportedWorkflowIds = new Set<string>()

  for (const workflow of selectedWorkflows) {
    try {
      const sessionDetail = await sessionService.getSession(workflow.id)
      workflowSessions.push({
        ...sessionDetail,
        id: sessionDetail.id || workflow.id,
        userId: sessionDetail.userId || workflow.user_id || 0,
        projectId: sessionDetail.projectId ?? workflow.folder_id,
        title:
          sessionDetail.title?.trim() ||
          sessionDetail.api_name ||
          workflow.api_name ||
          '未命名项目',
        toolType: sessionDetail.toolType || 'workflow',
        modelVersion: sessionDetail.modelVersion || 'fast',
        status: sessionDetail.status || 'completed',
        createdAt: sessionDetail.createdAt || workflow.created_at,
        updatedAt: sessionDetail.updatedAt || workflow.created_at,
        api_name: sessionDetail.api_name || workflow.api_name,
      })
      exportedWorkflowIds.add(workflow.id.toString())
    } catch {
      detailFailures.push(`${workflow.api_name || `未命名Workflow`}（ID: ${workflow.id}）`)
    }
  }

  if (workflowSessions.length === 0) {
    throw new Error(`以下Workflow详情获取失败：${detailFailures.join('、')}`)
  }

  return {
    ...emptyDownloadResult(selectedFiles),
    completedSelectedFiles: exportedWorkflowIds,
    exportTask: await exportSessions(workflowSessions, {
      ...exportOptions,
      format: 'zip',
      compress: true,
    }),
    successHint: buildWorkflowDetailFailureHint(detailFailures),
    shouldAutoClose: true,
  }
}

async function downloadSelectedFiles(
  fileList: FileItem[],
  selectedFiles: Set<string>,
  setExportProgress: ExportProgressSetter,
): Promise<void> {
  const selectedFileItems = fileList.filter((file) => selectedFiles.has(file.id))
  const totalCount = selectedFileItems.length
  let completedCount = 0
  const resolvedDownloads = selectedFileItems.map((fileItem) => {
    const fileData =
      fileItem.data && typeof fileItem.data === 'object'
        ? (fileItem.data as unknown as Record<string, unknown>)
        : null
    const downloadUrl = fileData ? resolveDownloadUrlFromRecord(fileData) : undefined

    return {
      fileItem,
      downloadUrl,
      downloadName: fileData ? resolveDownloadNameFromRecord(fileData, fileItem.name) : fileItem.name,
    }
  })
  const missingDownloadNames = resolvedDownloads
    .filter((item) => !item.downloadUrl)
    .map((item) => item.fileItem.name)

  if (missingDownloadNames.length > 0) {
    throw new Error(`以下文件缺少可下载地址：${missingDownloadNames.join('、')}`)
  }

  for (const item of resolvedDownloads) {
    setExportProgress({
      loaded: completedCount,
      total: totalCount,
      percentage: totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0,
      status: 'loading',
    })

    await triggerDownload(item.downloadUrl as string, item.downloadName)
    completedCount += 1
  }

  setExportProgress({
    loaded: completedCount,
    total: totalCount,
    percentage: totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 100,
    status: 'success',
  })
}

function collectExportSuccessHints(
  exportTask: ExportTask,
  partialSuccessHint: string | null,
): string[] {
  const successHints: string[] = partialSuccessHint ? [partialSuccessHint] : []
  const failedAttachmentCount = exportTask.result?.attachmentSummary?.failedCount ?? 0

  if (failedAttachmentCount > 0) {
    successHints.push(
      exportTask.result?.reportPath
        ? `另有 ${failedAttachmentCount} 个附件未能打包；详情见压缩包内的 ${exportTask.result.reportPath}`
        : `另有 ${failedAttachmentCount} 个附件未能打包`,
    )
  }

  return successHints
}
