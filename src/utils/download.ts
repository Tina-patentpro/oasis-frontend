/**
 * 下载工具类
 * 统一处理文件下载、导出功能
 */

export interface DownloadProgress {
  loaded: number
  total: number
  percentage: number
  status: 'loading' | 'success' | 'error'
  error?: string
}

export interface DownloadOptions {
  onProgress?: (progress: DownloadProgress) => void
  timeout?: number
  retryCount?: number
  fallbackUrl?: string
}

import { getViteApiBaseUrl } from '@/config/runtime-env'

import { downloadBlob } from './file-utils'

const ALLOWED_DOWNLOAD_PROTOCOLS = new Set(['http:', 'https:', 'data:', 'blob:', 'ftp:'])
const UNSUPPORTED_DOWNLOAD_URL_MESSAGE = '下载地址不受支持，请检查后重试'

interface ExportFormat {
  format: 'json' | 'csv' | 'xlsx' | 'pdf' | 'zip'
  mimeType: string
  extension: string
}

export const EXPORT_FORMATS: Record<string, ExportFormat> = {
  json: { format: 'json', mimeType: 'application/json', extension: '.json' },
  csv: { format: 'csv', mimeType: 'text/csv', extension: '.csv' },
  xlsx: {
    format: 'xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    extension: '.xlsx',
  },
  pdf: { format: 'pdf', mimeType: 'application/pdf', extension: '.pdf' },
  zip: { format: 'zip', mimeType: 'application/zip', extension: '.zip' },
}

/**
 * 下载文件
 */
async function downloadFile(
  url: string,
  filename: string,
  options: DownloadOptions = {},
): Promise<void> {
  const { onProgress, timeout = 30000, retryCount = 3, fallbackUrl } = options
  let primaryUrl: string

  try {
    primaryUrl = assertSupportedDownloadUrl(resolveDownloadUrl(url))
  } catch (error) {
    reportDownloadError(onProgress, error)
    throw error
  }

  let attempts = 0
  const maxAttempts = retryCount + 1

  while (attempts < maxAttempts) {
    try {
      const response = await fetchWithProgress(primaryUrl, {
        onProgress,
        timeout,
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const blob = await response.blob()
      downloadBlob(blob, filename)

      onProgress?.({
        loaded: blob.size,
        total: blob.size,
        percentage: 100,
        status: 'success',
      })

      return
    } catch (error) {
      attempts++
      const isLastAttempt = attempts >= maxAttempts
      const networkFetchError = isNetworkFetchError(error)

      if (networkFetchError) {
        // fetch 侧网络/CORS 失败时，立即改走浏览器原生下载，避免长时间卡在重试中
        const directUrl =
          isLastAttempt && fallbackUrl ? resolveDownloadUrl(fallbackUrl) : primaryUrl
        try {
          downloadByDirectLink(directUrl, filename)
        } catch (directError) {
          reportDownloadError(onProgress, directError)
          throw directError
        }
        onProgress?.({
          loaded: 0,
          total: 0,
          percentage: 100,
          status: 'success',
        })
        return
      }

      if (isLastAttempt) {
        if (fallbackUrl && attempts === maxAttempts) {
          // 尝试使用备用URL
          return downloadFile(fallbackUrl, filename, { ...options, fallbackUrl: undefined })
        }
        reportDownloadError(onProgress, error)
        throw error
      }

      // 重试阶段不应标记为 error，避免“已下载但误报失败”
      onProgress?.({
        loaded: 0,
        total: 0,
        percentage: 0,
        status: 'loading',
      })

      // 等待重试
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempts))
    }
  }
}

function isNetworkFetchError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === 'AbortError') {
    return false
  }
  const message = error instanceof Error ? error.message : String(error ?? '')
  return /failed to fetch/i.test(message) || /networkerror/i.test(message)
}

function reportDownloadError(
  onProgress: DownloadOptions['onProgress'],
  error: unknown,
): void {
  onProgress?.({
    loaded: 0,
    total: 0,
    percentage: 0,
    status: 'error',
    error: error instanceof Error ? error.message : 'Unknown error',
  })
}

function assertSupportedDownloadUrl(url: string): string {
  const normalizedUrl = typeof url === 'string' ? url.trim() : ''
  if (!normalizedUrl) {
    throw new Error(UNSUPPORTED_DOWNLOAD_URL_MESSAGE)
  }

  try {
    const baseUrl = typeof window === 'undefined' ? 'http://localhost/' : window.location.href
    const parsed = new URL(normalizedUrl, baseUrl)
    if (!ALLOWED_DOWNLOAD_PROTOCOLS.has(parsed.protocol)) {
      throw new Error(UNSUPPORTED_DOWNLOAD_URL_MESSAGE)
    }
  } catch (error) {
    if (error instanceof Error && error.message === UNSUPPORTED_DOWNLOAD_URL_MESSAGE) {
      throw error
    }
    throw new Error(UNSUPPORTED_DOWNLOAD_URL_MESSAGE)
  }

  return normalizedUrl
}

