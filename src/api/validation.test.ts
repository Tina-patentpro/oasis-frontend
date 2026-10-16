import { describe, expect, test } from '@jest/globals'

import {
  ResponseValidationError,
  createResponseValidator,
  isRecord,
  validateArray,
} from './validation'

interface UserPayload {
  id: number
  name: string
}

const isUserPayload = (value: unknown): value is UserPayload =>
  isRecord(value) && typeof value.id === 'number' && typeof value.name === 'string'

describe('response validation helpers', () => {
  test('creates validators that accept matching runtime payloads', () => {
    const validateUser = createResponseValidator(isUserPayload, 'UserPayload')

    expect(validateUser({ id: 1, name: '测试用户' })).toEqual({ id: 1, name: '测试用户' })
  })

  test('throws a typed validation error for mismatched runtime payloads', () => {
    const validateUser = createResponseValidator(isUserPayload, 'UserPayload')

    expect(() => validateUser({ id: '1', name: '测试用户' })).toThrow(ResponseValidationError)
    expect(() => validateUser({ id: '1', name: '测试用户' })).toThrow(
      'UserPayload 响应数据格式不正确',
    )
  })

  test('validates every item in response arrays', () => {
    const validateUsers = validateArray(isUserPayload, 'UserPayload[]')

    expect(validateUsers([{ id: 1, name: '测试用户' }])).toEqual([{ id: 1, name: '测试用户' }])
    expect(() => validateUsers([{ id: 1, name: null }])).toThrow(ResponseValidationError)
  })
})
