import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, jest, test } from '@jest/globals'
import { StrictMode, type ReactNode } from 'react'

const mockGetApiDetail = jest.fn<(endpoint: string) => Promise<any>>()
const mockSetEndpointAsync = jest.fn()

jest.mock('@/api/services', () => ({
  cmsService: {
    getApiDetail: (endpoint: string) => mockGetApiDetail(endpoint),
  },
}))

jest.mock('@/stores', () => ({
  useAsyncToolStore: {
    getState: () => ({ setEndpointAsync: mockSetEndpointAsync }),
  },
}))

import { useApiDetailLoader } from './use-api-detail-loader'

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}

const getApiEndpointForTool = (toolName: string, version: string) =>
  `/api/${toolName}/${version}`

function renderLoader(toolName = 'A') {
  return renderHook(
    ({ currentToolName }) =>
      useApiDetailLoader({
        hydrated: true,
        toolName: currentToolName,
        toolVersion: 'v1',
        inputSections: {},
        getApiEndpointForTool,
      }),
    { initialProps: { currentToolName: toolName } },
  )
}

function StrictModeWrapper({ children }: { children: ReactNode }) {
  return <StrictMode>{children}</StrictMode>
}

describe('useApiDetailLoader request ownership', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('starts a distinct request for a new endpoint and rejects the old endpoint result', async () => {
    const requestA = deferred<any>()
    const requestX = deferred<any>()
    mockGetApiDetail
      .mockReturnValueOnce(requestA.promise)
      .mockReturnValueOnce(requestX.promise)
    const { result, rerender } = renderLoader('A')

    await waitFor(() => expect(mockGetApiDetail).toHaveBeenCalledWith('/api/A/v1'))
    rerender({ currentToolName: 'X' })
    await waitFor(() => expect(mockGetApiDetail).toHaveBeenCalledWith('/api/X/v1'))

    await act(async () => {
      requestA.resolve({ is_async: 1, input_schema: [{ name: 'a-input' }] })
      await requestA.promise
    })
    expect(result.current.apiDetailLoaded).toBe(false)
    expect(mockSetEndpointAsync).not.toHaveBeenCalled()

    // A's finally must not clear X's still-active request.
    void result.current.fetchApiDetail()
    expect(mockGetApiDetail).toHaveBeenCalledTimes(2)

    await act(async () => {
      requestX.resolve({ is_async: 0, input_schema: [{ name: 'x-input' }] })
      await requestX.promise
    })
    await waitFor(() => expect(result.current.apiDetailLoaded).toBe(true))
    expect(result.current.currentApiDetail).toEqual(
      expect.objectContaining({ input_schema: [{ name: 'x-input' }] }),
    )
    expect(mockSetEndpointAsync).toHaveBeenCalledTimes(1)
    expect(mockSetEndpointAsync).toHaveBeenCalledWith('/api/X/v1', false)
  })

  test('deduplicates concurrent loads for the same endpoint', async () => {
    const requestA = deferred<any>()
    mockGetApiDetail.mockReturnValue(requestA.promise)
    const { result } = renderLoader('A')

    await waitFor(() => expect(mockGetApiDetail).toHaveBeenCalledTimes(1))
    void result.current.fetchApiDetail()
    void result.current.ensureApiDetailLoaded()
    expect(mockGetApiDetail).toHaveBeenCalledTimes(1)

    await act(async () => {
      requestA.resolve({ is_async: 0, input_schema: [] })
      await requestA.promise
    })
  })

  test('reset invalidates the old request without allowing its finally to clear the replacement', async () => {
    const oldRequest = deferred<any>()
    const replacementRequest = deferred<any>()
    mockGetApiDetail
      .mockReturnValueOnce(oldRequest.promise)
      .mockReturnValueOnce(replacementRequest.promise)
    const { result } = renderLoader('A')

    await waitFor(() => expect(mockGetApiDetail).toHaveBeenCalledTimes(1))
    act(() => result.current.resetApiDetailLoad())
    await waitFor(() => expect(mockGetApiDetail).toHaveBeenCalledTimes(2))

    await act(async () => {
      oldRequest.resolve({ is_async: 1, input_schema: [{ name: 'old-input' }] })
      await oldRequest.promise
    })
    expect(result.current.apiDetailLoaded).toBe(false)
    expect(mockSetEndpointAsync).not.toHaveBeenCalled()
    void result.current.fetchApiDetail()
    expect(mockGetApiDetail).toHaveBeenCalledTimes(2)

    await act(async () => {
      replacementRequest.resolve({ is_async: 0, input_schema: [{ name: 'current-input' }] })
      await replacementRequest.promise
    })
    await waitFor(() => expect(result.current.apiDetailLoaded).toBe(true))
    expect(result.current.currentApiDetail).toEqual(
      expect.objectContaining({ input_schema: [{ name: 'current-input' }] }),
    )
  })

  test('commits the same endpoint request after StrictMode replays effects', async () => {
    const requestA = deferred<any>()
    mockGetApiDetail.mockReturnValue(requestA.promise)
    const { result } = renderHook(
      () =>
        useApiDetailLoader({
          hydrated: true,
          toolName: 'A',
          toolVersion: 'v1',
          inputSections: {},
          getApiEndpointForTool,
        }),
      { wrapper: StrictModeWrapper },
    )

    await waitFor(() => expect(mockGetApiDetail).toHaveBeenCalledTimes(1))
    await act(async () => {
      requestA.resolve({ is_async: 0, input_schema: [{ name: 'a-input' }] })
      await requestA.promise
    })

    await waitFor(() => expect(result.current.apiDetailLoaded).toBe(true))
    expect(result.current.currentApiDetail).toEqual(
      expect.objectContaining({ input_schema: [{ name: 'a-input' }] }),
    )
  })
})
