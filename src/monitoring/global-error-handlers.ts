interface ErrorReportContext {
  tags?: Record<string, string>
  extra?: Record<string, unknown>
}

type ErrorReporter = (error: Error, context?: ErrorReportContext) => void

type ErrorEventTarget = Pick<Window, 'addEventListener' | 'removeEventListener'>

const toError = (reason: unknown): Error => {
  if (reason instanceof Error) {
    return reason
  }
  return new Error(typeof reason === 'string' ? reason : 'Unhandled promise rejection')
}

export const registerGlobalErrorHandlers = (
  reportError: ErrorReporter,
  target: ErrorEventTarget = window,
): (() => void) => {
  const handleError = (event: ErrorEvent): void => {
    reportError(event.error instanceof Error ? event.error : new Error(event.message), {
      extra: {
        message: event.message,
      },
      tags: {
        boundary: 'global',
        errorStage: 'error',
      },
    })
  }

  const handleUnhandledRejection = (event: PromiseRejectionEvent): void => {
    reportError(toError(event.reason), {
      extra: {
        reasonType: typeof event.reason,
      },
      tags: {
        boundary: 'global',
        errorStage: 'unhandledrejection',
      },
    })
  }

  target.addEventListener('error', handleError)
  target.addEventListener('unhandledrejection', handleUnhandledRejection)

  return () => {
    target.removeEventListener('error', handleError)
    target.removeEventListener('unhandledrejection', handleUnhandledRejection)
  }
}
