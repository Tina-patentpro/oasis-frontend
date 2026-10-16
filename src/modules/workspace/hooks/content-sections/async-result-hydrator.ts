import type { ProcessStatusResponse, WorkflowExecutionFile } from '@/types/api'
import { FILE_URL_SPLITTER } from '@/utils/file-url'
import {
  extractWorkflowOutputTextFields,
  stripWorkflowOutputFieldPrefix,
  type WorkflowOutputTextField,
} from '@/utils/workflow-output-text'

import { resolveAsyncTerminalDecision } from './async-terminal-decision'
import { createWorkflowFileFromUrl } from './file-utils'

interface AsyncFinalResult {
  text: string
  files: WorkflowExecutionFile[]
  sessionId?: number
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

const pickNumber = (...values: unknown[]): number | undefined => {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value
    }
  }

  return undefined
}

function createDownloadFile(
  url: string,
  index: number,
  sessionId?: number,
  options?: { fileName?: string; mimeType?: string; size?: number },
): WorkflowExecutionFile {
  const fallbackName = sessionId
    ? `生成结果_${sessionId}_${index + 1}.docx`
    : `生成结果_${Date.now()}_${index + 1}.docx`
  const created = createWorkflowFileFromUrl(url, fallbackName, {
    fileIdPrefix: sessionId ? `session_${sessionId}_${index}` : `async_result_${index}`,
    mimeType: options?.mimeType,
    size: options?.size,
  })

  return {
    ...created,
    fileName: options?.fileName ?? created.fileName,
    url,
    mimeType: options?.mimeType ?? created.mimeType,
    size: options?.size ?? created.size,
  }
}

/**
 * 位置匹配使用与 normalizeFileUrlList 相同的 FILE_URL_SPLITTER 正则。
 * 该正则匹配逗号后跟 https?:// 或 / 的位置，能正确分割绝对和相对 URL，
 * 同时不会误分割查询参数中的逗号（如 ?ids=a,b/c.docx 中逗号后是 b 而非 /）。
 */

/**
 * 将 file_url 值拆分为保留原始位置的 URL 数组（不去重）。
 * 专门用于 file_output[i] ↔ file_url[i] 的位置配对。
 * 去重操作延迟到合并完成后执行，避免 Set 去重导致索引偏移。
 * 使用 map 而非 flatMap 保留空槽，防止非字符串元素导致位置偏移。
 */
function splitFileUrlList(value: unknown): string[] {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (trimmed.length === 0) return []
    return trimmed
      .split(FILE_URL_SPLITTER)
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
  }
  if (!Array.isArray(value)) return []
  // 使用 map 保留索引位置：非字符串元素变为 undefined，后续 positionalUrls[index] 返回 undefined
  return value
    .map((item) => (typeof item === 'string' ? item.trim() : undefined))
    .filter((s): s is string => typeof s === 'string' && s.length > 0)
}

export function buildFinalResult(params: {
  answerText?: string
  fileOutput?: Array<Record<string, unknown>>
  fileUrl?: string | string[]
  sessionId?: number
  outputFields?: WorkflowOutputTextField[]
}): AsyncFinalResult | null {
  const answerText =
    stripWorkflowOutputFieldPrefix(
      typeof params.answerText === 'string' ? params.answerText : '',
      params.outputFields,
    ) ?? ''

  // 保留原始位置的 URL 列表，用于 file_output[i] ↔ file_url[i] 的位置配对
  const positionalUrls = splitFileUrlList(params.fileUrl)
  const usedPositionalIndices = new Set<number>()

  // ---- 第一步：处理 file_output 条目（保留原始索引） ----
  // 使用带索引的数组暂存，合并完成后再按 URL 去重
  const mergedFiles: Array<{ url: string; file: WorkflowExecutionFile }> = []

  if (Array.isArray(params.fileOutput) && params.fileOutput.length > 0) {
    params.fileOutput.forEach((rawItem, index) => {
      if (!isRecord(rawItem)) return

      const ownUrl = pickString(
        rawItem.download_url,
        rawItem.downloadUrl,
        rawItem.url,
        rawItem.file_url,
        rawItem.fileUrl,
        rawItem.remote_url,
        rawItem.remoteUrl,
      )
      const hasDirectDownloadUrl = pickString(rawItem.download_url, rawItem.downloadUrl)
      const positionalUrl = positionalUrls[index]

      // 决定最终下载链接：
      // - 有 download_url → 用 download_url
      // - 没有 download_url 但有对应位置的 file_url → 用 file_url（覆盖预览链接）
      // - 否则用 ownUrl（预览链接）或跳过
      let downloadUrl = ownUrl
      if (!hasDirectDownloadUrl && positionalUrl) {
        downloadUrl = positionalUrl
        usedPositionalIndices.add(index)
      }

      if (!downloadUrl) {
        const name = pickString(rawItem.filename, rawItem.fileName, rawItem.name) || '(unknown)'
        console.warn(
          `[buildFinalResult] file_output[${index}] "${name}" has no URL and no positional file_url[${index}] — entry dropped`,
        )
        return
      }

      const file = createDownloadFile(downloadUrl, index, params.sessionId, {
        fileName: pickString(rawItem.filename, rawItem.fileName, rawItem.name) || undefined,
        mimeType:
          pickString(
            rawItem.mime_type,
            rawItem.mimeType,
            rawItem.content_type,
            rawItem.contentType,
          ) || undefined,
        size: pickNumber(rawItem.size, rawItem.file_size, rawItem.fileSize),
      })

      mergedFiles.push({ url: downloadUrl, file })
    })
  }

  // ---- 第二步：添加未被 file_output 占用的 file_url 条目 ----
  positionalUrls.forEach((url, index) => {
    if (usedPositionalIndices.has(index)) return
    mergedFiles.push({ url, file: createDownloadFile(url, index, params.sessionId) })
  })

  // ---- 第三步：按 URL 去重（先出现的优先，保证 file_output 元数据不被 generic 条目覆盖） ----
  const filesByUrl = new Map<string, WorkflowExecutionFile>()
  for (const { url, file } of mergedFiles) {
    if (!filesByUrl.has(url)) {
      filesByUrl.set(url, file)
    }
  }

  const files = Array.from(filesByUrl.values())

  if (answerText.trim().length === 0 && files.length === 0) {
    return null
  }

  return {
    text:
      answerText.trim().length > 0
        ? answerText
        : '生成完成，文件已准备好，请点击\u201C下载\u201D按钮获取。',
    files,
    sessionId: params.sessionId,
  }
}

export async function resolveFinalResult(params: {
  process: ProcessStatusResponse
  outputFields?: WorkflowOutputTextField[]
}): Promise<AsyncFinalResult | null> {
  const { process } = params

  const terminalDecision = resolveAsyncTerminalDecision({
    status: process.status,
    is_completed: process.is_completed,
    progress_percent: process.progress_percent,
    answer_text: process.answer_text,
    output: process.output,
    file_output: process.file_output,
    file_url: process.file_url,
    error_message: process.error_message,
  })

  if (terminalDecision.kind !== 'completed') {
    return null
  }

  return buildFinalResult({
    answerText: process.answer_text,
    fileOutput: process.file_output,
    fileUrl: process.file_url,
    sessionId: process.session_id,
    outputFields: [
      ...extractWorkflowOutputTextFields(process.output),
      ...(params.outputFields ?? []),
    ],
  })
}
