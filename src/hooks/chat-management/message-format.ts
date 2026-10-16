import type { ChatTabKey } from '../../types'
import { buildRestoredChatflowImageContent } from '../../utils/chatflow-image-content'

const NL = '\n'

interface AssistantResponse {
  answer?: string
  answer_text?: string
  content?: string
  text?: string
  output?: string
  result?: string
  error?: string
  file_url?: unknown
  fileUrl?: unknown
  file_output?: Array<Record<string, unknown>>
  fileOutput?: Array<Record<string, unknown>>
}

interface FormatAssistantContentOptions {
  restoreImages?: boolean
}

function unwrapSingleBacktickText(value: string): string {
  if (
    value.startsWith('`') &&
    value.endsWith('`') &&
    !value.startsWith('```') &&
    !value.endsWith('```')
  ) {
    return value.slice(1, -1)
  }

  return value
}

export function buildAttachmentLines(
  attachments: Array<{ type: 'image' | 'file'; name: string }>,
): string {
  return attachments
    .map((att) => `[${att.type === 'image' ? '图片' : '文件'}] ${att.name}`)
    .join(NL)
}

export function buildChatPayload(text: string, attachmentLines: string): string {
  return text && attachmentLines ? `${text}${NL}${attachmentLines}` : text || attachmentLines
}

export function getChatflowType(mode: ChatTabKey): 1 | 2 | 3 {
  return mode === 'focus' ? 1 : mode === 'image' ? 2 : 3
}

export function formatAssistantContent(
  response: AssistantResponse,
  options: FormatAssistantContentOptions = {},
): string {
  const contentCandidate = [
    response.answer,
    response.answer_text,
    response.content,
    response.text,
    response.output,
    response.result,
  ].find((value) => typeof value === 'string' && value.trim().length > 0)

  const text =
    typeof contentCandidate === 'string'
      ? unwrapSingleBacktickText(contentCandidate).replace(/\)\s*!\[/g, ')\n\n![')
      : ''
  if (options.restoreImages) {
    const contentWithImages = buildRestoredChatflowImageContent({
      answerText: text,
      fileUrl: response.file_url ?? response.fileUrl,
      fileOutput: response.file_output ?? response.fileOutput,
    })
    if (contentWithImages.trim()) {
      return contentWithImages
    }
  }

  if (typeof contentCandidate === 'string') {
    return text
  }

  if (response.error) {
    return `错误: ${response.error}`
  }

  return '未知错误：未收到响应'
}
