import { useCallback } from 'react'

import type { Project } from '@/types/api'

interface UseProjectActionsParams {
  archiveProject: (projectId: number) => Promise<unknown>
  unarchiveProject: (projectId: number) => Promise<unknown>
  deleteProject: (projectId: number) => Promise<unknown>
  refreshSessions: () => Promise<void>
  notify: (message: string) => void
  showConfirm: (title: string, message: string, onConfirm: () => void) => void
  selectedProjectId: number | null
  setSelectedProjectId: (id: number | null) => void
}

export function useProjectActions({
  archiveProject,
  unarchiveProject,
  deleteProject,
  refreshSessions,
  notify,
  showConfirm,
  selectedProjectId,
  setSelectedProjectId,
}: UseProjectActionsParams) {
  const handleProjectArchiveToggle = useCallback(
    async (project: Project) => {
      try {
        if (project.status === 'active') {
          await archiveProject(project.id)
          notify(`项目"${project.name}"已归档`)
        } else {
          await unarchiveProject(project.id)
          notify(`项目"${project.name}"已恢复为进行中`)
        }
      } catch (error) {
        console.error('更新项目状态失败:', error)
        notify('更新项目状态失败，请稍后重试')
      }
    },
    [archiveProject, notify, unarchiveProject],
  )

  const handleProjectDelete = useCallback(
    (project: Project) => {
      showConfirm('删除项目', `确认删除项目"${project.name}"？此操作不可撤销。`, () => {
        void (async () => {
          try {
            await deleteProject(project.id)
            if (selectedProjectId === project.id) {
              setSelectedProjectId(null)
            }
            await refreshSessions()
            notify(`项目"${project.name}"已删除`)
          } catch (error) {
            console.error('删除项目失败:', error)
            notify('删除项目失败，请稍后重试')
          }
        })()
      })
    },
    [deleteProject, notify, refreshSessions, selectedProjectId, setSelectedProjectId, showConfirm],
  )

  return {
    handleProjectArchiveToggle,
    handleProjectDelete,
  }
}
