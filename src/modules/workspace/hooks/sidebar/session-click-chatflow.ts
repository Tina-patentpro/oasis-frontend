import type { ChatTabKey } from '@/types'
import type { ChatMessage, Project, Session, SessionDetail } from '@/types/api'
import { parseChatflowInputType, resolveChatModeFromTitle } from '@/constants/tabs'

import {
  buildRestoredChatflowImageContent,
  mergeRestoredChatflowImageSources,
} from './chatflow-image-restore'
import type { ChatSessionSelectPayload } from './types'

function normalizeConversationId(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

export function buildChatflowSessionSelectPayload(params: {
  session: Session
  fullDetail: SessionDetail
  relatedProject: Project | null
  restoredProjectId: number | null
}): ChatSessionSelectPayload {
  const { session, fullDetail, relatedProject, restoredProjectId } = params
  const rawInputs = fullDetail.inputs ?? session.inputs
  const parsedInputs: Record<string, unknown> =
    typeof rawInputs === 'object' && rawInputs !== null && !Array.isArray(rawInputs)
      ? (rawInputs as Record<string, unknown>)
      : {}
  const userQuery = typeof parsedInputs.query === 'string' ? parsedInputs.query : ''
  const inputConversationId = normalizeConversationId(parsedInputs.conversation_id)
  const detailConversationId = normalizeConversationId(fullDetail.conversationId)
  const listConversationId = normalizeConversationId(session.conversationId)
  const conversationId = inputConversationId || detailConversationId || listConversationId

  const answerText = fullDetail.answer_text || session.answer_text || ''

  let normalizedMode: ChatTabKey = 'general'
  const detailInputType = parseChatflowInputType(parsedInputs.type)
  if (detailInputType === 1) {
    normalizedMode = 'focus'
  } else if (detailInputType === 2) {
    normalizedMode = 'image'
  } else if (detailInputType !== undefined) {
    normalizedMode = 'general'
  } else {
    const resolved = resolveChatModeFromTitle(session.title)
    if (resolved) {
      normalizedMode = resolved
    } else if (session.toolType?.startsWith('chat.')) {
      const [, rawMode] = session.toolType.split('.')
      if (rawMode === 'focus' || rawMode === 'image') {
        normalizedMode = rawMode as ChatTabKey
      }
    } else {
      console.warn(
        `[handleSessionClick] cannot infer chatflow mode: title="${session.title}", toolType="${session.toolType}"`,
      )
    }
  }

  const baseId = -(session.id * 1000000 + Date.now())
  const chatMessages: ChatMessage[] = []
  if (userQuery) {
    chatMessages.push({
      id: baseId,
      sessionId: session.id,
      role: 'user',
      content: userQuery,
      mode: normalizedMode as ChatMessage['mode'],
      createdAt: session.createdAt,
    })
  }
  const restoredImageSources = mergeRestoredChatflowImageSources({
    fileUrls: [fullDetail.file_url, session.file_url],
    fileOutputs: [fullDetail.file_output, session.file_output],
  })
  const assistantContent =
    normalizedMode === 'image'
      ? buildRestoredChatflowImageContent({
          answerText,
          fileUrl: restoredImageSources.fileUrl,
          fileOutput: restoredImageSources.fileOutput,
        })
      : answerText

  if (assistantContent) {
    chatMessages.push({
      id: baseId + 1,
      sessionId: session.id,
      role: 'assistant',
      content: assistantContent,
      mode: normalizedMode as ChatMessage['mode'],
      createdAt: session.createdAt,
    })
  }

  const sessionDetail: SessionDetail = {
    ...fullDetail,
    inputs: parsedInputs,
    outputs: [],
    chatMessages,
    conversationId,
  }

  return {
    tab: normalizedMode,
    project: relatedProject,
    session,
    detail: sessionDetail,
    restoredProjectId,
  }
}
