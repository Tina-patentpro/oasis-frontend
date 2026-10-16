/**
 * 项目服务
 * 处理项目的创建、更新、查询等操作
 */

import type {
  Project,
  Session,
  CreateProjectRequest,
  UpdateProjectRequest,
  QuickCreateProjectRequest,
  ListProjectsParams,
  PaginatedResponse,
} from '@/types/api'

import { apiClient } from '../client'
import { ApiError } from '../errors'
import {
  extractFolderListPayload,
  mapFolderToProject,
  parseNonNegativeNumber,
  parseProjectId,
  resolveProjectIdFromCreateResponse,
  resolveSessionCount,
} from './project-service-normalizers'
import {
  applyProjectFilters,
  applyProjectSort,
  pickCreatedProjectCandidate,
} from './project-service-selectors'
import {
  extractFolderDetailRecord,
  requestFolderCreate,
  requestFolderDelete,
  requestFolderDetail,
  requestFolderList,
  sleep,
} from './project-service-requests'

const PROJECT_SESSION_COUNT_TTL_MS = 45_000
const PROJECT_LIST_DEFAULT_PAGE_SIZE = 15
const PROJECT_LIST_MAX_PAGE_SIZE = 100
const PROJECT_LOOKUP_RETRY_ATTEMPTS = 6
const PROJECT_LOOKUP_RETRY_DELAY_MS = 400
const PROJECT_LOOKUP_PAGE_SIZE = 100
const PROJECT_DELETE_VERIFY_ATTEMPTS = 5
const PROJECT_DELETE_VERIFY_DELAY_MS = 300
const PROJECT_DETAIL_RETRY_ATTEMPTS = 6
const PROJECT_DETAIL_RETRY_DELAY_MS = 350
const MAX_LOOKUP_SCAN_PAGES = 5
const MAX_DELETE_VERIFY_SCAN_PAGES = 20

class ProjectService {
  private projectSessionCountCache = new Map<number, { expiresAt: number; value: number }>()
  private inFlightProjectSessionCount = new Map<number, Promise<number | undefined>>()

  private setProjectSessionCountCache(projectId: number, value: number): void {
    this.projectSessionCountCache.set(projectId, {
      expiresAt: Date.now() + PROJECT_SESSION_COUNT_TTL_MS,
      value,
    })
  }

  private invalidateProjectSessionCountCache(projectId?: number): void {
    if (typeof projectId === 'number') {
      this.projectSessionCountCache.delete(projectId)
      this.inFlightProjectSessionCount.delete(projectId)
      return
    }

    this.projectSessionCountCache.clear()
    this.inFlightProjectSessionCount.clear()
  }

  private async fetchProjectSessionCountFromApi(projectId: number): Promise<number | undefined> {
    try {
      const detailPayload = await requestFolderDetail(projectId)
      const detail = extractFolderDetailRecord(detailPayload) ?? {}
      const count = resolveSessionCount({
        project_count: detail['project_count'],
        session_count: detail['session_count'],
      })
      if (typeof count === 'number') {
        this.setProjectSessionCountCache(projectId, count)
      }
      return count
    } catch (error) {
      console.warn(`[ProjectService] 获取项目 ${projectId} 会话数失败:`, error)
      return undefined
    }
  }

  private mapFolderListToProjects(response: unknown): Project[] {
    const { items } = extractFolderListPayload(response)
    return items
      .map((item) => mapFolderToProject(item))
      .filter((item): item is Project => item !== null)
      .map((project) => {
        if (typeof project.sessionCount === 'number') {
          this.setProjectSessionCountCache(project.id, project.sessionCount)
        }
        return project
      })
  }

  private async findProjectInFolderList(params: {
    expectedName: string
    expectedCustomer: string
    keyword?: string
    maxPages: number
    expectedProjectId?: number
    signal?: AbortSignal
  }): Promise<Project | null> {
    const { expectedName, expectedCustomer, keyword, maxPages, expectedProjectId, signal } = params
    let page = 1
    let totalPages = 1

    while (page <= totalPages && page <= maxPages) {
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
      const response = await requestFolderList({
        parent_id: 0,
        page,
        limit: PROJECT_LOOKUP_PAGE_SIZE,
        keyword,
      })
      const { total, serverPaginated } = extractFolderListPayload(response)
      const projects = this.mapFolderListToProjects(response)
      const match = pickCreatedProjectCandidate(
        projects,
        expectedName,
        expectedCustomer,
        expectedProjectId,
      )
      if (match) {
        return match
      }

      if (!serverPaginated) {
        return null
      }

      const responseTotal =
        typeof total === 'number' && Number.isFinite(total)
          ? Math.max(total, projects.length)
          : projects.length
      totalPages = Math.max(1, Math.ceil(responseTotal / PROJECT_LOOKUP_PAGE_SIZE))
      page += 1
    }

    return null
  }

