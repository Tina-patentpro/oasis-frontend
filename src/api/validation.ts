/**
 * 运行时响应校验相关工具
 * 不引入额外依赖，先提供轻量的 type guard（运行时类型判断）封装。
 */

export type ResponseValidator<T> = (payload: unknown) => T

export type TypeGuard<T> = (payload: unknown) => payload is T

export class ResponseValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ResponseValidationError'
  }
}

export function isRecord(payload: unknown): payload is Record<string, unknown> {
  return typeof payload === 'object' && payload !== null && !Array.isArray(payload)
}

export function createResponseValidator<T>(
  guard: TypeGuard<T>,
  schemaName = 'API',
): ResponseValidator<T> {
  return (payload: unknown): T => {
    if (!guard(payload)) {
      throw new ResponseValidationError(`${schemaName} 响应数据格式不正确`)
    }
    return payload
  }
}

export function validateArray<T>(
  itemGuard: TypeGuard<T>,
  schemaName = 'API[]',
): ResponseValidator<T[]> {
  return createResponseValidator<T[]>(
    (payload): payload is T[] => Array.isArray(payload) && payload.every(itemGuard),
    schemaName,
  )
}
