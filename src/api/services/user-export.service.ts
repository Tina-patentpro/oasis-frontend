import { resolveApiBaseUrl } from '../core/api-base-url'
import { getAccessToken } from '../core/token-storage'

export async function exportUserDataFile(options?: { signal?: AbortSignal }): Promise<Blob> {
  const token = getAccessToken()
  const headers = new Headers()
  if (token) {
    headers.append('Authorization', `Bearer ${token}`)
  }

  const apiBaseUrl = resolveApiBaseUrl(import.meta.env)
  const url = `${apiBaseUrl}/user/user/data/export`

  const response = await fetch(url, {
    method: 'GET',
    headers,
    signal: options?.signal,
  })

  if (!response.ok) {
    throw new Error(`Export failed: ${response.status} ${response.statusText}`)
  }

  return await response.blob()
}
