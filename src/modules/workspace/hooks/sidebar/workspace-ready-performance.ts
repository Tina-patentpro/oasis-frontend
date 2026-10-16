export type WorkspaceReadyMarkKind = 'tabs' | 'history' | 'project'

export interface WorkspaceReadyMarks {
  tabsReady: boolean
  historyReady: boolean
  projectReady: boolean
}

export interface BuildWorkspaceReadyMarkParams {
  marks: WorkspaceReadyMarks
  kind: WorkspaceReadyMarkKind
  ready: boolean
}

export interface BuildWorkspaceReadyMarkResult {
  marks: WorkspaceReadyMarks
  shouldMark: boolean
  markName: string
}

const MARK_CONFIG: Record<
  WorkspaceReadyMarkKind,
  { flag: keyof WorkspaceReadyMarks; markName: string }
> = {
  tabs: { flag: 'tabsReady', markName: 'tabs_ready' },
  history: { flag: 'historyReady', markName: 'history_ready' },
  project: { flag: 'projectReady', markName: 'project_ready' },
}

export function createWorkspaceReadyMarks(): WorkspaceReadyMarks {
  return {
    tabsReady: false,
    historyReady: false,
    projectReady: false,
  }
}

export function buildWorkspaceReadyMark({
  marks,
  kind,
  ready,
}: BuildWorkspaceReadyMarkParams): BuildWorkspaceReadyMarkResult {
  const config = MARK_CONFIG[kind]
  if (marks[config.flag] || !ready) {
    return {
      marks,
      shouldMark: false,
      markName: config.markName,
    }
  }

  return {
    marks: {
      ...marks,
      [config.flag]: true,
    },
    shouldMark: true,
    markName: config.markName,
  }
}
