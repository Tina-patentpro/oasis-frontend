import type { Session } from '@/types/api'

import type { SessionLoadOptions } from './session-loading'

export type SessionAssociationRefreshTarget =
  | { type: 'independent' }
  | { type: 'project'; projectId: number }

type LoadIndependentSessionsPage = (
  page: number,
  append: boolean,
  options?: SessionLoadOptions,
) => Promise<void>

type LoadProjectSessionsPage = (
  projectId: number,
  page: number,
  append: boolean,
  options?: SessionLoadOptions,
) => Promise<void>

function hasProjectId(session: Session): session is Session & { projectId: number } {
  return typeof session.projectId === 'number'
}

function dedupeRefreshTargets(
  targets: SessionAssociationRefreshTarget[],
): SessionAssociationRefreshTarget[] {
  const seen = new Set<string>()
  const deduped: SessionAssociationRefreshTarget[] = []
  targets.forEach((target) => {
    const key = target.type === 'independent' ? 'independent' : `project:${target.projectId}`
    if (seen.has(key)) {
      return
    }
    seen.add(key)
    deduped.push(target)
  })
  return deduped
}

export function buildAssociateProjectRefreshTargets(
  session: Session,
  targetProjectId: number,
): SessionAssociationRefreshTarget[] {
  const targets: SessionAssociationRefreshTarget[] = []

  if (hasProjectId(session) && session.projectId !== targetProjectId) {
    targets.push({ type: 'project', projectId: session.projectId })
  }
  if (!hasProjectId(session)) {
    targets.push({ type: 'independent' })
  }
  targets.push({ type: 'project', projectId: targetProjectId })

  return dedupeRefreshTargets(targets)
}

export function buildDissociateProjectRefreshTargets(
  session: Session,
): SessionAssociationRefreshTarget[] {
  const targets: SessionAssociationRefreshTarget[] = [{ type: 'independent' }]
  if (hasProjectId(session)) {
    targets.push({ type: 'project', projectId: session.projectId })
  }
  return dedupeRefreshTargets(targets)
}

export function runSessionAssociationRefreshTasks(
  targets: SessionAssociationRefreshTarget[],
  loadIndependentSessionsPage: LoadIndependentSessionsPage,
  loadProjectSessionsPage: LoadProjectSessionsPage,
): void {
  const refreshTasks = targets.map((target) =>
    target.type === 'independent'
      ? loadIndependentSessionsPage(1, false, { bypassCache: true })
      : loadProjectSessionsPage(target.projectId, 1, false, { bypassCache: true }),
  )
  void Promise.allSettled(refreshTasks)
}