  private async locateCreatedProject(
    data: QuickCreateProjectRequest,
    projectId?: number,
    signal?: AbortSignal,
  ): Promise<Project | null> {
    const expectedName = data.name.trim()
    const expectedCustomer = (data.customerName || data.name).trim()

    for (let attempt = 0; attempt < PROJECT_LOOKUP_RETRY_ATTEMPTS; attempt += 1) {
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
      const maxPages = Math.min(MAX_LOOKUP_SCAN_PAGES, attempt + 1)

      try {
        const keywordMatch = await this.findProjectInFolderList({
          expectedName,
          expectedCustomer,
          keyword: expectedName,
          maxPages,
          expectedProjectId: projectId,
          signal,
        })
        if (keywordMatch) {
          return keywordMatch
        }
      } catch (error) {
        if (signal?.aborted) throw error
        console.warn('[ProjectService] 关键词检索新建项目失败，将回退全量检索:', error)
      }

      const fullScanMatch = await this.findProjectInFolderList({
        expectedName,
        expectedCustomer,
        maxPages,
        expectedProjectId: projectId,
        signal,
      })
      if (fullScanMatch) {
        return fullScanMatch
      }

      if (attempt < PROJECT_LOOKUP_RETRY_ATTEMPTS - 1) {
        await sleep(PROJECT_LOOKUP_RETRY_DELAY_MS * (attempt + 1), signal)
      }
    }

    return null
  }

  private async getProjectWithRetry(
    projectId: number,
    signal?: AbortSignal,
  ): Promise<Project | null> {
    let lastError: unknown = null

    for (let attempt = 0; attempt < PROJECT_DETAIL_RETRY_ATTEMPTS; attempt += 1) {
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
      try {
        return await this.getProject(projectId)
      } catch (error) {
        if (signal?.aborted) throw error
        lastError = error
      }

      if (attempt < PROJECT_DETAIL_RETRY_ATTEMPTS - 1) {
        await sleep(PROJECT_DETAIL_RETRY_DELAY_MS * (attempt + 1), signal)
      }
    }

    if (lastError) {
      console.warn(`[ProjectService] 创建后按ID(${projectId})查询项目失败:`, lastError)
    }
    return null
  }

  private async projectExistsInFolderList(
    projectId: number,
    signal?: AbortSignal,
  ): Promise<boolean> {
    let page = 1
    let totalPages = 1

    while (page <= totalPages && page <= MAX_DELETE_VERIFY_SCAN_PAGES) {
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
      const response = await requestFolderList({
        parent_id: 0,
        page,
        limit: PROJECT_LOOKUP_PAGE_SIZE,
      })
      const { total, serverPaginated } = extractFolderListPayload(response)
      const projects = this.mapFolderListToProjects(response)
      if (projects.some((project) => project.id === projectId)) {
        return true
      }

      if (!serverPaginated) {
        return false
      }

      const responseTotal =
        typeof total === 'number' && Number.isFinite(total)
          ? Math.max(total, projects.length)
          : projects.length
      totalPages = Math.max(1, Math.ceil(responseTotal / PROJECT_LOOKUP_PAGE_SIZE))
      page += 1
    }

    return false
  }

