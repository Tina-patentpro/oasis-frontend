import type { KeyboardEvent } from 'react'

interface MenuKeyboardOptions {
  onClose: () => void
  returnFocusTo?: HTMLElement | null
}

export function handleMenuKeyboardNavigation(
  event: KeyboardEvent<HTMLElement>,
  { onClose, returnFocusTo }: MenuKeyboardOptions,
): void {
  const menuItems = Array.from(
    event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="menuitem"]'),
  )
  const currentIndex = menuItems.indexOf(document.activeElement as HTMLButtonElement)
  const focusMenuItem = (nextIndex: number) => {
    event.preventDefault()
    menuItems[nextIndex]?.focus()
  }

  if (event.key === 'Escape') {
    event.preventDefault()
    onClose()
    returnFocusTo?.focus()
  } else if (event.key === 'ArrowDown' && menuItems.length > 0) {
    focusMenuItem(currentIndex >= 0 ? (currentIndex + 1) % menuItems.length : 0)
  } else if (event.key === 'ArrowUp' && menuItems.length > 0) {
    focusMenuItem(currentIndex >= 0 ? (currentIndex - 1 + menuItems.length) % menuItems.length : 0)
  } else if (event.key === 'Home' && menuItems.length > 0) {
    focusMenuItem(0)
  } else if (event.key === 'End' && menuItems.length > 0) {
    focusMenuItem(menuItems.length - 1)
  }
}
