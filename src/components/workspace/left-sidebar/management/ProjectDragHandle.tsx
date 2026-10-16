import type { FC } from 'react'

interface ProjectDragHandleProps {
  dragEnabled: boolean
  projectId: number
  projectName: string
  onDragHandleStart?: () => void
  onDragHandleEnd?: () => void
}

export const ProjectDragHandle: FC<ProjectDragHandleProps> = ({
  dragEnabled,
  projectId,
  projectName,
  onDragHandleStart,
  onDragHandleEnd,
}) => (
  <button
    type="button"
    draggable={dragEnabled}
    disabled={!dragEnabled}
    onClick={(event) => event.stopPropagation()}
    onDragStart={(event) => {
      event.stopPropagation()
      event.dataTransfer.effectAllowed = 'move'
      event.dataTransfer.setData('application/x-project-id', String(projectId))
      event.dataTransfer.setData('text/plain', String(projectId))
      onDragHandleStart?.()
    }}
    onDragEnd={(event) => {
      event.stopPropagation()
      onDragHandleEnd?.()
    }}
    className={`rounded p-1 text-gray-500 ${
      dragEnabled
        ? 'cursor-grab hover:bg-emerald-50 hover:text-emerald-600 active:cursor-grabbing'
        : 'cursor-default opacity-0 pointer-events-none'
    }`}
    aria-hidden={!dragEnabled}
    aria-label={`拖拽排序项目: ${projectName}`}
    title={dragEnabled ? '拖拽排序' : undefined}
  >
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="9" cy="6" r="1.5" />
      <circle cx="15" cy="6" r="1.5" />
      <circle cx="9" cy="12" r="1.5" />
      <circle cx="15" cy="12" r="1.5" />
      <circle cx="9" cy="18" r="1.5" />
      <circle cx="15" cy="18" r="1.5" />
    </svg>
  </button>
)
