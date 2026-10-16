import { useMemo } from 'react'

import type { Project } from '@/types/api'
import { convertToProject } from '@/utils/helpers'

import type { AssociateProjectDialog } from './types'

type ProjectStatusFilter = 'active' | 'archived'
type WorkspaceManagementTab = 'history' | 'project'

interface SelectedProjectViewParams {
  projectList: Project[]
  selectedProjectId: number | null
}

interface SelectedProjectView {
  selectedProject: Project | undefined
  selectedProjectIndex: number
  convertedProject: Project | null
}

interface ProjectsForDialogsParams {
  activeProjectCache: Project[]
  projectList: Project[]
  projectSearchKeyword: string
  projectStatusFilter: ProjectStatusFilter
}

interface UseAssociateProjectDialogModelParams {
  associateProjectDialogOpen: boolean
  currentSessionProjectId: number | null
  currentSessionTitle: string
  ensureProjectSessionsLoaded: (projectId: number) => Promise<void>
  handleCreateNewProject: () => void
  handleProjectSelect: (project: Project) => Promise<boolean>
  isSubmitting: boolean
  setAssociateProjectDialogOpen: (open: boolean) => void
  setManagementTab: (tab: WorkspaceManagementTab) => void
  setProjectStatusFilter: (status: ProjectStatusFilter) => void
  setSelectedProjectId: (projectId: number | null) => void
}

export function buildSelectedProjectView({
  projectList,
  selectedProjectId,
}: SelectedProjectViewParams): SelectedProjectView {
  const selectedProject =
    selectedProjectId !== null
      ? projectList.find((project) => project.id === selectedProjectId)
      : undefined

  const selectedProjectIndex =
    selectedProjectId !== null
      ? projectList.findIndex((project) => project.id === selectedProjectId)
      : -1

  return {
    selectedProject,
    selectedProjectIndex,
    convertedProject:
      selectedProject && selectedProjectIndex >= 0
        ? convertToProject(selectedProject, selectedProjectIndex)
        : null,
  }
}

export function buildProjectsForDialogs({
  activeProjectCache,
  projectList,
  projectSearchKeyword,
  projectStatusFilter,
}: ProjectsForDialogsParams): Project[] {
  if (projectStatusFilter === 'active' && projectSearchKeyword.length === 0) {
    return projectList
  }

  if (activeProjectCache.length > 0) {
    return activeProjectCache
  }

  return projectList.filter((project) => project.status === 'active')
}

export function useAssociateProjectDialogModel({
  associateProjectDialogOpen,
  currentSessionProjectId,
  currentSessionTitle,
  ensureProjectSessionsLoaded,
  handleCreateNewProject,
  handleProjectSelect,
  isSubmitting,
  setAssociateProjectDialogOpen,
  setManagementTab,
  setProjectStatusFilter,
  setSelectedProjectId,
}: UseAssociateProjectDialogModelParams): AssociateProjectDialog {
  return useMemo<AssociateProjectDialog>(
    () => ({
      isOpen: associateProjectDialogOpen,
      open: () => setAssociateProjectDialogOpen(true),
      close: () => setAssociateProjectDialogOpen(false),
      currentSessionTitle,
      mode: currentSessionProjectId !== null ? 'transfer' : 'associate',
      excludeProjectId: currentSessionProjectId,
      isSubmitting,
      onCreateNewProject: handleCreateNewProject,
      onProjectSelect: async (project: Project) => {
        const associated = await handleProjectSelect(project)
        if (!associated) {
          return
        }
        setProjectStatusFilter('active')
        setManagementTab('project')
        setSelectedProjectId(project.id)
        void ensureProjectSessionsLoaded(project.id)
      },
    }),
    [
      associateProjectDialogOpen,
      currentSessionProjectId,
      currentSessionTitle,
      ensureProjectSessionsLoaded,
      handleCreateNewProject,
      handleProjectSelect,
      isSubmitting,
      setAssociateProjectDialogOpen,
      setManagementTab,
      setProjectStatusFilter,
      setSelectedProjectId,
    ],
  )
}
