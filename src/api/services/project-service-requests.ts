import { apiClient } from '../client'
import { ApiError } from '../errors'
import { isRecord } from '../validation'

type DeclaredHttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'

function defineApiEndpoints<const T extends readonly string[]>(
  _method: DeclaredHttpMethod,
  endpoints: T,
  _appendPathParam = false,
): T {
  return endpoints
}

const FOLDER_CREATE_ENDPOINTS = defineApiEndpoints('POST', [
  '/user/user/createfolder',
  '/user/createfolder',
] as const)
const FOLDER_LIST_ENDPOINTS = defineApiEndpoints('GET', [
  '/user/user/folderlist',
  '/user/folderlist',
] as const)
const FOLDER_DETAIL_ENDPOINTS = defineApiEndpoints(
  'GET',
  ['/user/user/folderdetail', '/user/folderdetail'] as const,
  true,
)
const FOLDER_DELETE_ENDPOINTS = defineApiEndpoints(
  'GET',
  ['/user/user/folderdel', '/user/folderdel'] as const,
  true,
)

export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'))
      return
    }
    const timer = setTimeout(resolve, ms)
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer)
        reject(new DOMException('Aborted', 'AbortError'))
      },
      { once: true },
    )
  })
}

async function requestWithEndpointFallback<T>(
  endpoints: readonly string[],
  request: (endpoint: string) => Promise<T>,
  context: string,
): Promise<T> {
  let lastError: unknown = null

  for (let index = 0; index < endpoints.length; index += 1) {
    const endpoint = endpoints[index]
    try {
      return await request(endpoint)
    } catch (error) {
      lastError = error
      const isNotFound = error instanceof ApiError && error.statusCode === 404
      if (!isNotFound || index === endpoints.length - 1) {
        throw error
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error(`[ProjectService] ${context} 调用失败`)
}

export async function requestFolderList(params?: Record<string, unknown>): Promise<unknown> {
  return requestWithEndpointFallback(
    FOLDER_LIST_ENDPOINTS,
    (endpoint) => apiClient.get<unknown>(endpoint, params),
    'folderlist',
  )
}

export async function requestFolderDetail(projectId: number): Promise<unknown> {
  return requestWithEndpointFallback(
    FOLDER_DETAIL_ENDPOINTS,
    (endpoint) => apiClient.get<unknown>(`${endpoint}/${projectId}`),
    'folderdetail',
  )
}

export async function requestFolderCreate(
  payload: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  return requestWithEndpointFallback(
    FOLDER_CREATE_ENDPOINTS,
    (endpoint) => apiClient.post<Record<string, unknown>>(endpoint, payload),
    'createfolder',
  )
}

export async function requestFolderDelete(projectId: number): Promise<void> {
  await requestWithEndpointFallback(
    FOLDER_DELETE_ENDPOINTS,
    (endpoint) =>
      apiClient.get<{
        code: number
        message: string
        data: unknown
      }>(`${endpoint}/${projectId}`),
    'folderdel',
  )
}

export function extractFolderDetailRecord(payload: unknown): Record<string, unknown> | null {
  if (!isRecord(payload)) {
    return null
  }
  const nestedData = payload['data']
  if (isRecord(nestedData)) {
    return nestedData
  }
  return payload
}
