import { beforeEach, describe, expect, jest, test } from '@jest/globals'

import {
  safeReadLocalStorageJson,
  safeRemoveLocalStorageItem,
  safeSetLocalStorageItem,
  safeSetLocalStorageJson,
} from './safe-storage'

describe('safe-storage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  test('does not throw when localStorage setItem is blocked', () => {
    const spy = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError')
    })

    expect(safeSetLocalStorageJson('user', { id: 1 })).toBe(false)

    spy.mockRestore()
  })

  test('removes invalid json and returns null', () => {
    localStorage.setItem('user', '{bad json')

    expect(safeReadLocalStorageJson('user')).toBeNull()
    expect(localStorage.getItem('user')).toBeNull()
  })

  test('ignores remove failures', () => {
    localStorage.setItem('user', 'value')
    const spy = jest.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new DOMException('Storage blocked', 'SecurityError')
    })

    expect(() => safeRemoveLocalStorageItem('user')).not.toThrow()

    spy.mockRestore()
  })

  test('stores plain values when storage is available', () => {
    expect(safeSetLocalStorageItem('plain', 'value')).toBe(true)
    expect(localStorage.getItem('plain')).toBe('value')
  })
})
