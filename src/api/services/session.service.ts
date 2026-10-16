/**
 * 会话服务
 * 处理会话的创建、更新、查询等操作
 */

import type {
  Session,
  SessionDetail,
  UpdateSessionRequest,
  UpdateSessionInputsRequest,
  RenameSessionRequest,
  AssociateProjectRequest,
  ListSessionsParams,
  PaginatedResponse,
  ExportDataRequest,
  ExportTaskResponse,
} from '@/types/api'
import { isWorkspaceFastBootEnabled } from '@/modules/workspace/hooks/workspace-env'

import { apiClient } from '../client'
import { SESSION_ROUTES } from '../core/session-routes'
import {
  applySessionFilters,
  dedupeProjectListItems,
  extractProjectListItems,
  extractSessionDetailRaw,
  mapProjectListItemToSession,
  mapSessionDetailRawToDetail,
  sortSessions,
  type ProjectListRawItem,
} from './session-service-normalizers'
import { requestLegacySessionDelete } from './session-service-requests'

const SESSION_LIST_CACHE_TTL_MS = 15_000
const DEFAULT_SESSION_SCAN_MODE: NonNullable<ListSessionsParams['scanMode']> =
  isWorkspaceFastBootEnabled() ? 'fast' : 'accurate'

class SessionService {
  private sessionListCache = new Map<
    string,
    { expiresAt: number; value: PaginatedResponse<Session> }
  >()
  private inFlightSessionListRequests = new Map<string, Promise<PaginatedResponse<Session>>>()

  private clonePaginatedSessions(payload: PaginatedResponse<Session>): PaginatedResponse<Session> {
    return {
      items: [...payload.items],
      pagination: { ...payload.pagination },
    }
  }

  private buildSessionListCacheKey(params: {
    type: string
    projectId: number
    search: string
    status: string
    sortBy: string
    sortOrder: string
    scanMode: string
    page: number
    pageSize: number
  }): string {
    return JSON.stringify(params)
  }

  private invalidateSessionListCache(): void {
    this.sessionListCache.clear()
    this.inFlightSessionListRequests.clear()
  }

