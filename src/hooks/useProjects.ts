/**
 * 项目管理Hook
 * 提供项目相关的所有操作
 */

import { useCallback, useMemo } from 'react'
import { useEffect, useRef } from 'react'

import type { Project, UpdateProjectRequest } from '@/types/api'

import { projectService } from '@/api/services'

import { useAPI } from './useAPI'
import { usePagination } from './usePagination'

interface UseProjectsOptions {
  status?: 'active' | 'archived'
  parentId?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  search?: string
  pageSize?: number
}

export function useProjects(options: UseProjectsOptions = {}) {
  const { status, parentId, sortBy, sortOrder, search, pageSize } = options

  const normalizeProject = useCallback((project: Project): Project => {
    const metadataCustomer =
      typeof project.metadata?.['customerName'] === 'string'
        ? (project.metadata?.['customerName'] as string)
        : undefined

    return {
      ...project,
      customerName: project.customerName ?? metadataCustomer,
    }
  }, [])

  // 使用分页Hook获取项目列表
  const fetchProjects = useCallback(
    (page: number, pageSize: number) =>
      projectService.getProjects({
        status,
        parentId,
        page,
        pageSize,
        sortBy,
        sortOrder,
        search,
      }),
    [parentId, search, sortBy, sortOrder, status],
  )

  const pagination = usePagination<Project>({
    fetchFn: fetchProjects,
    initialPageSize: pageSize ?? 15,
  })

  const hasInitializedFilterSyncRef = useRef(false)
  const lastFilterSignatureRef = useRef<string>('')
  const filterSignature = JSON.stringify({
    status: status ?? '',
    parentId: typeof parentId === 'number' ? parentId : 'none',
    sortBy: sortBy ?? '',
    sortOrder: sortOrder ?? '',
    search: search ?? '',
  })

  useEffect(() => {
    if (!hasInitializedFilterSyncRef.current) {
      hasInitializedFilterSyncRef.current = true
      lastFilterSignatureRef.current = filterSignature
      return
    }

    if (lastFilterSignatureRef.current === filterSignature) {
      return
    }
    lastFilterSignatureRef.current = filterSignature

    if (pagination.pagination.page === 1) {
      void pagination.refresh()
      return
    }
    void pagination.goToPage(1)
  }, [filterSignature, pagination])

  const normalizedProjects = useMemo(
    () => pagination.data.map((item) => normalizeProject(item)),
    [pagination.data, normalizeProject],
  )

  // 创建项目
  const createProject = useAPI(
    (data: Parameters<typeof projectService.createProject>[0]) =>
      projectService.createProject(data),
    {
      onSuccess: () => {
        pagination.refresh() // 创建成功后刷新列表
      },
    },
  )

  // 快速创建项目
  const quickCreateProject = useAPI(
    (data: Parameters<typeof projectService.quickCreateProject>[0]) =>
      projectService.quickCreateProject(data),
    {
      onSuccess: () => {
        pagination.refresh()
      },
    },
  )

  // 更新项目
  const updateProject = useCallback(
    async (id: number, data: UpdateProjectRequest) => {
      await projectService.updateProject(id, data)
      await pagination.refresh()
    },
    [pagination],
  )

  // 删除项目
  const deleteProject = useCallback(
    async (id: number) => {
      await projectService.deleteProject(id)
      await pagination.refresh()
    },
    [pagination],
  )

  // 归档项目
  const archiveProject = useCallback(
    async (id: number) => {
      await projectService.archiveProject(id)
      await pagination.refresh()
    },
    [pagination],
  )

  // 取消归档
  const unarchiveProject = useCallback(
    async (id: number) => {
      await projectService.unarchiveProject(id)
      await pagination.refresh()
    },
    [pagination],
  )

  return {
    // 项目列表
    projects: normalizedProjects,
    pagination: pagination.pagination,
    isLoading: pagination.isLoading || createProject.isLoading || quickCreateProject.isLoading,
    error: pagination.error || createProject.error || quickCreateProject.error,

    // 分页操作
    goToPage: pagination.goToPage,
    nextPage: pagination.nextPage,
    prevPage: pagination.prevPage,
    setPageSize: pagination.setPageSize,
    refresh: pagination.refresh,

    // 项目操作
    createProject: createProject.execute,
    quickCreateProject: quickCreateProject.execute,
    updateProject,
    deleteProject,
    archiveProject,
    unarchiveProject,
  }
}
