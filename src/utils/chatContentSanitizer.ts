const COMPLETE_THINK_TAG_REGEX = /<think\b[^>]*>[\s\S]*?<\/think>/gi
const HAS_COMPLETE_THINK_TAG_REGEX = /<think\b[^>]*>[\s\S]*?<\/think>/i
const LEADING_UNCLOSED_THINK_TAG_REGEX = /^\s*<think\b[^>]*>[\s\S]*$/i

export function stripThinkingContent(content: string): string {
  if (!content) {
    return ''
  }

  const hasCompleteThinkBlock = HAS_COMPLETE_THINK_TAG_REGEX.test(content)
  const withoutCompleteThinkBlocks = content.replace(COMPLETE_THINK_TAG_REGEX, '')
  const cleanedContent = hasCompleteThinkBlock
    ? withoutCompleteThinkBlocks.replace(/\n[ \t]*\n(?=\S)/g, '\n')
    : withoutCompleteThinkBlocks

  if (LEADING_UNCLOSED_THINK_TAG_REGEX.test(cleanedContent)) {
    return ''
  }

  return cleanedContent.trim()
}
