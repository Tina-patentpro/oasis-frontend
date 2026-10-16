import type { ListProjectsParams, Project } from '@/types/api'

import { toProjectSortTime } from './project-service-normalizers'

export function pickCreatedProjectCandidate(
  projects: Project[],
  expectedName: string,
  expectedCustomer: string,
  expectedProjectId?: number,
): Project | null {
  if (typeof expectedProjectId === 'number') {
    const byId = projects.find((project) => project.id === expectedProjectId)
    if (byId) {
      return byId
    }
  }

  const normalizedExpectedName = expectedName.trim().toLowerCase()
  const normalizedExpectedCustomer = expectedCustomer.trim().toLowerCase()

  const exactMatches = projects
    .filter(
      (project) =>
        project.name.trim() === expectedName &&
        (project.customerName || '').trim() === expectedCustomer,
    )
    .sort((a, b) => toProjectSortTime(b) - toProjectSortTime(a))
  if (exactMatches.length > 0) {
    return exactMatches[0]
  }

  const nameMatches = projects
    .filter((project) => project.name.trim() === expectedName)
    .sort((a, b) => toProjectSortTime(b) - toProjectSortTime(a))
  if (nameMatches.length > 0) {
    return nameMatches[0]
  }

  const fuzzyMatches = projects
    .filter((project) => {
      const projectName = project.name.toLowerCase()
      const customerName = (project.customerName || '').toLowerCase()
      return (
        (normalizedExpectedName !== '' && projectName.includes(normalizedExpectedName)) ||
        (normalizedExpectedCustomer !== '' && customerName.includes(normalizedExpectedCustomer))
      )
    })
    .sort((a, b) => toProjectSortTime(b) - toProjectSortTime(a))
  if (fuzzyMatches.length > 0) {
    return fuzzyMatches[0]
  }

  return null
}

export function applyProjectSort(
  projects: Project[],
  sortBy: ListProjectsParams['sortBy'],
  sortOrder: ListProjectsParams['sortOrder'],
): Project[] {
  if (!sortBy) {
    return projects
  }

  return [...projects].sort((a, b) => {
    const aVal = a[sortBy as keyof Project]
    const bVal = b[sortBy as keyof Project]
    const order = sortOrder === 'desc' ? -1 : 1

    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return order * aVal.localeCompare(bVal)
    }
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return order * (aVal - bVal)
    }
    return 0
  })
}

export function applyProjectFilters(projects: Project[], params?: ListProjectsParams): Project[] {
  let filteredProjects = projects

  if (params?.status) {
    filteredProjects = filteredProjects.filter((project) => project.status === params.status)
  }

  if (typeof params?.parentId === 'number' && Number.isFinite(params.parentId)) {
    const normalizedParentId = Math.max(0, params.parentId)
    filteredProjects = filteredProjects.filter(
      (project) => (project.parentId ?? 0) === normalizedParentId,
    )
  }

  const normalizedSearch = params?.search?.trim()
  if (normalizedSearch) {
    const searchLower = normalizedSearch.toLowerCase()
    filteredProjects = filteredProjects.filter(
      (project) =>
        project.name.toLowerCase().includes(searchLower) ||
        (project.customerName || '').toLowerCase().includes(searchLower),
    )
  }

  return filteredProjects
}
