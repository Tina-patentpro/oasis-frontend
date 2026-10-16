import { apiClient } from '../client'

type DeclaredHttpMethod = 'GET'

function defineApiEndpoints<const T extends readonly string[]>(
  _method: DeclaredHttpMethod,
  endpoints: T,
  _appendPathParam = false,
): T {
  return endpoints
}

const LEGACY_SESSION_DELETE_ENDPOINTS = defineApiEndpoints(
  'GET',
  ['/user/user/workflowdelete'] as const,
  true,
)

export async function requestLegacySessionDelete(sessionId: number | string): Promise<void> {
  await apiClient.get<void>(
    `${LEGACY_SESSION_DELETE_ENDPOINTS[0]}/${sessionId}`,
    undefined,
    undefined,
    { cache: 'no-store' },
  )
}
