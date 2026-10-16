import { type FC, useState } from 'react'

import { ConfirmDialog } from '@/components/ui/feedback/ConfirmDialog'
import type { OasisActionItem, OasisActionsPayload } from './oasis-actions'

interface OasisActionsBlockProps {
  payload: OasisActionsPayload
  onFill?: (query: string) => void
}

const CONFIRM_FILL_DIALOG_TITLE = '确认填入输入框'
const DEFAULT_CONFIRM_FILL_MESSAGE = '确认执行该操作？'
const CONFIRM_FILL_BUTTON_TEXT = '确认填入'

export const OasisActionsBlock: FC<OasisActionsBlockProps> = ({ payload, onFill }) => {
  const [pendingConfirmAction, setPendingConfirmAction] = useState<OasisActionItem | null>(null)
  const listLabel = payload.title || '快捷操作列表'

  const handleActionClick = (action: OasisActionItem): void => {
    if (!onFill || action.disabledReason) {
      return
    }

    if (action.type === 'confirm_fill') {
      setPendingConfirmAction(action)
      return
    }

    onFill(action.query)
  }

  const handleConfirmFill = (): void => {
    if (pendingConfirmAction && onFill) {
      onFill(pendingConfirmAction.query)
    }
    setPendingConfirmAction(null)
  }

  return (
    <>
      <div className="oasis-actions-block my-3 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-3 text-sm shadow-sm">
        {payload.title ? (
          <div className="mb-1 font-semibold text-emerald-900">{payload.title}</div>
        ) : null}
        {payload.description ? (
          <div className="mb-3 text-xs leading-relaxed text-emerald-800/80">
            {payload.description}
          </div>
        ) : null}
        <ol
          className="list-decimal space-y-2 pl-5 marker:font-semibold marker:text-emerald-700"
          aria-label={listLabel}
        >
          {payload.actions.map((action) => {
            const disabled = Boolean(action.disabledReason) || !onFill
            const actionTitle = action.disabledReason
              ? action.disabledReason
              : onFill
                ? `点击后插入到输入框开头：${action.label}`
                : '当前区域暂不支持填入输入框'

            return (
              <li key={action.id} className="min-w-0 pl-1">
                <button
                  type="button"
                  disabled={disabled}
                  title={actionTitle}
                  className="inline-flex w-full cursor-pointer items-start gap-2 rounded-lg border border-emerald-200 bg-white px-2 py-1.5 text-left text-xs font-medium leading-relaxed text-emerald-950 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 disabled:cursor-not-allowed disabled:border-emerald-100 disabled:bg-white/60 disabled:opacity-60 disabled:hover:border-emerald-100 disabled:hover:bg-white/60 disabled:hover:shadow-sm"
                  onClick={() => handleActionClick(action)}
                >
                  <span
                    aria-hidden="true"
                    className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-bold leading-none text-emerald-700"
                  >
                    ＋
                  </span>
                  <span className="break-words">{action.label}</span>
                </button>
                {action.description ? (
                  <div className="mt-1 px-2 text-[11px] leading-relaxed text-emerald-800/70 break-words">
                    {action.description}
                  </div>
                ) : null}
                {action.disabledReason ? (
                  <div className="mt-1 px-2 text-[11px] leading-relaxed text-amber-700 break-words">
                    {action.disabledReason}
                  </div>
                ) : null}
              </li>
            )
          })}
        </ol>
      </div>
      <ConfirmDialog
        isOpen={Boolean(pendingConfirmAction)}
        title={CONFIRM_FILL_DIALOG_TITLE}
        message={pendingConfirmAction?.confirmText || DEFAULT_CONFIRM_FILL_MESSAGE}
        confirmText={CONFIRM_FILL_BUTTON_TEXT}
        onConfirm={handleConfirmFill}
        onCancel={() => setPendingConfirmAction(null)}
      />
    </>
  )
}

OasisActionsBlock.displayName = 'OasisActionsBlock'
