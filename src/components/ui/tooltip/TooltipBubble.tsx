import type { FC, ReactNode, RefObject } from 'react'

import { buildArrowStyle, buildTooltipStyle } from './styles'
import type { TooltipAlign, TooltipCoords, TooltipPosition, TooltipTheme } from './types'

interface TooltipBubbleProps {
  content: ReactNode
  tooltipRef: RefObject<HTMLSpanElement | null>
  theme: TooltipTheme
  maxWidth: number
  visible: boolean
  followMouse: boolean
  mousePosition: { x: number; y: number }
  tooltipCoords: TooltipCoords
  position: TooltipPosition
  align: TooltipAlign
}

export const TooltipBubble: FC<TooltipBubbleProps> = ({
  content,
  tooltipRef,
  theme,
  maxWidth,
  visible,
  followMouse,
  mousePosition,
  tooltipCoords,
  position,
  align,
}) => (
  <span
    ref={tooltipRef}
    role="tooltip"
    style={buildTooltipStyle({
      theme,
      maxWidth,
      visible,
      followMouse,
      mousePosition,
      tooltipCoords,
    })}
  >
    {content}
    <span
      style={buildArrowStyle({
        theme,
        visible,
        position,
        align,
      })}
    />
  </span>
)