  private async fetchSessionsInternal(
    params: ListSessionsParams & {
      page: number
      pageSize: number
      scanMode: NonNullable<ListSessionsParams['scanMode']>
    },
    signal?: AbortSignal,
  ): Promise<PaginatedResponse<Session>> {
    const page = params.page
    const pageSize = params.pageSize
    const serverPageSize = Math.min(pageSize, 50)
    const isIndependentRequest = params.type === 'independent'
    const isProjectLinkedRequest = params.type === 'projectLinked'
    const usesAccurateScan = params.scanMode === 'accurate'
    const initialQueryPage = isProjectLinkedRequest && usesAccurateScan ? 1 : page

    // 转换参数格式
    const queryParams: Record<string, unknown> = {
      page: initialQueryPage,
      limit: serverPageSize,
    }

    if (params.search?.trim()) {
      queryParams.keyword = params.search.trim()
    }

    // 明确项目会话：按项目ID筛选。
    if (params.projectId !== undefined) {
      queryParams.folder_id = params.projectId
    } else if (isIndependentRequest) {
      // 独立会话：根本上走 folder_id=0，避免与项目会话混流。
      queryParams.folder_id = 0
    }

    // 调用文档基线接口：/api/user/user/projectlist
    const response = await apiClient.get<{
      total: number
      items?: ProjectListRawItem[]
      item?: ProjectListRawItem[]
    }>(SESSION_ROUTES.list, queryParams)

    let rawItems = extractProjectListItems(response)
    const responseTotal = typeof response?.total === 'number' ? response.total : rawItems.length

    let filteredSessions = applySessionFilters(
      dedupeProjectListItems(rawItems).map(mapProjectListItemToSession),
      params,
    )

    let usedDeepScan = false

    // 项目会话（未指定 projectId）在 accurate 模式下才做深度翻页，避免首屏等待放大。
    if (
      usesAccurateScan &&
      isProjectLinkedRequest &&
      params.projectId === undefined &&
      initialQueryPage === 1
    ) {
      usedDeepScan = true
      const maxPagesToScan = 50
      const seenIds = new Set<number>(rawItems.map((item) => item.id))
      const scannedItems: ProjectListRawItem[] = [...rawItems]

      for (let nextPage = 2; nextPage <= maxPagesToScan; nextPage += 1) {
        if (signal?.aborted) break
        const nextResponse = await apiClient.get<{
          total: number
          items?: ProjectListRawItem[]
          item?: ProjectListRawItem[]
        }>(SESSION_ROUTES.list, {
          ...queryParams,
          page: nextPage,
        })
        const pageItems = extractProjectListItems(nextResponse)
        if (pageItems.length === 0) {
          break
        }

        let appended = 0
        pageItems.forEach((item) => {
          if (seenIds.has(item.id)) {
            return
          }
          seenIds.add(item.id)
          scannedItems.push(item)
          appended += 1
        })

        if (appended === 0) {
          break
        }
        if (responseTotal > 0 && seenIds.size >= responseTotal) {
          break
        }
      }

      rawItems = scannedItems
      filteredSessions = applySessionFilters(
        dedupeProjectListItems(rawItems).map(mapProjectListItemToSession),
        params,
      )
    }

    filteredSessions = sortSessions(filteredSessions, params)

    const usesClientSegmentation =
      usesAccurateScan && isProjectLinkedRequest && params.projectId === undefined
    const hasLocalOnlyFilter = Boolean(params.status) && usesAccurateScan
    const useLocalPagination = usesClientSegmentation || hasLocalOnlyFilter || usedDeepScan
    const total = useLocalPagination ? filteredSessions.length : responseTotal
    const totalPages = Math.max(1, Math.ceil(total / pageSize))
    const items = useLocalPagination
      ? filteredSessions.slice((page - 1) * pageSize, page * pageSize)
      : filteredSessions

    return {
      items,
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
      },
    }
  }

  /**
   * 获取会话列表
   */
  async getSessions(
    params?: ListSessionsParams,
    options?: { signal?: AbortSignal },
  ): Promise<PaginatedResponse<Session>> {
    const page = Math.max(1, params?.page || 1)
    const pageSize = Math.max(1, params?.pageSize || 20)
    const scanMode = params?.scanMode ?? DEFAULT_SESSION_SCAN_MODE
    const cacheMode = params?.cacheMode ?? 'default'
    const normalizedParams: ListSessionsParams & {
      page: number
      pageSize: number
      scanMode: NonNullable<ListSessionsParams['scanMode']>
      cacheMode: NonNullable<ListSessionsParams['cacheMode']>
    } = {
      ...params,
      page,
      pageSize,
      scanMode,
      cacheMode,
    }

    if (cacheMode === 'bypass') {
      return this.fetchSessionsInternal(normalizedParams, options?.signal)
    }

    const cacheKey = this.buildSessionListCacheKey({
      type: normalizedParams.type ?? 'all',
      projectId: normalizedParams.projectId ?? -1,
      search: normalizedParams.search ?? '',
      status: normalizedParams.status ?? '',
      sortBy: normalizedParams.sortBy ?? '',
      sortOrder: normalizedParams.sortOrder ?? 'desc',
      scanMode: normalizedParams.scanMode,
      page: normalizedParams.page,
      pageSize: normalizedParams.pageSize,
    })
    const now = Date.now()

    const cached = this.sessionListCache.get(cacheKey)
    if (cached && cached.expiresAt > now) {
      return this.clonePaginatedSessions(cached.value)
    }
    if (cached) {
      this.sessionListCache.delete(cacheKey)
    }

    const inFlight = this.inFlightSessionListRequests.get(cacheKey)
    if (inFlight) {
      return inFlight.then((payload) => this.clonePaginatedSessions(payload))
    }

    const requestPromise = this.fetchSessionsInternal(normalizedParams, options?.signal)
      .then((payload) => {
        this.sessionListCache.set(cacheKey, {
          expiresAt: Date.now() + SESSION_LIST_CACHE_TTL_MS,
          value: payload,
        })
        return payload
      })
      .finally(() => {
        this.inFlightSessionListRequests.delete(cacheKey)
      })

    this.inFlightSessionListRequests.set(cacheKey, requestPromise)
    return requestPromise.then((payload) => this.clonePaginatedSessions(payload))
  }

  /**
   * 获取会话详情
   * 按 API接口文档-用户端.md 基线：使用 projectdetail 接口获取详情
   */
  async getSession(id: number): Promise<SessionDetail> {
    const response = await apiClient.get<unknown>(`${SESSION_ROUTES.detail}/${id}`)
    return mapSessionDetailRawToDetail(extractSessionDetailRaw(response), id)
  }

  /**
   * 更新会话
   * 按 API接口文档-用户端.md 基线：6.4 更新会话名称
   * GET /user/user/workflowupd/{id}?name={newName}
   */
  async updateSession(id: number, data: UpdateSessionRequest): Promise<Session> {
    const nextTitle = data.title?.trim()
    if (nextTitle) {
      await apiClient.get<{
        code: number
        message: string
        data: unknown
      }>(`${SESSION_ROUTES.rename}/${id}`, {
        name: nextTitle,
      })
      this.invalidateSessionListCache()
    }

    return this.getSession(id)
  }

  /**
   * 删除会话
   * 按 API接口文档-用户端.md 基线使用 legacy 会话删除接口。
   * 项目删除接口 DELETE /projects/{project_id} 不得用于会话删除。
   */
  async deleteSession(id: number): Promise<void> {
    await requestLegacySessionDelete(id)
    this.invalidateSessionListCache()
  }

  /**
   * 重命名会话
   */
  async renameSession(id: number, data: RenameSessionRequest): Promise<Session> {
    // 使用实际接口：/api/user/user/workflowupd/{id}?name={newName}
    await apiClient.get<{
      code: number
      message: string
      data: unknown
    }>(`${SESSION_ROUTES.rename}/${id}`, {
      name: data.title,
    })
    this.invalidateSessionListCache()

    return this.getSession(id)
  }

  /**
   * 关联项目
   */
  async associateProject(id: number, data: AssociateProjectRequest): Promise<Session> {
    // 使用实际接口：/api/user/user/workflowuploadfloder/{sessionId}/{folderId}
    await apiClient.get<{
      code: number
      message: string
      data: unknown
    }>(`${SESSION_ROUTES.move}/${id}/${data.projectId}`)
    this.invalidateSessionListCache()

    return this.getSession(id)
  }

  /**
   * 取消关联项目
   */
  async dissociateProject(id: number): Promise<Session> {
    // 使用实际接口：/api/user/user/workflowuploadfloder/{sessionId}/0
    // 传递0作为folderId表示取消关联
    const folderId = 0
    await apiClient.get<{
      code: number
      message: string
      data: unknown
    }>(`${SESSION_ROUTES.move}/${id}/${folderId}`)
    this.invalidateSessionListCache()

    return this.getSession(id)
  }

  /**
   * 更新会话输入
   */
  async updateSessionInputs(_id: number, _data: UpdateSessionInputsRequest): Promise<void> {
    console.warn('[SessionService] updateSessionInputs is not implemented yet.')
    throw new Error('Not implemented')
  }

  /**
   * 获取Workflow列表（原始格式）
   */
  async getWorkflowList(
    page: number = 1,
    limit: number = 20,
    options?: { signal?: AbortSignal },
  ): Promise<{
    total: number
    item: Array<{
      id: number
      api_name: string
      user_id: number
      folder_id: number
      created_at: string
    }>
  }> {
    const response = await apiClient.get<{
      total: number
      items?: Array<{
        id: number
        name?: string
        api_name?: string
        user_id?: number
        folder_id: number
        created_at: string
        type?: number
      }>
      item?: Array<{
        id: number
        name?: string
        api_name: string
        user_id?: number
        folder_id: number
        created_at: string
        type?: number
      }>
    }>(
      SESSION_ROUTES.list,
      {
        page,
        limit,
      },
      undefined,
      {
        signal: options?.signal,
      },
    )

    const rawItems = Array.isArray(response?.items)
      ? response.items
      : Array.isArray(response?.item)
        ? response.item
        : []

    const workflowItems = rawItems
      .filter((item) => item.type === 1 || typeof item.type !== 'number')
      .map((item) => ({
        id: item.id,
        api_name: item.api_name || item.name || '未命名项目',
        user_id: item.user_id ?? 0,
        folder_id: item.folder_id,
        created_at: item.created_at,
      }))

    return {
      total: workflowItems.length,
      item: workflowItems,
    }
  }

  /**
   * 批量下载Workflow（返回文件流）
   * @param ids Workflow ID列表
   * @deprecated API接口文档-用户端.md 未提供该接口；产品路径请改用 getSession + exportSessions 的前端本地导出流程
   */
  async batchDownloadWorkflows(_ids: number[]): Promise<Blob> {
    throw new Error(
      '[SessionService] Backend API not found in API接口文档-用户端.md: batchDownloadWorkflows',
    )
  }

  /**
   * 导出所有数据（返回文件流）
   * @returns Blob文件流
   */
  async exportAllData(): Promise<Blob> {
    throw new Error(
      '[SessionService] Backend API not found in API接口文档-用户端.md: exportAllData',
    )
  }

  /**
   * 导出会话数据
   */
  async exportSession(
    _sessionId: number,
    _format: 'json' | 'pdf' | 'docx',
  ): Promise<ExportTaskResponse> {
    console.warn('[SessionService] exportSession is not implemented yet.')
    throw new Error('Not implemented')
  }

  /**
   * 批量导出会话
   */
  async batchExportSessions(_data: ExportDataRequest): Promise<ExportTaskResponse> {
    console.warn('[SessionService] batchExportSessions is not implemented yet.')
    throw new Error('Not implemented')
  }

  /**
   * 获取导出任务状态
   */
  async getExportTaskStatus(_taskId: string): Promise<ExportTaskResponse> {
    console.warn('[SessionService] getExportTaskStatus is not implemented yet.')
    throw new Error('Not implemented')
  }
}

export const sessionService = new SessionService()
