interface RecoveryOp {
  id: string
  run: () => Promise<boolean>
}

interface RecoveryQueue {
  enqueue: (op: RecoveryOp) => void
  retryNext: () => Promise<RecoveryOp | null>
  size: () => number
}

export function createRecoveryQueue(): RecoveryQueue {
  const items: RecoveryOp[] = []

  return {
    enqueue(op: RecoveryOp) {
      items.push(op)
    },
    async retryNext() {
      const next = items.shift()
      if (!next) {
        return null
      }
      try {
        await next.run()
      } catch (error) {
        items.unshift(next)
        throw error
      }
      return next
    },
    size() {
      return items.length
    },
  }
}
