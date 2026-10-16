export const createHashWorker = (): Worker =>
  new Worker(new URL('./hash.worker.ts', import.meta.url), {
    type: 'module',
  })

export const shouldLogWorkerDebug = (): boolean => import.meta.env.DEV
