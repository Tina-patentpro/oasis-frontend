import type { Project, Tool } from '@/types/api'

// 工具辅助函数

/**
 * 生成唯一ID
 */
export const uid = (): string =>
  window.crypto?.randomUUID?.() || `id-${Math.random().toString(36).slice(2)}`

/**
 * 生成时间戳字符串
 */
export const timestamp = (): string => {
  const d = new Date()
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(
    d.getMinutes(),
  )}:${pad(d.getSeconds())}`
}

type ProjectLike = Partial<Project> & { sessions?: Array<unknown> }

/**
 * 将 ProjectSample 或 Partial<Project> 转换为 Project 类型
 * 在前端设计阶段，提供带默认元数据的项目对象
 */
export const convertToProject = (
  projectLike: ProjectLike | null | undefined,
  index: number,
): Project => {
  if (projectLike && typeof projectLike.id === 'number') {
    return projectLike as Project
  }

  const sessionCount =
    projectLike && Array.isArray(projectLike.sessions) ? projectLike.sessions.length : 0

  return {
    id: index + 1,
    userId: 1,
    name: projectLike?.name ?? `Project-${index + 1}`,
    description: projectLike?.description,
    status: 'active',
    sessionCount,
    metadata: {
      customerName: '示例科技有限公司',
      customerLevel: 'VIP客户',
      contactPerson: '张经理',
      contactRole: 'PM',
      contactMethod: 'zhang@example.com',
      cooperationType: '技术交底书撰写',
      projectStartDate: '2024-09-12',
      projectDeadline: '2024-10-08T18:00',
      deliverables: 'DOCX · 权利要求 · 数据字典',
      projectStatus: '撰写',
      projectPhase: '进行中',
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

interface FormatSessionTitleOptions {
  toolMetadataByName?: Record<string, Tool | undefined>
  fallbackVersion?: string
}

/**
 * 生成默认会话标题：工具名称 + 版本号（如 “Triz分析-V1”）
 */
export const formatSessionTitle = (
  rawToolName: string,
  rawVersion?: string | null,
  options: FormatSessionTitleOptions = {},
): string => {
  const toolName = rawToolName?.trim() || '未命名工具'
  const metadata = options.toolMetadataByName?.[toolName] ?? null
  const metadataVersions = metadata?.versions ?? []
  const normalizedRawVersion = rawVersion?.trim()

  const resolveVersionCandidate = (): string | undefined => {
    if (normalizedRawVersion) {
      return normalizedRawVersion
    }
    const fallback = metadataVersions[0]
    if (fallback?.id) return fallback.id
    if (fallback?.name) return fallback.name
    if (options.fallbackVersion) return options.fallbackVersion
    return undefined
  }

  const matchedMetadataVersion =
    metadataVersions.find(
      (version) =>
        version.id === rawVersion ||
        version.name === rawVersion ||
        version.id === options.fallbackVersion ||
        version.name === options.fallbackVersion,
    ) ?? null

  const versionCandidate = resolveVersionCandidate() ?? matchedMetadataVersion?.id ?? 'V1'

  const normalizeVersionTag = (input: string): string => {
    const trimmed = input.trim()
    const numberMatch = trimmed.match(/(\d+(?:\.\d+)?)/)
    const numberValue = numberMatch?.[1]
    if (numberValue) {
      const value = numberValue.endsWith('.0') ? numberValue.replace(/\.0$/, '') : numberValue
      return `V${value}`
    }
    const vMatch = trimmed.match(/v(\d+(?:\.\d+)?)/i)
    const vValue = vMatch?.[1]
    if (vValue) {
      const value = vValue.endsWith('.0') ? vValue.replace(/\.0$/, '') : vValue
      return `V${value}`
    }
    const alphanumeric = trimmed.replace(/[^0-9a-z]+/gi, '')
    if (alphanumeric) {
      return `V${alphanumeric.toUpperCase()}`
    }
    return 'V1'
  }

  const referenceVersion =
    normalizedRawVersion ||
    matchedMetadataVersion?.id ||
    matchedMetadataVersion?.name ||
    versionCandidate

  const versionTag = normalizeVersionTag(referenceVersion)

  return `${toolName}-${versionTag}`
}
