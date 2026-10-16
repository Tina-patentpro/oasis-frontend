import type { SessionTrackingHint, SessionTrackingPhase } from '../sidebar/optimistic-session'

export interface SessionTrackingContext {
  taskKey: string
  folderId: number
  title: string
  toolType: string
  submittedAtMs: number
}

interface SessionTrackingRegistry {
  contextByTaskKey: Record<string, SessionTrackingContext>
  resolvedSessionIdByTaskKey: Record<string, number>
}

export function createSessionTrackingRegistry(): SessionTrackingRegistry {
  return {
    contextByTaskKey: {},
    resolvedSessionIdByTaskKey: {},
  }
}

export function buildSessionTrackingHint(
  context: SessionTrackingContext,
  phase: SessionTrackingPhase,
  sessionId?: number,
): SessionTrackingHint {
  return {
    ...context,
    phase,
    sessionId,
  }
}

export function registerSessionTrackingContext(
  registry: SessionTrackingRegistry,
  context: SessionTrackingContext,
): SessionTrackingRegistry {
  return {
    ...registry,
    contextByTaskKey: {
      ...registry.contextByTaskKey,
      [context.taskKey]: context,
    },
  }
}

export function buildResolvedSessionTrackingHint(
  registry: SessionTrackingRegistry,
  payload: { taskKey: string; sessionId?: number | null },
): { nextRegistry: SessionTrackingRegistry; hint: SessionTrackingHint | null } {
  const { taskKey, sessionId } = payload
  if (typeof sessionId !== 'number' || !Number.isFinite(sessionId)) {
    return {
      nextRegistry: registry,
      hint: null,
    }
  }

  const context = registry.contextByTaskKey[taskKey]
  if (!context) {
    return {
      nextRegistry: registry,
      hint: null,
    }
  }

  if (registry.resolvedSessionIdByTaskKey[taskKey] === sessionId) {
    return {
      nextRegistry: registry,
      hint: null,
    }
  }

  return {
    nextRegistry: {
      ...registry,
      resolvedSessionIdByTaskKey: {
        ...registry.resolvedSessionIdByTaskKey,
        [taskKey]: sessionId,
      },
    },
    hint: buildSessionTrackingHint(context, 'resolved', sessionId),
  }
}

export function clearSessionTrackingContext(
  registry: SessionTrackingRegistry,
  taskKey: string,
): SessionTrackingRegistry {
  const nextContextByTaskKey = { ...registry.contextByTaskKey }
  const nextResolvedSessionIdByTaskKey = { ...registry.resolvedSessionIdByTaskKey }

  delete nextContextByTaskKey[taskKey]
  delete nextResolvedSessionIdByTaskKey[taskKey]

  return {
    contextByTaskKey: nextContextByTaskKey,
    resolvedSessionIdByTaskKey: nextResolvedSessionIdByTaskKey,
  }
}
