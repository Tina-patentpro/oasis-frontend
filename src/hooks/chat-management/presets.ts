import type { Project } from '@/types/api'

import type { ChatSession, ChatTabKey } from '../../types'
import { uid } from '../../utils/helpers'

type SessionProject = Pick<Project, 'id' | 'name'>

interface InitialMessage {
  role: 'user' | 'assistant'
  content: string
}

interface CreateChatSessionOptions {
  associatedProject?: SessionProject | null
  initialMessages?: InitialMessage[]
}

export const DEFAULT_PROMPTS: Record<string, string> = {
  通用对话: '你好，我已经准备好协助。是否需要先回顾上一轮交付中的重点？',
  工作聚焦: '早上好，请选择或关联项目后告诉我当前任务，我会协助拆解重点。',
  语义生图: '你好，请选择或关联项目后告诉我需要生成的附图主题与重点部件。',
}

function createChatSession(greeting: string, options?: CreateChatSessionOptions): ChatSession {
  const baseMessages =
    options?.initialMessages && options.initialMessages.length > 0
      ? options.initialMessages
      : [{ role: 'assistant' as const, content: greeting }]

  return {
    input: '',
    attachments: [],
    messages: baseMessages.map((message) => ({
      id: uid(),
      role: message.role,
      content: message.content,
    })),
    associatedProjectId: options?.associatedProject?.id ?? undefined,
    associatedProjectName: options?.associatedProject?.name ?? undefined,
    sessionId: undefined,
  }
}

export function createPresetSession(
  mode: ChatTabKey,
  chatflowPrompts: Record<string, string> | null,
): ChatSession {
  const currentPrompts = chatflowPrompts ?? DEFAULT_PROMPTS

  switch (mode) {
    case 'focus':
      return createChatSession('分享当前任务或难题,我可以协助拆解重点。', {
        initialMessages: [
          {
            role: 'assistant',
            content: currentPrompts['工作聚焦'] ?? DEFAULT_PROMPTS['工作聚焦'],
          },
        ],
      })
    case 'image':
      return createChatSession('描述你想生成的图像或风格,我会整理语义提示词。', {
        initialMessages: [
          {
            role: 'assistant',
            content: currentPrompts['语义生图'] ?? DEFAULT_PROMPTS['语义生图'],
          },
        ],
      })
    case 'general':
    default:
      return createChatSession(
        '你好,我是 AI 助手。告诉我正在编写的技术内容,我可以提供灵感与建议。',
        {
          initialMessages: [
            {
              role: 'assistant',
              content: currentPrompts['通用对话'] ?? DEFAULT_PROMPTS['通用对话'],
            },
          ],
        },
      )
  }
}
