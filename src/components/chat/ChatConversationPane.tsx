import type { CSSProperties, RefObject } from 'react'

import { Virtuoso, type VirtuosoHandle } from 'react-virtuoso'

import type { ChatSession, ChatTabKey, Message, Theme } from '../../types'
import { EmptyChatState } from './EmptyChatState'
import { MessageItem } from './ChatMessageItem'
import { TypingIndicator } from './TypingIndicator'

interface ChatConversationPaneProps {
  chatTab: ChatTabKey
  loading: boolean
  currentTheme: Theme
  searchOpen: boolean
  searchQuery: string
  onSearchQueryChange: (value: string) => void
  onSearchPrev: () => void
  onSearchNext: () => void
  onSearchClose: () => void
  searchMatchCount: number
  searchCurrentIndex: number
  session: ChatSession
  virtuosoRef: RefObject<VirtuosoHandle | null>
  onBottomStateChange: (atBottom: boolean) => void
  isMatch: (message: Message) => boolean
  onCopyMessage: (content: string) => void
  onRegenerate: () => void
  onCancelChatRequest?: () => void
  lastAssistantId?: string
  chatError?: string | null
  onSuggestionClick: (text: string) => void
  onOasisActionFill: (query: string) => void
  showScrollButton: boolean
  scrollButtonStyle: CSSProperties
  onScrollToBottom: () => void
}

interface ChatSearchBarProps {
  searchQuery: string
  onSearchQueryChange: (value: string) => void
  onSearchPrev: () => void
  onSearchNext: () => void
  onSearchClose: () => void
  searchMatchCount: number
  searchCurrentIndex: number
}

const ChatSearchBar = ({
  searchQuery,
  onSearchQueryChange,
  onSearchPrev,
  onSearchNext,
  onSearchClose,
  searchMatchCount,
  searchCurrentIndex,
}: ChatSearchBarProps) => (
  <div className="sticky top-0 z-10 bg-white border border-gray-200 rounded-lg px-3 py-2 mb-2 flex items-center gap-2 shadow-sm focus-within:ring-2 focus-within:ring-emerald-200">
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#9ca3af"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
    <input
      type="text"
      name="chat-search"
      value={searchQuery}
      onChange={(e) => {
        onSearchQueryChange(e.target.value)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          if (e.shiftKey) onSearchPrev()
          else onSearchNext()
        } else if (e.key === 'Escape') {
          e.preventDefault()
          onSearchClose()
        }
      }}
      placeholder="搜索对话内容…"
      aria-label="搜索对话内容"
      autoComplete="off"
      className="flex-1 text-sm outline-none bg-transparent"
      autoFocus
    />
    {searchQuery ? (
      <span
        className="text-xs text-gray-500 flex items-center gap-1"
        aria-live="polite"
        aria-atomic="true"
      >
        {searchMatchCount > 0
          ? `${searchCurrentIndex + 1}/${searchMatchCount}`
          : `${searchMatchCount} 条匹配`}
        {searchMatchCount > 1 ? (
          <>
            <button
              className="min-h-8 min-w-8 p-0.5 rounded hover:bg-gray-200 text-gray-500 hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300"
              onClick={onSearchPrev}
              aria-label="上一个匹配"
              type="button"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <polyline points="18 15 12 9 6 15" />
              </svg>
            </button>
            <button
              className="min-h-8 min-w-8 p-0.5 rounded hover:bg-gray-200 text-gray-500 hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300"
              onClick={onSearchNext}
              aria-label="下一个匹配"
              type="button"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
          </>
        ) : null}
      </span>
    ) : null}
    <button
      type="button"
      className="min-h-8 min-w-8 text-gray-500 hover:text-gray-600 p-0.5 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300"
      onClick={onSearchClose}
      aria-label="关闭搜索"
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    </button>
  </div>
)

interface ChatMessageListProps {
  chatTab: ChatTabKey
  loading: boolean
  currentTheme: Theme
  session: ChatSession
  virtuosoRef: RefObject<VirtuosoHandle | null>
  onBottomStateChange: (atBottom: boolean) => void
  isMatch: (message: Message) => boolean
  onCopyMessage: (content: string) => void
  onRegenerate: () => void
  lastAssistantId?: string
  chatError?: string | null
  onSuggestionClick: (text: string) => void
  onOasisActionFill: (query: string) => void
  showScrollButton: boolean
  scrollButtonStyle: CSSProperties
  onScrollToBottom: () => void
}

