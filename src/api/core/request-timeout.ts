interface TimeoutAbort {
  signal: AbortSignal
  clear: () => void
}

const TIMEOUT_ABORT_REASON = 'REQUEST_TIMEOUT'

export function withTimeoutAbort(timeoutMs?: number): TimeoutAbort {
  const controller = new AbortController()

  if (!timeoutMs || timeoutMs <= 0) {
    return {
      signal: controller.signal,
      clear: () => undefined,
    }
  }

  const timeout = setTimeout(() => controller.abort(TIMEOUT_ABORT_REASON), timeoutMs)

  return {
    signal: controller.signal,
    clear: () => clearTimeout(timeout),
  }
}

export function isTimeoutAbort(signal: AbortSignal): boolean {
  return signal.aborted && signal.reason === TIMEOUT_ABORT_REASON
}

export function mergeAbortSignals(...signals: Array<AbortSignal | undefined>): AbortSignal {
  const activeSignals = signals.filter((signal): signal is AbortSignal => !!signal)
  if (activeSignals.length === 0) {
    return new AbortController().signal
  }
  if (activeSignals.length === 1) {
    return activeSignals[0]
  }

  const controller = new AbortController()

  const abortFromSignal = (source: AbortSignal) => {
    if (controller.signal.aborted) {
      return
    }
    controller.abort(source.reason ?? 'ABORTED')
  }

  activeSignals.forEach((signal) => {
    if (signal.aborted) {
      abortFromSignal(signal)
      return
    }
    signal.addEventListener('abort', () => abortFromSignal(signal), { once: true })
  })

  return controller.signal
}
