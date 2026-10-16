import type { Session, SessionDetail } from '@/types/api'

export type ToolVersionMeta = {
  versions?: Array<{
    id?: string
    name?: string
    apiEndpoint?: string
    api_endpoint?: string
  }>
}

function normalizeToolKey(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/[（(].*?[）)]/g, '')
    .replace(/[\s_-]+/g, '')
    .replace(/(?:v)?\d+(?:\.\d+)*/g, '')
    .replace(/(?:fast|basic|pro|lite|x)/g, '')
    .replace(/(?:workflow|chatflow|api)/g, '')
}

function normalizeAliasKey(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '')
}

function isSubsequence(longer: string, shorter: string): boolean {
  if (!shorter) {
    return true
  }
  let i = 0
  let j = 0
  while (i < longer.length && j < shorter.length) {
    if (longer[i] === shorter[j]) {
      j += 1
    }
    i += 1
  }
  return j === shorter.length
}

function getSessionToolCandidates(session: Session, detail: SessionDetail): string[] {
  const raw = [detail.api_name, detail.title, session.api_name, session.title]
  const unique: string[] = []
  const seen = new Set<string>()
  raw.forEach((item) => {
    if (!item) {
      return
    }
    const next = item.trim()
    if (!next || seen.has(next)) {
      return
    }
    seen.add(next)
    unique.push(next)
  })
  return unique
}

function buildToolAliasMap(params: {
  availableToolNames: string[]
  toolMetadataByName: Record<string, ToolVersionMeta>
}): Map<string, string> {
  const { availableToolNames, toolMetadataByName } = params
  const aliasMap = new Map<string, string>()

  const bindAlias = (alias: string | undefined, toolName: string) => {
    if (!alias) {
      return
    }
    const normalized = normalizeAliasKey(alias)
    if (!normalized) {
      return
    }
    if (!aliasMap.has(normalized)) {
      aliasMap.set(normalized, toolName)
    }
  }

  availableToolNames.forEach((toolName) => {
    bindAlias(toolName, toolName)
    const toolMeta = toolMetadataByName[toolName]
    if (!toolMeta) {
      return
    }

    toolMeta.versions?.forEach((version) => {
      bindAlias(version.apiEndpoint ?? version.api_endpoint, toolName)
    })
  })

  return aliasMap
}

export function resolveSessionToolName(params: {
  session: Session
  detail: SessionDetail
  availableTabs: Array<{ k: string; tools: string[] }>
  toolMetadataByName: Record<string, ToolVersionMeta>
  resolveToolName: (toolKey: string) => string
}): string | null {
  const { session, detail, availableTabs, toolMetadataByName, resolveToolName } = params
  const availableToolNames = Array.from(
    new Set(availableTabs.flatMap((item) => item.tools).filter(Boolean)),
  )
  if (availableToolNames.length === 0) {
    return null
  }

  const candidates = getSessionToolCandidates(session, detail)
  const aliasMap = buildToolAliasMap({ availableToolNames, toolMetadataByName })

  for (const candidate of candidates) {
    const matchedByAlias = aliasMap.get(normalizeAliasKey(candidate))
    if (matchedByAlias) {
      return matchedByAlias
    }
  }

  for (const candidate of candidates) {
    const resolved = resolveToolName(candidate)
    if (availableToolNames.includes(resolved)) {
      return resolved
    }
    if (availableToolNames.includes(candidate)) {
      return candidate
    }
  }

  const normalizedToolMap = availableToolNames.map((name) => ({
    name,
    normalized: normalizeToolKey(name),
  }))
  const normalizedCandidates = candidates
    .map((item) => ({ raw: item, normalized: normalizeToolKey(resolveToolName(item)) }))
    .filter((item) => item.normalized.length >= 2)

  for (const candidate of normalizedCandidates) {
    const matched = normalizedToolMap.find((tool) => {
      if (tool.normalized.length < 2) {
        return false
      }
      if (tool.normalized === candidate.normalized) {
        return true
      }
      if (tool.normalized.includes(candidate.normalized)) {
        return true
      }
      if (candidate.normalized.includes(tool.normalized)) {
        return true
      }
      if (isSubsequence(tool.normalized, candidate.normalized)) {
        return true
      }
      if (isSubsequence(candidate.normalized, tool.normalized)) {
        return true
      }
      return false
    })
    if (matched) {
      return matched.name
    }
  }

  return null
}
