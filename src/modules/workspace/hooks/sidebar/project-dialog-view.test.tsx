import { act, renderHook } from '@testing-library/react'
import { describe, expect, jest, test } from '@jest/globals'

import type { Project } from '@/types/api'

import {
  buildProjectsForDialogs,
  buildSelectedProjectView,
  useAssociateProjectDialogModel,
} from './project-dialog-view'

function createProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 1,
    userId: 1,
    name: 'Project',
    status: 'active',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('workspace sidebar project dialog view', () => {
  test('builds the selected project view from the current project list and selected id', () => {
    const first = createProject({ id: 1, name: 'First' })
    const second = createProject({ id: 2, name: 'Second' })

    expect(
      buildSelectedProjectView({
        projectList: [first, second],
        selectedProjectId: 2,
      }),
    ).toEqual({
      selectedProject: second,
      selectedProjectIndex: 1,
      convertedProject: second,
    })

    expect(
      buildSelectedProjectView({
        projectList: [first, second],
        selectedProjectId: null,
      }),
    ).toEqual({
      selectedProject: undefined,
      selectedProjectIndex: -1,
      convertedProject: null,
    })
  })

  test('chooses dialog projects from full active list, active cache, or active fallback', () => {
    const active = createProject({ id: 1, status: 'active' })
    const archived = createProject({ id: 2, status: 'archived' })
    const cached = createProject({ id: 3, status: 'active' })

    expect(
      buildProjectsForDialogs({
        activeProjectCache: [cached],
        projectList: [active, archived],
        projectSearchKeyword: '',
        projectStatusFilter: 'active',
      }),
    ).toEqual([active, archived])

    expect(
      buildProjectsForDialogs({
        activeProjectCache: [cached],
        projectList: [active, archived],
        projectSearchKeyword: '客户',
        projectStatusFilter: 'active',
      }),
    ).toEqual([cached])

    expect(
      buildProjectsForDialogs({
        activeProjectCache: [],
        projectList: [active, archived],
        projectSearchKeyword: '',
        projectStatusFilter: 'archived',
      }),
    ).toEqual([active])
  })

  test('builds associate project dialog actions and activates project tab after successful select', async () => {
    const project = createProject({ id: 9 })
    const handleProjectSelect = jest
      .fn<(project: Project) => Promise<boolean>>()
      .mockResolvedValue(true)
    const ensureProjectSessionsLoaded = jest
      .fn<(projectId: number) => Promise<void>>()
      .mockResolvedValue(undefined)
    const setAssociateProjectDialogOpen = jest.fn()
    const setManagementTab = jest.fn()
    const setProjectStatusFilter = jest.fn()
    const setSelectedProjectId = jest.fn()

    const { result } = renderHook(() =>
      useAssociateProjectDialogModel({
        associateProjectDialogOpen: true,
        currentSessionProjectId: 5,
        currentSessionTitle: 'Session title',
        ensureProjectSessionsLoaded,
        handleCreateNewProject: jest.fn(),
        handleProjectSelect,
        isSubmitting: false,
        setAssociateProjectDialogOpen,
        setManagementTab,
        setProjectStatusFilter,
        setSelectedProjectId,
      }),
    )

    expect(result.current).toMatchObject({
      isOpen: true,
      currentSessionTitle: 'Session title',
      mode: 'transfer',
      excludeProjectId: 5,
      isSubmitting: false,
    })

    act(() => {
      result.current.open()
      result.current.close()
    })
    expect(setAssociateProjectDialogOpen).toHaveBeenCalledWith(true)
    expect(setAssociateProjectDialogOpen).toHaveBeenCalledWith(false)

    await act(async () => {
      await result.current.onProjectSelect(project)
    })

    expect(handleProjectSelect).toHaveBeenCalledWith(project)
    expect(setProjectStatusFilter).toHaveBeenCalledWith('active')
    expect(setManagementTab).toHaveBeenCalledWith('project')
    expect(setSelectedProjectId).toHaveBeenCalledWith(9)
    expect(ensureProjectSessionsLoaded).toHaveBeenCalledWith(9)
  })

  test('keeps workspace selection unchanged when project association is cancelled', async () => {
    const handleProjectSelect = jest
      .fn<(project: Project) => Promise<boolean>>()
      .mockResolvedValue(false)
    const ensureProjectSessionsLoaded = jest
      .fn<(projectId: number) => Promise<void>>()
      .mockResolvedValue(undefined)
    const setManagementTab = jest.fn()
    const setProjectStatusFilter = jest.fn()
    const setSelectedProjectId = jest.fn()

    const { result } = renderHook(() =>
      useAssociateProjectDialogModel({
        associateProjectDialogOpen: true,
        currentSessionProjectId: null,
        currentSessionTitle: 'Session title',
        ensureProjectSessionsLoaded,
        handleCreateNewProject: jest.fn(),
        handleProjectSelect,
        isSubmitting: true,
        setAssociateProjectDialogOpen: jest.fn(),
        setManagementTab,
        setProjectStatusFilter,
        setSelectedProjectId,
      }),
    )

    await act(async () => {
      await result.current.onProjectSelect(createProject({ id: 10 }))
    })

    expect(result.current.mode).toBe('associate')
    expect(result.current.isSubmitting).toBe(true)
    expect(setProjectStatusFilter).not.toHaveBeenCalled()
    expect(setManagementTab).not.toHaveBeenCalled()
    expect(setSelectedProjectId).not.toHaveBeenCalled()
    expect(ensureProjectSessionsLoaded).not.toHaveBeenCalled()
  })
})