const ChatMessageList = ({
  chatTab,
  loading,
  currentTheme,
  session,
  virtuosoRef,
  onBottomStateChange,
  isMatch,
  onCopyMessage,
  onRegenerate,
  lastAssistantId,
  chatError,
  onSuggestionClick,
  onOasisActionFill,
  showScrollButton,
  scrollButtonStyle,
  onScrollToBottom,
}: ChatMessageListProps) => (
  <>
    {!loading &&
    (session.messages.length === 0 ||
      (session.sessionId === undefined &&
        session.messages.length === 1 &&
        session.messages[0]?.role === 'assistant')) ? (
      <EmptyChatState
        chatTab={chatTab}
        onSuggestionClick={onSuggestionClick}
        theme={currentTheme}
      />
    ) : (
      <Virtuoso
        ref={virtuosoRef}
        data={session.messages}
        initialTopMostItemIndex={Math.max(0, session.messages.length - 1)}
        followOutput={(isAtBottom) => (isAtBottom ? 'smooth' : false)}
        className="flex-1 min-h-0 px-4 py-3"
        role="log"
        aria-label="对话消息列表"
        aria-live={loading ? 'polite' : 'off'}
        aria-relevant="additions text"
        atBottomStateChange={onBottomStateChange}
        itemContent={(index, message) => {
          const match = isMatch(message)

          return (
            <div className="mb-3">
              <MessageItem
                message={message}
                theme={currentTheme}
                onCopy={onCopyMessage}
                onRegenerate={
                  message.role === 'assistant' && message.id === lastAssistantId
                    ? onRegenerate
                    : undefined
                }
                isLastAssistant={message.id === lastAssistantId}
                highlight={match}
                hasError={
                  !!(chatError && message.role === 'assistant' && message.id === lastAssistantId)
                }
                onOasisActionFill={onOasisActionFill}
                errorMessage={
                  chatError && message.role === 'assistant' && message.id === lastAssistantId
                    ? chatError
                    : undefined
                }
              />
              {index === session.messages.length - 1 && loading ? (
                <TypingIndicator theme={currentTheme} />
              ) : null}
            </div>
          )
        }}
      />
    )}
    {showScrollButton ? (
      <button
        type="button"
        className="sticky bottom-2 mx-auto block rounded-full px-3 py-1 text-xs font-medium shadow-md transition-opacity hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
        style={scrollButtonStyle}
        onClick={onScrollToBottom}
        aria-label="回到底部"
      >
        ↓ 回到底部
      </button>
    ) : null}
  </>
)

export const ChatConversationPane = ({
  chatTab,
  loading,
  currentTheme,
  searchOpen,
  searchQuery,
  onSearchQueryChange,
  onSearchPrev,
  onSearchNext,
  onSearchClose,
  searchMatchCount,
  searchCurrentIndex,
  session,
  virtuosoRef,
  onBottomStateChange,
  isMatch,
  onCopyMessage,
  onRegenerate,
  onCancelChatRequest,
  lastAssistantId,
  chatError,
  onSuggestionClick,
  onOasisActionFill,
  showScrollButton,
  scrollButtonStyle,
  onScrollToBottom,
}: ChatConversationPaneProps) => (
  <div
    key={chatTab}
    className="flex flex-1 min-h-0 flex-col overflow-hidden bg-gray-50 animate-fadeIn relative"
    role="tabpanel"
    aria-labelledby={`tab-${chatTab}`}
    id={`tabpanel-${chatTab}`}
  >
    {loading ? (
      <div
        className="sticky top-0 z-20 flex items-center justify-center gap-2 border-y border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-900 shadow-sm"
        role="status"
        aria-live="polite"
        aria-label="AI 正在生成回复，请稍候…"
      >
        <svg
          className="animate-spin h-4 w-4 flex-shrink-0"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
        <span>AI 正在生成回复，请稍候…</span>
        {onCancelChatRequest ? (
          <button
            type="button"
            className="rounded-full border border-amber-300 px-2 py-0.5 text-xs font-medium text-amber-900 transition-colors hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            onClick={onCancelChatRequest}
            aria-label="取消生成"
          >
            取消
          </button>
        ) : null}
      </div>
    ) : null}
    {searchOpen ? (
      <ChatSearchBar
        searchQuery={searchQuery}
        onSearchQueryChange={onSearchQueryChange}
        onSearchPrev={onSearchPrev}
        onSearchNext={onSearchNext}
        onSearchClose={onSearchClose}
        searchMatchCount={searchMatchCount}
        searchCurrentIndex={searchCurrentIndex}
      />
    ) : null}
    <ChatMessageList
      chatTab={chatTab}
      loading={loading}
      currentTheme={currentTheme}
      session={session}
      virtuosoRef={virtuosoRef}
      onBottomStateChange={onBottomStateChange}
      isMatch={isMatch}
      onCopyMessage={onCopyMessage}
      onRegenerate={onRegenerate}
      lastAssistantId={lastAssistantId}
      chatError={chatError}
      onSuggestionClick={onSuggestionClick}
      onOasisActionFill={onOasisActionFill}
      showScrollButton={showScrollButton}
      scrollButtonStyle={scrollButtonStyle}
      onScrollToBottom={onScrollToBottom}
    />
  </div>
)
