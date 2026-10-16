// 历史数据相关（现有业务扩展）
import type { FileUrl } from './folders-workflow'

export interface HistoryDataItem {
  id: string
  title: string
  content: string
  date: string
  type: string
  tags: string[]
  read: boolean
  file_url?: FileUrl
  file_output?: Array<Record<string, unknown>>
  createdAt: string
  updatedAt: string
}

export interface HistorySearchParams {
  keyword?: string
  type?: string
  dateFrom?: string
  dateTo?: string
  read?: boolean
  page?: number
  pageSize?: number
  sortBy?: 'date' | 'title' | 'type'
  sortOrder?: 'asc' | 'desc'
  projectId?: number
}

export interface HistoryDataBatch {
  items: HistoryDataItem[]
  notFound: string[]
}
