import { useEffect, useRef, useCallback } from 'react'

// Module-level stack to coordinate focus restoration across nested traps
const focusTrapStack: {
  previouslyFocusedElement: HTMLElement | null
}[] = []

/**
 * Traps keyboard focus within an element (focus trap).
 * Pressing Tab/Shift+Tab cycles through focusable elements inside the container.
 * Automatically focuses the first focusable element on mount.
 *
 * Uses a module-level stack so that nested/sequential dialogs cooperate:
 * - When a trap activates, it pushes itself onto the stack.
 * - When a trap deactivates, it pops itself from the stack. Focus is restored
 *   to the original element only when the stack becomes empty AND that element
 *   is still connected and visible in the DOM.
 *
 * @param active - Whether the focus trap is active (typically matches the dialog's open state)
 * @returns A ref to attach to the dialog's container element
 */
export function useFocusTrap(active: boolean = true) {
  const containerRef = useRef<HTMLDivElement>(null)
  const stackEntryRef = useRef<{ previouslyFocusedElement: HTMLElement | null } | null>(null)

  const getFocusableElements = useCallback(() => {
    if (!containerRef.current) return []

    const focusableSelectors = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(', ')

    return Array.from(containerRef.current.querySelectorAll<HTMLElement>(focusableSelectors))
  }, [])

  useEffect(() => {
    if (!active || !containerRef.current) return

    const container = containerRef.current

    // Record the previously focused element and push to stack
    const stackEntry = { previouslyFocusedElement: document.activeElement as HTMLElement | null }
    stackEntryRef.current = stackEntry
    focusTrapStack.push(stackEntry)

    // Focus first element on mount via RAF, with safety checks
    const focusable = getFocusableElements()
    let rafId: number | undefined
    if (focusable.length > 0) {
      rafId = requestAnimationFrame(() => {
        if (container.isConnected && !container.contains(document.activeElement)) {
          focusable[0].focus()
        }
      })
    }

    // Track whether we had focusable elements, so the observer only
    // auto-focuses when content goes from 0 → N (lazy-loaded content).
    let hadFocusable = focusable.length > 0

    const observer = new MutationObserver(() => {
      const current = getFocusableElements()
      const hasFocusable = current.length > 0
      // Only steal focus when focusable elements appear for the first time
      if (hasFocusable && !hadFocusable && container.isConnected) {
        current[0].focus()
      }
      hadFocusable = hasFocusable
    })
    observer.observe(container, { childList: true, subtree: true })

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return

      const elements = getFocusableElements()
      if (elements.length === 0) return

      const first = elements[0]
      const last = elements[elements.length - 1]

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    container.addEventListener('keydown', handleKeyDown)

    return () => {
      if (rafId !== undefined) {
        cancelAnimationFrame(rafId)
      }
      observer.disconnect()
      container.removeEventListener('keydown', handleKeyDown)

      // Remove our entry from the stack
      const stackIndex = focusTrapStack.indexOf(stackEntry)
      if (stackIndex !== -1) {
        focusTrapStack.splice(stackIndex, 1)
      }

      // Only restore focus if no other trap is still active (stack is now empty)
      // AND the previously focused element is still valid (connected + visible)
      if (focusTrapStack.length === 0) {
        const el = stackEntry.previouslyFocusedElement
        if (el && typeof el.focus === 'function' && el.isConnected && el.offsetParent !== null) {
          el.focus()
        }
      }
    }
  }, [active, getFocusableElements])

  return containerRef
}
