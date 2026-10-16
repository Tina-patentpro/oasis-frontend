import { useCallback, useEffect, useRef } from 'react'

import type { ChatMode } from '../stores'

import { getChatPanelWidthBounds } from '@/utils/chatPanelWidth'

import {
  getRestoredQuarterChatWidth,
  shouldUpdatePreferredQuarterChatWidth,
} from './workspace-chat-width'

interface UseWorkspaceChatWidthSyncParams {
  chatWidth: number
  preferredChatWidth?: number
  setChatWidth: (width: number) => void
  setAutoAdjustedChatWidth?: (width: number) => void
  chatMode: ChatMode
  showSidebar: boolean
  leftSidebarWidth: number
}

export function useWorkspaceChatWidthSync({
  chatWidth,
  preferredChatWidth,
  setChatWidth,
  setAutoAdjustedChatWidth,
  chatMode,
  showSidebar,
  leftSidebarWidth,
}: UseWorkspaceChatWidthSyncParams): void {
  const preferredChatWidthRef = useRef(preferredChatWidth ?? chatWidth)
  const pendingAutoAdjustedQuarterWidthRef = useRef<number | null>(null)
  const chatWidthRef = useRef(chatWidth)
  const chatModeRef = useRef(chatMode)
  const previousChatModeRef = useRef(chatMode)
  const showSidebarRef = useRef(showSidebar)

  useEffect(() => {
    chatWidthRef.current = chatWidth
    if (preferredChatWidth !== undefined) {
      preferredChatWidthRef.current = preferredChatWidth
    } else if (
      shouldUpdatePreferredQuarterChatWidth({
        chatMode,
        previousChatMode: previousChatModeRef.current,
        chatWidth,
        pendingAutoAdjustedWidth: pendingAutoAdjustedQuarterWidthRef.current,
      })
    ) {
      preferredChatWidthRef.current = chatWidth
    }
    if (
      pendingAutoAdjustedQuarterWidthRef.current !== null &&
      Math.abs(pendingAutoAdjustedQuarterWidthRef.current - chatWidth) <= 2
    ) {
      pendingAutoAdjustedQuarterWidthRef.current = null
    }
    previousChatModeRef.current = chatMode
    chatModeRef.current = chatMode
  }, [chatMode, chatWidth, preferredChatWidth])

  const syncChatWidthToViewport = useCallback(() => {
    if (typeof window === 'undefined') {
      return
    }

    const currentChatMode = chatModeRef.current
    if (currentChatMode === 'off') {
      return
    }

    const { availableWidth: available, maxWidth } = getChatPanelWidthBounds({
      totalWidth: window.innerWidth,
      chatMode: currentChatMode,
      showSidebar: showSidebarRef.current,
      leftSidebarWidth,
    })
    const currentChatWidth = chatWidthRef.current

    if (currentChatMode === 'full') {
      if (Math.abs(currentChatWidth - maxWidth) > 2) {
        chatWidthRef.current = maxWidth
        ;(setAutoAdjustedChatWidth ?? setChatWidth)(maxWidth)
      }
      return
    }

    const nextWidth = getRestoredQuarterChatWidth(preferredChatWidthRef.current, available)

    if (Math.abs(nextWidth - currentChatWidth) > 2) {
      pendingAutoAdjustedQuarterWidthRef.current = nextWidth
      chatWidthRef.current = nextWidth
      ;(setAutoAdjustedChatWidth ?? setChatWidth)(nextWidth)
    }
  }, [leftSidebarWidth, setAutoAdjustedChatWidth, setChatWidth])

  useEffect(() => {
    chatModeRef.current = chatMode
    showSidebarRef.current = showSidebar

    if (chatMode === 'off') {
      return
    }

    syncChatWidthToViewport()
    window.addEventListener('resize', syncChatWidthToViewport)
    return () => {
      window.removeEventListener('resize', syncChatWidthToViewport)
    }
  }, [chatMode, showSidebar, syncChatWidthToViewport])
}
