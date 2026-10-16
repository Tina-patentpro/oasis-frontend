export function normalizeMermaidBlocks(content: string): string {
  if (!content.trim()) {
    return content
  }

  const lines = content.split('\n')
  const normalizedLines: string[] = []
  let index = 0
  let isInFencedCodeBlock = false

  while (index < lines.length) {
    const line = lines[index]

    if (isFenceLine(line)) {
      normalizedLines.push(line)
      isInFencedCodeBlock = !isInFencedCodeBlock
      index += 1
      continue
    }

    const mermaidDiagramKind = isInFencedCodeBlock ? null : getBareMermaidDiagramKind(line)

    if (mermaidDiagramKind) {
      const mermaidLines = [line]
      index += 1

      while (
        index < lines.length &&
        isBareMermaidContinuationLine(lines[index], mermaidDiagramKind)
      ) {
        mermaidLines.push(lines[index])
        index += 1
      }

      normalizedLines.push('```mermaid', ...mermaidLines, '```')
      continue
    }

    normalizedLines.push(line)
    index += 1
  }

  return normalizedLines.join('\n')
}

const FENCED_CODE_BLOCK_MARKER_REGEX = /^\s*(```|~~~)/

const BARE_MERMAID_START_REGEX =
  /^\s*(?:(?:flowchart|graph)\s+(?:TD|TB|BT|LR|RL)\b|sequenceDiagram\b|classDiagram\b|stateDiagram(?:-v2)?\b|erDiagram\b|pie(?:\s+(?:title|showData|accTitle|accDescr)\b.*)?\s*$|(?:journey|gantt|mindmap|timeline|gitGraph)\s*$)/i

type MermaidDiagramKind =
  | 'flowchart'
  | 'sequence'
  | 'class'
  | 'state'
  | 'er'
  | 'journey'
  | 'gantt'
  | 'pie'
  | 'mindmap'
  | 'timeline'
  | 'gitGraph'

const ORDINARY_MARKDOWN_LINE_REGEX = /^\s*(?:#{1,6}\s+|(?:[-*+]|\d+\.)\s+|>\s+|\|.+\|)/
const MERMAID_COMMENT_LINE_REGEX = /^\s*%%/
const FLOWCHART_LINE_REGEX =
  /^\s*(?:subgraph\b|end\s*$|direction\s+(?:TD|TB|BT|LR|RL)\b|classDef\b|class\b|style\b|linkStyle\b|click\b|accTitle\b|accDescr\b|[A-Za-z0-9_][\w-]*\s*(?:@\{|:::|\[|\(|\{|>|--|==|-\.|<--))/i
const SEQUENCE_LINE_REGEX =
  /^\s*(?:participant\b|actor\b|create\b|destroy\b|activate\b|deactivate\b|note\s+(?:right\s+of|left\s+of|over)\b|loop\b|alt\b|else\b|opt\b|par\b|and\b|rect\b|critical\b|break\b|end\s*$|autonumber\b|box\b|[A-Za-z0-9_][\w-]*\s*(?:->>|-->>|->|-->|-\)|--\)|x-|--x))/i
const CLASS_LINE_REGEX =
  /^\s*(?:namespace\b|class\b|<<[^>]+>>|note\s+(?:for|left|right)\b|link\b|callback\b|click\b|style\b|cssClass\b|end\s*$|[{}]\s*$|[A-Za-z0-9_][\w-]*\s*(?:<\|--|--\|>|\.\.\|>|<\|\.\.|\*--|--\*|o--|--o|<--|-->|--|\.\.|::|\{|\[|\(|@\{)|[A-Za-z0-9_][\w-]*\s*:\s*[+\-#~])/i
const STATE_LINE_REGEX =
  /^\s*(?:state\b|direction\s+(?:TD|TB|BT|LR|RL)\b|note\s+(?:left|right)\s+of\b|end\s*$|--\s*$|[{}]\s*$|\[\*\]\s*-->|[A-Za-z0-9_][\w-]*\s*(?:-->|\{|\[|\(|@\{))/i
const ER_LINE_REGEX =
  /^\s*(?:[A-Za-z0-9_][\w-]*\s*\{\s*$|[{}]\s*$|[A-Za-z0-9_][\w-]*\s+(?:\|\||\|o|o\{|\}o|\}\|)\s*--\s*(?:\|\||\|o|o\{|\}o|\}\|)\s+[A-Za-z0-9_][\w-]*(?:\s*:\s*\S.*)?|[A-Za-z0-9_][\w-]*\s+[A-Za-z0-9_][\w-]*(?:\s+[^:\n]+)?$)/i
const PIE_LINE_REGEX =
  /^\s*(?:(?:title|showData|accTitle|accDescr)\b|"[^"]+"\s*:\s*-?\d+(?:\.\d+)?\s*)/i
const GANTT_CONFIG_LINE_REGEX =
  /^\s*(?:title|dateFormat|axisFormat|tickInterval|todayMarker|excludes|weekday|inclusiveEndDates|section|accTitle|accDescr)\b/i
const GANTT_TASK_LINE_REGEX =
  /^\s*[^:\n：]+:\s*(?=[^,\n]*,)(?:crit\s*,\s*|active\s*,\s*|done\s*,\s*|milestone\s*,\s*)*(?:[A-Za-z][\w-]*\s*,\s*)?(?:after\s+[\w-]+|\d{4}-\d{2}-\d{2}|[\w-]+)\s*,\s*(?:\d{4}-\d{2}-\d{2}|\d+(?:ms|s|m|h|d|w)|until\s+[\w-]+)/i
const JOURNEY_CONFIG_LINE_REGEX = /^\s*(?:title|section|accTitle|accDescr)\b/i
const JOURNEY_TASK_LINE_REGEX = /^\s{2,}[^:\n：]+:\s*[1-5](?:\s*:|$)/
const MINDMAP_LINE_REGEX = /^\s*(?:(?:title|accTitle|accDescr)\b|\S.*\)\)|\s{2,}\S)/i
const TIMELINE_CONFIG_LINE_REGEX = /^\s*(?:title|section|accTitle|accDescr)\b/i
const TIMELINE_EVENT_LINE_REGEX =
  /^\s*(?:(?:\d{3,4}(?:\s*-\s*\d{3,4})?|\d{4}-\d{2}-\d{2})\s*:\s*\S|\s{2,}\S.*:\s*\S)/i
const GIT_GRAPH_LINE_REGEX =
  /^\s*(?:commit\b|branch\b|checkout\b|merge\b|cherry-pick\b|accTitle\b|accDescr\b|options\b|end\s*$)/i

function isFenceLine(line: string): boolean {
  return FENCED_CODE_BLOCK_MARKER_REGEX.test(line)
}

function getBareMermaidDiagramKind(line: string): MermaidDiagramKind | null {
  if (!BARE_MERMAID_START_REGEX.test(line)) {
    return null
  }

  const normalizedLine = line.trim().toLowerCase()

  if (normalizedLine.startsWith('flowchart') || normalizedLine.startsWith('graph')) {
    return 'flowchart'
  }

  if (normalizedLine.startsWith('sequencediagram')) {
    return 'sequence'
  }

  if (normalizedLine.startsWith('classdiagram')) {
    return 'class'
  }

  if (normalizedLine.startsWith('statediagram')) {
    return 'state'
  }

  if (normalizedLine.startsWith('erdiagram')) {
    return 'er'
  }

  if (normalizedLine.startsWith('gitgraph')) {
    return 'gitGraph'
  }

  return normalizedLine.split(/\s+/, 1)[0] as MermaidDiagramKind
}

function isBareMermaidContinuationLine(line: string, diagramKind: MermaidDiagramKind): boolean {
  if (line.trim() === '' || isFenceLine(line) || BARE_MERMAID_START_REGEX.test(line)) {
    return false
  }

  if (ORDINARY_MARKDOWN_LINE_REGEX.test(line)) {
    return false
  }

  if (MERMAID_COMMENT_LINE_REGEX.test(line)) {
    return true
  }

  if (diagramKind === 'flowchart') {
    return FLOWCHART_LINE_REGEX.test(line)
  }

  if (diagramKind === 'sequence') {
    return SEQUENCE_LINE_REGEX.test(line)
  }

  if (diagramKind === 'class') {
    return CLASS_LINE_REGEX.test(line)
  }

  if (diagramKind === 'state') {
    return STATE_LINE_REGEX.test(line)
  }

  if (diagramKind === 'er') {
    return ER_LINE_REGEX.test(line)
  }

  if (diagramKind === 'pie') {
    return PIE_LINE_REGEX.test(line)
  }

  if (diagramKind === 'gantt') {
    return GANTT_CONFIG_LINE_REGEX.test(line) || GANTT_TASK_LINE_REGEX.test(line)
  }

  if (diagramKind === 'journey') {
    return JOURNEY_CONFIG_LINE_REGEX.test(line) || JOURNEY_TASK_LINE_REGEX.test(line)
  }

  if (diagramKind === 'mindmap') {
    return MINDMAP_LINE_REGEX.test(line)
  }

  if (diagramKind === 'timeline') {
    return TIMELINE_CONFIG_LINE_REGEX.test(line) || TIMELINE_EVENT_LINE_REGEX.test(line)
  }

  if (diagramKind === 'gitGraph') {
    return GIT_GRAPH_LINE_REGEX.test(line)
  }

  return false
}
