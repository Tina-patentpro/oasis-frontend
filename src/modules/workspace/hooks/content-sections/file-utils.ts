import type { WorkflowExecutionFile } from '@/types/api'

const decodeFileName = (name: string): string => {
  try {
    return decodeURIComponent(name)
  } catch {
    return name
  }
}

const DANGEROUS_PROTOCOLS = /^(\s*(javascript|vbscript|data)\s*:)/i

export function createWorkflowFileFromUrl(
  fileUrl: string,
  fallbackName: string,
  options?: { fileIdPrefix?: string; mimeType?: string; size?: number },
): WorkflowExecutionFile {
  const rawUrl = typeof fileUrl === 'string' ? fileUrl.trim() : ''

  // 拒绝危险协议（javascript:, vbscript:），防止 URL 渲染为 <a href> 时产生 XSS
  // data: 协议在 <a> 标签中不会执行脚本，允许通过
  if (DANGEROUS_PROTOCOLS.test(rawUrl)) {
    console.warn('[createWorkflowFileFromUrl] blocked dangerous URL protocol:', rawUrl.slice(0, 30))
    return {
      fileId: `${options?.fileIdPrefix ?? 'file'}_blocked`,
      fileName: fallbackName,
      url: '',
      mimeType: 'application/octet-stream',
      size: 0,
    }
  }
  const baseOrigin =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : 'http://localhost'
  const isAbsoluteUrl = /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(rawUrl) || rawUrl.startsWith('//')
  const urlObj = new URL(rawUrl, baseOrigin)
  const pathname = urlObj.pathname
  const filenameMatch = pathname.match(/([^/]+\.[a-zA-Z0-9]+)$/)
  const filename = filenameMatch ? decodeFileName(filenameMatch[1]) : fallbackName

  return {
    fileId: `${options?.fileIdPrefix ?? 'file'}_${Date.now()}`,
    fileName: filename,
    url: isAbsoluteUrl ? urlObj.toString() : rawUrl,
    mimeType:
      options?.mimeType ??
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    size: options?.size,
  }
}
