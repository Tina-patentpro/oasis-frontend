import { useCallback, useEffect, useRef } from 'react'

import { createHashWorker, shouldLogWorkerDebug } from './hash-worker-factory'

interface FileHashResult {
  id: string
  name: string
  size: number
  type: string
  hash?: string
  error?: string
}

type PendingHandler = {
  resolve: (result: FileHashResult) => void
  reject: (error: Error) => void
}

// 检测浏览器是否支持 Module Worker
let moduleWorkerSupport: boolean | null = null
const canCreateModuleWorker = (): boolean => {
  if (moduleWorkerSupport !== null) {
    return moduleWorkerSupport
  }

  try {
    if (typeof Worker === 'undefined') {
      moduleWorkerSupport = false
      return moduleWorkerSupport
    }

    const testScript = 'export {}'
    const blob = new Blob([testScript], { type: 'application/javascript' })
    const url = URL.createObjectURL(blob)

    try {
      const worker = new Worker(url, { type: 'module' })
      worker.terminate()
      moduleWorkerSupport = true
    } catch {
      moduleWorkerSupport = false
    } finally {
      URL.revokeObjectURL(url)
    }
  } catch {
    moduleWorkerSupport = false
  }

  return moduleWorkerSupport
}

const createWorker = (): Worker | null => {
  if (!canCreateModuleWorker()) {
    return null
  }

  try {
    return createHashWorker()
  } catch (error) {
    if (shouldLogWorkerDebug()) {
      console.error('[file-hasher] Worker 创建失败', error)
    }
    return null
  }
}

const generateUuid = () =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`

export const useFileHasher = (): {
  hashFiles: (files: readonly File[]) => Promise<FileHashResult[]>
  isSupported: boolean
} => {
  const workerRef = useRef<Worker | null>(null)
  const pendingMapRef = useRef<Map<string, PendingHandler>>(new Map())
  const runtimeSupportsWorker = typeof window !== 'undefined' && typeof Worker !== 'undefined'
  const moduleSupport = runtimeSupportsWorker ? canCreateModuleWorker() : false

  useEffect(() => {
    if (!moduleSupport) {
      return
    }

    const worker = createWorker()
    if (!worker) {
      moduleWorkerSupport = false
      return
    }

    workerRef.current = worker
    const pendingMap = pendingMapRef.current

    worker.onmessage = (event: MessageEvent<FileHashResult>) => {
      const { id } = event.data
      const handler = pendingMapRef.current.get(id)
      if (!handler) return
      pendingMapRef.current.delete(id)

      if (event.data.error) {
        handler.reject(new Error(event.data.error))
      } else {
        handler.resolve(event.data)
      }
    }

    worker.onerror = (event) => {
      if (shouldLogWorkerDebug()) {
        console.error('[file-hasher] worker 错误', event)
      }

      moduleWorkerSupport = false
      worker.terminate()

      // 当 Worker 失败时，拒绝所有待处理的 Promise
      for (const [id, handler] of pendingMap.entries()) {
        handler.reject(new Error('Worker 发生错误'))
        pendingMap.delete(id)
      }

      workerRef.current = null
    }

    return () => {
      worker.terminate()
      workerRef.current = null

      // 在清理阶段拒绝所有挂起的 Promise 防止泄漏
      for (const [id, handler] of pendingMap.entries()) {
        handler.reject(new Error('Worker 已终止'))
        pendingMap.delete(id)
      }
    }
  }, [moduleSupport])

  const generateId = useCallback((file: File) => `${file.name}-${file.size}-${generateUuid()}`, [])

  const hashFiles = useCallback(
    async (files: readonly File[]): Promise<FileHashResult[]> => {
      if (!files.length || !workerRef.current) {
        return []
      }

      const worker = workerRef.current

      const tasks = files.map(
        (file) =>
          new Promise<FileHashResult>((resolve, reject) => {
            const id = generateId(file)

            // 设置 30 秒超时机制
            const timeoutId = setTimeout(() => {
              const handler = pendingMapRef.current.get(id)
              if (handler) {
                handler.reject(new Error('哈希计算超时'))
                pendingMapRef.current.delete(id)
              }
            }, 30000)

            pendingMapRef.current.set(id, {
              resolve: (result) => {
                clearTimeout(timeoutId)
                resolve(result)
              },
              reject: (error) => {
                clearTimeout(timeoutId)
                reject(error)
              },
            })

            worker.postMessage({ id, file })
          }),
      )

      return Promise.allSettled(tasks).then((results) =>
        results
          .map((result) => {
            if (result.status === 'fulfilled') {
              return result.value
            }

            return {
              id: generateUuid(),
              name: '',
              size: 0,
              type: 'unknown',
              error: result.reason instanceof Error ? result.reason.message : String(result.reason),
            }
          })
          .filter(Boolean),
      )
    },
    [generateId],
  )

  return {
    hashFiles,
    isSupported: moduleSupport,
  }
}
