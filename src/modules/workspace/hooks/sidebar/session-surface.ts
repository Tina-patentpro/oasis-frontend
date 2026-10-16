import type { Session, SessionDetail } from '@/types/api'

export type SessionSurface = 'chat' | 'workflow'

export type SessionLoadFailureReason =
  | 'detail-load'
  | 'chat-mode-hidden'
  | 'chat-handler-unavailable'
  | 'restore-failed'

export type ChatSessionRestoreResult =
  | { status: 'restored' }
  | { status: 'blocked'; reason: 'hidden-mode' | 'handler-unavailable' }

export type SessionLoadResult =
  | {
      status: 'loaded'
      sessionId: number
      surface: SessionSurface
      restoredProjectId: number | null
    }
  | { status: 'stale'; sessionId: number }
  | { status: 'failed'; sessionId: number; reason: SessionLoadFailureReason }

function isChatToolType(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.startsWith('chat.')
}

export function resolveSessionSurface(
  session: Session,
  detail?: SessionDetail,
): SessionSurface {
  if (typeof detail?.type === 'number') {
    return detail.type === 2 ? 'chat' : 'workflow'
  }
  if (typeof session.type === 'number') {
    return session.type === 2 ? 'chat' : 'workflow'
  }
  if (isChatToolType(detail?.toolType) || isChatToolType(session.toolType)) {
    return 'chat'
  }
  if (detail?.conversationId?.trim() || session.conversationId?.trim()) {
    return 'chat'
  }
  return 'workflow'
}
