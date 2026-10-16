import {
  lazy,
  Suspense,
  type ComponentProps,
  type FC,
  type MouseEvent,
  type TouchEvent,
} from 'react'

import type { ChatPanel } from '@/components/ChatPanel'
import type { ChatMode } from '@/modules/workspace/stores'
import {
  DEFAULT_LEFT_SIDEBAR_WIDTH,
  MIN_CHAT_PANEL_WIDTH,
  clampChatPanelWidth,
  getChatPanelWidthBounds,
} from '@/utils/chatPanelWidth'

const CHAT_PANEL_KEYBOARD_RESIZE_STEP = 24
const CHAT_PANEL_KEYBOARD_RESIZE_PAGE_STEP = 120

const LazyChatPanel = lazy(() =>
  import('@/components/ChatPanel').then((module) => ({ default: module.ChatPanel })),
)

interface WorkspaceRightPanelProps {
  chatOpen: boolean
  chatMode: ChatMode
  chatWidth: number
  showSidebar: boolean
  leftSidebarWidth?: number
  onStartResize: (event: MouseEvent<HTMLElement> | TouchEvent<HTMLElement>) => void
  onKeyboardResize: (delta: number) => void
  chatPanelProps: ComponentProps<typeof ChatPanel>
}

export const WorkspaceRightPanel: FC<WorkspaceRightPanelProps> = ({
  chatOpen,
  chatMode,
  chatWidth,
  showSidebar,
  leftSidebarWidth = DEFAULT_LEFT_SIDEBAR_WIDTH,
  onStartResize,
  onKeyboardResize,
  chatPanelProps,
}) => {
  const isCompact = typeof window !== 'undefined' && window.innerWidth < 640
  if (!chatOpen || (isCompact && (chatMode === 'quarter' || showSidebar))) return null

  const widthParams =
    typeof window === 'undefined'
      ? null
      : {
          totalWidth: window.innerWidth,
          chatMode,
          showSidebar,
          leftSidebarWidth,
        }
  const widthBounds =
    widthParams === null
      ? {
          minWidth: MIN_CHAT_PANEL_WIDTH,
          maxWidth: Math.max(chatWidth, MIN_CHAT_PANEL_WIDTH),
          canResize: chatMode === 'quarter' && chatWidth > MIN_CHAT_PANEL_WIDTH,
        }
      : getChatPanelWidthBounds(widthParams)
  const allowResize = widthBounds.canResize
  const ariaMaxWidth = widthBounds.maxWidth
  const boundedChatWidth =
    widthParams === null ? chatWidth : clampChatPanelWidth(chatWidth, widthParams)

  return (
    <div className={`flex items-stretch ${chatMode === 'full' ? 'flex-1 min-w-0' : 'flex-none'}`}>
      {allowResize && (
        <div
          role="separator"
          tabIndex={0}
          className="w-[10px] touch-none cursor-col-resize bg-transparent hover:bg-emerald-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
          onMouseDown={onStartResize}
          onTouchStart={onStartResize}
          onKeyDown={(event) => {
            const resizeTo = (nextWidth: number) => {
              event.preventDefault()
              onKeyboardResize(nextWidth - boundedChatWidth)
            }
            const resizeBy = (delta: number) => {
              event.preventDefault()
              onKeyboardResize(delta)
            }

            if (event.key === 'ArrowLeft') {
              resizeBy(CHAT_PANEL_KEYBOARD_RESIZE_STEP)
            } else if (event.key === 'ArrowRight') {
              resizeBy(-CHAT_PANEL_KEYBOARD_RESIZE_STEP)
            } else if (event.key === 'PageUp') {
              resizeBy(CHAT_PANEL_KEYBOARD_RESIZE_PAGE_STEP)
            } else if (event.key === 'PageDown') {
              resizeBy(-CHAT_PANEL_KEYBOARD_RESIZE_PAGE_STEP)
            } else if (event.key === 'Home') {
              resizeTo(widthBounds.minWidth)
            } else if (event.key === 'End') {
              resizeTo(ariaMaxWidth)
            }
          }}
          aria-label="调整对话框宽度"
          aria-orientation="vertical"
          aria-valuenow={boundedChatWidth}
          aria-valuemin={widthBounds.minWidth}
          aria-valuemax={ariaMaxWidth}
          aria-valuetext={`${boundedChatWidth} 像素`}
          aria-keyshortcuts="ArrowLeft ArrowRight PageUp PageDown Home End"
        />
      )}
      <div
        id="workspace-chat-surface"
        role="region"
        aria-label="对话工作区"
        tabIndex={-1}
        className={`${
          chatMode === 'full' ? 'flex-1 min-w-0 ' : ''
        }focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--theme-primary)]`}
      >
        <Suspense
          fallback={
            <div
              role="status"
              aria-live="polite"
              className="flex h-full min-h-40 items-center justify-center px-6 text-sm text-gray-500"
            >
              正在加载对话面板…
            </div>
          }
        >
          <LazyChatPanel {...chatPanelProps} width={boundedChatWidth} />
        </Suspense>
      </div>
    </div>
  )
}

WorkspaceRightPanel.displayName = 'WorkspaceRightPanel'
