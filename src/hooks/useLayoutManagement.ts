import { useState, useEffect, useRef, useCallback } from 'react'

import { clampChatPanelWidth, MIN_CHAT_PANEL_WIDTH } from '@/utils/chatPanelWidth'

import type { LayoutMode } from '../types'

export function useLayoutManagement(
  layoutMode: LayoutMode,
  showSidebar: boolean,
  chatWidth: number,
  setChatWidth: (width: number) => void,
  LEFT_SIDEBAR_WIDTH: number,
  chatMode: 'off' | 'quarter' | 'full',
) {
  const [appliedLayout, setAppliedLayout] = useState<'horizontal' | 'vertical' | 'contrast'>(
    'horizontal',
  )
  const middleRef = useRef<HTMLDivElement>(null)
  const layoutRef = useRef<HTMLDivElement>(null)
  const chatDrag = useRef({
    active: false,
    startX: 0,
    startWidth: chatWidth,
    _touchMove: null as ((e: TouchEvent) => void) | null,
    _touchEnd: null as (() => void) | null,
    _touchCancel: null as (() => void) | null,
  })
  const chatWidthRef = useRef(chatWidth)

  useEffect(() => {
    chatWidthRef.current = chatWidth
  }, [chatWidth])

  // Store latest layout params in refs so move/up handlers always see current values
  const chatModeRef = useRef(chatMode)
  useEffect(() => {
    chatModeRef.current = chatMode
  }, [chatMode])
  const showSidebarRef = useRef(showSidebar)
  useEffect(() => {
    showSidebarRef.current = showSidebar
  }, [showSidebar])

  // Update applied layout based on container width and mode
  useEffect(() => {
    const update = () => {
      const width = middleRef.current?.clientWidth || 0
      if (layoutMode === 'contrast') setAppliedLayout('contrast')
      else if (layoutMode === 'vertical') setAppliedLayout('vertical')
      else setAppliedLayout(width < 60 * 16 ? 'vertical' : 'horizontal')
    }
    const ro = new ResizeObserver(update)
    if (middleRef.current) ro.observe(middleRef.current)
    update()
    return () => ro.disconnect()
  }, [layoutMode])

  // Shared move/up logic for both mouse and touch
  const getBoundedChatWidth = useCallback(
    (width: number) => {
      const totalWidth =
        typeof window !== 'undefined' ? window.innerWidth : MIN_CHAT_PANEL_WIDTH * 4
      return clampChatPanelWidth(width, {
        totalWidth,
        chatMode: chatModeRef.current,
        showSidebar: showSidebarRef.current,
        leftSidebarWidth: LEFT_SIDEBAR_WIDTH,
      })
    },
    [LEFT_SIDEBAR_WIDTH],
  )

  const computeNextWidth = useCallback(
    (clientX: number) => {
      const next = getBoundedChatWidth(
        chatDrag.current.startWidth + (chatDrag.current.startX - clientX),
      )
      setChatWidth(next)
    },
    [getBoundedChatWidth, setChatWidth],
  )

  const stopDrag = useCallback(() => {
    chatDrag.current.active = false
  }, [])

  // Mouse listeners — always active (no passive concern)
  useEffect(() => {
    const move = (e: MouseEvent): void => {
      if (!chatDrag.current.active) return
      computeNextWidth(e.clientX)
    }
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', stopDrag)
    return () => {
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup', stopDrag)
    }
  }, [computeNextWidth, stopDrag])

  // Touch listeners — only added during active drag to avoid Chrome passive warnings
  useEffect(() => {
    const touchMove = (e: TouchEvent): void => {
      if (!chatDrag.current.active) return
      if (e.cancelable) {
        e.preventDefault() // prevent scroll during drag
      }
      computeNextWidth(e.touches[0].clientX)
    }
    const stopTouchDrag = (): void => {
      if (!chatDrag.current.active) return
      stopDrag()
      // Remove self once drag ends
      window.removeEventListener('touchmove', touchMove)
      window.removeEventListener('touchend', stopTouchDrag)
      window.removeEventListener('touchcancel', stopTouchDrag)
    }

    // Store refs so startChatDrag can attach them
    chatDrag.current._touchMove = touchMove
    chatDrag.current._touchEnd = stopTouchDrag
    chatDrag.current._touchCancel = stopTouchDrag

    return () => {
      window.removeEventListener('touchmove', touchMove)
      window.removeEventListener('touchend', stopTouchDrag)
      window.removeEventListener('touchcancel', stopTouchDrag)
    }
  }, [computeNextWidth, stopDrag])

  // Start drag handler — attaches touch listeners on demand
  const startChatDrag = (e: React.MouseEvent | React.TouchEvent): void => {
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    chatDrag.current = {
      ...chatDrag.current,
      active: true,
      startX: clientX,
      startWidth: chatWidthRef.current,
    }
    if (!('touches' in e)) {
      e.preventDefault()
    }
    // Attach touch listeners only when touch drag starts
    if ('touches' in e && chatDrag.current._touchMove) {
      window.addEventListener('touchmove', chatDrag.current._touchMove, { passive: false })
      window.addEventListener('touchend', chatDrag.current._touchEnd!)
      window.addEventListener('touchcancel', chatDrag.current._touchCancel!)
    }
  }

  const resizeChatBy = useCallback(
    (delta: number): void => {
      const nextWidth = getBoundedChatWidth(chatWidthRef.current + delta)
      chatWidthRef.current = nextWidth
      setChatWidth(nextWidth)
    },
    [getBoundedChatWidth, setChatWidth],
  )

  return {
    appliedLayout,
    middleRef,
    layoutRef,
    startChatDrag,
    resizeChatBy,
  }
}
