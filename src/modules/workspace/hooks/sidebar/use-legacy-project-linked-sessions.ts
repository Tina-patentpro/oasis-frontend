import { useEffect, useState } from 'react'

import type { Session } from '@/types/api'

interface LegacySessionApi {
  getSessions: (params: {
    type: 'projectLinked'
    page: number
    pageSize: number
    scanMode: 'accurate'
    cacheMode: 'bypass'
  }) => Promise<{ items: Session[] }>
}

export function useLegacyProjectLinkedSessions(params: {
  enabled: boolean
  pageSize: number
  sessionApi: LegacySessionApi
}) {
  const { enabled, pageSize, sessionApi } = params
  const [legacyProjectLinkedSessions, setLegacyProjectLinkedSessions] = useState<Session[]>([])

  useEffect(() => {
    if (!enabled) {
      return
    }

    let cancelled = false
    sessionApi
      .getSessions({
        type: 'projectLinked',
        page: 1,
        pageSize,
        scanMode: 'accurate',
        cacheMode: 'bypass',
      })
      .then((response) => {
        if (cancelled) {
          return
        }
        setLegacyProjectLinkedSessions(response.items)
      })
      .catch((error) => {
        if (cancelled) {
          return
        }
        console.warn('[useWorkspaceSidebar] 旧模式预加载项目会话失败:', error)
        setLegacyProjectLinkedSessions([])
      })

    return () => {
      cancelled = true
    }
  }, [enabled, pageSize, sessionApi])

  return {
    legacyProjectLinkedSessions,
    setLegacyProjectLinkedSessions,
  }
}
