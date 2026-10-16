/**
 * API 服务模块索引文件
 * 统一导出所有服务实例，便于管理和使用
 */

// 核心服务
import { cmsService } from './cms.service'
import { aiService } from './ai.service'
import { authService } from './auth.service'
import { projectService } from './project.service'
import { sessionService } from './session.service'
import { statisticsService } from './statistics.service'
import { fileService } from './file.service'
import { instructionService } from './instruction.service'
import { notificationService } from './notification.service'
import { referralService } from './referral.service'
import { opsStatusService } from './ops-status.service'
import { usageInsightsService } from './usage-insights.service'
import { performanceService } from './performance.service'
import { supportFeedbackService } from './support-feedback.service'
import { utilitiesService } from './utilities.service'
import { chatflowsService } from './chatflows.service'
import { conversationsService } from './conversations.service'
import { workflowsService } from './workflows.service'
import { dataDeletionService } from './data-deletion.service'
import { projectsCurrentService } from './projects-current.service'

// 用户和数据服务
import { userService } from './user.service'
import { historyService } from './history.service'

// 交易和营销服务
import { billingService } from './billing.service'

export {
  cmsService,
  aiService,
  authService,
  projectService,
  sessionService,
  statisticsService,
  fileService,
  instructionService,
  notificationService,
  referralService,
  opsStatusService,
  usageInsightsService,
  performanceService,
  supportFeedbackService,
  utilitiesService,
  chatflowsService,
  conversationsService,
  workflowsService,
  dataDeletionService,
  projectsCurrentService,
  userService,
  historyService,
  billingService,
}
