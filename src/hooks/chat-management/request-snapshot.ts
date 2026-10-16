import type { ChatRequestSnapshot, ChatflowFile } from './types'

interface CreateChatRequestSnapshotParams {
  query: string
  conversationId: string | null
  type: number
  folderId: number
  files: ChatflowFile[]
}

export function createChatRequestSnapshot({
  query,
  conversationId,
  type,
  folderId,
  files,
}: CreateChatRequestSnapshotParams): ChatRequestSnapshot {
  return {
    query,
    conversation_id: conversationId,
    type,
    folder_id: folderId,
    files: files.length > 0 ? files : undefined,
  }
}

export function storeChatRequestSnapshot(
  snapshots: Map<string, ChatRequestSnapshot>,
  messageId: string,
  snapshot: ChatRequestSnapshot,
): void {
  snapshots.set(messageId, snapshot)
}

export function updateChatRequestSnapshotConversationId(
  snapshots: Map<string, ChatRequestSnapshot>,
  messageId: string,
  conversationId: string,
): void {
  const previousSnapshot = snapshots.get(messageId)
  if (!previousSnapshot) {
    return
  }

  snapshots.set(messageId, {
    ...previousSnapshot,
    conversation_id: conversationId,
  })
}

export function getChatRequestSnapshotOrFallback(
  snapshots: Map<string, ChatRequestSnapshot>,
  messageId: string,
  fallback: ChatRequestSnapshot,
): ChatRequestSnapshot {
  return snapshots.get(messageId) ?? fallback
}
