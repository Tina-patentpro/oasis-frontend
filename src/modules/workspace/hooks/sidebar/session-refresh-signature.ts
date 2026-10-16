import type { Session } from '@/types/api'

export interface SessionRefreshDigest {
  total: number
  byId: Record<
    number,
    {
      hasAnswer: boolean
      hasFile: boolean
      answerLength: number
    }
  >
}

type SessionRefreshSignal = 'none' | 'weak' | 'strong'

function normalizeAnswerLength(value: unknown): number {
  if (typeof value !== 'string') {
    return 0
  }
  return value.trim().length
}

function hasFileContent(value: unknown): boolean {
  if (typeof value === 'string') {
    return value.trim().length > 0
  }

  if (Array.isArray(value)) {
    return value.some((item) => hasFileContent(item))
  }

  if (value && typeof value === 'object') {
    return Object.keys(value).length > 0
  }

  return false
}

export function buildSessionRefreshDigest(sessions: Session[]): SessionRefreshDigest {
  const byId: SessionRefreshDigest['byId'] = {}

  sessions.forEach((session) => {
    if (byId[session.id]) {
      return
    }
    const answerLength = normalizeAnswerLength(session.answer_text)
    byId[session.id] = {
      hasAnswer: answerLength > 0,
      hasFile: hasFileContent((session as Session & { file_url?: unknown }).file_url),
      answerLength,
    }
  })

  return {
    total: sessions.length,
    byId,
  }
}

export function detectSessionRefreshSignal(
  previous: SessionRefreshDigest,
  next: SessionRefreshDigest,
): SessionRefreshSignal {
  if (next.total > previous.total) {
    return 'strong'
  }

  let weakSignalFound = false

  for (const [sessionId, nextEntry] of Object.entries(next.byId)) {
    const prevEntry = previous.byId[Number(sessionId)]
    if (!prevEntry) {
      return 'strong'
    }
    if (!prevEntry.hasAnswer && nextEntry.hasAnswer) {
      return 'strong'
    }
    if (!prevEntry.hasFile && nextEntry.hasFile) {
      return 'strong'
    }
    if (nextEntry.answerLength > prevEntry.answerLength) {
      weakSignalFound = true
    }
  }

  return weakSignalFound ? 'weak' : 'none'
}
