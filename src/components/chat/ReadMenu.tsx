import React, { useCallback, useEffect, useId, type CSSProperties, type RefObject } from 'react'

import type { Theme } from '../../types'
import { Tooltip } from '../ui'

interface ReadMenuProps {
  isOpen: boolean
  isDisabled: boolean
  disabledReason?: string
  onToggle: () => void
  onClose?: () => void
  buttonRef: RefObject<HTMLButtonElement | null>
  menuRef: RefObject<HTMLDivElement | null>
  onReadFromGenerated: () => void
  onReadFromHistory: () => void
  historyDisabled?: boolean
  historyDisabledReason?: string
  theme: Theme
}

export const ReadMenu: React.FC<ReadMenuProps> = ({
  isOpen,
  isDisabled,
  disabledReason,
  onToggle,
  onClose,
  buttonRef,
  menuRef,
  onReadFromGenerated,
  onReadFromHistory,
  historyDisabled = false,
  historyDisabledReason,
  theme,
}) => {
  const menuId = useId()
  const disabledReasonId = useId()
  const historyDisabledReasonId = useId()
  const borderColor = `${theme.primary}26`
  const softHover = `${theme.primary}14`
  const shadowColor = `${theme.primary}29`
  const primaryForeground = theme.primaryForeground ?? '#ffffff'
  const primaryText = theme.primaryText ?? theme.primary
  const menuVisible = isOpen && !isDisabled
  const readTooltipContent =
    isDisabled && disabledReason ? disabledReason : '读取资料并追加到输入框末尾'
  const describedBy = isDisabled && disabledReason ? disabledReasonId : undefined
  const historyDescribedBy =
    historyDisabled && historyDisabledReason ? historyDisabledReasonId : undefined

  const handleMenuKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key !== 'Escape') {
        return
      }

      event.preventDefault()
      onClose?.()
      buttonRef.current?.focus()
    },
    [buttonRef, onClose],
  )

  useEffect(() => {
    if (!menuVisible) {
      return
    }

    menuRef.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus()
  }, [menuRef, menuVisible])

  const buttonStyle = {
    '--chat-btn-bg': menuVisible ? theme.primary : '#f3f4f6',
    '--chat-btn-color': menuVisible ? primaryForeground : '#374151',
    '--chat-btn-border': isDisabled ? '1px solid transparent' : `1px solid ${borderColor}`,
    '--chat-btn-hover-bg': isDisabled ? '#f3f4f6' : menuVisible ? theme.primaryHover : softHover,
    '--chat-btn-hover-color': menuVisible ? primaryForeground : primaryText,
    '--chat-btn-hover-shadow': shadowColor,
    '--chat-btn-press-bg': menuVisible ? theme.primaryHover : `${theme.primary}26`,
    '--chat-btn-focus-ring': theme.primary,
    '--chat-btn-hover-translate': isDisabled ? '0' : '-1px',
  } as CSSProperties

  const menuStyle: CSSProperties = {
    borderColor,
    boxShadow: `0 18px 36px ${shadowColor}`,
  }

  return (
    <div className="relative">
      <Tooltip content={readTooltipContent}>
        <button
          ref={buttonRef}
          onClick={onToggle}
          className="chat-action-btn px-3 py-1.5 rounded-md text-sm font-medium inline-flex items-center gap-2"
          style={buttonStyle}
          title={isDisabled ? disabledReason : undefined}
          aria-label="读取资料并追加到输入框末尾"
          aria-describedby={describedBy}
          aria-haspopup="dialog"
          aria-expanded={menuVisible}
          aria-controls={menuVisible ? menuId : undefined}
          disabled={isDisabled}
          type="button"
        >
          读取
        </button>
      </Tooltip>
      {isDisabled && disabledReason ? (
        <p id={disabledReasonId} className="mt-1 max-w-56 text-[11px] leading-snug text-gray-500">
          {disabledReason}
        </p>
      ) : null}
      {menuVisible && (
        <div
          id={menuId}
          ref={menuRef}
          role="dialog"
          aria-label="读取资料并追加到输入框末尾"
          className="absolute bottom-full left-0 mb-2 bg-white border rounded-2xl shadow-lg overflow-hidden text-sm z-20 w-52"
          style={menuStyle}
          onKeyDown={handleMenuKeyDown}
        >
          <Tooltip content="读取中栏生成结果，并追加到输入框末尾">
            <button
              className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
              onClick={onReadFromGenerated}
              type="button"
              aria-label="读取中栏生成结果，并追加到输入框末尾"
            >
              <span aria-hidden="true">📄</span> 读取中栏生成结果
            </button>
          </Tooltip>
          <Tooltip content="读取项目历史资料，并追加到输入框末尾">
            <button
              className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 disabled:cursor-not-allowed disabled:text-gray-500 disabled:hover:bg-white"
              onClick={onReadFromHistory}
              type="button"
              aria-label="读取项目历史资料，并追加到输入框末尾"
              aria-describedby={historyDescribedBy}
              title={historyDisabled ? historyDisabledReason : undefined}
              disabled={historyDisabled}
            >
              <span aria-hidden="true">📚</span> 读取项目历史资料
            </button>
          </Tooltip>
          {historyDisabled && historyDisabledReason ? (
            <p
              id={historyDisabledReasonId}
              className="px-4 pb-2 text-[11px] leading-snug text-gray-500"
            >
              {historyDisabledReason}
            </p>
          ) : null}
        </div>
      )}
    </div>
  )
}

ReadMenu.displayName = 'ReadMenu'
