import { afterAll, afterEach, beforeAll, describe, expect, jest, test } from '@jest/globals'
import { renderHook, waitFor } from '@testing-library/react'

import { useFileHasher } from './useFileHasher'

jest.mock('./hash-worker-factory', () => ({
  createHashWorker: jest.fn(() => new Worker('hash.worker.ts', { type: 'module' })),
  shouldLogWorkerDebug: jest.fn(() => false),
}))

type PostedMessage = {
  file: File
  id: string
}

type WorkerMessage = {
  data: {
    error?: string
    hash?: string
    id: string
    name: string
    size: number
    type: string
  }
}

type MockWorkerOptions = {
  type?: string
}

const originalWorker = globalThis.Worker
const originalCreateObjectURL = URL.createObjectURL
const originalRevokeObjectURL = URL.revokeObjectURL

const workerInstances: MockWorker[] = []

class MockWorker {
  onmessage: ((event: WorkerMessage) => void) | null = null
  onerror: ((event: Event) => void) | null = null
  postMessage = jest.fn((message: PostedMessage) => {
    this.messages.push(message)
  })
  terminate = jest.fn()
  messages: PostedMessage[] = []

  constructor(
    public readonly scriptUrl: string | URL,
    public readonly options?: MockWorkerOptions,
  ) {
    workerInstances.push(this)
  }
}

function getActiveWorker(): MockWorker {
  const activeWorker = workerInstances[workerInstances.length - 1]
  if (!activeWorker) {
    throw new Error('No active mock worker')
  }
  return activeWorker
}

async function renderSupportedHasher() {
  const view = renderHook(() => useFileHasher())

  await waitFor(() => {
    expect(workerInstances.length).toBeGreaterThanOrEqual(1)
  })

  return view
}

function getLastPostedMessage(worker: MockWorker): PostedMessage {
  const message = worker.messages[worker.messages.length - 1]
  if (!message) {
    throw new Error('No posted message')
  }
  return message
}

beforeAll(() => {
  Object.defineProperty(globalThis, 'Worker', {
    configurable: true,
    writable: true,
    value: MockWorker as unknown as typeof Worker,
  })
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    writable: true,
    value: jest.fn(() => 'blob:mock-worker-check'),
  })
  Object.defineProperty(URL, 'revokeObjectURL', {
    configurable: true,
    writable: true,
    value: jest.fn(),
  })
})

afterEach(() => {
  workerInstances.splice(0, workerInstances.length)
  jest.clearAllMocks()
  jest.useRealTimers()
})

afterAll(() => {
  Object.defineProperty(globalThis, 'Worker', {
    configurable: true,
    writable: true,
    value: originalWorker,
  })
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    writable: true,
    value: originalCreateObjectURL,
  })
  Object.defineProperty(URL, 'revokeObjectURL', {
    configurable: true,
    writable: true,
    value: originalRevokeObjectURL,
  })
})

describe('useFileHasher', () => {
  test('returns supported state and resolves hashes from worker messages', async () => {
    const { result, unmount } = await renderSupportedHasher()
    const file = new File(['hello'], 'hello.txt', { type: 'text/plain' })

    expect(result.current.isSupported).toBe(true)

    const promise = result.current.hashFiles([file])
    const worker = getActiveWorker()
    const posted = getLastPostedMessage(worker)

    expect(posted.file).toBe(file)
    expect(posted.id).toContain('hello.txt-5-')

    worker.onmessage?.({
      data: {
        id: posted.id,
        hash: 'abc123',
        name: file.name,
        size: file.size,
        type: file.type,
      },
    })

    await expect(promise).resolves.toEqual([
      {
        id: posted.id,
        hash: 'abc123',
        name: 'hello.txt',
        size: 5,
        type: 'text/plain',
      },
    ])

    unmount()
  })

  test('returns an empty result when there are no files to hash', async () => {
    const { result, unmount } = await renderSupportedHasher()

    await expect(result.current.hashFiles([])).resolves.toEqual([])

    unmount()
  })

  test('returns a readable error result when the worker reports a hash failure', async () => {
    const { result, unmount } = await renderSupportedHasher()
    const file = new File(['broken'], 'broken.txt', { type: 'text/plain' })

    const promise = result.current.hashFiles([file])
    const worker = getActiveWorker()
    const posted = getLastPostedMessage(worker)

    worker.onmessage?.({
      data: {
        id: posted.id,
        error: 'SUBTLE_CRYPTO_UNAVAILABLE',
        name: file.name,
        size: file.size,
        type: file.type,
      },
    })

    await expect(promise).resolves.toEqual([
      expect.objectContaining({
        error: 'SUBTLE_CRYPTO_UNAVAILABLE',
        name: '',
        size: 0,
        type: 'unknown',
      }),
    ])

    unmount()
  })

  test('returns a timeout error result when hashing takes too long', async () => {
    jest.useFakeTimers()
    const { result, unmount } = await renderSupportedHasher()
    const file = new File(['slow'], 'slow.txt', { type: 'text/plain' })

    const promise = result.current.hashFiles([file])

    jest.advanceTimersByTime(30000)

    await expect(promise).resolves.toEqual([
      expect.objectContaining({
        error: '哈希计算超时',
        name: '',
        size: 0,
        type: 'unknown',
      }),
    ])

    unmount()
  })

  test('terminates the worker and settles pending hashes when the hook unmounts', async () => {
    const { result, unmount } = await renderSupportedHasher()
    const file = new File(['pending'], 'pending.txt', { type: 'text/plain' })

    const promise = result.current.hashFiles([file])
    const worker = getActiveWorker()

    unmount()

    expect(worker.terminate).toHaveBeenCalled()
    await expect(promise).resolves.toEqual([
      expect.objectContaining({
        error: 'Worker 已终止',
        name: '',
        size: 0,
        type: 'unknown',
      }),
    ])
  })

  test('terminates the worker and settles pending hashes when the worker itself fails', async () => {
    const { result, unmount } = await renderSupportedHasher()
    const file = new File(['error'], 'error.txt', { type: 'text/plain' })

    const promise = result.current.hashFiles([file])
    const worker = getActiveWorker()

    worker.onerror?.(new Event('error'))

    expect(worker.terminate).toHaveBeenCalled()
    await expect(promise).resolves.toEqual([
      expect.objectContaining({
        error: 'Worker 发生错误',
        name: '',
        size: 0,
        type: 'unknown',
      }),
    ])

    unmount()
  })
})
