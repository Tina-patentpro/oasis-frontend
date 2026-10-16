// 聊天相关类型定义

export interface ChatTab {
  key: string
  label: string
  hint: string
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt?: string
}

export interface Attachment {
  id: string
  type: 'image' | 'file'
  name: string
  size: number
  file: File
}

export interface ChatSession {
  input: string
  attachments: Attachment[]
  messages: Message[]
  associatedProjectId?: number
  associatedProjectName?: string
  sessionId?: number
  conversationId?: string | null // 用于chatflow的conversation_id
}

export type ChatTabKey = 'general' | 'image' | 'focus'
