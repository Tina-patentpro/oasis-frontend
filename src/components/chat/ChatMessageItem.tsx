import { lazy, memo, Suspense, type CSSProperties } from 'react'

import { stripThinkingContent } from '@/utils/chatContentSanitizer'
import type { Message, Theme } from '../../types'
import { ComponentErrorBoundary } from '../error-boundaries'
import { Tooltip } from '../ui'

const ContentRenderer = lazy(() =>
  import('../ContentRenderer')
    .then((module) => ({
      default: module.ContentRenderer,
    }))
    .catch((error) => {
      console.error('[ChatMessageItem] Failed to load ContentRenderer chunk', {
        stage: 'chat-message-contentrenderer-import',
        chunk: '../ContentRenderer',
        errorName: error instanceof Error ? error.name : typeof error,
        errorMessage: error instanceof Error ? error.message : String(error),
        error,
      })
      throw error
    }),
)

function getMessageDate(message: Message): Date | null {
  if (message.createdAt) {
    const createdAtDate = new Date(message.createdAt)
    if (!Number.isNaN(createdAtDate.getTime())) {
      return createdAtDate
    }
  }

  const numericId = Number(message.id)
  if (!Number.isFinite(numericId)) {
    return null
  }

  const timestamp = numericId > 1e12 ? numericId : numericId > 1000000000 ? numericId * 1000 : null
  if (timestamp === null) {
    return null
  }

  const idDate = new Date(timestamp)
  return Number.isNaN(idDate.getTime()) ? null : idDate
}

const MESSAGE_TIME_FORMATTER = new Intl.DateTimeFormat('zh-CN', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

function formatMessageTime(message: Message): string {
  const date = getMessageDate(message)
  if (date) {
    return MESSAGE_TIME_FORMATTER.format(date)
  }

  return ''
}

interface MessageItemProps {
  message: Message
  theme: Theme
  onCopy?: (content: string) => void
  onRegenerate?: () => void
  isLastAssistant?: boolean
  highlight?: boolean
  hasError?: boolean
  errorMessage?: string
  onOasisActionFill?: (query: string) => void
}

const MESSAGE_BUBBLE_BASE_CLASS =
  'max-w-[85%] px-3 py-2 text-sm leading-relaxed rounded-2xl shadow-sm transition-transform duration-150 overflow-hidden'

function getMessageBubbleClassName(isUser: boolean, highlight: boolean): string {
  if (isUser) {
    return `${MESSAGE_BUBBLE_BASE_CLASS}${highlight ? ' ring-2 ring-yellow-300' : ''}`
  }

  return `${MESSAGE_BUBBLE_BASE_CLASS} bg-white text-gray-800 border border-gray-100${highlight ? ' ring-2 ring-yellow-300' : ''}`
}

function getMessageBubbleStyle(isUser: boolean, theme: Theme, hasError: boolean): CSSProperties {
  if (isUser) {
    return { backgroundColor: theme.primary, color: theme.primaryForeground ?? '#fff' }
  }

  return {
    borderColor: hasError ? '#ef4444' : `${theme.primary}26`,
    boxShadow: hasError ? '0 4px 12px #ef444414' : `0 8px 18px ${theme.primary}14`,
  }
}

interface AssistantMessageContentProps {
  content: string
  onOasisActionFill?: (query: string) => void
}

const AssistantMessageContent = ({ content, onOasisActionFill }: AssistantMessageContentProps) => (
  <ComponentErrorBoundary
    componentName="ContentRenderer"
    errorStage="chat-message-contentrenderer-import"
    chunkName="../ContentRenderer"
  >
    <Suspense
      fallback={
        <div className="whitespace-pre-wrap break-words">{stripThinkingContent(content)}</div>
      }
    >
      <ContentRenderer
        content={content}
        className="markdown-body"
        onOasisActionFill={onOasisActionFill}
      />
    </Suspense>
  </ComponentErrorBoundary>
)

interface AssistantMessageMetaProps {
  content: string
  messageTime: string
  hasError: boolean
  errorMessage?: string
  onCopy?: (content: string) => void
  onRegenerate?: () => void
  isLastAssistant?: boolean
}

const AssistantMessageMeta = ({
  content,
  messageTime,
  hasError,
  errorMessage,
  onCopy,
  onRegenerate,
  isLastAssistant,
}: AssistantMessageMetaProps) => (
  <div className="flex items-center gap-2 mt-1 px-1">
    {messageTime ? <span className="text-[10px] text-gray-500">{messageTime}</span> : null}
    {hasError ? (
      <span className="text-[10px] text-red-500" role="alert">
        {errorMessage ?? '生成失败'}
      </span>
    ) : null}
    {onCopy ? (
      <Tooltip content="复制回复内容">
        <button
          type="button"
          className="rounded px-1 text-[10px] text-gray-500 hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300"
          onClick={() => onCopy(content)}
        >
          复制
        </button>
      </Tooltip>
    ) : null}
    {onRegenerate && isLastAssistant ? (
      <Tooltip content="重新生成上一条回复">
        <button
          type="button"
          className="rounded px-1 text-[10px] text-gray-500 hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300"
          onClick={onRegenerate}
        >
          {hasError ? '重试' : '重新生成'}
        </button>
      </Tooltip>
    ) : null}
  </div>
)

export const MessageItem = memo<MessageItemProps>(
  ({
    message,
    theme,
    onCopy,
    onRegenerate,
    isLastAssistant,
    highlight,
    hasError,
    errorMessage,
    onOasisActionFill,
  }) => {
    const isUser = message.role === 'user'
    const messageTime = formatMessageTime(message)
    const assistantCopyContent = isUser ? message.content : stripThinkingContent(message.content)

    return (
      <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
        <div className={`group flex w-full flex-col ${isUser ? 'items-end' : 'items-start'}`}>
          <div
            className={getMessageBubbleClassName(isUser, !!highlight)}
            style={getMessageBubbleStyle(isUser, theme, !!hasError)}
          >
            {isUser ? (
              <div className="whitespace-pre-wrap break-words">{message.content}</div>
            ) : (
              <AssistantMessageContent
                content={message.content}
                onOasisActionFill={onOasisActionFill}
              />
            )}
          </div>
          {!isUser ? (
            <AssistantMessageMeta
              content={assistantCopyContent}
              messageTime={messageTime}
              hasError={!!hasError}
              errorMessage={errorMessage}
              onCopy={onCopy}
              onRegenerate={onRegenerate}
              isLastAssistant={isLastAssistant}
            />
          ) : messageTime ? (
            <div className="text-[10px] text-gray-500 mt-0.5 px-1">{messageTime}</div>
          ) : null}
        </div>
      </div>
    )
  },
  (prev, next) =>
    prev.message.id === next.message.id &&
    prev.message.content === next.message.content &&
    prev.message.role === next.message.role &&
    prev.message.createdAt === next.message.createdAt &&
    (prev.theme === next.theme ||
      (prev.theme.primary === next.theme.primary &&
        prev.theme.background === next.theme.background &&
        prev.theme.primaryForeground === next.theme.primaryForeground)) &&
    prev.isLastAssistant === next.isLastAssistant &&
    prev.highlight === next.highlight &&
    prev.hasError === next.hasError &&
    prev.errorMessage === next.errorMessage &&
    prev.onCopy === next.onCopy &&
    prev.onRegenerate === next.onRegenerate &&
    prev.onOasisActionFill === next.onOasisActionFill,
)

MessageItem.displayName = 'MessageItem'
