import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from 'react'

import { prependToChatInput } from '@/utils/chatInputAppend'

import type { ChatTabKey } from '../../types'

import {
  DEFAULT_TEXTAREA_HEIGHT_PRESET,
  MIN_TEXTAREA_HEIGHT,
  type TextareaHeightPresetKey,
} from './ChatPanel.constants'
import { clampChatInput, getTextareaHeight } from './ChatPanel.helpers'

interface UseChatPanelComposerStateArgs {
  chatTab: ChatTabKey
  sessionInput: string
  sessionId?: number
  currentTextareaHeightPreset: TextareaHeightPresetKey
  onInputChange: (value: string) => void
  sendChat: (inputOverride?: string) => void
  clearChat: () => void
  onStartNewConversation: () => void
  notifyRef: { current: (message: string) => void }
  clearChatButtonRef: RefObject<HTMLButtonElement | null>
  newConversationButtonRef: RefObject<HTMLButtonElement | null>
  setClearConfirmOpen: (open: boolean) => void
  setNewConversationConfirmOpen: (open: boolean) => void
}

export function useTextareaHeightPreset(chatTab: ChatTabKey): {
  currentTextareaHeightPreset: TextareaHeightPresetKey
  handleTextareaHeightPresetChange: (preset: TextareaHeightPresetKey) => void
} {
  const [textareaHeightPresetByTab, setTextareaHeightPresetByTab] = useState<
    Record<ChatTabKey, TextareaHeightPresetKey>
  >(() => ({
    focus: DEFAULT_TEXTAREA_HEIGHT_PRESET,
    image: DEFAULT_TEXTAREA_HEIGHT_PRESET,
    general: DEFAULT_TEXTAREA_HEIGHT_PRESET,
  }))
  const currentTextareaHeightPreset =
    textareaHeightPresetByTab[chatTab] ?? DEFAULT_TEXTAREA_HEIGHT_PRESET

  const handleTextareaHeightPresetChange = useCallback(
    (preset: TextareaHeightPresetKey) => {
      setTextareaHeightPresetByTab((prev) => {
        if (prev[chatTab] === preset) return prev
        return {
          ...prev,
          [chatTab]: preset,
        }
      })
    },
    [chatTab],
  )

  return { currentTextareaHeightPreset, handleTextareaHeightPresetChange }
}

export function useChatPanelComposerState({
  chatTab,
  sessionInput,
  sessionId,
  currentTextareaHeightPreset,
  onInputChange,
  sendChat,
  clearChat,
  onStartNewConversation,
  notifyRef,
  clearChatButtonRef,
  newConversationButtonRef,
  setClearConfirmOpen,
  setNewConversationConfirmOpen,
}: UseChatPanelComposerStateArgs) {
  const [localInput, setLocalInput] = useState(sessionInput)
  const localInputRef = useRef(sessionInput)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const setLocalInputValue = useCallback((value: string) => {
    const nextValue = clampChatInput(value)
    localInputRef.current = nextValue
    setLocalInput(nextValue)
    return nextValue
  }, [])

  const handleTextareaReady = useCallback(
    (textarea: HTMLTextAreaElement) => {
      textarea.style.height = `${MIN_TEXTAREA_HEIGHT}px`
      const next = getTextareaHeight(textarea.scrollHeight, currentTextareaHeightPreset)
      textarea.style.height = `${next}px`
    },
    [currentTextareaHeightPreset],
  )

  useLayoutEffect(() => {
    const el = textareaRef.current
    if (!el) return

    handleTextareaReady(el)
  }, [handleTextareaReady, localInput])

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
      debounceRef.current = null
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- preserve existing session input sync behavior.
    setLocalInputValue(sessionInput)
  }, [chatTab, sessionInput, sessionId, setLocalInputValue])

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
        debounceRef.current = null
      }
    }
  }, [])

  const emitInputChange = useCallback(
    (value: string) => {
      const nextValue = clampChatInput(value)
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
        debounceRef.current = null
      }
      onInputChange(nextValue)
    },
    [onInputChange],
  )

  const focusTextarea = useCallback(() => {
    textareaRef.current?.focus()
  }, [])

  const prependInputAndNotify = useCallback(
    (query: string, skipWhenSame: boolean) => {
      const currentInput = localInputRef.current
      const nextInput = prependToChatInput(currentInput, query)
      if (skipWhenSame && nextInput === currentInput) {
        return
      }

      setLocalInputValue(nextInput)
      emitInputChange(nextInput)

      if (typeof window.requestAnimationFrame === 'function') {
        window.requestAnimationFrame(focusTextarea)
      } else {
        focusTextarea()
      }

      notifyRef.current('已插入到输入框开头，请检查后发送')
    },
    [emitInputChange, focusTextarea, notifyRef, setLocalInputValue],
  )

  const handleInputChange = useCallback(
    (value: string) => {
      const nextValue = setLocalInputValue(value)
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
      debounceRef.current = setTimeout(() => {
        onInputChange(nextValue)
        debounceRef.current = null
      }, 250)
    },
    [onInputChange, setLocalInputValue],
  )

  const handleOasisActionFill = useCallback(
    (query: string) => {
      prependInputAndNotify(query, false)
    },
    [prependInputAndNotify],
  )

  const handleSuggestionPrepend = useCallback(
    (query: string) => {
      prependInputAndNotify(query, true)
    },
    [prependInputAndNotify],
  )

  const handleInstructionPrepend = useCallback(
    (content: string) => {
      const nextValue = prependToChatInput(localInputRef.current, content)
      handleInputChange(nextValue)
    },
    [handleInputChange],
  )

  const commitLocalInput = useCallback(() => {
    emitInputChange(localInputRef.current)
  }, [emitInputChange])

  const handleSendChat = useCallback(() => {
    const currentInput = localInputRef.current
    emitInputChange(currentInput)
    sendChat(currentInput)
  }, [emitInputChange, sendChat])

  const handleClearChatConfirm = useCallback(() => {
    setClearConfirmOpen(false)
    setLocalInputValue('')
    emitInputChange('')
    clearChat()
    clearChatButtonRef.current?.focus()
  }, [clearChat, clearChatButtonRef, emitInputChange, setClearConfirmOpen, setLocalInputValue])

  const handleStartNewConversation = useCallback(() => {
    if (localInputRef.current.trim()) {
      setNewConversationConfirmOpen(true)
      return
    }
    setLocalInputValue('')
    emitInputChange('')
    onStartNewConversation()
    newConversationButtonRef.current?.focus()
  }, [
    emitInputChange,
    newConversationButtonRef,
    onStartNewConversation,
    setLocalInputValue,
    setNewConversationConfirmOpen,
  ])

  const handleNewConversationConfirm = useCallback(() => {
    setNewConversationConfirmOpen(false)
    setLocalInputValue('')
    emitInputChange('')
    onStartNewConversation()
    newConversationButtonRef.current?.focus()
  }, [
    emitInputChange,
    newConversationButtonRef,
    onStartNewConversation,
    setLocalInputValue,
    setNewConversationConfirmOpen,
  ])

  return {
    localInput,
    textareaRef,
    handleTextareaReady,
    handleInputChange,
    handleOasisActionFill,
    handleSuggestionPrepend,
    handleInstructionPrepend,
    commitLocalInput,
    handleSendChat,
    handleClearChatConfirm,
    handleStartNewConversation,
    handleNewConversationConfirm,
  }
}
