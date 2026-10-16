export function isWorkspaceFastBootEnabled(): boolean {
  return import.meta.env.VITE_WORKSPACE_FAST_BOOT !== '0'
}
