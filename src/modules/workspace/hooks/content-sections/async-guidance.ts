type AsyncGuidanceStatus = 'queued' | 'running' | 'timeout' | 'failed'

// 匹配明确的异步占位符短语，避免误匹配专利正文中的常用词（如"处理方法"、"通知单元"）
// 要求复合词或明确的占位措辞，而非单独的"处理"/"通知"等通用词
const ASYNC_TEXT_PATTERN =
  /异步(?:处理|任务|执行|生成|提交)|请(?:稍后查看|等待处理|等待通知)|处理中[，,。.\s]*请|后台(?:处理|生成|执行)(?:中|完成后)|任务(?:已提交|排队中|进行中)|正在(?:异步)?生成中/i

function formatSubmittedAt(value: Date | undefined): string {
  const date = value ?? new Date()
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  const hh = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')
  const ss = String(date.getSeconds()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`
}

function getStatusLabel(status: AsyncGuidanceStatus): string {
  if (status === 'queued') return '排队中'
  if (status === 'running') return '处理中'
  if (status === 'timeout') return '等待超时'
  return '处理失败'
}

function quoteAsMarkdownBlock(text: string): string {
  return text
    .split('\n')
    .map((line) => `> ${line}`)
    .join('\n')
}

function buildSteps(status: AsyncGuidanceStatus): string[] {
  if (status === 'queued' || status === 'running') {
    return [
      '你可以继续填写其他参数或切换到其他工具，无需停留在当前页面等待。',
      '任务完成后会在通知中心提示，并自动刷新对应会话列表。',
      '可在历史记录中查看最新结果与下载文件。',
    ]
  }
  if (status === 'timeout') {
    return [
      '当前任务可能仍在后台执行，请先查看通知中心或历史记录是否已有结果。',
      '如长时间无结果，可重新发起生成。',
      '如需排查，请记录任务编号并联系支持同事。',
    ]
  }
  return [
    '请先检查输入参数是否完整、文件是否可访问。',
    '修正后可重新点击生成发起任务。',
    '如持续失败，请携带任务编号联系支持同事。',
  ]
}

export function isLikelyAsyncPlaceholderText(text: string): boolean {
  return ASYNC_TEXT_PATTERN.test(text || '')
}

export function resolveAsyncGuidanceStatus(params: {
  workflowStatus?: string
  backendText?: string
}): AsyncGuidanceStatus | null {
  const workflowStatus = (params.workflowStatus || '').toLowerCase()
  if (workflowStatus === 'queued') return 'queued'
  if (workflowStatus === 'running') return 'running'
  if (workflowStatus === 'failed' || workflowStatus === 'cancelled') return 'failed'
  if (isLikelyAsyncPlaceholderText(params.backendText || '')) return 'running'
  return null
}

export function buildAsyncGuidanceFollowUpMarkdown(params: {
  taskKey: string
  toolName: string
  status: AsyncGuidanceStatus
  submittedAt?: Date
}): string {
  const steps = buildSteps(params.status)
  const stepLines = steps.map((item, index) => `${index + 1}. ${item}`).join('\n')

  return [
    '## 异步任务执行指引',
    '',
    '### 当前状态',
    `- 任务编号：\`${params.taskKey}\``,
    `- 工具：${params.toolName}`,
    `- 状态：${getStatusLabel(params.status)}`,
    `- 提交时间：${formatSubmittedAt(params.submittedAt)}`,
    '',
    '### 下一步建议',
    stepLines,
  ].join('\n')
}

export function buildAsyncGuidanceMarkdown(params: {
  taskKey: string
  toolName: string
  status: AsyncGuidanceStatus
  submittedAt?: Date
  backendMessage?: string
}): string {
  const followUp = buildAsyncGuidanceFollowUpMarkdown(params)
  const backendMessage = (params.backendMessage || '').trim()
  if (!backendMessage) {
    return followUp
  }

  return [followUp, '', '### 后端返回原文', quoteAsMarkdownBlock(backendMessage)].join('\n')
}

export function extractBackendAsyncNoticeMarkdown(payload: {
  outputs?: Record<string, unknown>
  rawResponse?: unknown
}): string | null {
  const outputs = payload.outputs || {}
  const rawRecord =
    payload.rawResponse &&
    typeof payload.rawResponse === 'object' &&
    !Array.isArray(payload.rawResponse)
      ? (payload.rawResponse as Record<string, unknown>)
      : {}

  const candidates: unknown[] = [
    outputs['async_notice_markdown'],
    outputs['async_notice'],
    rawRecord['async_notice_markdown'],
    rawRecord['async_notice'],
  ]

  for (const item of candidates) {
    if (typeof item === 'string' && item.trim().length > 0) {
      return item.trim()
    }
    if (item && typeof item === 'object' && !Array.isArray(item)) {
      const record = item as Record<string, unknown>
      const nested = record['markdown'] || record['message']
      if (typeof nested === 'string' && nested.trim().length > 0) {
        return nested.trim()
      }
    }
  }

  return null
}
