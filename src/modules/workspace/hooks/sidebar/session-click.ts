import type { Project, Session, SessionDetail } from '@/types/api'
import { sessionService } from '@/api/services'
import { dispatchSessionOutputRestored } from '@/modules/workspace/events/session-output-restored-event'
import { normalizeFileUrlList } from '@/utils/file-url'
import { normalizeWorkflowResultPayload } from '@/utils/workflow-result'

import { useContentStore } from '../../stores'
import { buildChatflowSessionSelectPayload } from './session-click-chatflow'
import {
  logSessionClickDebug,
  logSessionClickDebugError,
  summarizeSessionInput,
} from './session-click-debug'
import {
  resolveExpectedInputKeys,
  resolveSectionKey,
  restoreInputSectionValue,
  waitForInputPagesReady,
} from './session-click-input-restore'
import { resolveSessionToolName, type ToolVersionMeta } from './session-click-tool-resolution'
import {
  resolveSessionSurface,
  type SessionLoadResult,
} from './session-surface'
import type { ChatSessionSelectHandler } from './types'
import { resolveVersionForTool } from './tool-version'

type ToolState = {
  name: string
  ver: string
}

export type ProvisionalSessionRestore = { rollback: () => void; release: () => void }

export function resolveRestoredGenerationStatus(params: {
  status?: Session['status']
  hasText: boolean
  hasFiles: boolean
}): 'idle' | 'running' | 'success' {
  const { hasText, hasFiles } = params
  if (hasText || hasFiles) {
    return 'success'
  }
  return 'idle'
}

function cleanRestoredWorkflowText(text: string, session: Session, detail?: SessionDetail): string {
  const normalized = normalizeWorkflowResultPayload({
    ...session,
    ...detail,
    type: detail?.type ?? session.type ?? 1,
    name: detail?.title ?? detail?.api_name ?? session.title,
    api_name: detail?.api_name ?? session.api_name ?? detail?.title ?? session.title,
    answer_text: text,
  })

  return normalized.text || text
}

function normalizeRestoredProjectId(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null
}

