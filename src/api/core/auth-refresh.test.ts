import { describe, expect, jest, test } from '@jest/globals'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { handleUnauthorized, setUnauthorizedHandler } from './auth-refresh'

describe('auth-refresh', () => {
  test('does not import the auth store from the API layer', () => {
    const source = readFileSync(join(__dirname, 'auth-refresh.ts'), 'utf8')

    expect(source).not.toContain("import('@/stores/useAuthStore')")
    expect(source).not.toContain('@/stores/useAuthStore')
  })

  test('delegates unauthorized handling to the registered handler', async () => {
    const handler = jest.fn((_: string): void => undefined)
    const resetHandler = setUnauthorizedHandler(handler)

    await handleUnauthorized('登录状态已过期')

    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler).toHaveBeenCalledWith('登录状态已过期')
    resetHandler()
  })
})
