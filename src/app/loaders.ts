/**
 * Route chunk loaders with promise caching and error recovery.
 *
 * Extracted from App.tsx to avoid circular imports
 * (App -> lazy(AuthPage) -> import(App)).
 *
 * IMPORTANT: React.lazy caches the loader result (success or failure) and
 * will NOT call the loader again for the same component instance. If a chunk
 * fails to load, the ErrorBoundary's full-page-reload buttons (e.g. "首页")
 * or a manual F5 are the only real recovery paths. The cache clearing here
 * ensures that a fresh import() is attempted after a full page reload.
 */

type ModuleWithDefault<T> = { default: T }

// Cached promises deduplicate concurrent import() calls (e.g. preload +
// React.lazy racing). On rejection the cache is cleared so a fresh import()
// is used after a full page reload or component remount via ErrorBoundary key.

let _workspacePromise: Promise<ModuleWithDefault<any>> | null = null
export const workspaceLoader = (): Promise<ModuleWithDefault<any>> => {
  if (!_workspacePromise) {
    _workspacePromise = import('@/modules/workspace/WorkspaceApp')
      .then((m) => ({ default: m.WorkspaceApp }))
      .catch((err) => {
        _workspacePromise = null
        throw err
      })
  }
  return _workspacePromise
}

let _profilePromise: Promise<ModuleWithDefault<any>> | null = null
export const profileLoader = (): Promise<ModuleWithDefault<any>> => {
  if (!_profilePromise) {
    _profilePromise = import('@/pages/user/ProfileAndRewardPage')
      .then((m) => ({ default: m.ProfileAndRewardPage }))
      .catch((err) => {
        _profilePromise = null
        throw err
      })
  }
  return _profilePromise
}

/**
 * Preload the workspace chunk. Safe to call multiple times (idempotent).
 * Logs failures for observability; the cache is cleared so a fresh import()
 * is used on the next page load.
 */
export const preloadWorkspace = (): void => {
  workspaceLoader().catch((err) => {
    console.warn('[preload] workspace chunk failed to load:', err)
  })
}

/**
 * Preload the profile chunk. Same semantics as preloadWorkspace.
 */
export const preloadProfile = (): void => {
  profileLoader().catch((err) => {
    console.warn('[preload] profile chunk failed to load:', err)
  })
}
