const SENSITIVE_KEY_PATTERN = /token|password|secret|key|cookie|auth|authorization/i
const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi
const MAINLAND_PHONE_PATTERN = /\b1[3-9]\d{9}\b/g
const URL_SECRET_PATTERN =
  /([?&](?:token|access_token|refresh_token|password|secret|key|auth|authorization)=)[^&#\s]+/gi
const BEARER_PATTERN = /\bBearer\s+[A-Za-z0-9._~+/=-]+/gi
const MAX_SCRUB_DEPTH = 5

type SanitizableSentryEvent = {
  request?: {
    headers?: Record<string, unknown>
    cookies?: unknown
    url?: string
    data?: unknown
    body?: unknown
  }
  extra?: Record<string, unknown>
  tags?: Record<string, unknown>
  contexts?: Record<string, unknown>
  user?: Record<string, unknown>
  breadcrumbs?: Array<{
    data?: unknown
    message?: string
  }>
}

const scrubSensitiveString = (value: string): string =>
  value
    .replace(URL_SECRET_PATTERN, '$1[Filtered]')
    .replace(BEARER_PATTERN, 'Bearer [Filtered]')
    .replace(EMAIL_PATTERN, '[FilteredEmail]')
    .replace(MAINLAND_PHONE_PATTERN, '[FilteredPhone]')

const scrubSensitiveValue = (key: string, value: unknown, depth = 0): unknown => {
  if (SENSITIVE_KEY_PATTERN.test(key)) {
    return '[Filtered]'
  }
  if (typeof value === 'string') {
    return scrubSensitiveString(value)
  }
  if (!value || typeof value !== 'object' || depth >= MAX_SCRUB_DEPTH) {
    return value
  }
  if (Array.isArray(value)) {
    return value.map((item) => scrubSensitiveValue('', item, depth + 1))
  }

  const sanitized: Record<string, unknown> = {}
  for (const [childKey, childValue] of Object.entries(value)) {
    sanitized[childKey] = scrubSensitiveValue(childKey, childValue, depth + 1)
  }
  return sanitized
}

export const sanitizeSentryEvent = <T extends SanitizableSentryEvent>(event: T): T => {
  if (event.request?.headers) {
    delete event.request.headers['Authorization']
    delete event.request.headers['authorization']
    delete event.request.headers['Cookie']
    delete event.request.headers['cookie']
  }
  if (event.request?.cookies) {
    delete event.request.cookies
  }
  if (event.request?.url) {
    event.request.url = scrubSensitiveString(event.request.url)
  }
  if (event.request && 'data' in event.request) {
    event.request.data = scrubSensitiveValue('', event.request.data)
  }
  if (event.request && 'body' in event.request) {
    event.request.body = scrubSensitiveValue('', event.request.body)
  }

  if (event.extra) {
    event.extra = scrubSensitiveValue('', event.extra) as Record<string, unknown>
  }
  if (event.tags) {
    event.tags = scrubSensitiveValue('', event.tags) as Record<string, unknown>
  }
  if (event.contexts) {
    event.contexts = scrubSensitiveValue('', event.contexts) as Record<string, unknown>
  }
  if (event.user) {
    event.user = scrubSensitiveValue('', event.user) as Record<string, unknown>
  }

  if (event.breadcrumbs) {
    event.breadcrumbs = event.breadcrumbs.map((crumb) => {
      if (crumb.message) {
        crumb.message = scrubSensitiveString(crumb.message)
      }
      if (crumb.data && typeof crumb.data === 'object') {
        crumb.data = scrubSensitiveValue('', crumb.data) as Record<string, unknown>
      }
      return crumb
    })
  }

  return event
}
