import type { Session } from '@/types/api'

import { useContentStore } from '../../stores'

function normalizeSectionKey(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '')
}

function areStringArraysEqual(left: string[], right: string[]): boolean {
  if (left.length !== right.length) {
    return false
  }
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) {
      return false
    }
  }
  return true
}

export function resolveSectionKey(
  sectionKey: string,
  contentPages: Array<{ key: string }> | undefined,
): string {
  if (!contentPages || contentPages.length === 0) {
    return sectionKey
  }
  if (contentPages.some((page) => page.key === sectionKey)) {
    return sectionKey
  }

  const normalizedTarget = normalizeSectionKey(sectionKey)
  const normalizedMatch = contentPages.find(
    (page) => normalizeSectionKey(page.key) === normalizedTarget,
  )
  if (normalizedMatch) {
    return normalizedMatch.key
  }

  return sectionKey
}

const FALLBACK_PAGE_KEYS = ['overview', 'background', 'solution', 'benefit', 'example', 'drawing']

function isFallbackOnlyPages(contentPages: Array<{ key: string }> | undefined): boolean {
  if (!contentPages || contentPages.length !== FALLBACK_PAGE_KEYS.length) {
    return false
  }
  return FALLBACK_PAGE_KEYS.every((key, index) => contentPages[index]?.key === key)
}

export async function waitForInputPagesReady(params: {
  expectedKeys: string[]
  baselineKeys?: string[]
  timeoutMs?: number
}): Promise<void> {
  const { expectedKeys, baselineKeys = [], timeoutMs = 2500 } = params
  const targets = expectedKeys
    .map((key) => normalizeSectionKey(key))
    .filter((key) => key.length > 0)
  if (targets.length === 0) {
    return
  }
  const normalizedBaselineKeys = baselineKeys.map((key) => normalizeSectionKey(key))

  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    const pages = useContentStore.getState().pages
    const pageKeys = (pages || []).map((page) => normalizeSectionKey(page.key))
    if (targets.some((target) => pageKeys.includes(target))) {
      return
    }
    const pageSchemaChanged =
      normalizedBaselineKeys.length === 0 || !areStringArraysEqual(pageKeys, normalizedBaselineKeys)
    if ((pages?.length ?? 0) > 0 && pageSchemaChanged && !isFallbackOnlyPages(pages)) {
      return
    }
    await new Promise((resolve) => setTimeout(resolve, 120))
  }
}

export function restoreInputSectionValue(params: {
  rawKey: string
  content: string
  contentPages: Array<{ key: string }> | undefined
  setInputSection: (page: string, content: string) => void
}) {
  const { rawKey, content, contentPages, setInputSection } = params
  if (!rawKey) {
    return
  }

  const resolvedKey = resolveSectionKey(rawKey, contentPages)
  // Keep original key so values can be re-bound after dynamic schema loads.
  setInputSection(rawKey, content)
  if (resolvedKey !== rawKey) {
    setInputSection(resolvedKey, content)
  }
}

export function resolveExpectedInputKeys(inputs: Session['inputs']): string[] {
  if (Array.isArray(inputs)) {
    return inputs
      .map((item) => item?.sectionKey)
      .filter((key): key is string => typeof key === 'string' && key.trim().length > 0)
  }
  if (inputs && typeof inputs === 'object' && !Array.isArray(inputs)) {
    return Object.keys(inputs)
  }
  return []
}
