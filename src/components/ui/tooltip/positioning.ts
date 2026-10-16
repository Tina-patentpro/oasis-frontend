import type { CSSProperties } from 'react'

import type { TooltipAlign, TooltipCoords, TooltipPosition } from './types'

export const getArrowStyles = (position: TooltipPosition, align: TooltipAlign): CSSProperties => {
  const base: CSSProperties = {}

  switch (position) {
    case 'top':
    case 'auto':
      base.top = '100%'
      if (align === 'start') {
        base.left = '18px'
        base.transform = 'translate(0, -1px) rotate(45deg)'
      } else if (align === 'end') {
        base.right = '18px'
        base.transform = 'translate(0, -1px) rotate(45deg)'
      } else {
        base.left = '50%'
        base.transform = 'translate(-50%, -1px) rotate(45deg)'
      }
      return base
    case 'bottom':
      base.bottom = '100%'
      if (align === 'start') {
        base.left = '18px'
        base.transform = 'translate(0, 1px) rotate(45deg)'
      } else if (align === 'end') {
        base.right = '18px'
        base.transform = 'translate(0, 1px) rotate(45deg)'
      } else {
        base.left = '50%'
        base.transform = 'translate(-50%, 1px) rotate(45deg)'
      }
      return base
    case 'left':
      base.left = '100%'
      if (align === 'start') {
        base.top = '18px'
        base.transform = 'translate(-1px, 0) rotate(45deg)'
      } else if (align === 'end') {
        base.bottom = '18px'
        base.transform = 'translate(-1px, 0) rotate(45deg)'
      } else {
        base.top = '50%'
        base.transform = 'translate(-1px, -50%) rotate(45deg)'
      }
      return base
    case 'right':
      base.right = '100%'
      if (align === 'start') {
        base.top = '18px'
        base.transform = 'translate(1px, 0) rotate(45deg)'
      } else if (align === 'end') {
        base.bottom = '18px'
        base.transform = 'translate(1px, 0) rotate(45deg)'
      } else {
        base.top = '50%'
        base.transform = 'translate(1px, -50%) rotate(45deg)'
      }
      return base
  }

  return base
}

export const getTooltipCoords = (
  targetRect: DOMRect,
  tooltipRect: DOMRect,
  position: TooltipPosition,
  align: TooltipAlign,
): TooltipCoords => {
  let top = 0
  let left = 0

  switch (position) {
    case 'top':
      top = targetRect.top - tooltipRect.height - 8
      switch (align) {
        case 'start':
          left = targetRect.left
          break
        case 'end':
          left = targetRect.right - tooltipRect.width
          break
        case 'center':
        default:
          left = targetRect.left + targetRect.width / 2 - tooltipRect.width / 2
          break
      }
      return { top, left }
    case 'bottom':
      top = targetRect.bottom + 8
      switch (align) {
        case 'start':
          left = targetRect.left
          break
        case 'end':
          left = targetRect.right - tooltipRect.width
          break
        case 'center':
        default:
          left = targetRect.left + targetRect.width / 2 - tooltipRect.width / 2
          break
      }
      return { top, left }
    case 'left':
      left = targetRect.left - tooltipRect.width - 8
      switch (align) {
        case 'start':
          top = targetRect.top
          break
        case 'end':
          top = targetRect.bottom - tooltipRect.height
          break
        case 'center':
        default:
          top = targetRect.top + targetRect.height / 2 - tooltipRect.height / 2
          break
      }
      return { top, left }
    case 'right':
      left = targetRect.right + 8
      switch (align) {
        case 'start':
          top = targetRect.top
          break
        case 'end':
          top = targetRect.bottom - tooltipRect.height
          break
        case 'center':
        default:
          top = targetRect.top + targetRect.height / 2 - tooltipRect.height / 2
          break
      }
      return { top, left }
    case 'auto':
      top = targetRect.top - tooltipRect.height - 8
      break
  }

  switch (align) {
    case 'start':
      left = targetRect.left
      break
    case 'end':
      left = targetRect.right - tooltipRect.width
      break
    case 'center':
    default:
      left = targetRect.left + targetRect.width / 2 - tooltipRect.width / 2
      break
  }

  return { top, left }
}

export const calculateBestPosition = (
  targetRect: DOMRect,
  tooltipRect: DOMRect,
): TooltipPosition => {
  const viewport = {
    width: window.innerWidth,
    height: window.innerHeight,
  }
  const positions: TooltipPosition[] = ['bottom', 'top', 'right', 'left']

  for (const pos of positions) {
    let x = 0
    let y = 0

    switch (pos) {
      case 'top':
        x = targetRect.left + targetRect.width / 2 - tooltipRect.width / 2
        y = targetRect.top - tooltipRect.height - 8
        break
      case 'bottom':
        x = targetRect.left + targetRect.width / 2 - tooltipRect.width / 2
        y = targetRect.bottom + 8
        break
      case 'left':
        x = targetRect.left - tooltipRect.width - 8
        y = targetRect.top + targetRect.height / 2 - tooltipRect.height / 2
        break
      case 'right':
        x = targetRect.right + 8
        y = targetRect.top + targetRect.height / 2 - tooltipRect.height / 2
        break
      default:
        break
    }

    if (
      x >= 0 &&
      x + tooltipRect.width <= viewport.width &&
      y >= 0 &&
      y + tooltipRect.height <= viewport.height
    ) {
      return pos
    }
  }

  return 'bottom'
}
