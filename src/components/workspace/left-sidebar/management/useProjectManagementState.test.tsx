import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, jest, test } from '@jest/globals'

import type { Project, UpdateProjectRequest } from '@/types/api'

import { useProjectManagementState } from './useProjectManagementState'

type ProjectUpdateHandler = (projectId: number, updates: UpdateProjectRequest) => Promise<unknown>

function createProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 1,
    userId: 1,
    name: 'Alpha 项目',
    customerName: '客户 A',
    status: 'active',
    createdAt: '2026-06-01T00:00:00.000Z',
    updatedAt: '2026-06-01T00:00:00.000Z',
    ...overrides,
  }
}

function renderProjectManagementState(onProjectUpdate = jest.fn<ProjectUpdateHandler>()) {
  return {
    onProjectUpdate,
    ...renderHook(() => useProjectManagementState({ onProjectUpdate })),
  }
}

describe('useProjectManagementState', () => {
  test('toggles manual project expansion and can clear all expansion state', () => {
    const { result } = renderProjectManagementState()

    expect(result.current.getDefaultProjectExpanded(1)).toBe(false)

    act(() => {
      result.current.toggleProjectExpanded(1)
    })
    expect(result.current.manualExpandedProjects).toEqual({ 1: true })

    act(() => {
      result.current.toggleProjectExpanded(1)
    })
    expect(result.current.manualExpandedProjects).toEqual({ 1: false })

    act(() => {
      result.current.clearExpandedProjects()
    })
    expect(result.current.manualExpandedProjects).toEqual({})
  })

  test('starts and cancels project name editing with a draft initialized from the project name', () => {
    const project = createProject()
    const { result } = renderProjectManagementState()

    act(() => {
      result.current.beginProjectNameEdit(project)
    })

    expect(result.current.editingProjectNameId).toBe(project.id)
    expect(result.current.projectNameDrafts[project.id]).toBe('Alpha 项目')

    act(() => {
      result.current.cancelProjectNameEdit(project.id)
    })

    expect(result.current.editingProjectNameId).toBeNull()
    expect(result.current.projectNameDrafts).toEqual({})
  })

  test('commits a changed project name and clears the edit state after success', async () => {
    const project = createProject()
    const onProjectUpdate = jest.fn<ProjectUpdateHandler>(async () => undefined)
    const { result } = renderProjectManagementState(onProjectUpdate)

    act(() => {
      result.current.beginProjectNameEdit(project)
      result.current.setProjectNameDrafts({ [project.id]: '  Alpha 新名称  ' })
    })

    await act(async () => {
      await result.current.commitProjectNameEdit(project)
    })

    expect(onProjectUpdate).toHaveBeenCalledWith(project.id, { name: 'Alpha 新名称' })
    expect(result.current.editingProjectNameId).toBeNull()
    expect(result.current.projectNameDrafts).toEqual({})
  })

  test('does not submit empty or unchanged project names', async () => {
    const project = createProject()
    const { result, onProjectUpdate } = renderProjectManagementState()

    act(() => {
      result.current.beginProjectNameEdit(project)
      result.current.setProjectNameDrafts({ [project.id]: '   ' })
    })

    await act(async () => {
      await result.current.commitProjectNameEdit(project)
    })

    expect(onProjectUpdate).not.toHaveBeenCalled()
    expect(result.current.editingProjectNameId).toBeNull()
    expect(result.current.projectNameDrafts[project.id]).toBe(project.name)

    act(() => {
      result.current.beginProjectNameEdit(project)
      result.current.setProjectNameDrafts({ [project.id]: project.name })
    })

    await act(async () => {
      await result.current.commitProjectNameEdit(project)
    })

    expect(onProjectUpdate).not.toHaveBeenCalled()
    expect(result.current.editingProjectNameId).toBeNull()
  })

  test('uses customerName first and falls back to metadata customer name when editing customer', async () => {
    const projectWithCustomer = createProject({ id: 7, customerName: '客户字段' })
    const projectWithMetadataCustomer = createProject({
      id: 8,
      customerName: undefined,
      metadata: { customerName: '元数据客户' },
    })
    const onProjectUpdate = jest.fn<ProjectUpdateHandler>(async () => undefined)
    const { result } = renderProjectManagementState(onProjectUpdate)

    act(() => {
      result.current.beginProjectCustomerEdit(projectWithCustomer)
    })
    expect(result.current.projectCustomerDrafts[7]).toBe('客户字段')

    act(() => {
      result.current.beginProjectCustomerEdit(projectWithMetadataCustomer)
    })
    expect(result.current.projectCustomerDrafts[8]).toBe('元数据客户')

    act(() => {
      result.current.setProjectCustomerDrafts((prev) => ({ ...prev, 8: '  新客户  ' }))
    })

    await act(async () => {
      await result.current.commitProjectCustomerEdit(projectWithMetadataCustomer)
    })

    expect(onProjectUpdate).toHaveBeenCalledWith(8, {
      customerName: '新客户',
      metadata: { customerName: '新客户' },
    })
    expect(result.current.editingProjectCustomerId).toBeNull()
    expect(result.current.projectCustomerDrafts).toEqual({ 7: '客户字段' })
  })

  test('does not submit empty or unchanged customer names', async () => {
    const project = createProject({ id: 3, customerName: '客户 A' })
    const { result, onProjectUpdate } = renderProjectManagementState()

    act(() => {
      result.current.beginProjectCustomerEdit(project)
      result.current.setProjectCustomerDrafts({ [project.id]: '   ' })
    })

    await act(async () => {
      await result.current.commitProjectCustomerEdit(project)
    })

    expect(onProjectUpdate).not.toHaveBeenCalled()
    expect(result.current.editingProjectCustomerId).toBeNull()
    expect(result.current.projectCustomerDrafts[project.id]).toBe('客户 A')

    act(() => {
      result.current.beginProjectCustomerEdit(project)
      result.current.setProjectCustomerDrafts({ [project.id]: '客户 A' })
    })

    await act(async () => {
      await result.current.commitProjectCustomerEdit(project)
    })

    expect(onProjectUpdate).not.toHaveBeenCalled()
    expect(result.current.editingProjectCustomerId).toBeNull()
  })

  test('queues failed name updates and retries them until they succeed', async () => {
    const project = createProject({ id: 5 })
    const onProjectUpdate = jest
      .fn<ProjectUpdateHandler>()
      .mockRejectedValueOnce(new Error('offline'))
      .mockRejectedValueOnce(new Error('still offline'))
      .mockResolvedValueOnce(undefined)
    const { result } = renderProjectManagementState(onProjectUpdate)

    act(() => {
      result.current.beginProjectNameEdit(project)
      result.current.setProjectNameDrafts({ [project.id]: '恢复队列名称' })
    })

    await act(async () => {
      await result.current.commitProjectNameEdit(project)
    })

    expect(result.current.pendingRecoveryCount).toBe(1)

    await act(async () => {
      await expect(result.current.retryNextRecovery()).resolves.toBeNull()
    })
    expect(result.current.pendingRecoveryCount).toBe(1)

    await act(async () => {
      const retried = await result.current.retryNextRecovery()
      expect(retried?.id).toBe('project-name-5')
    })

    expect(result.current.pendingRecoveryCount).toBe(0)
    expect(onProjectUpdate).toHaveBeenLastCalledWith(project.id, { name: '恢复队列名称' })
  })

  test('queues failed customer updates with the expected customer payload', async () => {
    const project = createProject({ id: 6, customerName: '旧客户' })
    const onProjectUpdate = jest
      .fn<ProjectUpdateHandler>()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(undefined)
    const { result } = renderProjectManagementState(onProjectUpdate)

    act(() => {
      result.current.beginProjectCustomerEdit(project)
      result.current.setProjectCustomerDrafts({ [project.id]: '新客户' })
    })

    await act(async () => {
      await result.current.commitProjectCustomerEdit(project)
    })

    expect(result.current.pendingRecoveryCount).toBe(1)

    await act(async () => {
      const retried = await result.current.retryNextRecovery()
      expect(retried?.id).toBe('project-customer-6')
    })

    expect(onProjectUpdate).toHaveBeenLastCalledWith(project.id, {
      customerName: '新客户',
      metadata: { customerName: '新客户' },
    })
    expect(result.current.pendingRecoveryCount).toBe(0)
  })

  test('closes an open project menu on outside click while keeping inside clicks open', async () => {
    const { result } = renderProjectManagementState()
    const container = document.createElement('div')
    const insideButton = document.createElement('button')
    container.appendChild(insideButton)
    document.body.appendChild(container)

    act(() => {
      result.current.setProjectCardRef(1, container)
      result.current.setProjectMenuOpen(1)
    })

    await waitFor(() => {
      expect(result.current.projectMenuOpen).toBe(1)
    })

    act(() => {
      insideButton.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    })
    expect(result.current.projectMenuOpen).toBe(1)

    act(() => {
      document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    })
    expect(result.current.projectMenuOpen).toBeNull()

    document.body.removeChild(container)
  })

  test('focuses and selects project name and customer inputs when editing starts', async () => {
    const project = createProject({ id: 9 })
    const { result } = renderProjectManagementState()
    const nameInput = document.createElement('input')
    const customerInput = document.createElement('input')
    nameInput.focus = jest.fn()
    nameInput.select = jest.fn()
    customerInput.focus = jest.fn()
    customerInput.select = jest.fn()

    act(() => {
      result.current.setProjectNameInputRef(project.id, nameInput)
      result.current.setProjectCustomerInputRef(project.id, customerInput)
      result.current.beginProjectNameEdit(project)
      result.current.beginProjectCustomerEdit(project)
    })

    await waitFor(() => {
      expect(nameInput.focus).toHaveBeenCalled()
      expect(nameInput.select).toHaveBeenCalled()
      expect(customerInput.focus).toHaveBeenCalled()
      expect(customerInput.select).toHaveBeenCalled()
    })
  })
})
