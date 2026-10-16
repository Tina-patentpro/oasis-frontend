import type { ProjectSessionPageState } from './session-loading'

export function getInitializedProjectSessionIds(
  projectSessionPageState: Record<number, ProjectSessionPageState>,
): number[] {
  return Object.entries(projectSessionPageState)
    .filter(([, state]) => state.initialized)
    .map(([projectId]) => Number(projectId))
}

export function normalizeRefreshFolderId(value: unknown): number | null {
  if (value === undefined || value === null || value === '') {
    return 0
  }

  const folderId = Number(value)
  if (!Number.isFinite(folderId) || folderId < 0) {
    return null
  }
  return folderId
}
