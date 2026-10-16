import { useEffect, useRef, useState } from 'react'

export function useInstructionDeleteConfirmation() {
  const [pendingDeleteKey, setPendingDeleteKey] = useState<string | null>(null)
  const deleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!pendingDeleteKey) {
      return
    }

    deleteTimerRef.current = setTimeout(() => setPendingDeleteKey(null), 3000)
    return () => {
      if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current)
    }
  }, [pendingDeleteKey])

  return { pendingDeleteKey, setPendingDeleteKey }
}
