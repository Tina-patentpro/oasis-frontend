import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const STORAGE_KEY = 'workspace-ui-storage'

describe('workspace useWorkspaceUIStore hydration', () => {
  let consoleErrorSpy: jest.SpiedFunction<typeof console.error>

  beforeEach(() => {
    jest.resetModules()
    window.localStorage.clear()
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
    window.localStorage.clear()
    jest.resetModules()
  })

  test('imports without logging a store initialization rehydrate error', async () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        state: {
          chatWidth: 99999,
          leftWidth: 99999,
          chatMode: 'invalid',
          layoutMode: 'invalid',
        },
        version: 0,
      }),
    )

    await import('./useWorkspaceUIStore')
    await Promise.resolve()

    expect(consoleErrorSpy).not.toHaveBeenCalledWith(
      'Failed to rehydrate workspace ui store',
      expect.any(ReferenceError),
    )
  })

  test('does not reference the exported store binding from the rehydrate callback', () => {
    const source = readFileSync(resolve(__dirname, 'useWorkspaceUIStore.ts'), 'utf8')
    const rehydrateCallback = source.slice(source.indexOf('onRehydrateStorage'))

    expect(rehydrateCallback).not.toContain('useWorkspaceUIStore.setState')
  })

  test('migrates the legacy chat width into a durable preferred width', async () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        state: {
          chatWidth: 612,
          chatMode: 'quarter',
          showSidebar: false,
        },
        version: 0,
      }),
    )

    const { useWorkspaceUIStore } = await import('./useWorkspaceUIStore')
    await Promise.resolve()

    const state = useWorkspaceUIStore.getState()
    expect(state.preferredChatWidth).toBe(612)
    expect(state.chatWidth).toBe(612)
  })
})
