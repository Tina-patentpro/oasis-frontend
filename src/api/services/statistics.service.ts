/**
 * 统计服务
 * 按 API接口文档-用户端.md 基线对齐。
 */

import type {
  ProjectDetail,
  ProjectActivity,
  ProjectFile,
  PatentSearchResult,
  ProjectManagementStats,
  ProjectManagementStatsParams,
  ProjectActivitiesParams,
  ProjectFilesParams,
  ProjectPatentsParams,
  PaginatedResponse,
} from '@/types/api'

import { projectService } from './project.service'

const notSupported = (name: string): never => {
  throw new Error(`[statisticsService] Backend API not found in API接口文档-用户端.md: ${name}`)
}

class StatisticsService {
  /**
   * 获取项目详细信息。
   * 项目使用 folderdetail 链路；projectdetail 是 legacy 会话详情接口。
   * folderdetail 不返回会话、文件或费用明细，因此这里只提供保持公开签名的兼容投影，
   * 不把空数组和零值解释为后端统计事实。
   */
  async getProjectDetail(projectId: number): Promise<ProjectDetail> {
    const project = await projectService.getProject(projectId)

    return {
      ...project,
      sessions: [],
      files: [],
      statistics: {
        totalSessions: project.sessionCount ?? 0,
        totalFiles: 0,
        totalCost: 0,
        lastActivityAt: project.lastActivityAt ?? project.updatedAt,
      },
    }
  }

  /**
   * 文档未提供项目活动接口
   */
  async getProjectActivities(
    _params: ProjectActivitiesParams,
  ): Promise<PaginatedResponse<ProjectActivity>> {
    return notSupported('getProjectActivities')
  }

  /**
   * 文档未提供项目文件接口
   */
  async getProjectFiles(_params: ProjectFilesParams): Promise<PaginatedResponse<ProjectFile>> {
    return notSupported('getProjectFiles')
  }

  /**
   * 文档未提供项目专利检索接口
   */
  async getProjectPatents(
    _params: ProjectPatentsParams,
  ): Promise<PaginatedResponse<PatentSearchResult>> {
    return notSupported('getProjectPatents')
  }

  /**
   * 文档未提供项目管理统计接口
   */
  async getProjectManagementStats(
    _params?: ProjectManagementStatsParams,
  ): Promise<ProjectManagementStats> {
    return notSupported('getProjectManagementStats')
  }

  /**
   * 文档未提供项目导出接口
   */
  async exportProjectData(
    _projectId: number,
    _format: 'json' | 'csv' | 'excel' = 'json',
  ): Promise<string> {
    return notSupported('exportProjectData')
  }

  async exportStatisticsReport(
    _params: ProjectManagementStatsParams & { format: 'json' | 'csv' | 'excel' },
  ): Promise<string> {
    return notSupported('exportStatisticsReport')
  }
}

export const statisticsService = new StatisticsService()
