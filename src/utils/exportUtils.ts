import type { HistoryDataItem, Project, Session } from '@/types/api'

import { executeExportTask } from './export-utils/executor'
import {
  buildHistoryEntries,
  buildProjectEntries,
  buildSessionEntries,
} from './export-utils/entries'
import type { ExportOptions, ExportTask } from './export-utils/models'
import { createExportTask, resolveFormat } from './export-utils/task'

export type { ExportOptions, ExportTask } from './export-utils/models'

/**
 * 导出会话数据
 */
export async function exportSessions(
  sessions: Session[],
  options: ExportOptions = {},
): Promise<ExportTask> {
  const task = createExportTask(
    'sessions',
    sessions.map((session) => ({
      id: session.id.toString(),
      name: session.title,
      type: 'session' as const,
      data: session,
    })),
    options,
  )

  const format = resolveFormat(options)
  const payload = {
    type: 'sessions',
    exportTime: new Date().toISOString(),
    totalItems: sessions.length,
    items: sessions.map((session) => ({
      id: session.id,
      title: session.title,
      toolType: session.toolType,
      modelVersion: session.modelVersion,
      status: session.status,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      projectId: session.projectId,
    })),
  }

  await executeExportTask(task, format, 'sessions_export', payload, () =>
    buildSessionEntries(sessions, options.includeAttachments),
  )

  return task
}

/**
 * 导出项目数据
 */
export async function exportProjects(
  projects: Project[],
  options: ExportOptions = {},
): Promise<ExportTask> {
  const task = createExportTask(
    'projects',
    projects.map((project) => ({
      id: project.id.toString(),
      name: project.name,
      type: 'project' as const,
      data: project,
    })),
    options,
  )

  const format = resolveFormat(options)
  const payload = {
    type: 'projects',
    exportTime: new Date().toISOString(),
    totalItems: projects.length,
    items: projects.map((project) => ({
      id: project.id,
      name: project.name,
      description: project.description,
      status: project.status,
      ownerId: project.ownerId ?? project.userId,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    })),
  }

  await executeExportTask(task, format, 'projects_export', payload, () =>
    buildProjectEntries(projects, options.includeAttachments),
  )

  return task
}

/**
 * 导出历史数据
 */
export async function exportHistory(
  historyItems: HistoryDataItem[],
  options: ExportOptions = {},
): Promise<ExportTask> {
  const task = createExportTask(
    'history',
    historyItems.map((item) => ({
      id: item.id,
      name: item.title,
      type: 'history' as const,
      data: item,
    })),
    options,
  )

  const format = resolveFormat(options)
  const payload = {
    type: 'history',
    exportTime: new Date().toISOString(),
    totalItems: historyItems.length,
    items: historyItems.map((item) => ({
      id: item.id,
      title: item.title,
      type: item.type,
      tags: item.tags,
      date: item.date,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    })),
  }

  await executeExportTask(task, format, 'history_export', payload, () =>
    buildHistoryEntries(historyItems),
  )

  return task
}
