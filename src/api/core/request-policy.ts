import type { RetryOptions, RequestProfile } from './types'

interface RequestPolicy {
  timeoutMs: number
  retry?: RetryOptions
}

export function resolveRequestPolicy(params: { profile: RequestProfile }): RequestPolicy {
  if (params.profile === 'background') {
    return {
      timeoutMs: 30000,
      retry: {
        retries: 2,
        backoffMs: 600,
      },
    }
  }

  return {
    timeoutMs: 12000,
    retry: {
      retries: 1,
      backoffMs: 250,
    },
  }
}
