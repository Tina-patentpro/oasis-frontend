import { memo, useId, type ReactNode, type CSSProperties, type RefObject } from 'react'

import { LoadingSpinner } from '../feedback/LoadingSpinner'
import { Tooltip } from '../Tooltip'

interface ActionBtnProps {
  children: ReactNode
  onClick: () => void
  primary?: boolean
  disabled?: boolean
  loading?: boolean
  ariaLabel?: string
  themeColor?: string
  themeHoverColor?: string
  themeForegroundColor?: string
  themeTextColor?: string
  active?: boolean
  tooltip?: string
  tooltipPosition?: 'top' | 'bottom' | 'left' | 'right'
  className?: string
  buttonRef?: RefObject<HTMLButtonElement | null>
}

const ActionButton = memo<ActionBtnProps>(
  ({
    children,
    onClick,
    primary,
    disabled,
    loading,
    ariaLabel,
    themeColor = '#059669',
    themeHoverColor,
    themeForegroundColor = '#ffffff',
    themeTextColor = themeColor,
    active = false,
    tooltip,
    tooltipPosition = 'top',
    className,
    buttonRef,
  }) => {
    const tooltipDescriptionId = useId()
    const hoverColor = themeHoverColor ?? themeColor
    const baseStyle = primary
      ? ({
          '--chat-btn-bg': disabled || loading ? '#e5e7eb' : themeColor,
          '--chat-btn-color': disabled || loading ? '#6b7280' : themeForegroundColor,
          '--chat-btn-hover-bg': disabled || loading ? themeColor : hoverColor,
          '--chat-btn-hover-color': themeForegroundColor,
          '--chat-btn-hover-shadow': `${themeColor}40`,
          '--chat-btn-press-bg': hoverColor,
          '--chat-btn-focus-ring': themeColor,
        } as CSSProperties)
      : ({
          '--chat-btn-bg': active ? themeColor : '#f3f4f6',
          '--chat-btn-color': active ? themeForegroundColor : '#374151',
          '--chat-btn-border': active ? `1px solid ${themeColor}` : `1px solid ${themeColor}26`,
          '--chat-btn-hover-bg': `${themeColor}14`,
          '--chat-btn-hover-color': active ? themeForegroundColor : themeTextColor,
          '--chat-btn-hover-shadow': `${themeColor}2e`,
          '--chat-btn-press-bg': `${themeColor}26`,
          '--chat-btn-focus-ring': themeColor,
          '--chat-btn-hover-translate': '-1px',
        } as CSSProperties)

    const buttonElement = (
      <button
        ref={buttonRef}
        type="button"
        onClick={onClick}
        disabled={disabled || loading}
        className={`chat-action-btn px-3 py-1.5 rounded-md text-sm font-medium inline-flex items-center gap-2 ${className ?? ''}`}
        style={baseStyle}
        aria-label={ariaLabel || (typeof children === 'string' ? children : undefined)}
        aria-busy={loading || undefined}
        aria-describedby={tooltip ? tooltipDescriptionId : undefined}
      >
        {tooltip && (
          <span id={tooltipDescriptionId} className="sr-only">
            {tooltip}
          </span>
        )}
        {loading && <LoadingSpinner size="sm" />}
        {children}
      </button>
    )

    if (tooltip) {
      return (
        <Tooltip content={tooltip} position={tooltipPosition}>
          {buttonElement}
        </Tooltip>
      )
    }

    return buttonElement
  },
)

ActionButton.displayName = 'ActionButton'

export const ActionBtn = ActionButton