  private async ensureProjectDeleted(projectId: number, signal?: AbortSignal): Promise<boolean> {
    for (let attempt = 0; attempt < PROJECT_DELETE_VERIFY_ATTEMPTS; attempt += 1) {
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
      try {
        const detailPayload = await requestFolderDetail(projectId)
        const detailRecord = extractFolderDetailRecord(detailPayload)
        const detailId = detailRecord ? parseProjectId(detailRecord['id']) : undefined
        const deletedFlag = detailRecord
          ? parseNonNegativeNumber(detailRecord['is_del'])
          : undefined
        if (deletedFlag === 1 || (typeof detailId === 'number' && detailId !== projectId)) {
          return true
        }
      } catch (error) {
        if (signal?.aborted) throw error
        if (error instanceof ApiError && error.statusCode === 404) {
          const stillExists = await this.projectExistsInFolderList(projectId, signal)
          if (!stillExists) {
            return true
          }
        } else {
          console.warn('[ProjectService] 删除校验时读取详情失败:', error)
        }
      }

      const stillExists = await this.projectExistsInFolderList(projectId, signal)
      if (!stillExists) {
        return true
      }

      if (attempt < PROJECT_DELETE_VERIFY_ATTEMPTS - 1) {
        await sleep(PROJECT_DELETE_VERIFY_DELAY_MS * (attempt + 1), signal)
      }
    }

    return false
  }

  async getProjectSessionCount(
    projectId: number,
    options?: { force?: boolean },
  ): Promise<number | undefined> {
    if (!options?.force) {
      const cached = this.projectSessionCountCache.get(projectId)
      if (cached && cached.expiresAt > Date.now()) {
        return cached.value
      }
      if (cached) {
        this.projectSessionCountCache.delete(projectId)
      }
    }

    const inFlight = this.inFlightProjectSessionCount.get(projectId)
    if (inFlight) {
      return inFlight
    }

    const request = this.fetchProjectSessionCountFromApi(projectId).finally(() => {
      this.inFlightProjectSessionCount.delete(projectId)
    })
    this.inFlightProjectSessionCount.set(projectId, request)
    return request
  }

  /**
   * 获取项目列表
   */
  async getProjects(params?: ListProjectsParams): Promise<PaginatedResponse<Project>> {
    const page = Math.max(1, params?.page || 1)
    const pageSize = Math.max(
      1,
      Math.min(params?.pageSize || PROJECT_LIST_DEFAULT_PAGE_SIZE, PROJECT_LIST_MAX_PAGE_SIZE),
    )
    const parentId =
      typeof params?.parentId === 'number' && Number.isFinite(params.parentId)
        ? Math.max(0, params.parentId)
        : 0
    const queryParams: Record<string, unknown> = {
      page,
      limit: pageSize,
      parent_id: parentId,
    }

    const normalizedSearch = params?.search?.trim()
    if (normalizedSearch) {
      queryParams.keyword = normalizedSearch
    }
    if (params?.status) {
      queryParams.archive = params.status === 'archived' ? 1 : 0
    }

    const normalizedParams: ListProjectsParams = {
      ...params,
      page,
      pageSize,
      parentId,
      search: normalizedSearch,
    }

    const response = await requestFolderList(queryParams)
    const { total: serverTotal, serverPaginated } = extractFolderListPayload(response)

    // 将响应数据映射为Project类型
    let projects = this.mapFolderListToProjects(response)

    // 仅在旧数组接口场景执行前端过滤，避免对服务端分页结果二次截断
    if (!serverPaginated) {
      projects = applyProjectFilters(projects, normalizedParams)
    }
    projects = applyProjectSort(projects, normalizedParams.sortBy, normalizedParams.sortOrder)

    if (serverPaginated) {
      const total =
        typeof serverTotal === 'number' && Number.isFinite(serverTotal)
          ? Math.max(serverTotal, projects.length)
          : projects.length
      return {
        items: projects,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.max(1, Math.ceil(total / pageSize)),
        },
      }
    }

