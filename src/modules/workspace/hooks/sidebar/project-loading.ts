import type { PaginatedResponse, Project } from '@/types/api'

export interface ProjectListPaginationView {
  initialized: boolean
  isLoading: boolean
  hasMore: boolean
  loadedCount: number
  total: number
}

export interface ChildProjectPageState {
  page: number
  total: number
  totalPages: number
  isLoading: boolean
  initialized: boolean
}

type Pagination = PaginatedResponse<Project>['pagination']

export function mergeProjectsById(prev: Project[], next: Project[]): Project[] {
  const byId = new Map<number, Project>()
  prev.forEach((item) => byId.set(item.id, item))
  next.forEach((item) => byId.set(item.id, item))
  return Array.from(byId.values())
}

export function buildChildProjectLoadingState(
  previous: ChildProjectPageState | undefined,
): ChildProjectPageState {
  return {
    page: previous?.page ?? 0,
    total: previous?.total ?? 0,
    totalPages: previous?.totalPages ?? 0,
    initialized: previous?.initialized ?? false,
    isLoading: true,
  }
}

export function buildChildProjectLoadedState(pagination: Pagination): ChildProjectPageState {
  return {
    page: pagination.page,
    total: pagination.total,
    totalPages: pagination.totalPages,
    initialized: true,
    isLoading: false,
  }
}

export function buildChildProjectErrorState(
  previous: ChildProjectPageState | undefined,
): ChildProjectPageState {
  return {
    page: previous?.page ?? 0,
    total: previous?.total ?? 0,
    totalPages: previous?.totalPages ?? 0,
    initialized: previous?.initialized ?? false,
    isLoading: false,
  }
}

export function buildChildProjectPaginationByParent(params: {
  projectList: Project[]
  childProjectsByParent: Record<number, Project[]>
  childProjectPageState: Record<number, ChildProjectPageState>
}): Record<number, ProjectListPaginationView> {
  const view: Record<number, ProjectListPaginationView> = {}
  params.projectList.forEach((project) => {
    const children = params.childProjectsByParent[project.id] ?? []
    const state = params.childProjectPageState[project.id]
    view[project.id] = {
      initialized: state?.initialized ?? false,
      isLoading: state?.isLoading ?? false,
      hasMore: state ? state.page < state.totalPages : false,
      loadedCount: children.length,
      total: state?.total ?? children.length,
    }
  })
  return view
}

export function buildProjectListPagination(params: {
  filteredProjects: Project[]
  isProjectsLoading: boolean
  pagination: Pagination
}): ProjectListPaginationView {
  const loadedCount = params.filteredProjects.length
  return {
    initialized: params.pagination.page > 0 || loadedCount > 0,
    isLoading: params.isProjectsLoading,
    hasMore: params.pagination.page < params.pagination.totalPages,
    loadedCount,
    total: Math.max(params.pagination.total, loadedCount),
  }
}
