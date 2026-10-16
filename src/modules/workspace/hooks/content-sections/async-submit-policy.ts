interface SubmitErrorPolicy {
  keepPolling: boolean
  markFailed: boolean
}

export function resolveSubmitErrorPolicy(params: { statusCode?: number }): SubmitErrorPolicy {
  if (params.statusCode === 504) {
    return {
      keepPolling: true,
      markFailed: false,
    }
  }

  return {
    keepPolling: false,
    markFailed: true,
  }
}
