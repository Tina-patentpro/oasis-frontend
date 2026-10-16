import type { ChatTabKey } from '../../types'

export const CHAT_TAB_KEYS: ChatTabKey[] = ['general', 'focus', 'image']

export type ChatflowFile = {
  type: 'document' | 'image' | 'audio' | 'video'
  transfer_method: 'remote_url'
  url: string
}

export type ChatRequestSnapshot = {
  query: string
  conversation_id: string | null
  type: number
  folder_id: number
  files?: ChatflowFile[]
}

export function createChatTabRecord<T>(valueFactory: () => T): Record<ChatTabKey, T> {
  return CHAT_TAB_KEYS.reduce(
    (record, tab) => ({
      ...record,
      [tab]: valueFactory(),
    }),
    {} as Record<ChatTabKey, T>,
  )
}
