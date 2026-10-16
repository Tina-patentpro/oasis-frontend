import { AnimatePresence, motion } from '@/components/ui/motion'
import { type KeyboardEvent, type MutableRefObject, type ReactNode, useEffect, useRef } from 'react'

import { dialogVariants, overlayVariants } from '@/utils/animations'

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

let openDialogCount = 0
let previousBodyOverflow = ''

interface AccessibleDialogProps {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
  labelledBy?: string
  describedBy?: string
  label?: string
  className?: string
  wrapperClassName?: string
  overlayClassName?: string
  initialFocusRef?: MutableRefObject<HTMLElement | null>
  closeOnOverlayClick?: boolean
  closeOnEscape?: boolean
  zIndexClassName?: string
}

function getFocusableElements(container: HTMLElement | null) {
  if (!container) {
    return []
  }

  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) => element.getAttribute('aria-hidden') !== 'true',
  )
}

export function AccessibleDialog({
  isOpen,
  onClose,
  children,
  labelledBy,
  describedBy,
  label,
  className = '',
  wrapperClassName = 'items-center justify-center p-4 overflow-auto',
  overlayClassName = 'bg-black/50',
  initialFocusRef,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  zIndexClassName = 'z-50',
}: AccessibleDialogProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null)
  const previousActiveElementRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!isOpen) {
      return
    }

    if (openDialogCount === 0) {
      previousBodyOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
    }
    openDialogCount += 1

    return () => {
      openDialogCount = Math.max(0, openDialogCount - 1)
      if (openDialogCount === 0) {
        document.body.style.overflow = previousBodyOverflow
        previousBodyOverflow = ''
      }
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    previousActiveElementRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null

    const focusTimer = window.setTimeout(() => {
      const focusTarget = initialFocusRef?.current ?? getFocusableElements(dialogRef.current)[0]
      ;(focusTarget ?? dialogRef.current)?.focus()
    }, 0)

    return () => {
      window.clearTimeout(focusTimer)
      const previousActiveElement = previousActiveElementRef.current
      if (previousActiveElement && document.contains(previousActiveElement)) {
        window.setTimeout(() => previousActiveElement.focus(), 0)
      }
    }
  }, [initialFocusRef, isOpen])

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape' && closeOnEscape) {
      event.preventDefault()
      event.stopPropagation()
      onClose()
      return
    }

    if (event.key !== 'Tab') {
      return
    }

    const focusableElements = getFocusableElements(dialogRef.current)
    if (focusableElements.length === 0) {
      event.preventDefault()
      event.stopPropagation()
      dialogRef.current?.focus()
      return
    }

    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]
    const activeElement = document.activeElement

    if (event.shiftKey && activeElement === firstElement) {
      event.preventDefault()
      event.stopPropagation()
      lastElement.focus()
      return
    }

    if (!event.shiftKey && activeElement === lastElement) {
      event.preventDefault()
      event.stopPropagation()
      firstElement.focus()
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className={`fixed inset-0 ${zIndexClassName} flex ${wrapperClassName}`}>
          <motion.div
            aria-hidden="true"
            className={`absolute inset-0 z-0 ${overlayClassName}`}
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={closeOnOverlayClick ? onClose : undefined}
          />
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={labelledBy}
            aria-describedby={describedBy}
            aria-label={label}
            tabIndex={-1}
            className={`relative z-10 ${className}`}
            variants={dialogVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={handleKeyDown}
          >
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

AccessibleDialog.displayName = 'AccessibleDialog'
