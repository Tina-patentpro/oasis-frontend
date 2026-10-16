// Workspace相关类型定义

export type ToolName = string

export interface Tab {
  k: string
  t: string
  tools: ToolName[]
}

export interface ContentPage {
  key: string
  label: string
}

export interface ToolState {
  name: ToolName
  ver: string
}

export interface VersionInfo {
  title: string
  desc: string
}

export type ManagementTab = 'history' | 'project'
export type LayoutMode = 'auto' | 'contrast' | 'vertical'
