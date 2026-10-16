// 项目管理增强与分析相关（现有业务扩展）

export interface ProjectManagementStats {
  kpi: {
    documentsGenerated: {
      count: number
      change: string
      progress: number
    }
    workflowExecutions: {
      count: number
      successRate: number
      progress: number
    }
    patentSearches: {
      count: number
      keyReferences: number
      progress: number
    }
    totalHours: {
      count: number
      avgPerUser: number
      progress: number
    }
  }
  trends: ProjectWorkloadTrend[]
  customerDistribution: ProjectCustomerStatistics[]
  taskAnalysis: TaskTypeAnalysis[]
  timeline: TimelineEvent[]
  todos: TodoItem[]
  lastUpdated: string
}

export interface ProjectWorkloadTrend {
  date: string
  documents: number
  workflows: number
  patents: number
}

export interface ProjectCustomerStatistics {
  customerId: string
  customerName: string
  projectCount: number
  percentage: number
  color?: string
}

export interface TaskTypeAnalysis {
  taskType: string
  taskName: string
  members: number
  count: number
  hours: number
  color?: string
}

export interface TimelineEvent {
  id: number
  time: string
  title: string
  description: string
  executor: string
  type: 'activity' | 'milestone' | 'alert'
}

export interface TodoItem {
  id: number
  title: string
  description: string
  assignee: string
  dueDate?: string
  status?: string
  progress?: number
  priority: 'high' | 'medium' | 'low'
  color?: string
}

export interface ProjectManagementStatsParams {
  timeRange?: 'today' | 'week' | 'month' | 'quarter' | 'half-year' | 'year'
  customerFilter?: string
}

export interface ProjectActivitiesParams {
  projectId: number
  type?: 'workflow' | 'file_generate' | 'patent_search' | 'term_validation'
  page?: number
  pageSize?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface ProjectFilesParams {
  projectId: number
  type?: 'DOCX' | 'PDF' | 'MD' | 'JSON' | 'TXT'
  page?: number
  pageSize?: number
}

export interface ProjectPatentsParams {
  projectId: number
  source?: 'CNIPA' | 'USPTO' | 'JPO' | 'EPO'
  page?: number
  pageSize?: number
}
