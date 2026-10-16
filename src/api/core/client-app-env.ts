export function getClientApp(): string {
  return import.meta.env.VITE_CLIENT_APP || 'workarea'
}
