// 3. 用户消息模块

export interface NotificationAction {
  label: string
  handler: () => void
}

export interface Notification {
  id: number
  userId?: number
  type?: 'info' | 'success' | 'warning' | 'error'
  title: string
  message: string
  read: boolean
  persistent?: boolean
  action?: NotificationAction
  createdAt: string
}

export interface MarkNotificationReadRequest {
  id: number
}

export interface UserMessage {
  id: number
  title: string
  content: string
  is_read: number
  created_at: string
}

export interface GetUserMessageListRequest {
  page: number
  limit: number
  type: number
}

export interface GetUserMessageListResponse {
  total: number
  items: UserMessage[]
}
