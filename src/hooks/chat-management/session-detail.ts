import type { Project, SessionDetail } from '@/types/api'

import type { ChatSession } from '../../types'
import { uid } from '../../utils/helpers'

export function createEmptyChatSession(): ChatSession {
  return {
    input: '',
    attachments: [],
    messages: [],
    associatedProjectId: undefined,
    associatedProjectName: undefined,
    sessionId: undefined,
  }
}

export function createChatSessionFromDetail(
  detail: SessionDetail,
  project: Project | null,
  previousSession: ChatSession,
  restoredProjectId: number | null,
): ChatSession {
  const sortedMessages = [...(detail.chatMessages ?? [])].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  )
  const mappedMessages = sortedMessages.map((message) => ({
    id: String(message.id ?? uid()),
    role: message.role,
    content: message.content,
    createdAt: message.createdAt,
  }))
  const isSameSession = detail.id === previousSession.sessionId

  return {
    ...previousSession,
    input: '',
    attachments: [],
    messages: mappedMessages,
    associatedProjectId: restoredProjectId ?? undefined,
    associatedProjectName:
      restoredProjectId !== null && project?.id === restoredProjectId ? project.name : undefined,
    sessionId: detail.id,
    conversationId:
      detail.conversationId !== undefined
        ? (detail.conversationId ?? null)
        : isSameSession
          ? (previousSession.conversationId ?? null)
          : null,
  }
}
