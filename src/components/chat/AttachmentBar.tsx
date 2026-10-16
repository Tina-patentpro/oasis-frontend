import { Children, type FC, type ReactNode, type RefObject } from 'react'

import type { Attachment, Theme } from '../../types'
import { ActionBtn, AttachBadge, Tooltip } from '../ui'

const ATTACHMENT_BAR_COMPACT_BREAKPOINT = 480
const ATTACHMENT_BAR_HORIZONTAL_PADDING = 24

interface AttachmentBarProps {
  panelWidth: number
  attachments: Attachment[]
  onRemoveAttachment: (id: string) => void
  readMenu: ReactNode
  secondaryAction: ReactNode
  chatInput: string
  onClearChat: () => void
  onSendChat: () => void
  onStartNewConversation: () => void
  clearChatButtonRef?: RefObject<HTMLButtonElement | null>
  newConversationButtonRef?: RefObject<HTMLButtonElement | null>
  theme: Theme
  loading?: boolean
}

export const AttachmentBar: FC<AttachmentBarProps> = ({
  panelWidth,
  attachments,
  onRemoveAttachment,
  readMenu,
  secondaryAction,
  chatInput,
  onClearChat,
  onSendChat,
  onStartNewConversation,
  clearChatButtonRef,
  newConversationButtonRef,
  theme,
  loading,
}) => {
  const sendDisabled = loading || (!chatInput.trim() && attachments.length === 0)
  const actionDisabled = loading
  const themePrimary = theme.primary
  const themeHover = theme.primaryHover
  const themeText = theme.primaryText ?? theme.primary
  const secondaryItems = Children.toArray(secondaryAction ?? null)
  const availableWidth = Math.max(panelWidth - ATTACHMENT_BAR_HORIZONTAL_PADDING, 0)
  const isCompactLayout = availableWidth < ATTACHMENT_BAR_COMPACT_BREAKPOINT
  const shouldStackSecondaryRow = isCompactLayout && secondaryItems.length > 1
  const containerClassName = isCompactLayout
    ? 'flex w-full flex-wrap items-start gap-2'
    : 'flex w-full flex-wrap items-center gap-x-3 gap-y-2'
  const leftToolsClassName = shouldStackSecondaryRow
    ? 'order-1 flex min-w-0 flex-1 flex-wrap items-center gap-2'
    : 'order-1 flex flex-wrap items-center gap-2'
  const middleActionsClassName = shouldStackSecondaryRow
    ? 'order-3 flex basis-full flex-wrap items-center gap-2 pt-1'
    : isCompactLayout
      ? 'order-2 flex flex-wrap items-center gap-2'
      : 'order-2 flex min-w-0 flex-1 flex-wrap items-center justify-center gap-2'
  const sendActionsClassName = shouldStackSecondaryRow
    ? 'order-2 ml-auto flex shrink-0 items-center gap-2'
    : isCompactLayout
      ? 'order-3 ml-auto flex shrink-0 items-center gap-2'
      : 'order-3 ml-auto flex items-center gap-2'

  return (
    <>
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 max-h-[72px] overflow-y-auto">
          {attachments.map((att) => (
            <AttachBadge
              key={att.id}
              att={att}
              onRemove={onRemoveAttachment}
              theme={theme}
              removeDisabled={loading}
            />
          ))}
        </div>
      )}
      <div className={containerClassName}>
        <div className={leftToolsClassName} data-testid="attachment-bar-left-tools">
          <div className="flex items-center gap-2">{readMenu}</div>
          <Tooltip content="清空当前对话的所有消息记录" position="top" align="end">
            <ActionBtn
              buttonRef={clearChatButtonRef}
              onClick={onClearChat}
              ariaLabel="清空对话"
              themeColor={themePrimary}
              themeHoverColor={themeHover}
              themeTextColor={themeText}
              disabled={actionDisabled}
            >
              清空对话
            </ActionBtn>
          </Tooltip>
        </div>
        {secondaryItems.length > 0 ? (
          <div className={middleActionsClassName} data-testid="attachment-bar-secondary-actions">
            {/* index key acceptable: items are static layout slots with no reorder */}
            {secondaryItems.map((item, index) => (
              <div key={`secondary-${index}`} className="flex items-center">
                {item}
              </div>
            ))}
          </div>
        ) : null}
        <div className={sendActionsClassName} data-testid="attachment-bar-send-actions">
          <Tooltip content="开启一轮全新的对话" position="top" align="end">
            <ActionBtn
              buttonRef={newConversationButtonRef}
              onClick={onStartNewConversation}
              ariaLabel="新对话"
              themeColor={themePrimary}
              themeHoverColor={themeHover}
              themeTextColor={themeText}
              disabled={actionDisabled}
            >
              新对话
            </ActionBtn>
          </Tooltip>
          <Tooltip
            content={
              loading
                ? '正在生成回复，请稍候…'
                : sendDisabled
                  ? '请输入内容或添加附件后发送'
                  : '发送消息到AI助手'
            }
            position="top"
            align="end"
          >
            <span aria-busy={loading}>
              <ActionBtn
                primary
                onClick={onSendChat}
                loading={loading}
                disabled={sendDisabled}
                ariaLabel="发送消息"
                themeColor={themePrimary}
                themeHoverColor={themeHover}
                themeForegroundColor={theme.primaryForeground}
                themeTextColor={themeText}
              >
                发送
              </ActionBtn>
            </span>
          </Tooltip>
        </div>
      </div>
    </>
  )
}

AttachmentBar.displayName = 'AttachmentBar'
