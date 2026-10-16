export function getViteApiBaseUrl(): string | undefined {
  const value = import.meta.env?.VITE_API_BASE_URL
  if (typeof value !== 'string') {
    return undefined
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}
