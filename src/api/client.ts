import { buildQueryString, performRequest, uploadFileRequest } from './core/client-helpers'
import { handleUnauthorized } from './core/auth-refresh'
import { resolveApiBaseUrl } from './core/api-base-url'
import { clearAccessToken, setAccessToken } from './core/token-storage'
import type { ApiRequestOptions, RequestProfile, RetryOptions } from './core/types'
import type { ResponseValidator } from './validation'

const handleRequestUnauthorized = async (): Promise<void> => {
  await handleUnauthorized()
}

interface RequestOptions {
  retry?: RetryOptions
  timeoutMs?: number
  requestProfile?: RequestProfile
  headers?: HeadersInit
  signal?: AbortSignal
  cache?: ApiRequestOptions<unknown>['cache']
}

class ApiClient {
  private baseURL: string

  constructor(baseURL: string = '/api') {
    this.baseURL = baseURL
  }

  public setToken(token: string): void {
    setAccessToken(token)
  }

  public clearToken(): void {
    clearAccessToken()
  }

  private async request<T>(endpoint: string, options: ApiRequestOptions<T> = {}): Promise<T> {
    return performRequest({
      baseURL: this.baseURL,
      endpoint,
      options,
      clearToken: () => this.clearToken(),
      onUnauthorized: handleRequestUnauthorized,
    })
  }

  public get<T>(
    endpoint: string,
    params?: unknown,
    validator?: ResponseValidator<T>,
    options?: RequestOptions,
  ): Promise<T> {
    return this.request<T>(endpoint + buildQueryString(params), {
      method: 'GET',
      validator,
      retry: options?.retry,
      timeoutMs: options?.timeoutMs,
      requestProfile: options?.requestProfile,
      headers: options?.headers,
      signal: options?.signal,
      cache: options?.cache,
    })
  }

  public post<TResponse, TPayload = unknown>(
    endpoint: string,
    data?: TPayload,
    validator?: ResponseValidator<TResponse>,
    options?: RequestOptions,
  ): Promise<TResponse> {
    return this.request<TResponse>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
      validator,
      retry: options?.retry,
      timeoutMs: options?.timeoutMs,
      requestProfile: options?.requestProfile,
      headers: options?.headers,
      signal: options?.signal,
    })
  }

  public put<TResponse, TPayload = unknown>(
    endpoint: string,
    data?: TPayload,
    validator?: ResponseValidator<TResponse>,
    options?: RequestOptions,
  ): Promise<TResponse> {
    return this.request<TResponse>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
      validator,
      retry: options?.retry,
      timeoutMs: options?.timeoutMs,
      requestProfile: options?.requestProfile,
      headers: options?.headers,
      signal: options?.signal,
    })
  }

  public delete<T>(
    endpoint: string,
    validator?: ResponseValidator<T>,
    options?: RequestOptions,
  ): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
      validator,
      retry: options?.retry,
      timeoutMs: options?.timeoutMs,
      requestProfile: options?.requestProfile,
      headers: options?.headers,
      signal: options?.signal,
    })
  }

  public patch<TResponse, TPayload = unknown>(
    endpoint: string,
    data?: TPayload,
    validator?: ResponseValidator<TResponse>,
    options?: RequestOptions,
  ): Promise<TResponse> {
    return this.request<TResponse>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
      validator,
      retry: options?.retry,
      timeoutMs: options?.timeoutMs,
      requestProfile: options?.requestProfile,
      headers: options?.headers,
      signal: options?.signal,
    })
  }

  public async uploadFile<T>(
    endpoint: string,
    formData: FormData,
    options?: RequestOptions,
  ): Promise<T> {
    return uploadFileRequest<T>({
      baseURL: this.baseURL,
      endpoint,
      formData,
      signal: options?.signal,
    })
  }
}

const apiBaseUrl = resolveApiBaseUrl(import.meta.env)
export const apiClient = new ApiClient(apiBaseUrl)
