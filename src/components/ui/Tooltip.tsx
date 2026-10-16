import {
  type FocusEvent as ReactFocusEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactElement,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'

import { useWorkspaceUIStore } from '@/modules/workspace/stores/useWorkspaceUIStore'
import { useThemeStore } from '@/stores'
import { calculateBestPosition, getTooltipCoords } from './tooltip/positioning'
import { TooltipBubble } from './tooltip/TooltipBubble'
import type {
  InternalHandlers,
  TooltipChildProps,
  TooltipPosition,
  TooltipProps,
} from './tooltip/types'

export function Tooltip({
  content,
  position = 'auto',
  align = 'center',
  children,
  className,
  delay = 300,
  followMouse = false,
  maxWidth = 280,
  inlineChild = false,
}: TooltipProps) {
  const tooltipsEnabled = useWorkspaceUIStore((state) => state.tooltipsEnabled)
  const currentTheme = useThemeStore((state) => state.currentTheme)

  const [visible, setVisible] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const [actualPosition, setActualPosition] = useState<TooltipPosition>('top')
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [tooltipCoords, setTooltipCoords] = useState({ top: -9999, left: -9999 })

  const containerRef = useRef<HTMLSpanElement>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const animationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const tooltipRef = useRef<HTMLSpanElement>(null)

  const shouldRender = tooltipsEnabled && !!content

  const handlers = useMemo<InternalHandlers>(() => {
    if (!shouldRender) {
      return {}
    }

    const open = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current)
        animationTimeoutRef.current = null
      }

      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = null
        setVisible(true)
        setIsAnimating(true)

        // 计算实际位置
        if (containerRef.current && position === 'auto') {
          const targetRect = containerRef.current.getBoundingClientRect()
          const tooltipElement = document.createElement('div')
          tooltipElement.style.cssText = `
            position: absolute;
            visibility: hidden;
            white-space: normal;
            font-size: 12px;
            padding: 6px 10px;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            word-break: break-word;
            max-width: ${maxWidth}px;
          `
          tooltipElement.textContent = typeof content === 'string' ? content : 'Tooltip'
          document.body.appendChild(tooltipElement)

          const tooltipRect = tooltipElement.getBoundingClientRect()
          const calculatedPosition = calculateBestPosition(targetRect, tooltipRect)
          setActualPosition(calculatedPosition)

          document.body.removeChild(tooltipElement)
        } else {
          setActualPosition(position)
        }
      }, delay)
    }

    const close = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
      setVisible(false)
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current)
      }
      animationTimeoutRef.current = setTimeout(() => {
        animationTimeoutRef.current = null
        setIsAnimating(false)
      }, 160)
    }

    const updateMousePosition = (event: ReactMouseEvent) => {
      if (followMouse) {
        setMousePosition({ x: event.clientX, y: event.clientY })
      }
    }

    return {
      onMouseEnter: (event: ReactMouseEvent) => {
        open()
        updateMousePosition(event)
      },
      onMouseLeave: (_event: ReactMouseEvent) => {
        close()
      },
      onMouseMove: updateMousePosition,
      onFocus: open,
      onBlur: close,
    }
  }, [shouldRender, position, delay, followMouse, content, maxWidth])

  // 清理定时器
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current)
      }
    }
  }, [])

  const childElement = children as ReactElement<TooltipChildProps>
  const childProps = childElement.props ?? {}
  const childClassName = typeof childProps.className === 'string' ? childProps.className : ''
  const shouldStretch = !inlineChild && /\b(w-full|flex-1|grow)\b/.test(childClassName)
  const isBlockRequested = !inlineChild && /\b(block|flex|grid)\b/.test(childClassName)

  useLayoutEffect(() => {
    if (!shouldRender || !visible || followMouse || !containerRef.current || !tooltipRef.current) {
      return
    }
    const targetRect = containerRef.current.getBoundingClientRect()
    const tooltipRect = tooltipRef.current.getBoundingClientRect()
    const coords = getTooltipCoords(targetRect, tooltipRect, actualPosition, align)
    setTooltipCoords(coords)
  }, [shouldRender, visible, followMouse, actualPosition, align, content])

  const childMouseEnter = childProps.onMouseEnter as ((event: ReactMouseEvent) => void) | undefined
  const childMouseLeave = childProps.onMouseLeave as ((event: ReactMouseEvent) => void) | undefined
  const childMouseMove = childProps.onMouseMove as ((event: ReactMouseEvent) => void) | undefined
  const childFocus = childProps.onFocus as ((event: ReactFocusEvent) => void) | undefined
  const childBlur = childProps.onBlur as ((event: ReactFocusEvent) => void) | undefined

  const handleMouseEnter = (event: ReactMouseEvent) => {
    childMouseEnter?.(event)
    handlers.onMouseEnter?.(event)
  }

  const handleMouseLeave = (event: ReactMouseEvent) => {
    childMouseLeave?.(event)
    handlers.onMouseLeave?.(event)
  }

  const handleMouseMove = (event: ReactMouseEvent) => {
    childMouseMove?.(event)
    handlers.onMouseMove?.(event)
  }

  const handleFocus = (event: ReactFocusEvent) => {
    childFocus?.(event)
    handlers.onFocus?.(event)
  }

  const handleBlur = (event: ReactFocusEvent) => {
    childBlur?.(event)
    handlers.onBlur?.(event)
  }

  return (
    <span
      ref={containerRef}
      className={`relative ${shouldStretch || isBlockRequested ? 'flex w-full' : 'inline-flex'} ${className ?? ''}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
      onFocus={handleFocus}
      onBlur={handleBlur}
      style={{
        position: 'relative',
        display: shouldStretch || isBlockRequested ? 'flex' : 'inline-flex',
        ...(shouldStretch || isBlockRequested ? { width: '100%' } : {}),
      }}
    >
      {childElement}
      {shouldRender &&
        isAnimating &&
        (!followMouse
          ? createPortal(
              <TooltipBubble
                content={content}
                tooltipRef={tooltipRef}
                theme={currentTheme}
                maxWidth={maxWidth}
                visible={visible}
                followMouse={followMouse}
                mousePosition={mousePosition}
                tooltipCoords={tooltipCoords}
                position={actualPosition}
                align={align}
              />,
              document.body,
            )
          : shouldRender && (
              <TooltipBubble
                content={content}
                tooltipRef={tooltipRef}
                theme={currentTheme}
                maxWidth={maxWidth}
                visible={visible}
                followMouse={followMouse}
                mousePosition={mousePosition}
                tooltipCoords={tooltipCoords}
                position={actualPosition}
                align={align}
              />
            ))}
    </span>
  )
}