// Session restore flow is intentionally centralized here; complexity will be reduced in a follow-up split.
// eslint-disable-next-line complexity
export async function handleWorkspaceSessionClick(params: {
  session: Session
  projectList: Project[]
  availableTabs: Array<{ k: string; tools: string[] }>
  toolMetadataByName: Record<string, ToolVersionMeta>
  filteredToolMetadataByName: Record<string, ToolVersionMeta>
  tab: string
  tool: ToolState
  setTab: (tab: string) => void
  setTool: (tool: ToolState) => void
  notify: (message: string) => void
  resolveToolName: (toolKey: string) => string
  onChatSessionSelect?: ChatSessionSelectHandler
  loadSessionFiles?: (params: {
    fileUrl?: string | string[]
    fileOutput?: Array<Record<string, unknown>>
    sessionId: number
  }) => void
  requestApiDetailLoad?: () => void
  isSessionClickCurrent?: () => boolean
  beginProvisionalRestore?: () => ProvisionalSessionRestore
}): Promise<SessionLoadResult> {
  const {
    session,
    projectList,
    availableTabs,
    toolMetadataByName,
    filteredToolMetadataByName,
    tab,
    tool,
    setTab,
    setTool,
    notify,
    resolveToolName,
    onChatSessionSelect,
    loadSessionFiles,
    requestApiDetailLoad,
    isSessionClickCurrent,
    beginProvisionalRestore,
  } = params
  const isCurrentSessionClick = () => isSessionClickCurrent?.() ?? true
  let provisionalRestore: ProvisionalSessionRestore | null = null

  try {
    notify(`正在加载会话"${session.title}"...`)

    let fullSession: SessionDetail
    try {
      fullSession = await sessionService.getSession(session.id)
    } catch {
      if (!isCurrentSessionClick()) {
        return { status: 'stale', sessionId: session.id }
      }
      console.warn('[workspace] 会话详情加载失败')
      notify('加载会话失败，请稍后重试')
      return { status: 'failed', sessionId: session.id, reason: 'detail-load' }
    }
    if (!isCurrentSessionClick()) {
      logSessionClickDebug('session click discarded (stale by initial guard)', {
        sessionId: session.id,
        source: 'handleWorkspaceSessionClick',
      })
      return { status: 'stale', sessionId: session.id }
    }
    const restoredProjectId = normalizeRestoredProjectId(
      fullSession.projectId === undefined ? session.projectId : fullSession.projectId,
    )
    const relatedProject =
      restoredProjectId !== null
        ? (projectList.find((project) => project.id === restoredProjectId) ?? null)
        : null
    const surface = resolveSessionSurface(session, fullSession)
    logSessionClickDebug('session click start', {
      sessionId: session.id,
      sessionType: session.type,
      detailType: fullSession.type,
      projectId: restoredProjectId,
      title: session.title,
      projectTitle: relatedProject?.name ?? null,
      toolType: session.toolType,
      hasInputs: Boolean(session.inputs || fullSession.inputs),
      source: 'handleWorkspaceSessionClick',
    })

    if (surface === 'workflow') {
      logSessionClickDebug('session click branch workflow', {
        sessionId: session.id,
        branch: 'workflow',
        sessionType: session.type,
        detailType: fullSession.type,
      })
      logSessionClickDebug('session click workflow init', {
        sessionId: session.id,
        fullSessionType: fullSession.type,
      })
      let toolNameFromSession = tool.name
      try {
        toolNameFromSession =
          resolveSessionToolName({
            session,
            detail: fullSession,
            availableTabs,
            toolMetadataByName,
            resolveToolName,
          }) ?? tool.name
      } catch (error) {
        logSessionClickDebugError('session click workflow resolveSessionToolName failed', {
          sessionId: session.id,
          detailType: fullSession.type,
          error: String(error),
        })
      }
      toolNameFromSession = toolNameFromSession?.trim() ? toolNameFromSession : tool.name
      const tabForTool = availableTabs.find((item) => item.tools.includes(toolNameFromSession))
      logSessionClickDebug('session click workflow routing', {
        sessionId: session.id,
        selectedToolName: toolNameFromSession,
        hasTabForTool: Boolean(tabForTool),
      })

      provisionalRestore = beginProvisionalRestore?.() ?? null

      if (tabForTool) {
        if (tabForTool.k !== tab) {
          setTab(tabForTool.k)
        }
        const nextVersion = resolveVersionForTool(
          toolNameFromSession,
          session.modelVersion,
          filteredToolMetadataByName,
          toolMetadataByName,
          tool.ver,
        )
        setTool({ name: toolNameFromSession, ver: nextVersion })
      } else if (toolMetadataByName[toolNameFromSession]) {
        const nextVersion = resolveVersionForTool(
          toolNameFromSession,
          session.modelVersion,
          filteredToolMetadataByName,
          toolMetadataByName,
          tool.ver,
        )
        setTool({ name: toolNameFromSession, ver: nextVersion })
      }

      const {
        setInputSection,
        setGenerated,
        resetInputSections,
        clearVersions,
        addVersion,
        setInputPage,
      } = useContentStore.getState()
      logSessionClickDebug('session click workflow content actions ready', {
        sessionId: session.id,
      })

      const inputsToRestore = fullSession.inputs || session.inputs
      logSessionClickDebug('session click workflow input restore source', {
        sessionId: session.id,
        inputValueType: typeof inputsToRestore,
        hasInputsFromDetail: Boolean(fullSession.inputs),
      })
      const expectedInputKeys = resolveExpectedInputKeys(inputsToRestore)
      logSessionClickDebug('session click workflow expected keys', {
        sessionId: session.id,
        expectedInputKeysCount: expectedInputKeys.length,
      })
      const baselinePageKeys = (useContentStore.getState().pages || []).map((page) => page.key)
      requestApiDetailLoad?.()
      logSessionClickDebug('session click workflow requestApiDetailLoad triggered', {
        sessionId: session.id,
      })
      if (expectedInputKeys.length > 0) {
        await waitForInputPagesReady({
          expectedKeys: expectedInputKeys,
          baselineKeys: baselinePageKeys,
        })
        logSessionClickDebug('session click workflow input pages ready', {
          sessionId: session.id,
          baselinePageCount: baselinePageKeys.length,
          expectedInputKeysCount: expectedInputKeys.length,
        })
      }
      if (!isCurrentSessionClick()) {
        logSessionClickDebug('session click discarded (stale after waitForInputPagesReady)', {
          sessionId: session.id,
          expectedInputKeysCount: expectedInputKeys.length,
          baselineKeysCount: baselinePageKeys.length,
        })
        provisionalRestore?.rollback()
        return { status: 'stale', sessionId: session.id }
      }

      resetInputSections()
      clearVersions()
      setGenerated('')
      logSessionClickDebug('session click workflow state reset', { sessionId: session.id })

      const latestContentPages = useContentStore.getState().pages
      logSessionClickDebug('session click workflow pages snapshot', {
        sessionId: session.id,
        hasPages: Array.isArray(latestContentPages),
        pageCount: latestContentPages?.length ?? 0,
        pages: latestContentPages?.map((page) => page.key).slice(0, 10),
      })

      if (Array.isArray(inputsToRestore)) {
        let restoredCount = 0
        inputsToRestore.forEach((input) => {
          if (!input?.sectionKey) {
            return
          }
          const content = typeof input.content === 'string' ? input.content : ''
          restoreInputSectionValue({
            rawKey: input.sectionKey,
            content,
            contentPages: latestContentPages,
            setInputSection,
          })
          restoredCount += 1
        })
        logSessionClickDebug('session click workflow input section restore (array)', {
          sessionId: session.id,
          restoredSectionCount: restoredCount,
        })
      } else if (
        inputsToRestore &&
        typeof inputsToRestore === 'object' &&
        !Array.isArray(inputsToRestore)
      ) {
        let restoredObjectCount = 0
        Object.entries(inputsToRestore).forEach(([key, value]) => {
          const content =
            typeof value === 'string'
              ? value
              : value !== null && value !== undefined
                ? JSON.stringify(value)
                : ''
          if (!content) {
            return
          }
          restoreInputSectionValue({
            rawKey: key,
            content,
            contentPages: latestContentPages,
            setInputSection,
          })
          restoredObjectCount += 1
        })
        logSessionClickDebug('session click workflow input section restore (object)', {
          sessionId: session.id,
          restoredSectionCount: restoredObjectCount,
        })
      }

      const inputKeys = Array.isArray(inputsToRestore)
        ? inputsToRestore
            .map((item) => item?.sectionKey)
            .filter((key): key is string => typeof key === 'string' && key.trim().length > 0)
            .map((key) => resolveSectionKey(key, latestContentPages))
        : inputsToRestore && typeof inputsToRestore === 'object' && !Array.isArray(inputsToRestore)
          ? Object.keys(inputsToRestore).map((key) => resolveSectionKey(key, latestContentPages))
          : []
      const firstValidKey = inputKeys.find((key) => latestContentPages?.some((p) => p.key === key))
      const defaultInputPage =
        firstValidKey ||
        (latestContentPages?.some((page) => page.key === 'userInstruction')
          ? 'userInstruction'
          : (latestContentPages?.[0]?.key ?? 'userInstruction'))
      logSessionClickDebug('session click workflow default input page', {
        sessionId: session.id,
        firstValidKey,
        fallbackToInput: !firstValidKey,
      })
      setInputPage(defaultInputPage)
      logSessionClickDebug('session click workflow setInputPage applied', {
        sessionId: session.id,
        inputPage: defaultInputPage,
      })

      logSessionClickDebug('session click workflow answer candidate state', {
        sessionId: session.id,
        detailAnswerLength: String(fullSession.answer_text ?? '').length,
        listAnswerLength: String(session.answer_text ?? '').length,
        detailInputType: typeof fullSession.inputs,
        listInputType: typeof session.inputs,
        inputSummary: summarizeSessionInput(fullSession.inputs ?? session.inputs),
      })

      const rawAnswerToRestore = fullSession.answer_text || session.answer_text
      logSessionClickDebug('session click workflow answer snapshot', {
        sessionId: session.id,
        fullSessionAnswerLength: rawAnswerToRestore?.length ?? 0,
        listAnswerLength: session.answer_text?.length ?? 0,
        hasFullSessionAnswer: Boolean(fullSession.answer_text),
      })
      logSessionClickDebug('session click workflow clean answer start', { sessionId: session.id })
      let answerToRestore: unknown = rawAnswerToRestore
      try {
        answerToRestore =
          typeof rawAnswerToRestore === 'string' && rawAnswerToRestore.trim().length > 0
            ? cleanRestoredWorkflowText(rawAnswerToRestore, session, fullSession)
            : rawAnswerToRestore
      } catch (error) {
        logSessionClickDebug('session click workflow cleanRestoredWorkflowText failed', {
          sessionId: session.id,
          detailType: fullSession.type,
          listType: session.type,
          error: String(error),
        })
        answerToRestore = rawAnswerToRestore
      }
      const hasRestoredText =
        typeof answerToRestore === 'string' && answerToRestore.trim().length > 0
      logSessionClickDebug('session click workflow answer resolved', {
        sessionId: session.id,
        finalAnswerType: typeof answerToRestore,
        finalAnswerLength: typeof answerToRestore === 'string' ? answerToRestore.length : 0,
        hasRestoredText,
      })
      if (typeof answerToRestore === 'string') {
        logSessionClickDebug('session click workflow setGenerated', {
          sessionId: session.id,
          restoreTextLength: answerToRestore.length,
          isMermaidSnippet: answerToRestore.includes('```mermaid'),
          hasProjectImage: answerToRestore.includes('![项目还原图]'),
        })
        setGenerated(answerToRestore)
        addVersion({
          id: `${session.id}`,
          time: session.createdAt,
          text: answerToRestore,
        })
        logSessionClickDebug('session click workflow addVersion done', {
          sessionId: session.id,
          restoreTextLength: answerToRestore.length,
        })
      } else {
        logSessionClickDebug('session click workflow answer text type invalid', {
          sessionId: session.id,
          finalAnswerType: typeof answerToRestore,
        })
      }

      const fileUrlToLoad = fullSession.file_url || session.file_url || ''
      const fileOutputToLoad = fullSession.file_output || session.file_output
      const hasRestoredFiles = normalizeFileUrlList(fileUrlToLoad).length > 0
      logSessionClickDebug('session click workflow file resolve', {
        sessionId: session.id,
        hasRestoredFiles,
        fileOutputType: Array.isArray(fileOutputToLoad) ? 'array' : typeof fileOutputToLoad,
      })
      if (loadSessionFiles) {
        loadSessionFiles({
          fileUrl: fileUrlToLoad,
          fileOutput: fileOutputToLoad,
          sessionId: session.id,
        })
        logSessionClickDebug('session click workflow loadSessionFiles called', {
          sessionId: session.id,
          fileUrlType: typeof fileUrlToLoad,
        })
      }
      dispatchSessionOutputRestored({
        sessionId: session.id,
        hasText: hasRestoredText,
        hasFiles: hasRestoredFiles,
        restoredStatus: resolveRestoredGenerationStatus({
          status: fullSession.status || session.status,
          hasText: hasRestoredText,
          hasFiles: hasRestoredFiles,
        }),
        source: 'session-click',
      })
      logSessionClickDebug('session click workflow restored event sent', {
        sessionId: session.id,
        hasText: hasRestoredText,
        hasFiles: hasRestoredFiles,
      })
      logSessionClickDebug('session click workflow completed', { sessionId: session.id })
    } else {
      logSessionClickDebug('session click branch chatflow', {
        sessionId: session.id,
        branch: 'chatflow',
        sessionType: session.type,
        detailType: fullSession.type,
      })
      if (!onChatSessionSelect) {
        notify('当前无法恢复该聊天会话，请稍后重试')
        return {
          status: 'failed',
          sessionId: session.id,
          reason: 'chat-handler-unavailable',
        }
      }
      const restoreResult = onChatSessionSelect(
        buildChatflowSessionSelectPayload({
          session,
          fullDetail: fullSession,
          relatedProject,
          restoredProjectId,
        }),
      )
      if (restoreResult?.status !== 'restored') {
        const blockedReason =
          restoreResult?.status === 'blocked' ? restoreResult.reason : 'handler-unavailable'
        if (blockedReason === 'handler-unavailable') {
          notify('当前无法恢复该聊天会话，请稍后重试')
        }
        return {
          status: 'failed',
          sessionId: session.id,
          reason:
            blockedReason === 'hidden-mode'
              ? 'chat-mode-hidden'
              : 'chat-handler-unavailable',
        }
      }
    }

    if (isCurrentSessionClick()) {
      notify(`会话"${session.title}"加载成功`)
      provisionalRestore?.release()
      return { status: 'loaded', sessionId: session.id, surface, restoredProjectId }
    }
    provisionalRestore?.rollback()
    return { status: 'stale', sessionId: session.id }
  } catch {
    provisionalRestore?.rollback()
    console.warn('[workspace] 会话恢复失败')
    if (isCurrentSessionClick()) {
      notify('加载会话失败，请稍后重试')
      return { status: 'failed', sessionId: session.id, reason: 'restore-failed' }
    }
    return { status: 'stale', sessionId: session.id }
  }
}
