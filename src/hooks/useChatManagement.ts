import { useState, useCallback, useRef, useEffect } from 'react'

import { sessionService } from '@/api/services'
import { MAX_CHAT_ATTACHMENT_COUNT } from '@/constants/chatUpload'
import type { Project, SessionDetail } from '@/types/api'
import { stripThinkingContent } from '@/utils/chatContentSanitizer'
import { appendToChatInput, joinReadableSnippets } from '@/utils/chatInputAppend'

import type { ChatSession, ChatTabKey } from '../types'
import { uid } from '../utils/helpers'
import { createPresetSession } from './chat-management/presets'
import {
  createChatSessionFromDetail,
  createEmptyChatSession,
} from './chat-management/session-detail'
import { useChatRequestActions } from './chat-management/use-chat-request-actions'
import { useChatRequestState } from './chat-management/use-chat-request-state'
import { useChatflowPrompts } from './chat-management/use-chatflow-prompts'
import { createChatTabRecord, type ChatRequestSnapshot } from './chat-management/types'

export function useChatManagement(
  notify: (message: string) => void,
  setHistoryDialogOpen: (open: boolean) => void,
  onSessionLinked?: () => void,
  onWorkspaceProjectSelect?: (projectId: number | null) => void,
  openHistoryDialog?: (options?: { projectId?: number; type?: string; title?: string }) => void,
) {
  const chatflowPrompts = useChatflowPrompts()

  const createPresetSessionByMode = useCallback(
    (mode: ChatTabKey): ChatSession => createPresetSession(mode, chatflowPrompts),
    [chatflowPrompts],
  )

  const [chatSessions, setChatSessions] = useState<Record<ChatTabKey, ChatSession>>(() => ({
    general: {
      ...createPresetSessionByMode('general'),
      conversationId: null, // 用于chatflow的conversation_id
    },
    focus: {
      ...createPresetSessionByMode('focus'),
      conversationId: null, // 用于chatflow的conversation_id
    },
    image: {
      ...createPresetSessionByMode('image'),
      conversationId: null, // 用于chatflow的conversation_id
    },
  }))

  const [chatTab, setChatTab] = useState<ChatTabKey>('focus')

  // 当 chatflowPrompts 从 null 变为有值时，更新没有用户消息的 session 的提示语
  useEffect(() => {
    // 只在 chatflowPrompts 有值时才更新（避免初始化时覆盖）
    if (!chatflowPrompts) {
      return
    }

    let canceled = false
    queueMicrotask(() => {
      if (canceled) return
      setChatSessions((prev) => {
        const updated: Record<ChatTabKey, ChatSession> = {} as Record<ChatTabKey, ChatSession>
        let changed = false
        for (const mode of ['general', 'focus', 'image'] as ChatTabKey[]) {
          const session = prev[mode]
          if (session.sessionId) {
            updated[mode] = session
            continue
          }
          // 仅更新没有用户消息的 session 的欢迎语，避免清空草稿、附件和项目关联
          if (session.messages.filter((m) => m.role === 'user').length === 0) {
            const presetSession = createPresetSessionByMode(mode)
            const nextWelcomeMessage = presetSession.messages.find((message) => message.role === 'assistant')
            const currentWelcomeIndex = session.messages.findIndex(
              (message) => message.role === 'assistant',
            )

            if (!nextWelcomeMessage) {
              updated[mode] = session
              continue
            }

            if (currentWelcomeIndex === -1) {
              updated[mode] = {
                ...session,
                messages: [nextWelcomeMessage, ...session.messages],
              }
              changed = true
              continue
            }

            if (session.messages[currentWelcomeIndex]?.content === nextWelcomeMessage.content) {
              updated[mode] = session
              continue
            }

            updated[mode] = {
              ...session,
              messages: session.messages.map((message, index) =>
                index === currentWelcomeIndex
                  ? { ...message, content: nextWelcomeMessage.content }
                  : message,
              ),
            }
            changed = true
          } else {
            updated[mode] = session
          }
        }
        return changed ? updated : prev
      })
    })

    return () => {
      canceled = true
    }
  }, [chatflowPrompts, createPresetSessionByMode])

  const {
    chatLoadingByTab,
    chatLoadingRef,
    abortControllerRef,
    chatErrorByTab,
    setChatLoadingForTab,
    setChatErrorForTab,
    startChatRequestForTab,
    isLatestChatRequest,
    invalidateChatRequestsForTab,
  } = useChatRequestState()
  const chatInputRef = useRef<Record<ChatTabKey, string>>(createChatTabRecord(() => ''))
  const projectAssociationRequestRef = useRef<Record<ChatTabKey, number>>(
    createChatTabRecord(() => 0),
  )

  // 存储每条用户消息的原始请求快照，用于 regenerateChat 时复用附件和会话上下文
  const originalRequestSnapshotRef = useRef<Map<string, ChatRequestSnapshot>>(new Map())

  // ref 缓存最新 chatSessions，避免闭包陷阱
  const chatSessionsRef = useRef(chatSessions)
  useEffect(() => {
    chatSessionsRef.current = chatSessions
  }, [chatSessions])

  const cleanupRequestSnapshotsForTab = useCallback((tab: ChatTabKey): void => {
    const session = chatSessionsRef.current[tab]
    if (!session) return

    for (const message of session.messages) {
      if (message.role === 'user') {
        originalRequestSnapshotRef.current.delete(message.id)
      }
    }
  }, [])

  // Read menu state
  const [readMenuOpen, setReadMenuOpen] = useState(false)
  const readMenuBtnRef = useRef<HTMLButtonElement>(null)
  const readMenuRef = useRef<HTMLDivElement>(null)

  const chatSession = chatSessions[chatTab]
  const chatInput = chatSession.input
  const chatAttachments = chatSession.attachments
  const chatLoading = chatLoadingByTab[chatTab] ?? false
  const chatError = chatErrorByTab[chatTab] ?? null
  useEffect(() => {
    chatInputRef.current = {
      ...chatInputRef.current,
      [chatTab]: chatInput,
    }
  }, [chatInput, chatTab])

  const updateChatSessionByTab = useCallback(
    (tab: ChatTabKey, updater: (prev: ChatSession) => ChatSession): void => {
      setChatSessions((prev) => ({
        ...prev,
        [tab]: updater(prev[tab]),
      }))
    },
    [],
  )

  const updateChatSession = useCallback(
    (updater: (prev: ChatSession) => ChatSession): void => {
      updateChatSessionByTab(chatTab, updater)
    },
    [chatTab, updateChatSessionByTab],
  )

  const changeChatInput = useCallback(
    (value: string): void => {
      chatInputRef.current = {
        ...chatInputRef.current,
        [chatTab]: value,
      }
      updateChatSession((prev) => ({ ...prev, input: value }))
    },
    [chatTab, updateChatSession],
  )

  const addChatAttachments = useCallback(
    (files: FileList | null, type: 'image' | 'file'): void => {
      if (chatLoadingRef.current[chatTab]) {
        return
      }

      const arr = Array.from(files || [])
      if (!arr.length) return

      const incomingAttachments = arr.map((f) => ({
        id: uid(),
        type,
        name: f.name,
        size: f.size,
        file: f,
      }))
      const currentAttachmentCount = chatSessionsRef.current[chatTab]?.attachments.length ?? 0
      const remainingSlots = Math.max(MAX_CHAT_ATTACHMENT_COUNT - currentAttachmentCount, 0)
      const acceptedAttachments = incomingAttachments.slice(0, remainingSlots)
      if (acceptedAttachments.length < incomingAttachments.length) {
        notify(
          `最多上传${MAX_CHAT_ATTACHMENT_COUNT}个文件，已保留前${MAX_CHAT_ATTACHMENT_COUNT}个`,
        )
      }
      if (!acceptedAttachments.length) return

      updateChatSession((prev) => {
        const nextAttachments = acceptedAttachments.slice(
          0,
          Math.max(MAX_CHAT_ATTACHMENT_COUNT - prev.attachments.length, 0),
        )
        if (!nextAttachments.length) {
          return prev
        }

        return {
          ...prev,
          attachments: [...prev.attachments, ...nextAttachments],
        }
      })
    },
    [chatLoadingRef, chatTab, notify, updateChatSession],
  )

  const removeChatAttachment = useCallback(
    (id: string): void => {
      if (chatLoadingRef.current[chatTab]) {
        return
      }

      updateChatSession((prev) => ({
        ...prev,
        attachments: prev.attachments.filter((att) => att.id !== id),
      }))
    },
    [chatLoadingRef, chatTab, updateChatSession],
  )

  const { sendChat, regenerateChat, cancelChatRequest } = useChatRequestActions({
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
  })

  const clearChat = useCallback((): void => {
    invalidateChatRequestsForTab(chatTab)
    cleanupRequestSnapshotsForTab(chatTab)
    setChatErrorForTab(chatTab, null)
    updateChatSession((prev) => ({
      ...prev,
      input: '',
      attachments: [],
      messages: prev.messages.slice(0, 1),
      // 所有使用 chatflow 的模式都重置 conversationId
      ...(chatTab === 'general' || chatTab === 'image' || chatTab === 'focus'
        ? { conversationId: null }
        : {}),
    }))
    notify('对话已清空')
  }, [
    chatTab,
    cleanupRequestSnapshotsForTab,
    invalidateChatRequestsForTab,
    notify,
    setChatErrorForTab,
    updateChatSession,
  ])

  const readFromGenerated = useCallback(
    (generated: string): void => {
      const text = stripThinkingContent(generated).trim()
      if (!text) {
        notify('暂无生成结果')
        setReadMenuOpen(false)
        return
      }
      updateChatSession((prev) => ({
        ...prev,
        input: appendToChatInput(prev.input, text),
      }))
      setReadMenuOpen(false)
      notify('已将生成结果追加到输入框末尾')
    },
    [notify, updateChatSession, setReadMenuOpen],
  )

  const startNewConversation = useCallback(() => {
    invalidateChatRequestsForTab(chatTab)
    cleanupRequestSnapshotsForTab(chatTab)
    setChatErrorForTab(chatTab, null)
    const nextSession = createPresetSessionByMode(chatTab)
    setChatSessions((prev) => ({
      ...prev,
      [chatTab]: nextSession,
    }))
    setReadMenuOpen(false)
    onWorkspaceProjectSelect?.(nextSession.associatedProjectId ?? null)
  }, [
    chatTab,
    cleanupRequestSnapshotsForTab,
    createPresetSessionByMode,
    invalidateChatRequestsForTab,
    onWorkspaceProjectSelect,
    setChatErrorForTab,
    setReadMenuOpen,
  ])

  const readFromHistory = useCallback((): void => {
    const currentSession = chatSessionsRef.current[chatTab]
    const projectId = currentSession?.associatedProjectId
    const projectName = currentSession?.associatedProjectName

    setReadMenuOpen(false)

    if (openHistoryDialog) {
      if (!projectId) {
        notify('请先关联项目后读取项目历史资料')
        return
      }

      openHistoryDialog({
        projectId,
        title: projectName ? `读取项目历史资料：${projectName}` : '读取项目历史资料',
      })
      return
    }

    setHistoryDialogOpen(true)
  }, [chatTab, notify, openHistoryDialog, setHistoryDialogOpen, setReadMenuOpen])

  const handleHistoryDataConfirm = useCallback(
    (selectedData: string[]): void => {
      const sanitizedData = selectedData.map(stripThinkingContent)
      const historyText = joinReadableSnippets(sanitizedData)
      if (historyText) {
        const readableCount = sanitizedData.filter((item) => item.trim().length > 0).length
        updateChatSession((prev) => ({
          ...prev,
          input: appendToChatInput(prev.input, historyText),
        }))
        notify(`已将 ${readableCount} 条历史资料追加到输入框末尾`)
      }
    },
    [notify, updateChatSession],
  )

  const setChatAssociatedProjectLocal = useCallback(
    (project: Project | null): void => {
      const currentSession = chatSessionsRef.current[chatTab]
      const nextProjectId = project?.id ?? undefined
      if (currentSession?.associatedProjectId === nextProjectId) {
        return
      }

      updateChatSession((prev) => ({
        ...prev,
        associatedProjectId: nextProjectId,
        associatedProjectName: project?.name ?? undefined,
      }))
    },
    [chatTab, updateChatSession],
  )

  const setChatAssociatedProject = useCallback(
    (project: Project | null): void => {
      const currentSession = chatSessionsRef.current[chatTab]
      const nextProjectId = project?.id ?? undefined
      if (currentSession?.associatedProjectId === nextProjectId) {
        return
      }

      const targetChatTab = chatTab
      const previousProjectId = currentSession?.associatedProjectId
      const previousProjectName = currentSession?.associatedProjectName
      const capturedSessionId = currentSession?.sessionId
      const requestId = projectAssociationRequestRef.current[targetChatTab] + 1
      projectAssociationRequestRef.current = {
        ...projectAssociationRequestRef.current,
        [targetChatTab]: requestId,
      }
      const isLatestProjectAssociation = (): boolean =>
        projectAssociationRequestRef.current[targetChatTab] === requestId

      setChatAssociatedProjectLocal(project)

      if (!capturedSessionId) {
        onWorkspaceProjectSelect?.(nextProjectId ?? null)
        return
      }

      void (async () => {
        try {
          if (nextProjectId) {
            await sessionService.associateProject(capturedSessionId, { projectId: nextProjectId })
          } else {
            await sessionService.dissociateProject(capturedSessionId)
          }
          if (!isLatestProjectAssociation()) {
            return
          }
          const latestSession = chatSessionsRef.current[targetChatTab]
          if (latestSession?.sessionId !== capturedSessionId) {
            return
          }
          if (latestSession?.associatedProjectId !== nextProjectId) {
            return
          }
          onSessionLinked?.()
          onWorkspaceProjectSelect?.(nextProjectId ?? null)
        } catch (error) {
          if (!isLatestProjectAssociation()) {
            return
          }
          const latestSession = chatSessionsRef.current[targetChatTab]
          if (latestSession?.sessionId !== capturedSessionId) {
            return
          }
          console.error('[useChatManagement] 更新会话关联项目失败', error)
          if (latestSession?.associatedProjectId === nextProjectId) {
            setChatSessions((prev) => {
              const targetSession = prev[targetChatTab]
              if (
                !targetSession ||
                targetSession.sessionId !== capturedSessionId ||
                targetSession.associatedProjectId !== nextProjectId
              ) {
                return prev
              }

              return {
                ...prev,
                [targetChatTab]: {
                  ...targetSession,
                  associatedProjectId: previousProjectId,
                  associatedProjectName: previousProjectName,
                },
              }
            })
            onWorkspaceProjectSelect?.(previousProjectId ?? null)
          }
          notify('更新会话关联项目失败，请稍后重试')
        }
      })()
    },
    [chatTab, notify, onSessionLinked, onWorkspaceProjectSelect, setChatAssociatedProjectLocal],
  )

  const hydrateChatSessionFromDetail = useCallback(
    (
      detail: SessionDetail,
      mode: ChatTabKey,
      project: Project | null,
      restoredProjectId: number | null,
    ): void => {
      invalidateChatRequestsForTab(mode)
      cleanupRequestSnapshotsForTab(mode)
      projectAssociationRequestRef.current = {
        ...projectAssociationRequestRef.current,
        [mode]: projectAssociationRequestRef.current[mode] + 1,
      }
      setChatErrorForTab(mode, null)

      setChatSessions((prev) => {
        const previousSession = prev[mode] ?? createEmptyChatSession()
        return {
          ...prev,
          [mode]: createChatSessionFromDetail(
            detail,
            project,
            previousSession,
            restoredProjectId,
          ),
        }
      })

      setChatTab(mode)

      onWorkspaceProjectSelect?.(restoredProjectId)
    },
    [
      cleanupRequestSnapshotsForTab,
      invalidateChatRequestsForTab,
      setChatErrorForTab,
      setChatSessions,
      setChatTab,
      onWorkspaceProjectSelect,
    ],
  )

  return {
    chatSessions,
    chatTab,
    setChatTab,
    chatSession,
    chatInput,
    chatAttachments,
    chatLoading,
    chatError,
    readMenuOpen,
    setReadMenuOpen,
    readMenuBtnRef,
    readMenuRef,
    changeChatInput,
    addChatAttachments,
    removeChatAttachment,
    sendChat,
    regenerateChat,
    cancelChatRequest,
    clearChat,
    readFromGenerated,
    readFromHistory,
    handleHistoryDataConfirm,
    setChatAssociatedProject,
    setChatAssociatedProjectLocal,
    hydrateChatSessionFromDetail,
    startNewConversation,
  }
}
