import type { ChatSession } from '../../types'
import { uid } from '../../utils/helpers'

import { formatAssistantContent } from './message-format'

interface ChatflowConversationResponse {
  conversation_id?: string
}

interface ChatflowAssistantResponse {
  answer?: string
  answer_text?: string
  content?: string
  text?: string
  output?: string
  result?: string
  error?: string
}

interface ChatflowConversationUpdate {
  nextConversationId: string | null
  createdConversation: boolean
}

export function resolveChatflowConversationUpdate(
  response: ChatflowConversationResponse,
  previousConversationId: string | null,
): ChatflowConversationUpdate {
  const nextConversationId =
    typeof response.conversation_id === 'string' && response.conversation_id !== ''
      ? response.conversation_id
      : null
  const hasPreviousConversationId =
    typeof previousConversationId === 'string' && previousConversationId.length > 0

  return {
    nextConversationId,
    createdConversation: !hasPreviousConversationId && nextConversationId !== null,
  }
}

export function appendChatflowAssistantMessage(
  session: ChatSession,
  response: ChatflowAssistantResponse,
  options: { restoreImages?: boolean } = {},
): ChatSession {
  return {
    ...session,
    messages: [
      ...session.messages,
      {
        id: uid(),
        role: 'assistant',
        content: formatAssistantContent(response, options),
        createdAt: new Date().toISOString(),
      },
    ],
  }
}
