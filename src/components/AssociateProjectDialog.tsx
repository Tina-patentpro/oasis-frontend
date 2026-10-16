import { useId, type ReactElement } from 'react'

import type { Project } from '@/types/api'

import { AccessibleDialog } from './ui/feedback/AccessibleDialog'

interface AssociateProjectDialogProps {
  isOpen: boolean
  onClose: () => void
  onCreateNewProject: () => void
  onSelectProject: (project: Project) => void
  sessionName: string
  projects: Project[]
  backgroundColor: string
  mode?: 'associate' | 'transfer'
  excludeProjectId?: number | null
  isSubmitting?: boolean
}

export function AssociateProjectDialog({
  isOpen,
  onClose,
  onCreateNewProject,
  onSelectProject,
  sessionName,
  projects,
  backgroundColor,
  mode = 'associate',
  excludeProjectId = null,
  isSubmitting = false,
}: AssociateProjectDialogProps): ReactElement | null {
  const sessionLabel = sessionName || '当前会话'
  const availableProjects =
    excludeProjectId === null
      ? projects
      : projects.filter((project) => project.id !== excludeProjectId)
  const dialogTitle = mode === 'transfer' ? '转移关联' : '关联项目'
  const dialogDescription =
    mode === 'transfer'
      ? `选择其他项目或创建新项目来转移会话“${sessionLabel}”`
      : `选择项目或创建新项目来关联会话“${sessionLabel}”`
  const projectDividerLabel = mode === 'transfer' ? '或选择其他项目' : '或选择现有项目'
  const titleId = useId()
  const descriptionId = useId()

  return (
    <AccessibleDialog
      isOpen={isOpen}
      onClose={onClose}
      labelledBy={titleId}
      describedBy={descriptionId}
      closeOnEscape={!isSubmitting}
      closeOnOverlayClick={!isSubmitting}
      className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[calc(100vh-2rem)] overflow-y-auto"
    >
      <div className="px-6 py-4 border-b" style={{ backgroundColor }}>
        <h2 id={titleId} className="text-lg font-bold text-gray-900">
          {dialogTitle}
        </h2>
        <p id={descriptionId} className="text-sm text-gray-600 mt-1">
          {dialogDescription}
        </p>
      </div>

      <div className="p-6 space-y-4">
        {isSubmitting && (
          <div
            role="status"
            className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700"
          >
            正在处理关联，请稍候…
          </div>
        )}

        {/* Create New Project Button */}
        <button
          type="button"
          onClick={onCreateNewProject}
          disabled={isSubmitting}
          className="w-full px-4 py-3 rounded-lg border-2 border-dashed border-gray-300 hover:border-emerald-400 hover:bg-emerald-50 transition-[border-color,background-color,color] flex items-center justify-center gap-2 text-gray-600 hover:text-emerald-600 disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-50 disabled:text-gray-500"
        >
          <svg
            viewBox="0 0 24 24"
            width="20"
            height="20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span className="font-medium">创建新项目</span>
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 border-t border-gray-200"></div>
          <span className="text-xs text-gray-500">{projectDividerLabel}</span>
          <div className="flex-1 border-t border-gray-200"></div>
        </div>

        {/* Project List */}
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {availableProjects.length > 0 ? (
            availableProjects.map((project) => (
              <button
                key={project.id}
                type="button"
                disabled={isSubmitting}
                onClick={() => {
                  if (isSubmitting) {
                    return
                  }
                  void onSelectProject(project)
                }}
                className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 hover:border-emerald-400 hover:bg-emerald-50 transition-[border-color,background-color,color] flex items-center gap-3 disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-50 disabled:text-gray-500"
              >
                <span className="text-xl">📁</span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 truncate">{project.name}</div>
                  <div className="text-xs text-gray-500">
                    {typeof project.sessionCount === 'number'
                      ? `${project.sessionCount} 个会话`
                      : '会话数待统计'}
                  </div>
                </div>
                <svg
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            ))
          ) : (
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-500">
              暂无其他可选项目，可以先创建新项目。
            </div>
          )}
        </div>
      </div>

      <div className="px-6 py-4 border-t bg-gray-50 flex justify-end">
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-100 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
        >
          取消
        </button>
      </div>
    </AccessibleDialog>
  )
}
