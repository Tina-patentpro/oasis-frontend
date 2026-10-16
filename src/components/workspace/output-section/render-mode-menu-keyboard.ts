import { type KeyboardEvent, type RefObject, useEffect } from 'react'

interface RenderModeMenuKeyboardOptions {
  open: boolean
  menuRef: RefObject<HTMLDivElement | null>
  buttonRef: RefObject<HTMLButtonElement | null>
  onClose: () => void
}

const getItems = (menu: HTMLDivElement | null) =>
  Array.from(menu?.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]') ?? [])

export function useRenderModeMenuKeyboard({
  open,
  menuRef,
  buttonRef,
  onClose,
}: RenderModeMenuKeyboardOptions) {
  useEffect(() => {
    if (open) getItems(menuRef.current)[0]?.focus()
  }, [menuRef, open])

  return (event: KeyboardEvent<HTMLDivElement>) => {
    const items = getItems(event.currentTarget)
    const currentIndex = Math.max(0, items.indexOf(document.activeElement as HTMLButtonElement))
    const focusItem = (index: number) => {
      event.preventDefault()
      items[index]?.focus()
    }

    if (event.key === 'ArrowDown') focusItem((currentIndex + 1) % items.length)
    if (event.key === 'ArrowUp') focusItem((currentIndex - 1 + items.length) % items.length)
    if (event.key === 'Home') focusItem(0)
    if (event.key === 'End') focusItem(items.length - 1)
    if (event.key === 'Escape') {
      event.preventDefault()
      onClose()
      buttonRef.current?.focus()
    }
  }
}
