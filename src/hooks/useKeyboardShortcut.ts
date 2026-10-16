import { useEffect } from 'react'

/**
 * 键盘修饰键接口
 */
interface KeyboardModifiers {
  ctrl?: boolean
  shift?: boolean
  alt?: boolean
}

/**
 * Hook: useKeyboardShortcut
 * 处理键盘快捷键
 */
export function useKeyboardShortcut(
  key: string,
  handler: (e: KeyboardEvent) => void,
  modifiers: KeyboardModifiers = {},
): void {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      const ctrlOrCmd = e.ctrlKey || e.metaKey
      if (
        e.key.toLowerCase() === key.toLowerCase() &&
        (!modifiers.ctrl || ctrlOrCmd) &&
        (!modifiers.shift || e.shiftKey) &&
        (!modifiers.alt || e.altKey)
      ) {
        e.preventDefault()
        handler(e)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [key, handler, modifiers])
}
