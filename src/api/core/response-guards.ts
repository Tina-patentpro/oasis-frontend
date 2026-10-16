import type { ErrorEnvelope, SuccessEnvelope } from './types'

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

export const isErrorEnvelope = (value: unknown): value is ErrorEnvelope => {
  if (!isObject(value)) {
    return false
  }
  if (value['success'] !== false) {
    return false
  }
  const error = value['error']
  if (!isObject(error)) {
    return false
  }
  return typeof error['code'] === 'string' && typeof error['message'] === 'string'
}

export const isDetailErrorResponse = (value: unknown): value is { detail: string } => {
  if (!isObject(value)) {
    return false
  }
  return typeof value['detail'] === 'string'
}

export const isSuccessEnvelope = <T>(value: unknown): value is SuccessEnvelope<T> => {
  if (!isObject(value)) {
    return false
  }
  return value['success'] === true && Object.prototype.hasOwnProperty.call(value, 'data')
}

export const isCodeDataResponse = <T>(
  value: unknown,
): value is { code: number | string; message?: string; msg?: string; data: T } => {
  if (!isObject(value)) {
    return false
  }
  return typeof value['code'] === 'number' || typeof value['code'] === 'string'
}
