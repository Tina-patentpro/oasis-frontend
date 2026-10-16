import { useCallback } from 'react'
import type { MutableRefObject } from 'react'

import { aiService } from '@/api/services'

import type { ChatSession, ChatTabKey } from '../../types'
import { uid } from '../../utils/helpers'

import {
  buildAttachmentLines,
  buildChatPayload,
  getChatflowType,
} from './message-format'
import {
  appendChatflowAssistantMessage,
  resolveChatflowConversationUpdate,
} from './chatflow-response'
import {
  createChatRequestSnapshot,
  getChatRequestSnapshotOrFallback,
  storeChatRequestSnapshot,
  updateChatRequestSnapshotConversationId,
} from './request-snapshot'
import type { ChatRequestSnapshot } from './types'
import { uploadChatAttachments } from './upload-chat-attachments'

interface UseChatRequestActionsParams {
  chatTab: ChatTabKey
  notify: (message: string) => void
  onSessionLinked?: () => void
  chatSessionsRef: MutableRefObject<Record<ChatTabKey, ChatSession>>
  chatInputRef: MutableRefObject<Record<ChatTabKey, string>>
  chatLoadingRef: MutableRefObject<Record<ChatTabKey, boolean>>
  originalRequestSnapshotRef: MutableRefObject<Map<string, ChatRequestSnapshot>>
  abortControllerRef: MutableRefObject<Record<ChatTabKey, AbortController | null>>
  setChatLoadingForTab: (tab: ChatTabKey, loading: boolean) => void
  setChatErrorForTab: (tab: ChatTabKey, error: string | null) => void
  startChatRequestForTab: (tab: ChatTabKey) => number
  isLatestChatRequest: (tab: ChatTabKey, version: number) => boolean
  invalidateChatRequestsForTab: (tab: ChatTabKey) => void
  updateChatSessionByTab: (tab: ChatTabKey, updater: (prev: ChatSession) => ChatSession) => void
}

