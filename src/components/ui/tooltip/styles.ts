import type {
  TooltipAlign,
  TooltipCoords,
  TooltipPosition,
  TooltipStyle,
  TooltipTheme,
} from './types'
import { getArrowStyles } from './positioning'

interface BuildTooltipStyleParams {
  theme: TooltipTheme
  maxWidth: number
  visible: boolean
  followMouse: boolean
  mousePosition: { x: number; y: number }
  tooltipCoords: TooltipCoords
}

interface BuildArrowStyleParams {
  theme: TooltipTheme
  visible: boolean
  position: TooltipPosition
  align: TooltipAlign
}

const buildSharedStyle = (
  theme: TooltipTheme,
  maxWidth: number,
  visible: boolean,
): TooltipStyle => ({
  position: 'fixed',
  zIndex: 9999,
  pointerEvents: 'none',
  background: theme.primary,
  color: '#ffffff',
  padding: '8px 12px',
  borderRadius: '10px',
  fontSize: '12px',
  fontWeight: 500,
  lineHeight: 1.4,
  whiteSpace: 'normal',
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  wordBreak: 'break-word',
  maxWidth: `${maxWidth}px`,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  border: `1px solid ${theme.primary}40`,
  boxShadow: `0 16px 32px ${theme.primary}30, 0 8px 16px rgba(0, 0, 0, 0.1)`,
  opacity: visible ? 1 : 0,
  transform: visible ? 'scale(1)' : 'scale(0.95)',
  transformOrigin: 'center',
  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
})

export const buildTooltipStyle = ({
  theme,
  maxWidth,
  visible,
  followMouse,
  mousePosition,
  tooltipCoords,
}: BuildTooltipStyleParams): TooltipStyle => {
  const shared = buildSharedStyle(theme, maxWidth, visible)

  if (followMouse && visible) {
    return {
      ...shared,
      left: mousePosition.x + 10,
      top: mousePosition.y - 10,
    }
  }

  return {
    ...shared,
    top: tooltipCoords.top,
    left: tooltipCoords.left,
  }
}

export const buildArrowStyle = ({
  theme,
  visible,
  position,
  align,
}: BuildArrowStyleParams): TooltipStyle => ({
  position: 'absolute',
  width: '10px',
  height: '10px',
  background: theme.primary,
  border: `1px solid ${theme.primary}40`,
  borderRadius: '2px',
  opacity: visible ? 1 : 0,
  transition: 'opacity 0.2s ease',
  ...getArrowStyles(position, align),
})