export function resolveDownloadUrl(url: string, baseUrl?: string): string {
  const normalizedUrl = typeof url === 'string' ? url.trim() : ''
  if (!normalizedUrl) {
    return url
  }

  // Reject dangerous URI schemes
  const isRelativeUrl =
    !/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(normalizedUrl) && !normalizedUrl.startsWith('//')
  if (!isRelativeUrl) {
    try {
      const parsed = new URL(normalizedUrl)
      if (!ALLOWED_DOWNLOAD_PROTOCOLS.has(parsed.protocol)) {
        return normalizedUrl // return as-is, don't process through URL constructor
      }
    } catch {
      return normalizedUrl
    }
  }

  const preferredBaseUrl = baseUrl ?? getViteApiBaseUrl()

  if (typeof window !== 'undefined' && preferredBaseUrl) {
    try {
      const currentHost = window.location.hostname
      const isLoopback =
        currentHost === '127.0.0.1' || currentHost === 'localhost' || currentHost === '::1'
      const target = new URL(normalizedUrl)
      const backend = new URL(preferredBaseUrl, window.location.href)

      if (
        isLoopback &&
        target.origin === backend.origin &&
        target.pathname.startsWith('/uploads/')
      ) {
        return new URL(
          `${target.pathname}${target.search}${target.hash}`,
          window.location.origin,
        ).toString()
      }
    } catch {
      // Relative URLs and malformed values continue through the normal resolver below.
    }
  }

  try {
    if (preferredBaseUrl) {
      return new URL(normalizedUrl, preferredBaseUrl).toString()
    }
  } catch {
    // ignore and fall back to window location
  }

  if (typeof window === 'undefined') {
    return normalizedUrl
  }

  try {
    return new URL(normalizedUrl, window.location.href).toString()
  } catch {
    return normalizedUrl
  }
}

function downloadByDirectLink(url: string, filename?: string): void {
  const safeUrl = assertSupportedDownloadUrl(url)

  const link = document.createElement('a')
  link.href = safeUrl
  link.download = filename || ''
  link.target = '_blank'
  link.rel = 'noopener noreferrer'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

/**
 * 带进度的fetch
 */
async function fetchWithProgress(
  url: string,
  options: {
    onProgress?: (progress: DownloadProgress) => void
    timeout?: number
  } = {},
): Promise<Response> {
  const { onProgress, timeout = 30000 } = options

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url, {
      signal: controller.signal,
    })

    if (!response.body) {
      return response
    }

    const contentLength = response.headers.get('content-length')
    const total = contentLength ? parseInt(contentLength, 10) : 0
    let loaded = 0

    const reader = response.body.getReader()
    const stream = new ReadableStream({
      start(controller) {
        function pump(): Promise<void> {
          return reader.read().then(({ done, value }) => {
            if (done) {
              controller.close()
              return
            }

            loaded += value.length
            const percentage = total > 0 ? Math.round((loaded / total) * 100) : 0

            onProgress?.({
              loaded,
              total,
              percentage,
              status: 'loading',
            })

            controller.enqueue(value)
            return pump()
          })
        }
        return pump()
      },
    })

    return new Response(stream, {
      headers: response.headers,
      status: response.status,
      statusText: response.statusText,
    })
  } finally {
    clearTimeout(timeoutId)
  }
}

// downloadBlob — imported from ./file-utils

/**
 * 获取文件大小格式化字符串
 */
export function formatFileSize(bytes?: number | null): string {
  if (typeof bytes !== 'number' || !Number.isFinite(bytes) || bytes < 0) {
    return '大小未知'
  }
  if (bytes === 0) return '0 B'

  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * 创建带时间戳的文件名
 */
export function createTimestampedFileName(
  baseName: string,
  format: string,
  prefix?: string,
): string {
  const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '')
  const cleanBaseName = baseName.replace(/[^\w\u4e00-\u9fa5-]/g, '_')
  const prefixStr = prefix ? `${prefix}_` : ''
  return `${prefixStr}${cleanBaseName}_${timestamp}.${format}`
}

/**
 * 从URL下载文件
 */
export async function downloadFromUrl(
  url: string,
  filename: string,
  options?: DownloadOptions,
): Promise<void> {
  return downloadFile(url, filename, options)
}

/**
 * 直接触发浏览器下载（通过创建 <a> 标签）
 * @param url 文件URL
 * @param filename 文件名（可选）
 */
export async function triggerDownload(url: string, filename?: string): Promise<void> {
  const downloadUrl = assertSupportedDownloadUrl(resolveDownloadUrl(url))

  try {
    // 尝试使用 fetch + blob 方式下载
    const response = await fetch(downloadUrl, { mode: 'cors' })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    const blob = await response.blob()

    // 从 URL 中提取文件名（如果没有提供 filename）
    let downloadFilename = filename
    if (!downloadFilename) {
      try {
        const urlObj = new URL(downloadUrl, window.location.origin)
        const pathname = urlObj.pathname
        const match = pathname.match(/([^/]+\.[a-zA-Z0-9]+)$/)
        downloadFilename = match ? match[1] : 'download.docx'
      } catch {
        downloadFilename = 'download.docx'
      }
    }

    // 尝试从响应头获取文件名
    const contentDisposition = response.headers.get('content-disposition')
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/)
      if (filenameMatch && filenameMatch[1]) {
        downloadFilename = filenameMatch[1].replace(/['"]/g, '')
      }
    }

    // 创建下载链接并触发下载
    downloadBlob(blob, downloadFilename)
  } catch (error) {
    console.error('[triggerDownload] fetch 下载失败')

    if (!isNetworkFetchError(error)) {
      throw error
    }

    console.warn('[triggerDownload] 已切换到浏览器直接下载')
    downloadByDirectLink(downloadUrl, filename)
  }
}

/**
 * 下载文本内容为文件
 */
export function downloadText(
  content: string,
  filename: string,
  mimeType: string = 'text/plain',
): void {
  const blob = new Blob([content], { type: mimeType })
  downloadBlob(blob, filename)
}