    const startIndex = (page - 1) * pageSize
    const endIndex = startIndex + pageSize
    return {
      items: projects.slice(startIndex, endIndex),
      pagination: {
        page,
        pageSize,
        total: projects.length,
        totalPages: Math.max(1, Math.ceil(projects.length / pageSize)),
      },
    }
  }

  /**
   * 获取项目详情
   */
  async getProject(id: number): Promise<Project> {
    try {
      const response = await requestFolderDetail(id)
      const detailRecord = extractFolderDetailRecord(response) ?? response
      const project = mapFolderToProject(detailRecord, id)

      if (!project) {
        throw new Error(`Project with ID ${id} not found`)
      }

      if (typeof project.sessionCount === 'number') {
        this.setProjectSessionCountCache(project.id, project.sessionCount)
      }

      return project
    } catch (error) {
      const isExpectedNotFound = error instanceof ApiError && error.statusCode === 404
      if (!isExpectedNotFound) {
        console.error('[ProjectService] Failed to find project:', error)
      }
      throw error
    }
  }

  /**
   * 创建项目
   */
  async createProject(data: CreateProjectRequest): Promise<Project> {
    // 统一使用 verified API: /api/user/user/createfolder
    return this.quickCreateProject({
      name: data.name,
      customerName: data.customerName ?? '',
      description: data.description,
    })
  }

  /**
   * 快速创建项目
   */
  async quickCreateProject(data: QuickCreateProjectRequest): Promise<Project> {
    // 转换参数格式以匹配新API
    const payload = {
      id: 0, // 创建时id固定为0
      name: data.name,
      coustomer_name: data.customerName || data.name, // 必须字段
      parent_id: 0,
    }

    const response = await requestFolderCreate(payload)
    const projectId = resolveProjectIdFromCreateResponse(response)

    const projectById =
      typeof projectId === 'number' ? await this.getProjectWithRetry(projectId) : null
    if (projectById) {
      return projectById
    }

    const createdProject = await this.locateCreatedProject(data, projectId)
    if (createdProject) {
      return createdProject
    }

    if (typeof projectId === 'number') {
      const now = new Date().toISOString()
      return {
        id: projectId,
        userId: 0,
        ownerId: 0,
        name: data.name,
        customerName: data.customerName || data.name,
        description: data.description || '',
        status: 'active',
        sessionCount: 0,
        createdAt: now,
        updatedAt: now,
      }
    }

    throw new Error('[ProjectService] 创建项目失败：后端未返回有效项目ID，且未在列表中检索到新项目')
  }

  /**
   * 更新项目
   */
  async updateProject(id: number, data: UpdateProjectRequest): Promise<Project> {
    // 使用实际接口：/api/user/user/folderupd/{id}
    // 参数：name（项目名称），coustomer_name（客户名称）
    await apiClient.get<{
      code: number
      message: string
      data: unknown
    }>(`/user/user/folderupd/${id}`, {
      name: data.name,
      coustomer_name: data.customerName,
    })

    return this.getProject(id)
  }

  /**
   * 更新客户名称
   */
  async updateCustomerName(id: number, customerName: string): Promise<Project> {
    // 按 API接口文档-用户端.md 基线：使用 folderupd 接口更新客户名称
    await apiClient.get<{
      code: number
      message: string
      data: unknown
    }>(`/user/user/folderupd/${id}`, {
      coustomer_name: customerName,
    })

    return this.getProject(id)
  }

  /**
   * 删除项目
   */
  async deleteProject(id: number): Promise<void> {
    await requestFolderDelete(id)

    let deleted = await this.ensureProjectDeleted(id)

    if (!deleted) {
      deleted = await this.ensureProjectDeleted(id)
    }

    if (!deleted) {
      throw new Error('[ProjectService] 删除项目失败：folderdel 调用后项目仍存在')
    }

    this.invalidateProjectSessionCountCache(id)
  }

  /**
   * 归档项目
   */
  async archiveProject(id: number): Promise<Project> {
    // 使用实际接口：/api/user/user/folderarchive/{id}/{archive}
    // archive参数：1表示归档，0表示取消归档
    const archiveFlag = 1
    await apiClient.get<{
      code: number
      message: string
      data: unknown
    }>(`/user/user/folderarchive/${id}/${archiveFlag}`)
    this.invalidateProjectSessionCountCache(id)

    return this.getProject(id)
  }

  /**
   * 取消归档项目
   */
  async unarchiveProject(id: number): Promise<Project> {
    // 使用实际接口：/api/user/user/folderarchive/{id}/{archive}
    // archive参数：1表示归档，0表示取消归档
    const archiveFlag = 0
    await apiClient.get<{
      code: number
      message: string
      data: unknown
    }>(`/user/user/folderarchive/${id}/${archiveFlag}`)
    this.invalidateProjectSessionCountCache(id)

    return this.getProject(id)
  }

  /**
   * 获取项目会话列表
   */
  async getProjectSessions(
    _projectId: number,
    _page?: number,
    _pageSize?: number,
  ): Promise<PaginatedResponse<Session>> {
    console.warn(
      '[ProjectService] getProjectSessions is not implemented. Use SessionService.getSessions with projectId instead.',
    )
    throw new Error('Not implemented')
  }
}

export const projectService = new ProjectService()
