interface SecurityPolicyOptions {
  allowInlineScripts?: boolean
  includeFrameAncestors?: boolean
  includeLocalDevelopmentOrigins?: boolean
  sources?: SecurityCspSources
}

export interface SecurityCspSources {
  apiBaseUrl?: string
  sentryDsn?: string
  imgOrigins?: string[]
  connectOrigins?: string[]
}

interface NormalizedSecurityCspSources {
  imgOrigins: string[]
  connectOrigins: string[]
}

const unique = (values: Array<string | null>): string[] =>
  Array.from(new Set(values.filter((value): value is string => Boolean(value))))

const extractHttpsOrigin = (value: string | undefined): string | null => {
  if (!value) {
    return null
  }

  try {
    const url = new URL(value)
    return url.protocol === 'https:' ? url.origin : null
  } catch {
    return null
  }
}

const normalizeOrigins = (values: string[] | undefined): string[] =>
  unique((values ?? []).map(extractHttpsOrigin))

export const createSecurityCspSources = ({
  apiBaseUrl,
  sentryDsn,
  imgOrigins,
  connectOrigins,
}: SecurityCspSources = {}): NormalizedSecurityCspSources => {
  const apiOrigin = extractHttpsOrigin(apiBaseUrl)
  const sentryOrigin = extractHttpsOrigin(sentryDsn)

  return {
    imgOrigins: unique([apiOrigin, ...normalizeOrigins(imgOrigins)]),
    connectOrigins: unique([apiOrigin, sentryOrigin, ...normalizeOrigins(connectOrigins)]),
  }
}

const buildCspDirectives = ({
  allowInlineScripts = false,
  includeFrameAncestors = false,
  includeLocalDevelopmentOrigins = false,
  sources,
}: SecurityPolicyOptions = {}): string[] => {
  const normalizedSources = createSecurityCspSources(sources)
  const imgHttpsWhitelist = normalizedSources.imgOrigins.join(' ')
  const connectHttpsWhitelist = normalizedSources.connectOrigins.join(' ')
  const localImageSources = includeLocalDevelopmentOrigins
    ? 'http://127.0.0.1:* http://localhost:*'
    : ''
  const localConnectSources = includeLocalDevelopmentOrigins
    ? 'http://127.0.0.1:* http://localhost:* ws://127.0.0.1:* ws://localhost:*'
    : ''

  return [
    "default-src 'self'",
    allowInlineScripts ? "script-src 'self' 'unsafe-inline'" : "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    ["img-src 'self' data: blob:", imgHttpsWhitelist, localImageSources].filter(Boolean).join(' '),
    "font-src 'self' data:",
    ["connect-src 'self'", connectHttpsWhitelist, localConnectSources].filter(Boolean).join(' '),
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    ...(includeFrameAncestors ? ["frame-ancestors 'none'"] : []),
  ]
}

export const createSecurityCsp = (options?: SecurityPolicyOptions): string =>
  buildCspDirectives(options).join('; ')

// Meta tag CSP: frame-ancestors is ignored by browsers in meta tags, so omit it
export const SECURITY_META_CSP = createSecurityCsp()
export const SECURITY_DEV_CSP = createSecurityCsp({
  allowInlineScripts: true,
  includeLocalDevelopmentOrigins: true,
})

export const createSecurityHeaders = (options?: SecurityPolicyOptions): Record<string, string> => ({
  'Content-Security-Policy': createSecurityCsp({ ...options, includeFrameAncestors: true }),
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
})

// Backward-compatible default (strict policy).
export const SECURITY_HEADERS: Record<string, string> = createSecurityHeaders()
