import type {
  CSSProperties,
  FocusEvent as ReactFocusEvent,
  MouseEvent as ReactMouseEvent,
  ReactElement,
  ReactNode,
} from 'react'

export type TooltipPosition = 'top' | 'bottom' | 'left' | 'right' | 'auto'
export type TooltipAlign = 'start' | 'center' | 'end'

export interface TooltipProps {
  content: ReactNode
  position?: TooltipPosition
  align?: TooltipAlign
  children: ReactElement
  className?: string
  delay?: number
  followMouse?: boolean
  maxWidth?: number
  inlineChild?: boolean
}

export interface InternalHandlers {
  onMouseEnter?: (event: ReactMouseEvent) => void
  onMouseLeave?: (event: ReactMouseEvent) => void
  onMouseMove?: (event: ReactMouseEvent) => void
  onFocus?: (event: ReactFocusEvent) => void
  onBlur?: (event: ReactFocusEvent) => void
}

export type TooltipChildProps = {
  className?: string
  onMouseEnter?: (event: ReactMouseEvent) => void
  onMouseLeave?: (event: ReactMouseEvent) => void
  onMouseMove?: (event: ReactMouseEvent) => void
  onFocus?: (event: ReactFocusEvent) => void
  onBlur?: (event: ReactFocusEvent) => void
}

export interface TooltipCoords {
  top: number
  left: number
}

export interface TooltipTheme {
  primary: string
}

export type TooltipStyle = CSSProperties
