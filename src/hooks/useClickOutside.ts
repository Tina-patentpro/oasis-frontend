import { useEffect, useRef, type RefObject } from 'react'

type ClickOutsideRef = RefObject<unknown>

/**
 * Hook: useClickOutside
 * 检测是否点击在指定元素外部
 */
export function useClickOutside(
  refs: readonly ClickOutsideRef[],
  handler: () => void,
  enabled: boolean = true,
): void {
  const latestHandler = useRef(handler)
  const latestRefs = useRef(refs)

  useEffect(() => {
    latestHandler.current = handler
  }, [handler])

  useEffect(() => {
    latestRefs.current = refs
  }, [refs])

  useEffect(() => {
    if (!enabled) return

    const handleClick = (event: MouseEvent): void => {
      const isOutside = latestRefs.current.every((ref) => {
        const current = ref.current
        if (!(current instanceof Node)) {
          return true
        }
        return !current.contains(event.target as Node)
      })
      if (isOutside) {
        latestHandler.current()
      }
    }

    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [enabled])
}