export function useChatRequestActions({
  chatTab,
  notify,
  onSessionLinked,
  chatSessionsRef,
  chatInputRef,
  chatLoadingRef,
  originalRequestSnapshotRef,
  abortControllerRef,
  setChatLoadingForTab,
  setChatErrorForTab,
  startChatRequestForTab,
  isLatestChatRequest,
  invalidateChatRequestsForTab,
  updateChatSessionByTab,
}: UseChatRequestActionsParams) {
  const sendChat = useCallback(
    (inputOverride?: string): void => {
      const targetChatTab = chatTab
      if (chatLoadingRef.current[targetChatTab]) return

      const targetSession = chatSessionsRef.current[targetChatTab]
      if (!targetSession) return

      const targetAttachments = [...targetSession.attachments]
      const text = (inputOverride ?? chatInputRef.current[targetChatTab] ?? '').trim()
      if (!text && targetAttachments.length === 0) return

      const attachmentLines = buildAttachmentLines(targetAttachments)
      const payload = buildChatPayload(text, attachmentLines)
      const conversationId = targetSession.conversationId ?? null
      const type = getChatflowType(targetChatTab)
      const folderId = targetSession.associatedProjectId ?? 0
      const requestVersion = startChatRequestForTab(targetChatTab)

      abortControllerRef.current[targetChatTab]?.abort()
      const controller = new AbortController()
      abortControllerRef.current = {
        ...abortControllerRef.current,
        [targetChatTab]: controller,
      }
      const { signal } = controller

      void (async () => {
        setChatLoadingForTab(targetChatTab, true)
        setChatErrorForTab(targetChatTab, null)
        try {
          const uploadResult = await uploadChatAttachments(targetAttachments, signal)
          if (uploadResult.status === 'aborted') {
            return
          }
          if (uploadResult.status === 'failed') {
            console.error('文件上传失败:', uploadResult.attachmentName, uploadResult.error)
            const failureMessage = `文件上传失败: ${uploadResult.attachmentName}`
            setChatErrorForTab(targetChatTab, failureMessage)
            notify(failureMessage)
            return
          }
          const { files } = uploadResult

          if (signal.aborted || !isLatestChatRequest(targetChatTab, requestVersion)) return

          const userMsgId = uid()
          const userCreatedAt = new Date().toISOString()
          const requestSnapshot = createChatRequestSnapshot({
            query: text || attachmentLines,
            conversationId,
            type,
            folderId,
            files,
          })
          storeChatRequestSnapshot(originalRequestSnapshotRef.current, userMsgId, requestSnapshot)
          updateChatSessionByTab(targetChatTab, (prev) => ({
            ...prev,
            input: '',
            attachments: [],
            messages: [
              ...prev.messages,
              { id: userMsgId, role: 'user', content: payload, createdAt: userCreatedAt },
            ],
          }))

          const response = await aiService.sendChatflow({
            ...requestSnapshot,
            signal,
          })

          if (signal.aborted || !isLatestChatRequest(targetChatTab, requestVersion)) return

          const { nextConversationId, createdConversation } = resolveChatflowConversationUpdate(
            response,
            conversationId,
          )

          if (nextConversationId !== null) {
            updateChatRequestSnapshotConversationId(
              originalRequestSnapshotRef.current,
              userMsgId,
              nextConversationId,
            )
            updateChatSessionByTab(targetChatTab, (prev) => ({
              ...prev,
              conversationId: nextConversationId,
            }))
          }

          if (createdConversation) {
            onSessionLinked?.()
          }

          updateChatSessionByTab(targetChatTab, (prev) =>
            appendChatflowAssistantMessage(prev, response, {
              restoreImages: targetChatTab === 'image',
            }),
          )

          if (response.error) {
            setChatErrorForTab(targetChatTab, response.error)
            notify(`对话失败: ${response.error}`)
          }
        } catch (error) {
          if (signal.aborted || !isLatestChatRequest(targetChatTab, requestVersion)) return
          console.error('Chatflow发送消息失败', error)
          const errorMessage = error instanceof Error ? error.message : '未知错误'
          setChatErrorForTab(targetChatTab, errorMessage)
          notify(`发送失败: ${errorMessage}`)
        } finally {
          if (
            abortControllerRef.current[targetChatTab] === controller &&
            isLatestChatRequest(targetChatTab, requestVersion)
          ) {
            abortControllerRef.current = {
              ...abortControllerRef.current,
              [targetChatTab]: null,
            }
            setChatLoadingForTab(targetChatTab, false)
          }
        }
      })()
    },
    [
      abortControllerRef,
      chatInputRef,
      chatLoadingRef,
      chatSessionsRef,
      chatTab,
      isLatestChatRequest,
      notify,
      onSessionLinked,
      originalRequestSnapshotRef,
      setChatErrorForTab,
      setChatLoadingForTab,
      startChatRequestForTab,
      updateChatSessionByTab,
    ],
  )

  const regenerateChat = useCallback((): void => {
    const targetChatTab = chatTab
    if (chatLoadingRef.current[targetChatTab]) return

    const session = chatSessionsRef.current[targetChatTab]
    const currentMessages = session.messages
    let lastUserIdx = -1
    for (let i = currentMessages.length - 1; i >= 0; i--) {
      if (currentMessages[i].role === 'user') {
        lastUserIdx = i
        break
      }
    }
    if (lastUserIdx === -1) return

    const lastUserContent = currentMessages[lastUserIdx].content
    const lastUserMessageId = currentMessages[lastUserIdx].id
    const trimmed = currentMessages.slice(0, lastUserIdx + 1)
    const requestVersion = startChatRequestForTab(targetChatTab)

    updateChatSessionByTab(targetChatTab, () => ({
      ...session,
      messages: trimmed,
    }))

    abortControllerRef.current[targetChatTab]?.abort()
    const controller = new AbortController()
    abortControllerRef.current = {
      ...abortControllerRef.current,
      [targetChatTab]: controller,
    }
    const { signal } = controller

    void (async () => {
      setChatLoadingForTab(targetChatTab, true)
      setChatErrorForTab(targetChatTab, null)
      try {
        const originalRequest = getChatRequestSnapshotOrFallback(
          originalRequestSnapshotRef.current,
          lastUserMessageId,
          createChatRequestSnapshot({
            query: lastUserContent,
            conversationId: session.conversationId ?? null,
            type: getChatflowType(targetChatTab),
            folderId: session.associatedProjectId ?? 0,
            files: [],
          }),
        )
        const response = await aiService.sendChatflow({
          ...originalRequest,
          signal,
        })

        if (signal.aborted || !isLatestChatRequest(targetChatTab, requestVersion)) return

        const { nextConversationId } = resolveChatflowConversationUpdate(
          response,
          originalRequest.conversation_id,
        )
        if (nextConversationId !== null) {
          storeChatRequestSnapshot(originalRequestSnapshotRef.current, lastUserMessageId, {
            ...originalRequest,
            conversation_id: nextConversationId,
          })
          updateChatSessionByTab(targetChatTab, (prev) => ({
            ...prev,
            conversationId: nextConversationId,
          }))
        }

        updateChatSessionByTab(targetChatTab, (prev) =>
          appendChatflowAssistantMessage(prev, response, {
            restoreImages: targetChatTab === 'image',
          }),
        )

        if (response.error) {
          setChatErrorForTab(targetChatTab, response.error)
          notify(`对话失败: ${response.error}`)
        }
      } catch (error) {
        if (signal.aborted || !isLatestChatRequest(targetChatTab, requestVersion)) return
        console.error('Regenerate失败:', error)
        const errorMessage = error instanceof Error ? error.message : '未知错误'
        setChatErrorForTab(targetChatTab, errorMessage)
        notify(`重新生成失败: ${errorMessage}`)
      } finally {
        if (
          abortControllerRef.current[targetChatTab] === controller &&
          isLatestChatRequest(targetChatTab, requestVersion)
        ) {
          abortControllerRef.current = {
            ...abortControllerRef.current,
            [targetChatTab]: null,
          }
          setChatLoadingForTab(targetChatTab, false)
        }
      }
    })()
  }, [
    abortControllerRef,
    chatLoadingRef,
    chatSessionsRef,
    chatTab,
    isLatestChatRequest,
    notify,
    originalRequestSnapshotRef,
    setChatErrorForTab,
    setChatLoadingForTab,
    startChatRequestForTab,
    updateChatSessionByTab,
  ])

  const cancelChatRequest = useCallback((): void => {
    if (!chatLoadingRef.current[chatTab]) {
      return
    }

    invalidateChatRequestsForTab(chatTab)
    setChatErrorForTab(chatTab, null)
    notify('已取消生成')
  }, [chatLoadingRef, chatTab, invalidateChatRequestsForTab, notify, setChatErrorForTab])

  return {
    sendChat,
    regenerateChat,
    cancelChatRequest,
  }
}
