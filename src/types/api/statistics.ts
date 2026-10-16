// 统计与导出相关（现有业务扩展）

export interface ListTransactionsParams {
  type?: 'all' | 'recharge' | 'consume' | 'bonus' | 'refund'
  startDate?: string
  endDate?: string
  page?: number
  pageSize?: number
}

export interface ListFilesParams {
  sessionId?: number
  fileType?: 'image' | 'document' | 'other'
  projectId?: number
  page?: number
  pageSize?: number
}

export interface GetChatHistoryParams {
  sessionId: number
  mode?: 'general' | 'image' | 'focus'
  page?: number
  pageSize?: number
}

export interface StatisticsOverview {
  totalSessions: number
  totalProjects: number
  totalSpend: number
  currentBalance: number
  period: {
    startDate: string
    endDate: string
  }
}

export interface WorkloadTrend {
  date: string
  sessionCount: number
  spend: number
}

export interface CustomerStatistics {
  customerId: string
  customerName: string
  sessionCount: number
  totalSpend: number
}

export interface TaskTypeStatistics {
  taskType: string
  count: number
  percentage: number
}

export interface ExportDataRequest {
  format: 'json' | 'csv' | 'excel'
  includeProjects?: boolean
  includeSessions?: boolean
  includeTransactions?: boolean
}

export interface ExportTaskResponse {
  taskId: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  downloadUrl?: string
  createdAt: string
}
