export interface InstructionItem {
  key: string
  title: string
  description: string
  content: string
  badge?: string
  canDelete?: boolean
  isCustom?: boolean
}

export interface InstructionFormState {
  title: string
  content: string
}
