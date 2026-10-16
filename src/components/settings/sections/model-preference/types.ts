export interface ModelPreferenceSectionProps {
  themeColor: string
}

export interface ToolVersion {
  id: string
  name: string
  description: string
}

export interface Tab {
  k: string
  t: string
  tools: string[]
}

export interface ToolMetadata {
  name: string
  description: string
  versions: ToolVersion[]
}
