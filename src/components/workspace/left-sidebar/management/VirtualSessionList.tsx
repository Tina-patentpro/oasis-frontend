import type { FC, ReactNode } from 'react'

import { Virtuoso } from 'react-virtuoso'

import type { Session } from '@/types/api'

const SESSION_VIRTUALIZATION_THRESHOLD = 30
const ESTIMATED_SESSION_ROW_HEIGHT = 56
const STANDALONE_LIST_MAX_HEIGHT = 440
const PROJECT_LIST_MAX_HEIGHT = 320
const MIN_VIRTUAL_LIST_HEIGHT = 160

interface VirtualSessionListProps {
  sessions: Session[]
  variant: 'standalone' | 'project'
  renderSessionItem: (session: Session, variant: 'standalone' | 'project') => ReactNode
  footer?: ReactNode
}

export const VirtualSessionList: FC<VirtualSessionListProps> = ({
  sessions,
  variant,
  renderSessionItem,
  footer,
}) => {
  if (sessions.length <= SESSION_VIRTUALIZATION_THRESHOLD) {
    return (
      <>
        {sessions.map((session) => renderSessionItem(session, variant))}
        {footer}
      </>
    )
  }

  const maxHeight = variant === 'project' ? PROJECT_LIST_MAX_HEIGHT : STANDALONE_LIST_MAX_HEIGHT
  const height = Math.min(
    maxHeight,
    Math.max(MIN_VIRTUAL_LIST_HEIGHT, sessions.length * ESTIMATED_SESSION_ROW_HEIGHT),
  )

  const Footer = () => (footer ? <>{footer}</> : null)

  return (
    <Virtuoso
      data={sessions}
      style={{ height }}
      className="pr-1"
      role="list"
      aria-label={variant === 'project' ? '项目会话列表' : '独立会话列表'}
      computeItemKey={(_, session) => session.id}
      components={{ Footer }}
      itemContent={(_, session) => (
        <div className={variant === 'project' ? 'pb-1' : 'pb-2'}>
          {renderSessionItem(session, variant)}
        </div>
      )}
    />
  )
}
