import { normalizeFileUrlList } from '@/utils/file-url'

type AsyncTerminalDecisionKind = 'completed' | 'failed' | 'running'

interface AsyncTerminalDecisionInput {
  status?: string | null
  is_completed?: boolean | null
  progress_percent?: number | null
  answer_text?: string | null
  generatedContent?: string | null
  output?: string | null
  file_url?: string | string[] | null
  file_output?: Array<Record<string, unknown>> | null
  error_message?: string | null
  allowResultOnlyCompletion?: boolean
}

interface AsyncTerminalDecision {
  kind: AsyncTerminalDecisionKind
  hasText: boolean
  hasFiles: boolean
  hasResult: boolean
  completionSignal: boolean
  failureSignal: boolean
}

const COMPLETED_STATUSES = new Set(['completed', 'succeeded', 'success', 'done', 'finished'])
const FAILED_STATUSES = new Set(['failed', 'cancelled', 'canceled', 'error', 'timeout'])

function hasUsableText(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0
}

function normalizeStatus(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined
  }
  const normalized = value.trim().toLowerCase()
  return normalized.length > 0 ? normalized : undefined
}

function hasUsableFileOutput(fileOutput: unknown): boolean {
  if (!Array.isArray(fileOutput)) {
    return false
  }

  return fileOutput.some((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      return false
    }

    const record = item as Record<string, unknown>
    return (
      normalizeFileUrlList([
        record['downloadUrl'],
        record['download_url'],
        record['remote_url'],
        record['remoteUrl'],
        record['url'],
      ]).length > 0
    )
  })
}

export function resolveAsyncTerminalDecision(
  input: AsyncTerminalDecisionInput,
): AsyncTerminalDecision {
  const status = normalizeStatus(input.status)
  const hasText =
    hasUsableText(input.generatedContent) ||
    hasUsableText(input.answer_text) ||
    hasUsableText(input.output)
  // hasFiles 与 buildFinalResult 的对齐关系：
  // - 当 file_url 非空时，hasFiles 为 true，buildFinalResult 也会通过 splitFileUrlList 使用这些 URL
  // - 当 file_output 条目自身有 URL 时，两边都认可
  // - 当 file_output 条目无 URL 但可通过 file_url[i] 位置配对获得时，hasFiles 仍为 true
  //   （因为 file_url 非空已使第一项为 true）
  // - 唯一不覆盖的场景：file_output 全无 URL + file_url 为空 → 确实没有可恢复的文件
  const hasFiles =
    normalizeFileUrlList(input.file_url).length > 0 || hasUsableFileOutput(input.file_output)
  const hasResult = hasText || hasFiles

  const progressPercent =
    typeof input.progress_percent === 'number' && Number.isFinite(input.progress_percent)
      ? input.progress_percent
      : 0

  const completionSignal =
    input.is_completed === true ||
    progressPercent >= 100 ||
    (typeof status === 'string' && COMPLETED_STATUSES.has(status))

  const failureSignal =
    (typeof status === 'string' && FAILED_STATUSES.has(status)) ||
    hasUsableText(input.error_message)

  if (hasResult && (completionSignal || input.allowResultOnlyCompletion === true)) {
    return {
      kind: 'completed',
      hasText,
      hasFiles,
      hasResult,
      completionSignal,
      failureSignal,
    }
  }

  if (failureSignal) {
    return {
      kind: 'failed',
      hasText,
      hasFiles,
      hasResult,
      completionSignal,
      failureSignal,
    }
  }

  return {
    kind: 'running',
    hasText,
    hasFiles,
    hasResult,
    completionSignal,
    failureSignal,
  }
}
