export type OasisActionType = 'fill' | 'confirm_fill'

export type OasisActionRequirement =
  | 'attachment'
  | 'input'
  | 'final_disclosure'
  | 'final_claims'
  | 'final_embodiment'
  | 'final_figure_desc'

export interface OasisActionItem {
  id: string
  label: string
  type: OasisActionType
  query: string
  confirmText?: string
  description?: string
  disabledReason?: string
  requires?: OasisActionRequirement[]
}

export interface OasisActionsPayload {
  version: '1.0'
  title: string
  description?: string
  layout?: 'row' | 'grid'
  actions: OasisActionItem[]
}

const MAX_ACTIONS = 6
const FORBIDDEN_ACTION_FIELDS = new Set(['send', 'auto_send', 'confirm_send'])
const MAX_ID_LENGTH = 64
const MAX_TITLE_LENGTH = 60
const MAX_DESCRIPTION_LENGTH = 120
const MAX_LABEL_LENGTH = 32
const MAX_QUERY_LENGTH = 800
const MAX_CONFIRM_TEXT_LENGTH = 120

const ALLOWED_TYPES = new Set<OasisActionType>(['fill', 'confirm_fill'])
const ALLOWED_REQUIRES = new Set<OasisActionRequirement>([
  'attachment',
  'input',
  'final_disclosure',
  'final_claims',
  'final_embodiment',
  'final_figure_desc',
])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function pickText(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== 'string') {
    return undefined
  }

  const text = value.trim()
  return text && text.length <= maxLength ? text : undefined
}

function pickRequires(value: unknown): OasisActionRequirement[] | undefined {
  if (value === undefined) {
    return undefined
  }

  if (!Array.isArray(value)) {
    return undefined
  }

  if (
    value.some((item) => {
      return typeof item !== 'string' || !ALLOWED_REQUIRES.has(item as OasisActionRequirement)
    })
  ) {
    return undefined
  }

  const requires = value.filter((item): item is OasisActionRequirement =>
    ALLOWED_REQUIRES.has(item as OasisActionRequirement),
  )

  return requires.length > 0 ? Array.from(new Set(requires)) : undefined
}

function parseAction(value: unknown): OasisActionItem | null {
  if (!isRecord(value)) {
    return null
  }

  if (Object.keys(value).some((field) => FORBIDDEN_ACTION_FIELDS.has(field))) {
    return null
  }

  const id = pickText(value.id, MAX_ID_LENGTH)
  const label = pickText(value.label, MAX_LABEL_LENGTH)
  const query = pickText(value.query, MAX_QUERY_LENGTH)
  const type = typeof value.type === 'string' ? value.type : ''

  if (!id || !label || !query || !ALLOWED_TYPES.has(type as OasisActionType)) {
    return null
  }

  const action: OasisActionItem = {
    id,
    label,
    type: type as OasisActionType,
    query,
  }

  const confirmText = pickText(value.confirmText, MAX_CONFIRM_TEXT_LENGTH)
  if (value.confirmText !== undefined && typeof value.confirmText !== 'string') {
    return null
  }
  if (
    typeof value.confirmText === 'string' &&
    value.confirmText.trim().length > MAX_CONFIRM_TEXT_LENGTH
  ) {
    return null
  }
  if (type === 'confirm_fill' && !confirmText) {
    return null
  }
  if (confirmText) {
    action.confirmText = confirmText
  }

  const description = pickText(value.description, MAX_DESCRIPTION_LENGTH)
  if (value.description !== undefined && typeof value.description !== 'string') {
    return null
  }
  if (
    typeof value.description === 'string' &&
    value.description.trim().length > MAX_DESCRIPTION_LENGTH
  ) {
    return null
  }
  if (description) {
    action.description = description
  }

  const disabledReason = pickText(value.disabledReason, MAX_DESCRIPTION_LENGTH)
  if (value.disabledReason !== undefined && typeof value.disabledReason !== 'string') {
    return null
  }
  if (
    typeof value.disabledReason === 'string' &&
    value.disabledReason.trim().length > MAX_DESCRIPTION_LENGTH
  ) {
    return null
  }
  if (disabledReason) {
    action.disabledReason = disabledReason
  }

  if (
    value.requires !== undefined &&
    (!Array.isArray(value.requires) ||
      value.requires.some((item) => {
        return typeof item !== 'string' || !ALLOWED_REQUIRES.has(item as OasisActionRequirement)
      }))
  ) {
    return null
  }
  const requires = pickRequires(value.requires)
  if (requires) {
    action.requires = requires
  }

  return action
}

export function parseOasisActionsPayload(raw: string): OasisActionsPayload | null {
  let parsed: unknown

  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }

  if (!isRecord(parsed) || !Array.isArray(parsed.actions)) {
    return null
  }

  if (parsed.version !== '1.0') {
    return null
  }

  const title = pickText(parsed.title, MAX_TITLE_LENGTH)
  if (!title) {
    return null
  }

  if (parsed.actions.length === 0 || parsed.actions.length > MAX_ACTIONS) {
    return null
  }

  const actions = parsed.actions.map(parseAction)
  if (actions.some((item) => item === null)) {
    return null
  }

  const validActions = actions as OasisActionItem[]
  const actionIds = new Set<string>()
  for (const action of validActions) {
    if (actionIds.has(action.id)) {
      return null
    }
    actionIds.add(action.id)
  }

  const payload: OasisActionsPayload = {
    version: '1.0',
    title,
    actions: validActions,
  }

  const description = pickText(parsed.description, MAX_DESCRIPTION_LENGTH)
  if (parsed.description !== undefined && typeof parsed.description !== 'string') {
    return null
  }
  if (
    typeof parsed.description === 'string' &&
    parsed.description.trim().length > MAX_DESCRIPTION_LENGTH
  ) {
    return null
  }
  if (description) {
    payload.description = description
  }

  if (parsed.layout !== undefined && parsed.layout !== 'row' && parsed.layout !== 'grid') {
    return null
  }

  if (parsed.layout === 'row' || parsed.layout === 'grid') {
    payload.layout = parsed.layout
  }

  return payload
}
