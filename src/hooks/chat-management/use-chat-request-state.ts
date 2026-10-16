import { useCallback, useRef, useState } from 'react'

import type { ChatTabKey } from '../../types'

import { createChatTabRecord } from './types'

export function useChatRequestState() {
  const [chatLoadingByTab, setChatLoadingByTab] = useState<Record<ChatTabKey, boolean>>(() =>
    createChatTabRecord(() => false),
  )
  const chatLoadingRef = useRef<Record<ChatTabKey, boolean>>(createChatTabRecord(() => false))
  const abortControllerRef = useRef<Record<ChatTabKey, AbortController | null>>(
    createChatTabRecord(() => null),
  )
  const chatRequestVersionRef = useRef<Record<ChatTabKey, number>>(createChatTabRecord(() => 0))
  const [chatErrorByTab, setChatErrorByTab] = useState<Record<ChatTabKey, string | null>>(() =>
    createChatTabRecord(() => null),
  )

  const setChatLoadingForTab = useCallback((tab: ChatTabKey, loading: boolean): void => {
    chatLoadingRef.current = {
      ...chatLoadingRef.current,
      [tab]: loading,
    }

    setChatLoadingByTab((prev) => (prev[tab] === loading ? prev : { ...prev, [tab]: loading }))
  }, [])

  const setChatErrorForTab = useCallback((tab: ChatTabKey, error: string | null): void => {
    setChatErrorByTab((prev) => (prev[tab] === error ? prev : { ...prev, [tab]: error }))
  }, [])

  const startChatRequestForTab = useCallback((tab: ChatTabKey): number => {
    const nextVersion = chatRequestVersionRef.current[tab] + 1
    chatRequestVersionRef.current = {
      ...chatRequestVersionRef.current,
      [tab]: nextVersion,
    }
    return nextVersion
  }, [])

  const isLatestChatRequest = useCallback((tab: ChatTabKey, version: number): boolean => {
    return chatRequestVersionRef.current[tab] === version
  }, [])

  const invalidateChatRequestsForTab = useCallback(
    (tab: ChatTabKey): void => {
      chatRequestVersionRef.current = {
        ...chatRequestVersionRef.current,
        [tab]: chatRequestVersionRef.current[tab] + 1,
      }
      abortControllerRef.current[tab]?.abort()
      abortControllerRef.current = {
        ...abortControllerRef.current,
        [tab]: null,
      }
      setChatLoadingForTab(tab, false)
    },
    [setChatLoadingForTab],
  )

  return {
    chatLoadingByTab,
    chatLoadingRef,
    abortControllerRef,
    chatErrorByTab,
    setChatLoadingForTab,
    setChatErrorForTab,
    startChatRequestForTab,
    isLatestChatRequest,
    invalidateChatRequestsForTab,
  }
}
