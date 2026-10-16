/**
 * Shared file utility functions.
 *
 * Centralises logic that was previously duplicated across
 * `user-data-export.ts`, `export-utils/entries.ts` and `download.ts`.
 */

/**
 * Returns `true` when the given URL string is already absolute
 * (i.e. starts with a scheme such as `https:` or with `//`).
 */
function isAbsoluteUrl(url: string): boolean {
  return /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(url) || url.startsWith('//')
}

/**
 * Decide whether an `Authorization: Bearer <token>` header should be
 * attached to a request for *resolvedUrl*.
 *
 * - Relative URLs always require the header (they resolve to the same origin).
 * - For absolute URLs the header is only added when the target origin matches
 *   the current `window.location.origin`.
 */
export function shouldAttachAuthorization(rawUrl: string, resolvedUrl: string): boolean {
  if (!isAbsoluteUrl(rawUrl)) {
    return true
  }

  try {
    const targetUrl = new URL(resolvedUrl)
    if (typeof window !== 'undefined' && window.location?.origin) {
      return targetUrl.origin === window.location.origin
    }
  } catch {
    return false
  }

  return false
}

/**
 * Coerce an unknown error value into a human-readable string.
 */
export function normalizeErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message
  }

  const fallback = String(error ?? '').trim()
  return fallback || '未知错误'
}

/**
 * Trigger a browser download for the given `Blob`.
 *
 * Creates a temporary `<a>` element, clicks it, then revokes the
 * object-URL to free memory.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Given a desired *path* and a set of already-used paths, return a unique
 * variant by appending `(2)`, `(3)`, … before the file extension when
 * necessary.  The chosen path is **added** to `usedPaths` before returning.
 */
export function ensureUniquePath(path: string, usedPaths: Set<string>): string {
  if (!usedPaths.has(path)) {
    usedPaths.add(path)
    return path
  }

  const extensionIndex = path.lastIndexOf('.')
  const base = extensionIndex > 0 ? path.slice(0, extensionIndex) : path
  const extension = extensionIndex > 0 ? path.slice(extensionIndex) : ''

  const MAX_ATTEMPTS = 1000
  let attempt = 2
  while (attempt <= MAX_ATTEMPTS) {
    const nextPath = `${base} (${attempt})${extension}`
    if (!usedPaths.has(nextPath)) {
      usedPaths.add(nextPath)
      return nextPath
    }
    attempt += 1
  }
  // Fallback: return a timestamped path if MAX_ATTEMPTS exceeded
  const fallbackPath = `${base} (${Date.now()})${extension}`
  usedPaths.add(fallbackPath)
  return fallbackPath
}

/**
 * Strip characters that are unsafe in file/path names and collapse
 * whitespace.  Returns *fallback* when the result would be empty.
 */
export function sanitizeFileName(
  name: string | undefined | null,
  fallback: string = 'untitled',
): string {
  if (!name) {
    return fallback
  }

  const sanitized = name
    .replace(/[\\/:*?"<>|\r\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return sanitized || fallback
}
