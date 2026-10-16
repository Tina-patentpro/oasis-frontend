import type {
  DownloadExportType,
  DownloadFilesDialogProps,
  FileItem,
} from './DownloadFilesDialog.types'

export function resolveExportErrorMessage(error: unknown): string {
  if (error instanceof DOMException && error.name === 'AbortError') {
    return '下载超时，请稍后重试'
  }

  const message = error instanceof Error ? error.message : String(error ?? '')
  if (!message) {
    return '下载失败'
  }
  if (/failed to fetch/i.test(message) || /networkerror/i.test(message)) {
    return '下载链接不可达或已过期，请稍后重试'
  }
  return message
}

function pickFirstNonEmptyString(candidates: unknown[]): string | undefined {
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim().length > 0) {
      return candidate
    }
  }
  return undefined
}

export function resolveDownloadUrlFromRecord(
  fileData: Record<string, unknown>,
): string | undefined {
  return pickFirstNonEmptyString([
    fileData['downloadUrl'],
    fileData['download_url'],
    fileData['ossUrl'],
    fileData['remote_url'],
    fileData['remoteUrl'],
    fileData['url'],
  ])
}

export function resolveDownloadNameFromRecord(
  fileData: Record<string, unknown>,
  fallbackName: string,
): string {
  return (
    pickFirstNonEmptyString([
      fileData['fileName'],
      fileData['originalName'],
      fileData['filename'],
      fileData['name'],
    ]) || fallbackName
  )
}

export function buildWorkflowDetailFailureHint(failedWorkflowLabels: string[]): string {
  if (failedWorkflowLabels.length === 0) {
    return ''
  }

  if (failedWorkflowLabels.length === 1) {
    return `另有 1 条Workflow详情获取失败，未纳入导出：${failedWorkflowLabels[0]}`
  }

  if (failedWorkflowLabels.length === 2) {
    return `另有 2 条Workflow详情获取失败，未纳入导出：${failedWorkflowLabels.join('、')}`
  }

  return `另有 ${failedWorkflowLabels.length} 条Workflow详情获取失败，未纳入导出：${failedWorkflowLabels
    .slice(0, 2)
    .join('、')} 等`
}

export function buildFileListFromData(
  exportType: DownloadExportType,
  data: DownloadFilesDialogProps['data'],
): FileItem[] {
  switch (exportType) {
    case 'session':
      return (
        data?.sessions?.map((session) => ({
          id: session.id.toString(),
          name: session.title,
          type: '会话',
          data: session,
        })) ?? []
      )
    case 'project':
      return (
        data?.projects?.map((project) => ({
          id: project.id.toString(),
          name: project.name,
          type: '项目',
          data: project,
        })) ?? []
      )
    case 'history':
      return (
        data?.history?.map((item) => ({
          id: item.id,
          name: item.title,
          type: '历史记录',
          data: item,
        })) ?? []
      )
    case 'files':
      if (data?.generatedFiles?.length) {
        return data.generatedFiles.map((file, index) => ({
          id: file.fileId || `generated-${index}`,
          name: file.fileName || `生成文件-${index + 1}`,
          type: file.mimeType || '生成附件',
          size: file.size,
          data: file,
        }))
      }
      return (
        data?.files?.map((file) => ({
          id: file.id.toString(),
          name: file.originalName || file.filename,
          type: file.fileType,
          size: file.size,
          data: file,
        })) ?? []
      )
    case 'workflow':
      return (
        data?.workflows?.map((workflow) => ({
          id: workflow.id.toString(),
          name: workflow.api_name,
          type: 'Workflow',
          data: workflow,
        })) ?? []
      )
    case 'instructions':
      return []
    default:
      return []
  }
}
