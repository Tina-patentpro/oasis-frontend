// 6. 项目管理模块（/projects）

import type { Session } from './folders-workflow'
import type { FileRecord } from './user'

export interface Project {
  id: number
  userId: number
  ownerId?: number
  name: string
  parentId?: number
  childCount?: number
  hasChildren?: boolean
  description?: string
  customerName?: string
  projectCode?: string
  lastActivityAt?: string
  status: 'active' | 'archived'
  sessionCount?: number
  metadata?: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface ProjectFieldConfig {
  key: string
  label: string
  type: 'text' | 'textarea' | 'date' | 'datetime' | 'select' | 'number'
  category: 'customer' | 'basic' | 'other'
  placeholder?: string
  required?: boolean
  options?: string[]
  sortOrder: number
}

export interface ProjectFieldGroup {
  category: 'customer' | 'basic' | 'other'
  label: string
  icon?: string
  bgColor?: string
  textColor?: string
  borderColor?: string
  fields: ProjectFieldConfig[]
}

export interface CreateProjectRequest {
  name: string
  customerName?: string
  description?: string
}

export interface UpdateProjectRequest {
  name?: string
  customerName?: string
  projectCode?: string
  lastActivityAt?: string
  description?: string
  status?: 'active' | 'archived'
  metadata?: Record<string, unknown>
}

export interface QuickCreateProjectRequest {
  id?: number
  name: string
  customerName: string
  description?: string
  metadata?: Record<string, unknown>
}

export interface ListProjectsParams {
  status?: 'active' | 'archived'
  parentId?: number
  page?: number
  pageSize?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  search?: string
}

export interface ProjectDetail extends Project {
  sessions: Session[]
  files: FileRecord[]
  statistics: {
    totalSessions: number
    totalFiles: number
    totalCost: number
    lastActivityAt?: string
  }
}

export interface ProjectActivity {
  id: number
  projectId: number
  type: 'workflow' | 'file_generate' | 'patent_search' | 'term_validation'
  title: string
  status: 'success' | 'failed' | 'partial'
  duration: number
  description: string
  outputs: string[]
  createdAt: string
}

export interface ProjectFile {
  id: number
  projectId: number
  sessionId?: number
  type: 'DOCX' | 'PDF' | 'MD' | 'JSON' | 'TXT'
  name: string
  source: string
  size: number
  version: string
  ossUrl: string
  createdAt: string
  updatedAt: string
}

export interface PatentSearchResult {
  id: number
  projectId: number
  patentId: string
  title: string
  source: 'CNIPA' | 'USPTO' | 'JPO' | 'EPO'
  searchDate: string
  keyPoints: string
  tags: string[]
  pdfUrl?: string
  createdAt: string
}
