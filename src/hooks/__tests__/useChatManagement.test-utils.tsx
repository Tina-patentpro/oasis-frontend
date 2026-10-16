import { renderHook } from '@testing-library/react'
import { jest } from '@jest/globals'

import type { ChatflowPromptsResponse } from '@/api/services/ai.service'

import { useChatManagement } from '../useChatManagement'

export const EMPTY_CHATFLOW_PROMPTS: ChatflowPromptsResponse = {
  通用对话: [],
  工作聚焦: [],
  语义生图: [],
}

export function createDeferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error?: unknown) => void
  const promise = new Promise<T>((innerResolve, innerReject) => {
    resolve = innerResolve
    reject = innerReject
  })
  return { promise, resolve, reject }
}

export function createFileList(files: File[]): FileList {
  return {
    ...files,
    length: files.length,
    item: (index: number) => files[index] ?? null,
    [Symbol.iterator]: function* iterator() {
      yield* files
    },
  } as unknown as FileList
}

interface CreateHookOptions {
  notify?: jest.Mock<(message: string) => void>
  setHistoryDialogOpen?: jest.Mock<(open: boolean) => void>
  onSessionLinked?: jest.Mock<() => void>
  onWorkspaceProjectSelect?: jest.Mock<(projectId: number | null) => void>
  openHistoryDialog?: jest.Mock<
    (options?: { projectId?: number; type?: string; title?: string }) => void
  >
}

export function createHook(options: CreateHookOptions = {}) {
  const notify = options.notify ?? jest.fn<(message: string) => void>()
  const setHistoryDialogOpen = options.setHistoryDialogOpen ?? jest.fn<(open: boolean) => void>()
  const onSessionLinked = options.onSessionLinked ?? jest.fn<() => void>()
  const onWorkspaceProjectSelect =
    options.onWorkspaceProjectSelect ?? jest.fn<(projectId: number | null) => void>()

  const hook = renderHook(() =>
    useChatManagement(
      notify,
      setHistoryDialogOpen,
      onSessionLinked,
      onWorkspaceProjectSelect,
      options.openHistoryDialog,
    ),
  )

  return {
    ...hook,
    notify,
    setHistoryDialogOpen,
    onSessionLinked,
    onWorkspaceProjectSelect,
    openHistoryDialog: options.openHistoryDialog,
  }
}
