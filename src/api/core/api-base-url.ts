interface ApiBaseUrlEnv {
  DEV?: boolean
  VITE_API_BASE_URL?: string
}

interface LocationLike {
  hostname?: string
}

function isLoopbackHost(hostname?: string): boolean {
  return hostname === '127.0.0.1' || hostname === 'localhost' || hostname === '::1'
}

export function resolveApiBaseUrl(
  env: ApiBaseUrlEnv,
  locationLike: LocationLike | undefined = globalThis.location,
): string {
  if (env.DEV || isLoopbackHost(locationLike?.hostname)) {
    return '/api'
  }

  return env.VITE_API_BASE_URL || '/api'
}
