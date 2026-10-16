import type { Locator, Page, Request } from 'playwright/test'

import { expect, test } from './fixtures/diagnostic-test'
import {
  installStrictWorkspaceApiMock,
  seedAuthenticatedSession,
  type StrictApiFixture,
} from './helpers/workspace-api-mock'

const CHAT_SESSION_ID = 8101
const CHAT_SESSION_TITLE = '会话显示：聊天记录'
const CHAT_QUESTION = '聊天记录中的用户问题'
const CHAT_ANSWER = '聊天记录中的助手回答'
const WORKFLOW_SESSION_ID = 8102
const WORKFLOW_TOOL = '会话显示工作流'
const WORKFLOW_ANSWER = '工作流当前内容：只应显示最新已提交记录'
const RACE_WORKFLOW_SESSION_ID = 8106
const RACE_WORKFLOW_TOOL = '竞态保护工具 A'
const RACE_WORKFLOW_API_NAME = 'session-display-race-workflow-a-e2e'
const RACE_WORKFLOW_MANUAL_VERSION = 'manual-v2'
const RACE_WORKFLOW_MANUAL_API_NAME = 'session-display-race-workflow-a-manual-v2-e2e'
const RACE_WORKFLOW_INPUT = '竞态工作流 A 输入不得污染当前会话'
const RACE_WORKFLOW_ANSWER = '竞态工作流 A 输出不得污染当前会话'
const MANUAL_TARGET_TAB = '手动目标组'
const MANUAL_TARGET_TOOL = '手动目标工具'
const FOCUS_SESSION_ID = 8103
const FOCUS_SESSION_TITLE = '工作聚焦：已有聊天记录'
const FOCUS_ANSWER = '已有聊天内容：隐藏模式失败后必须继续保留'
const HIDDEN_SESSION_ID = 8104
const HIDDEN_SESSION_TITLE = '语义生图：隐藏模式记录'
const HIDDEN_ANSWER = '隐藏模式记录不得冒充已恢复内容'
const LEGACY_SESSION_ID = 8105
const LEGACY_SESSION_TITLE = '通用对话：旧式记录'
const LEGACY_ANSWER = '缺失 type 但包含 conversation 的旧式聊天已恢复'
const LIST_PROJECT_ID = 7
const DETAIL_PROJECT_ID = 33
const LIST_PROJECT_NAME = '列表项目 7'
const DETAIL_PROJECT_NAME = '详情权威项目 33'
const LAYOUT_STRESS_PROJECT_ID = 44
const LAYOUT_STRESS_PROJECT_NAME = '用于验证横向分栏输入区标题栏不会被压缩的较长项目名称'

interface SessionMockOptions {
  waitForChatDetail?: Promise<void>
  waitForWorkflowDetail?: Promise<void>
  waitForRaceWorkflowDetail?: Promise<void>
  enableSchemaRace?: boolean
  apiDetailWaiters?: Record<string, Promise<void>>
  onApiDetailRequest?: (apiName: string) => void
  onRaceWorkflowDetailRequest?: () => void
  apiDetailBodies?: unknown[]
  detailFailureSessionId?: number
  authorityProjectIds?: boolean
  includeLayoutStressProject?: boolean
}

function buildCategoriesResponse(includeSchemaRace = false) {
  return {
    质量验证: [
      {
        id: 91,
        name: WORKFLOW_TOOL,
        group: '质量验证',
        description: '会话恢复端到端验证工具',
        file_url: '',
        workflow: '',
        sort: 1,
        is_active: true,
        apis: [
          {
            id: 911,
            sub_category_id: 91,
            ai_model_id: 911,
            aimodel: 'fast',
            api_endpoint: 'session-display-workflow-e2e',
            api_description: '端到端验证模型',
            api_process: '',
            is_async: 0,
          },
        ],
      },
      ...(includeSchemaRace
        ? [
            {
              id: 92,
              name: RACE_WORKFLOW_TOOL,
              group: '质量验证',
              description: '会话恢复竞态保护验证工具',
              file_url: '',
              workflow: '',
              sort: 0,
              is_active: true,
              apis: [
                {
                  id: 921,
                  sub_category_id: 92,
                  ai_model_id: 921,
                  aimodel: 'fast',
                  api_endpoint: RACE_WORKFLOW_API_NAME,
                  api_description: '竞态保护端到端验证模型',
                  api_process: '',
                  is_async: 0,
                },
                {
                  id: 922,
                  sub_category_id: 92,
                  ai_model_id: 922,
                  aimodel: RACE_WORKFLOW_MANUAL_VERSION,
                  api_endpoint: RACE_WORKFLOW_MANUAL_API_NAME,
                  api_description: '手动版本切换端到端验证模型',
                  api_process: '',
                  is_async: 0,
                },
              ],
            },
          ]
        : []),
    ],
    ...(includeSchemaRace
      ? {
          [MANUAL_TARGET_TAB]: [
            {
              id: 93,
              name: MANUAL_TARGET_TOOL,
              group: MANUAL_TARGET_TAB,
              description: '手动 tab 切换的稳定目标工具',
              file_url: '',
              workflow: '',
              sort: 0,
              is_active: true,
              apis: [
                {
                  id: 931,
                  sub_category_id: 93,
                  ai_model_id: 931,
                  aimodel: 'manual-target',
                  api_endpoint: 'session-display-manual-target-e2e',
                  api_description: '手动 tab 切换目标',
                  api_process: '',
                  is_async: 0,
                },
              ],
            },
          ],
        }
      : {}),
  }
}

function buildSessionList(includeSchemaRace = false) {
  const raceSession = {
    id: RACE_WORKFLOW_SESSION_ID,
    name: RACE_WORKFLOW_TOOL,
    api_name: RACE_WORKFLOW_TOOL,
    user_id: 1,
    folder_id: 0,
    created_at: '2026-07-17T09:56:00.000Z',
    type: 1,
    answer_text: '竞态工作流 A 列表摘要',
    inputs: JSON.stringify({ race_a_prompt: '竞态工作流 A 列表输入' }),
  }
  return {
    total: includeSchemaRace ? 6 : 5,
    items: [
      {
        id: WORKFLOW_SESSION_ID,
        name: WORKFLOW_TOOL,
        api_name: WORKFLOW_TOOL,
        user_id: 1,
        folder_id: 0,
        created_at: '2026-07-17T10:01:00.000Z',
        type: 1,
        answer_text: '工作流列表摘要',
        inputs: JSON.stringify({ prompt: '列表工作流输入' }),
      },
      {
        id: CHAT_SESSION_ID,
        name: CHAT_SESSION_TITLE,
        api_name: CHAT_SESSION_TITLE,
        user_id: 1,
        folder_id: 0,
        created_at: '2026-07-17T10:00:00.000Z',
        type: 2,
        answer_text: '聊天列表摘要',
        inputs: JSON.stringify({
          type: 0,
          query: CHAT_QUESTION,
          conversation_id: 'conversation-session-display-e2e',
        }),
      },
      {
        id: FOCUS_SESSION_ID,
        name: FOCUS_SESSION_TITLE,
        api_name: FOCUS_SESSION_TITLE,
        user_id: 1,
        folder_id: 0,
        created_at: '2026-07-17T09:59:00.000Z',
        type: 2,
        answer_text: '已有聊天列表摘要',
        inputs: JSON.stringify({
          type: 1,
          query: '已有聊天问题',
          conversation_id: 'conversation-focus-session-display-e2e',
        }),
      },
      {
        id: HIDDEN_SESSION_ID,
        name: HIDDEN_SESSION_TITLE,
        api_name: HIDDEN_SESSION_TITLE,
        user_id: 1,
        folder_id: 0,
        created_at: '2026-07-17T09:58:00.000Z',
        type: 2,
        answer_text: '隐藏聊天列表摘要',
        inputs: JSON.stringify({
          type: 2,
          query: '隐藏模式问题',
          conversation_id: 'conversation-hidden-session-display-e2e',
        }),
      },
      {
        id: LEGACY_SESSION_ID,
        name: LEGACY_SESSION_TITLE,
        api_name: LEGACY_SESSION_TITLE,
        user_id: 1,
        folder_id: 0,
        created_at: '2026-07-17T09:57:00.000Z',
        answer_text: '旧式聊天列表摘要',
        inputs: JSON.stringify({
          query: '旧式聊天问题',
          conversation_id: 'conversation-legacy-session-display-e2e',
        }),
      },
      ...(includeSchemaRace ? [raceSession] : []),
    ],
  }
}

function buildAuthoritySessionList() {
  const items = buildSessionList().items
    .filter((item) => item.id === CHAT_SESSION_ID || item.id === FOCUS_SESSION_ID)
    .map((item) => ({ ...item, folder_id: LIST_PROJECT_ID }))
  return { total: items.length, items }
}

function buildChatDetail(projectId = 0) {
  return {
    id: CHAT_SESSION_ID,
    user_id: 1,
    folder_id: projectId,
    api_name: CHAT_SESSION_TITLE,
    type: 2,
    created_at: '2026-07-17T10:00:00.000Z',
    answer_text: CHAT_ANSWER,
    inputs: JSON.stringify({
      type: 0,
      query: CHAT_QUESTION,
      conversation_id: 'conversation-session-display-e2e',
    }),
  }
}

function buildWorkflowDetail() {
  return {
    id: WORKFLOW_SESSION_ID,
    user_id: 1,
    folder_id: 0,
    api_name: WORKFLOW_TOOL,
    type: 1,
    created_at: '2026-07-17T10:01:00.000Z',
    answer_text: WORKFLOW_ANSWER,
    inputs: JSON.stringify({ prompt: '详情工作流输入' }),
  }
}

function buildFocusDetail(projectId = 0) {
  return {
    id: FOCUS_SESSION_ID,
    user_id: 1,
    folder_id: projectId,
    api_name: FOCUS_SESSION_TITLE,
    type: 2,
    created_at: '2026-07-17T09:59:00.000Z',
    answer_text: FOCUS_ANSWER,
    inputs: JSON.stringify({
      type: 1,
      query: '已有聊天问题',
      conversation_id: 'conversation-focus-session-display-e2e',
    }),
  }
}

function buildHiddenDetail() {
  return {
    id: HIDDEN_SESSION_ID,
    user_id: 1,
    folder_id: 0,
    api_name: HIDDEN_SESSION_TITLE,
    type: 2,
    created_at: '2026-07-17T09:58:00.000Z',
    answer_text: HIDDEN_ANSWER,
    inputs: JSON.stringify({
      type: 2,
      query: '隐藏模式问题',
      conversation_id: 'conversation-hidden-session-display-e2e',
    }),
  }
}

function buildLegacyDetail() {
  return {
    id: LEGACY_SESSION_ID,
    user_id: 1,
    folder_id: 0,
    api_name: LEGACY_SESSION_TITLE,
    created_at: '2026-07-17T09:57:00.000Z',
    answer_text: LEGACY_ANSWER,
    conversation_id: 'conversation-legacy-detail-e2e',
    inputs: JSON.stringify({
      query: '旧式聊天问题',
      conversation_id: 'conversation-legacy-session-display-e2e',
    }),
  }
}

function buildRaceWorkflowDetail() {
  return {
    id: RACE_WORKFLOW_SESSION_ID,
    user_id: 1,
    folder_id: 0,
    api_name: RACE_WORKFLOW_TOOL,
    type: 1,
    created_at: '2026-07-17T09:56:00.000Z',
    answer_text: RACE_WORKFLOW_ANSWER,
    inputs: JSON.stringify({ race_a_prompt: RACE_WORKFLOW_INPUT }),
  }
}

function readPostBody(request: Request): unknown {
  try {
    return request.postDataJSON()
  } catch {
    return request.postData()
  }
}

async function installSessionMocks(
  page: Page,
  options: SessionMockOptions = {},
): Promise<void> {
  const fixtures: StrictApiFixture[] = [
    {
      method: 'GET',
      path: '/api/apicategories/detail',
      respond: () => ({ body: buildCategoriesResponse(options.enableSchemaRace) }),
    },
    ...['/api/user/user/folderlist', '/api/user/folderlist'].map(
      (path): StrictApiFixture => ({
        method: 'GET',
        path,
        respond: () => ({
          body: {
            total: options.includeLayoutStressProject ? 3 : 2,
            items: [
              {
                id: LIST_PROJECT_ID,
                name: LIST_PROJECT_NAME,
                coustomer_name: '列表客户',
                user_id: 1,
                parent_id: 0,
                created_at: '2026-01-01T00:00:00.000Z',
                status: 0,
                child_count: 0,
                session_count: 2,
              },
              {
                id: DETAIL_PROJECT_ID,
                name: DETAIL_PROJECT_NAME,
                coustomer_name: '详情客户',
                user_id: 1,
                parent_id: 0,
                created_at: '2026-01-01T00:00:00.000Z',
                status: 0,
                child_count: 0,
                session_count: 1,
              },
              ...(options.includeLayoutStressProject
                ? [
                    {
                      id: LAYOUT_STRESS_PROJECT_ID,
                      name: LAYOUT_STRESS_PROJECT_NAME,
                      coustomer_name: '排版测试客户',
                      user_id: 1,
                      parent_id: 0,
                      created_at: '2026-01-01T00:00:00.000Z',
                      status: 0,
                      child_count: 0,
                      session_count: 0,
                    },
                  ]
                : []),
            ],
          },
        }),
      }),
    ),
    {
      method: 'GET',
      path: '/api/user/user/projectlist',
      respond: (_request, url) => {
        const folderId = url.searchParams.get('folder_id')
        return {
          body:
            folderId === '0'
              ? buildSessionList(options.enableSchemaRace)
              : options.authorityProjectIds && folderId === String(LIST_PROJECT_ID)
                ? buildAuthoritySessionList()
                : { total: 0, items: [] },
        }
      },
    },
    {
      method: 'GET',
      path: `/api/user/user/projectdetail/${CHAT_SESSION_ID}`,
      respond: async () => {
        await options.waitForChatDetail
        return options.detailFailureSessionId === CHAT_SESSION_ID
          ? { status: 500, body: { message: 'detail unavailable' } }
          : {
              body: buildChatDetail(options.authorityProjectIds ? LIST_PROJECT_ID : 0),
            }
      },
    },
    {
      method: 'GET',
      path: `/api/user/user/projectdetail/${WORKFLOW_SESSION_ID}`,
      respond: async () => {
        await options.waitForWorkflowDetail
        return options.detailFailureSessionId === WORKFLOW_SESSION_ID
          ? { status: 500, body: { message: 'detail unavailable' } }
          : { body: buildWorkflowDetail() }
      },
    },
    {
      method: 'GET',
      path: `/api/user/user/projectdetail/${FOCUS_SESSION_ID}`,
      respond: () => ({
        body: buildFocusDetail(options.authorityProjectIds ? DETAIL_PROJECT_ID : 0),
      }),
    },
    {
      method: 'GET',
      path: `/api/user/user/projectdetail/${HIDDEN_SESSION_ID}`,
      respond: () => ({ body: buildHiddenDetail() }),
    },
    {
      method: 'GET',
      path: `/api/user/user/projectdetail/${LEGACY_SESSION_ID}`,
      respond: () => ({ body: buildLegacyDetail() }),
    },
    {
      method: 'GET',
      path: `/api/user/user/projectdetail/${RACE_WORKFLOW_SESSION_ID}`,
      respond: async () => {
        options.onRaceWorkflowDetailRequest?.()
        await options.waitForRaceWorkflowDetail
        return { body: buildRaceWorkflowDetail() }
      },
    },
    {
      method: 'POST',
      path: '/api/apicategories/apidetail',
      respond: async (request) => {
        const requestBody = readPostBody(request)
        options.apiDetailBodies?.push(requestBody)
        const apiName =
          requestBody && typeof requestBody === 'object' && 'name' in requestBody
            ? String(requestBody.name)
            : ''
        options.onApiDetailRequest?.(apiName)
        await options.apiDetailWaiters?.[apiName]
        const isRaceWorkflow =
          apiName === RACE_WORKFLOW_API_NAME || apiName === RACE_WORKFLOW_MANUAL_API_NAME
        const isInitialRaceWorkflow = apiName === RACE_WORKFLOW_API_NAME
        const isManualRaceWorkflow = apiName === RACE_WORKFLOW_MANUAL_API_NAME
        return {
          body: {
            code: 0,
            message: 'success',
            data: {
              id: isInitialRaceWorkflow ? 921 : isManualRaceWorkflow ? 922 : 911,
              name: isRaceWorkflow ? apiName : 'session-display-workflow-e2e',
              api_type: 'Workflow',
              price: 0,
              is_async: 0,
              input_schema: [
                {
                  type: 'paragraph',
                  cn_name: isInitialRaceWorkflow
                    ? '竞态工作流 A 输入'
                    : isManualRaceWorkflow
                      ? '手动版本输入'
                      : '工作流输入',
                  en_name: isInitialRaceWorkflow
                    ? 'race_a_prompt'
                    : isManualRaceWorkflow
                      ? 'manual_prompt'
                      : 'prompt',
                  content: '',
                },
              ],
              output_schema: [],
              created_at: '2026-01-01T00:00:00.000Z',
              updated_at: '2026-01-01T00:00:00.000Z',
            },
          },
        }
      },
    },
  ]

  await installStrictWorkspaceApiMock(page, fixtures)
}

async function openIndependentHistory(page: Page) {
  const historyTab = page.getByRole('button', { name: '独立会话历史' })
  await expect(historyTab).toBeVisible()
  const chatSession = page.getByRole('button', { name: new RegExp(`^${CHAT_SESSION_TITLE}`) })
  if (!(await chatSession.isVisible())) {
    await historyTab.click()
  }
  await expect(chatSession).toBeVisible()
}

async function installSessionSuccessToastObserver(page: Page) {
  await page.addInitScript(() => {
    const observedWindow = window as Window & { __sessionSuccessToasts?: string[] }
    observedWindow.__sessionSuccessToasts = []
    const seen = new WeakSet<Element>()
    const observer = new MutationObserver(() => {
      document.querySelectorAll('[role="alert"], [role="status"]').forEach((element) => {
        const text = element.textContent?.trim() ?? ''
        if (!text.includes('加载成功') || seen.has(element)) return
        seen.add(element)
        observedWindow.__sessionSuccessToasts?.push(text)
      })
    })
    observer.observe(document, { childList: true, subtree: true })
  })
}

async function getSessionSuccessToasts(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const observedWindow = window as Window & { __sessionSuccessToasts?: string[] }
    return observedWindow.__sessionSuccessToasts ?? []
  })
}

function getRaceWorkflowSession(page: Page) {
  return page.locator('button[aria-busy]').filter({ hasText: RACE_WORKFLOW_TOOL })
}

async function expectRaceRestoreCancelled(page: Page) {
  const pendingWorkflowA = getRaceWorkflowSession(page)
  await expect(pendingWorkflowA).toHaveAttribute('aria-busy', 'false')
  await expect(pendingWorkflowA).not.toHaveAttribute('aria-current')
  await expect(pendingWorkflowA.getByText('正在加载', { exact: true })).toHaveCount(0)
}

async function expectSurfaceWithinViewport(
  surface: Locator,
  viewport: { width: number; height: number },
) {
  const box = await surface.boundingBox()
  expect(box).not.toBeNull()
  expect(box!.width).toBeGreaterThan(0)
  expect(box!.height).toBeGreaterThan(0)
  expect(box!.x).toBeGreaterThanOrEqual(0)
  expect(box!.y).toBeGreaterThanOrEqual(0)
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width)
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height)
}

async function expectLocatorsNotToIntersect(first: Locator, second: Locator) {
  const firstBox = await first.boundingBox()
  const secondBox = await second.boundingBox()
  expect(firstBox).not.toBeNull()
  expect(secondBox).not.toBeNull()

  const intersects =
    firstBox!.x < secondBox!.x + secondBox!.width &&
    firstBox!.x + firstBox!.width > secondBox!.x &&
    firstBox!.y < secondBox!.y + secondBox!.height &&
    firstBox!.y + firstBox!.height > secondBox!.y

  expect(intersects).toBe(false)
}

async function seedWorkspaceUiState(
  page: Page,
  state: {
    showSidebar: boolean
    chatMode: 'off' | 'quarter' | 'full'
    chatOpen: boolean
  },
) {
  await page.addInitScript((persistedState) => {
    localStorage.setItem(
      'workspace-ui-storage',
      JSON.stringify({
        version: 1,
        state: {
          ...persistedState,
          leftWidth: 320,
          preferredChatWidth: 520,
          layoutMode: 'auto',
          tooltipsEnabled: true,
        },
      }),
    )
  }, state)
}

async function installCompactFirstCommitObserver(page: Page) {
  await page.addInitScript(() => {
    type CompactFirstCommitSnapshot = {
      surfaces: string[]
      activeModes: string[]
      indicator: { width: string; transform: string } | null
      controlBoxes: Array<{
        name: string
        x: number
        y: number
        width: number
        height: number
      }>
      bodyScrollWidth: number
      viewportWidth: number
      viewportHeight: number
    }
    const observedWindow = window as Window & {
      __compactFirstCommitSnapshots?: CompactFirstCommitSnapshot[]
    }
    observedWindow.__compactFirstCommitSnapshots = []

    const capture = (observer: MutationObserver) => {
      const compactSwitch = document.querySelector<HTMLElement>(
        '[data-testid="compact-chat-mode-switch"]',
      )
      const sidebar = document.querySelector<HTMLElement>(
        'aside[aria-label="工具与历史记录侧栏"]',
      )
      const workflow = document.querySelector<HTMLElement>('#workspace-workflow-surface')
      const chat = document.querySelector<HTMLElement>('#workspace-chat-surface')
      if (!compactSwitch || (!sidebar && !workflow && !chat)) return

      const surfaces = [
        sidebar ? 'sidebar' : null,
        workflow ? 'workflow' : null,
        chat ? 'chat' : null,
      ].filter((surface): surface is string => surface !== null)
      const activeModes = Array.from(
        compactSwitch.querySelectorAll<HTMLButtonElement>('button[aria-pressed="true"]'),
      ).map((button) => button.getAttribute('aria-label') ?? '')
      const indicator = compactSwitch.querySelector<HTMLElement>(
        '[data-testid="compact-chat-mode-indicator"]',
      )
      const activeSurface = sidebar ?? workflow ?? chat
      const controls = [
        ...Array.from(document.querySelectorAll<HTMLElement>('nav button')),
        ...Array.from(
          activeSurface?.querySelectorAll<HTMLElement>('button, input, textarea, select') ?? [],
        ),
      ].filter((element) =>
        typeof element.checkVisibility === 'function'
          ? element.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })
          : getComputedStyle(element).display !== 'none' &&
            getComputedStyle(element).visibility !== 'hidden',
      )
      const controlBoxes = controls.map((element) => {
        const box = element.getBoundingClientRect()
        return {
          name:
            element.getAttribute('aria-label') ??
            element.getAttribute('title') ??
            element.textContent?.trim() ??
            element.tagName,
          x: box.x,
          y: box.y,
          width: box.width,
          height: box.height,
        }
      })

      observedWindow.__compactFirstCommitSnapshots?.push({
        surfaces,
        activeModes,
        indicator: indicator
          ? { width: indicator.style.width, transform: indicator.style.transform }
          : null,
        controlBoxes,
        bodyScrollWidth: document.documentElement.scrollWidth,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
      })
      observer.disconnect()
    }

    const observer = new MutationObserver(() => capture(observer))
    observer.observe(document, { childList: true, subtree: true })
  })
}

const compactTruthTable = [
  {
    label: 'sidebar=true + Off',
    persisted: { showSidebar: true, chatMode: 'off' as const, chatOpen: true },
    surface: 'sidebar',
    activeMode: 'Off',
  },
  {
    label: 'sidebar=true + Quarter',
    persisted: { showSidebar: true, chatMode: 'quarter' as const, chatOpen: false },
    surface: 'sidebar',
    activeMode: 'Off',
  },
  {
    label: 'sidebar=true + Full',
    persisted: { showSidebar: true, chatMode: 'full' as const, chatOpen: true },
    surface: 'sidebar',
    activeMode: 'Off',
  },
  {
    label: 'sidebar=false + Off（stale chatOpen）',
    persisted: { showSidebar: false, chatMode: 'off' as const, chatOpen: true },
    surface: 'workflow',
    activeMode: 'Off',
  },
  {
    label: 'sidebar=false + Quarter（stale closed）',
    persisted: { showSidebar: false, chatMode: 'quarter' as const, chatOpen: false },
    surface: 'chat',
    activeMode: 'Full',
  },
  {
    label: 'sidebar=false + Full（stale closed）',
    persisted: { showSidebar: false, chatMode: 'full' as const, chatOpen: false },
    surface: 'chat',
    activeMode: 'Full',
  },
] as const

for (const scenario of compactTruthTable) {
  test(`320px/375px compact 首帧真值表：${scenario.label} 只显示规范主表面`, async ({
    page,
  }) => {
    await seedAuthenticatedSession(page)
    await seedWorkspaceUiState(page, scenario.persisted)
    await installCompactFirstCommitObserver(page)
    await installSessionMocks(page)

    for (const viewport of [
      { width: 320, height: 800 },
      { width: 375, height: 812 },
    ]) {
      await page.setViewportSize(viewport)
      await page.goto('/workspace')

      await expect
        .poll(() =>
          page.evaluate(() => {
            const observedWindow = window as Window & {
              __compactFirstCommitSnapshots?: unknown[]
            }
            return observedWindow.__compactFirstCommitSnapshots?.[0] ?? null
          }),
        )
        .not.toBeNull()
      const snapshot = await page.evaluate(() => {
        const observedWindow = window as Window & {
          __compactFirstCommitSnapshots?: Array<{
            surfaces: string[]
            activeModes: string[]
            indicator: { width: string; transform: string } | null
            controlBoxes: Array<{
              name: string
              x: number
              y: number
              width: number
              height: number
            }>
            bodyScrollWidth: number
            viewportWidth: number
            viewportHeight: number
          }>
        }
        return observedWindow.__compactFirstCommitSnapshots?.[0] ?? null
      })
      expect(snapshot).not.toBeNull()
      expect(snapshot!.surfaces).toEqual([scenario.surface])
      expect(snapshot!.activeModes).toEqual([`设置对话栏为 ${scenario.activeMode}`])
      expect(snapshot!.indicator).toEqual({
        width: '50%',
        transform: scenario.activeMode === 'Full' ? 'translateX(100%)' : 'translateX(0%)',
      })
      expect(snapshot!.controlBoxes.length).toBeGreaterThan(0)
      for (const box of snapshot!.controlBoxes) {
        expect(box.width, box.name).toBeGreaterThan(0)
        expect(box.height, box.name).toBeGreaterThan(0)
        expect(box.x, box.name).toBeGreaterThanOrEqual(0)
        expect(box.y, box.name).toBeGreaterThanOrEqual(0)
        expect(box.x + box.width, box.name).toBeLessThanOrEqual(
          snapshot!.viewportWidth,
        )
      }
      expect(snapshot!.bodyScrollWidth).toBeLessThanOrEqual(snapshot!.viewportWidth)

      const sidebar = page.getByRole('complementary', { name: '工具与历史记录侧栏' })
      const workflow = page.getByRole('region', { name: '工作流工作区' })
      const chat = page.getByRole('region', { name: '对话工作区' })
      await expect(sidebar).toHaveCount(scenario.surface === 'sidebar' ? 1 : 0)
      await expect(workflow).toHaveCount(scenario.surface === 'workflow' ? 1 : 0)
      await expect(chat).toHaveCount(scenario.surface === 'chat' ? 1 : 0)
    }
  })
}

test('320px 会话切换在首次 lazy 与缓存命中后都聚焦对话工作区', async ({ page }) => {
  let chatPanelChunkRequestCount = 0
  let releaseChatPanelChunk = () => {}
  const waitForChatPanelChunk = new Promise<void>((resolve) => {
    releaseChatPanelChunk = resolve
  })
  await page.route('**/assets/ChatPanel-*.js', async (route) => {
    chatPanelChunkRequestCount += 1
    await waitForChatPanelChunk
    await route.fallback()
  })
  await page.setViewportSize({ width: 320, height: 800 })
  await seedAuthenticatedSession(page)
  await seedWorkspaceUiState(page, {
    showSidebar: true,
    chatMode: 'off',
    chatOpen: false,
  })
  await installSessionMocks(page)

  await page.goto('/workspace')
  await openIndependentHistory(page)
  const chatSession = page.getByRole('button', { name: new RegExp(`^${CHAT_SESSION_TITLE}`) })

  try {
    await chatSession.click()
    const chatSurface = page.getByRole('region', { name: '对话工作区' })
    await expect.poll(() => chatPanelChunkRequestCount).toBe(1)
    await expect(chatSurface).toBeVisible()
    await expect(chatSurface).toBeFocused()
    await expectSurfaceWithinViewport(chatSurface, { width: 320, height: 800 })
    await expect(chatSurface.getByRole('status')).toHaveText('正在加载对话面板…')
    await expect(page.getByRole('complementary', { name: '工具与历史记录侧栏' })).toHaveCount(0)

    releaseChatPanelChunk()
    await expect(page.getByText(CHAT_ANSWER)).toBeVisible()

    await page.getByRole('button', { name: '显示侧边栏' }).click()
    await openIndependentHistory(page)
    await page.getByRole('button', { name: new RegExp(`^${CHAT_SESSION_TITLE}`) }).click()
    await expect(chatSurface).toBeVisible()
    await expect(chatSurface).toBeFocused()
    await expectSurfaceWithinViewport(chatSurface, { width: 320, height: 800 })
    await expect(page.getByText(CHAT_ANSWER)).toBeVisible()
    expect(chatPanelChunkRequestCount).toBe(1)
  } finally {
    releaseChatPanelChunk()
  }
})

test('375px Quarter 初始会话选择工作流后关闭聊天并聚焦工作流', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await seedAuthenticatedSession(page)
  await seedWorkspaceUiState(page, {
    showSidebar: false,
    chatMode: 'quarter',
    chatOpen: true,
  })
  await installSessionMocks(page)

  await page.goto('/workspace')
  await expect(page.getByRole('region', { name: '对话工作区' })).toBeVisible()
  await page.getByRole('button', { name: '显示侧边栏' }).click()
  await openIndependentHistory(page)
  await page.locator('button[aria-busy]').filter({ hasText: WORKFLOW_TOOL }).click()

  const workflowSurface = page.getByRole('region', { name: '工作流工作区' })
  await expect(workflowSurface).toBeVisible()
  await expect(workflowSurface).toBeFocused()
  await expect(page.getByRole('region', { name: '对话工作区' })).toHaveCount(0)
})

test('会话详情失败 500 保留原选择且不以列表摘要冒充成功详情', async ({
  page,
  diagnostics,
}) => {
  diagnostics.expect({
    kind: 'http',
    method: 'GET',
    pathname: new RegExp(`/api/user/user/projectdetail/${WORKFLOW_SESSION_ID}$`),
    status: 500,
    minOccurrences: 1,
    maxOccurrences: 1,
  })
  diagnostics.expect({
    kind: 'console',
    level: 'error',
    sourcePathname: new RegExp(`/api/user/user/projectdetail/${WORKFLOW_SESSION_ID}$`),
    message: /Failed to load resource.*500/i,
    minOccurrences: 0,
    maxOccurrences: 1,
  })
  diagnostics.expect({
    kind: 'console',
    level: 'warning',
    message: /^\[workspace\] 会话详情加载失败$/,
    argumentCount: 1,
    minOccurrences: 0,
    maxOccurrences: 0,
  })
  await page.setViewportSize({ width: 1280, height: 720 })
  await seedAuthenticatedSession(page)
  await installSessionMocks(page, { detailFailureSessionId: WORKFLOW_SESSION_ID })

  await page.goto('/workspace')
  await openIndependentHistory(page)
  const chatSession = page.getByRole('button', { name: new RegExp(`^${CHAT_SESSION_TITLE}`) })
  const failedWorkflow = page.locator('button[aria-busy]').filter({ hasText: WORKFLOW_TOOL })
  await chatSession.click()
  await expect(page.getByText(CHAT_ANSWER)).toBeVisible()

  const failureResponse = page.waitForResponse(
    (response) =>
      response.url().includes(`/api/user/user/projectdetail/${WORKFLOW_SESSION_ID}`) &&
      response.status() === 500,
  )
  await failedWorkflow.click()
  await failureResponse

  await expect(chatSession).toHaveAttribute('aria-current', 'true')
  await expect(failedWorkflow).not.toHaveAttribute('aria-current')
  await expect(page.getByText(CHAT_ANSWER)).toBeVisible()
  await expect(page.getByText('工作流列表摘要')).toHaveCount(0)
  await expect(page.getByText(`会话"${WORKFLOW_TOOL}"加载成功`)).toHaveCount(0)
})

test('detail pending 时手动切换 tab 立即取消会话恢复且不启动旧 schema', async ({
  page,
}, testInfo) => {
  let releaseRaceDetail = () => {}
  const waitForRaceDetail = new Promise<void>((resolve) => {
    releaseRaceDetail = resolve
  })
  let signalRaceDetailRequested = () => {}
  const raceDetailRequested = new Promise<void>((resolve) => {
    signalRaceDetailRequested = resolve
  })
  const apiDetailBodies: unknown[] = []

  await installSessionSuccessToastObserver(page)
  await seedAuthenticatedSession(page)
  await installSessionMocks(page, {
    enableSchemaRace: true,
    waitForRaceWorkflowDetail: waitForRaceDetail,
    onRaceWorkflowDetailRequest: signalRaceDetailRequested,
    apiDetailBodies,
  })

  await page.goto('/workspace')
  await openIndependentHistory(page)
  const pendingWorkflowA = getRaceWorkflowSession(page)
  const manualTargetTab = page.getByRole('button', { name: MANUAL_TARGET_TAB, exact: true })
  const raceDetailResponse = page.waitForResponse((response) =>
    response.url().includes(`/api/user/user/projectdetail/${RACE_WORKFLOW_SESSION_ID}`),
  )

  await pendingWorkflowA.click()
  await raceDetailRequested
  await expect(pendingWorkflowA).toHaveAttribute('aria-busy', 'true')
  await expect(pendingWorkflowA.getByText('正在加载', { exact: true })).toBeVisible()

  await manualTargetTab.click()
  await expect(manualTargetTab).toHaveAttribute('aria-pressed', 'true')
  await expectRaceRestoreCancelled(page)

  try {
    releaseRaceDetail()
    await raceDetailResponse
  } finally {
    releaseRaceDetail()
  }

  await expect(manualTargetTab).toHaveAttribute('aria-pressed', 'true')
  await expectRaceRestoreCancelled(page)
  await expect(page.getByText(RACE_WORKFLOW_ANSWER)).toHaveCount(0)
  await expect(page.getByRole('textbox', { name: '竞态工作流 A 输入内容' })).toHaveCount(0)
  expect(
    apiDetailBodies.filter(
      (body) =>
        body !== null &&
        typeof body === 'object' &&
        'name' in body &&
        body.name === RACE_WORKFLOW_API_NAME,
    ),
  ).toHaveLength(0)
  expect(await getSessionSuccessToasts(page)).toEqual([])
  await page.screenshot({ path: testInfo.outputPath('detail-pending-manual-tab.png') })
})

test('schema pending 时手动切换工具 X 保持手动目标且拒绝旧会话迟到提交', async ({
  page,
}, testInfo) => {
  let releaseRaceSchema = () => {}
  const waitForRaceSchema = new Promise<void>((resolve) => {
    releaseRaceSchema = resolve
  })
  let signalRaceSchemaRequested = () => {}
  const raceSchemaRequested = new Promise<void>((resolve) => {
    signalRaceSchemaRequested = resolve
  })

  await installSessionSuccessToastObserver(page)
  await seedAuthenticatedSession(page)
  await installSessionMocks(page, {
    enableSchemaRace: true,
    apiDetailWaiters: { [RACE_WORKFLOW_API_NAME]: waitForRaceSchema },
    onApiDetailRequest: (apiName) => {
      if (apiName === RACE_WORKFLOW_API_NAME) signalRaceSchemaRequested()
    },
  })

  await page.goto('/workspace')
  await openIndependentHistory(page)
  const pendingWorkflowA = getRaceWorkflowSession(page)
  const sidebar = page.getByRole('complementary', { name: '工具与历史记录侧栏' })
  const manualToolX = sidebar.getByRole('button', { name: WORKFLOW_TOOL, exact: true })
  const raceSchemaResponse = page.waitForResponse((response) => {
    if (!response.url().includes('/api/apicategories/apidetail')) return false
    const body = readPostBody(response.request())
    return (
      body !== null &&
      typeof body === 'object' &&
      'name' in body &&
      body.name === RACE_WORKFLOW_API_NAME
    )
  })

  await pendingWorkflowA.click()
  await raceSchemaRequested
  await expect(pendingWorkflowA).toHaveAttribute('aria-busy', 'true')

  await manualToolX.click()
  await expectRaceRestoreCancelled(page)
  await expect(manualToolX).toHaveClass(/bg-theme-light/)

  try {
    releaseRaceSchema()
    await raceSchemaResponse
  } finally {
    releaseRaceSchema()
  }

  await expectRaceRestoreCancelled(page)
  await expect(manualToolX).toHaveClass(/bg-theme-light/)
  await expect(page.getByText(RACE_WORKFLOW_ANSWER)).toHaveCount(0)
  await expect(page.getByRole('textbox', { name: '竞态工作流 A 输入内容' })).toHaveCount(0)
  expect(await getSessionSuccessToasts(page)).toEqual([])
  await page.screenshot({ path: testInfo.outputPath('schema-pending-manual-tool-x.png') })
})

test('schema pending 时手动切换第二版本保持 manual-v2 且拒绝旧会话迟到提交', async ({
  page,
}, testInfo) => {
  let releaseRaceSchema = () => {}
  const waitForRaceSchema = new Promise<void>((resolve) => {
    releaseRaceSchema = resolve
  })
  let signalRaceSchemaRequested = () => {}
  const raceSchemaRequested = new Promise<void>((resolve) => {
    signalRaceSchemaRequested = resolve
  })

  await installSessionSuccessToastObserver(page)
  await seedAuthenticatedSession(page)
  await installSessionMocks(page, {
    enableSchemaRace: true,
    apiDetailWaiters: { [RACE_WORKFLOW_API_NAME]: waitForRaceSchema },
    onApiDetailRequest: (apiName) => {
      if (apiName === RACE_WORKFLOW_API_NAME) signalRaceSchemaRequested()
    },
  })

  await page.goto('/workspace')
  await openIndependentHistory(page)
  const pendingWorkflowA = getRaceWorkflowSession(page)
  const sidebar = page.getByRole('complementary', { name: '工具与历史记录侧栏' })
  const modelTrigger = sidebar.locator('button[aria-haspopup="listbox"]')
  const raceSchemaResponse = page.waitForResponse((response) => {
    if (!response.url().includes('/api/apicategories/apidetail')) return false
    const body = readPostBody(response.request())
    return (
      body !== null &&
      typeof body === 'object' &&
      'name' in body &&
      body.name === RACE_WORKFLOW_API_NAME
    )
  })

  await pendingWorkflowA.click()
  await raceSchemaRequested
  await expect(pendingWorkflowA).toHaveAttribute('aria-busy', 'true')
  await expect(modelTrigger).toContainText('fast')

  const manualVersionResponse = page.waitForResponse((response) => {
    if (!response.url().includes('/api/apicategories/apidetail')) return false
    const body = readPostBody(response.request())
    return (
      body !== null &&
      typeof body === 'object' &&
      'name' in body &&
      body.name === RACE_WORKFLOW_MANUAL_API_NAME
    )
  })
  await modelTrigger.click()
  await page
    .getByRole('listbox', { name: '选择模型版本' })
    .getByRole('option', { name: new RegExp(RACE_WORKFLOW_MANUAL_VERSION) })
    .click()
  await manualVersionResponse
  await expectRaceRestoreCancelled(page)
  await expect(modelTrigger).toContainText(RACE_WORKFLOW_MANUAL_VERSION)

  try {
    releaseRaceSchema()
    await raceSchemaResponse
  } finally {
    releaseRaceSchema()
  }

  await expectRaceRestoreCancelled(page)
  await expect(modelTrigger).toContainText(RACE_WORKFLOW_MANUAL_VERSION)
  await expect(page.getByText(RACE_WORKFLOW_ANSWER)).toHaveCount(0)
  await expect(page.getByRole('textbox', { name: '竞态工作流 A 输入内容' })).toHaveCount(0)
  expect(await getSessionSuccessToasts(page)).toEqual([])
  await page.screenshot({ path: testInfo.outputPath('schema-pending-manual-version.png') })
})

test('工作流 A 越过详情 guard 等待动态 schema 时，会话 B 的 500 不污染已提交会话 X', async ({
  page,
  diagnostics,
}) => {
  diagnostics.expect({
    kind: 'http',
    method: 'GET',
    pathname: new RegExp(`/api/user/user/projectdetail/${CHAT_SESSION_ID}$`),
    status: 500,
    minOccurrences: 1,
    maxOccurrences: 1,
  })
  diagnostics.expect({
    kind: 'console',
    level: 'error',
    sourcePathname: new RegExp(`/api/user/user/projectdetail/${CHAT_SESSION_ID}$`),
    message: /Failed to load resource.*500/i,
    minOccurrences: 0,
    maxOccurrences: 1,
  })
  diagnostics.expect({
    kind: 'console',
    level: 'warning',
    message: /^\[workspace\] 会话详情加载失败$/,
    argumentCount: 1,
    minOccurrences: 0,
    maxOccurrences: 0,
  })

  let releaseRaceSchema = () => {}
  const waitForRaceSchema = new Promise<void>((resolve) => {
    releaseRaceSchema = resolve
  })
  let signalRaceSchemaRequested = (_apiName: string) => {}
  let raceSchemaRequestCount = 0
  const raceSchemaRequested = new Promise<string>((resolve) => {
    signalRaceSchemaRequested = resolve
  })

  await page.addInitScript(() => {
    const observedWindow = window as Window & { __sessionSuccessToasts?: string[] }
    observedWindow.__sessionSuccessToasts = []
    const seen = new WeakSet<Element>()
    const observer = new MutationObserver(() => {
      document.querySelectorAll('[role="alert"], [role="status"]').forEach((element) => {
        const text = element.textContent?.trim() ?? ''
        if (!text.includes('加载成功') || seen.has(element)) return
        seen.add(element)
        observedWindow.__sessionSuccessToasts?.push(text)
      })
    })
    observer.observe(document, { childList: true, subtree: true })
  })
  await seedAuthenticatedSession(page)
  await seedWorkspaceUiState(page, {
    showSidebar: true,
    chatMode: 'off',
    chatOpen: false,
  })
  await installSessionMocks(page, {
    detailFailureSessionId: CHAT_SESSION_ID,
    enableSchemaRace: true,
    apiDetailWaiters: { [RACE_WORKFLOW_API_NAME]: waitForRaceSchema },
    onApiDetailRequest: (apiName) => {
      if (apiName === RACE_WORKFLOW_API_NAME) {
        raceSchemaRequestCount += 1
        signalRaceSchemaRequested(apiName)
      }
    },
  })

  await page.goto('/workspace')
  await openIndependentHistory(page)
  const committedSessionX = page.locator('button[aria-busy]').filter({ hasText: WORKFLOW_TOOL })
  const pendingWorkflowA = page
    .locator('button[aria-busy]')
    .filter({ hasText: RACE_WORKFLOW_TOOL })
  const failedSessionB = page.getByRole('button', {
    name: new RegExp(`^${CHAT_SESSION_TITLE}`),
  })
  const sidebar = page.getByRole('complementary', { name: '工具与历史记录侧栏' })
  const committedToolX = sidebar.getByRole('button', { name: WORKFLOW_TOOL, exact: true })
  const pendingToolA = sidebar.getByRole('button', { name: RACE_WORKFLOW_TOOL, exact: true })

  await committedSessionX.click()
  await expect(committedSessionX).toHaveAttribute('aria-current', 'true')
  await expect(page.getByRole('textbox', { name: '工作流输入内容' })).toHaveValue(
    '详情工作流输入',
  )
  await expect(page.getByText(WORKFLOW_ANSWER)).toBeVisible()
  await expect(committedToolX).toHaveClass(/bg-theme-light/)

  const workflowADetailResponse = page.waitForResponse(
    (response) =>
      response.url().includes(`/api/user/user/projectdetail/${RACE_WORKFLOW_SESSION_ID}`) &&
      response.status() === 200,
  )
  const workflowASchemaResponse = page.waitForResponse((response) => {
    if (!response.url().includes('/api/apicategories/apidetail')) return false
    const body = readPostBody(response.request())
    return (
      body !== null &&
      typeof body === 'object' &&
      'name' in body &&
      body.name === RACE_WORKFLOW_API_NAME
    )
  })
  await pendingWorkflowA.click()
  await workflowADetailResponse
  await expect(raceSchemaRequested).resolves.toBe(RACE_WORKFLOW_API_NAME)
  expect(raceSchemaRequestCount).toBe(1)
  await expect(pendingWorkflowA).toHaveAttribute('aria-busy', 'true')

  const sessionBFailureResponse = page.waitForResponse(
    (response) =>
      response.url().includes(`/api/user/user/projectdetail/${CHAT_SESSION_ID}`) &&
      response.status() === 500,
  )
  await failedSessionB.click()
  await sessionBFailureResponse

  try {
    await expect(page.getByRole('textbox', { name: '工作流输入内容' })).toHaveValue(
      '详情工作流输入',
    )
    await expect(page.getByText(WORKFLOW_ANSWER)).toBeVisible()
    await expect(committedToolX).toHaveClass(/bg-theme-light/)
  } finally {
    releaseRaceSchema()
  }
  await workflowASchemaResponse

  await expect(committedSessionX).toHaveAttribute('aria-current', 'true')
  await expect(pendingWorkflowA).not.toHaveAttribute('aria-current')
  await expect(failedSessionB).not.toHaveAttribute('aria-current')
  await expect(page.getByRole('textbox', { name: '工作流输入内容' })).toHaveValue(
    '详情工作流输入',
  )
  await expect(page.getByText(WORKFLOW_ANSWER)).toBeVisible()
  await expect(page.getByText(RACE_WORKFLOW_ANSWER)).toHaveCount(0)
  await expect(page.getByRole('textbox', { name: '竞态工作流 A 输入内容' })).toHaveCount(0)
  await expect(committedToolX).toHaveClass(/bg-theme-light/)
  await expect(pendingToolA).not.toHaveClass(/bg-theme-light/)
  await expect(page.getByRole('region', { name: '工作流工作区' })).toBeVisible()
  await expect(page.getByRole('region', { name: '对话工作区' })).toHaveCount(0)
  const successToasts = await page.evaluate(() => {
    const observedWindow = window as Window & { __sessionSuccessToasts?: string[] }
    return observedWindow.__sessionSuccessToasts ?? []
  })
  expect(raceSchemaRequestCount).toBe(1)
  expect(successToasts).toEqual([`会话"${WORKFLOW_TOOL}"加载成功`])
})

test('隐藏 chat mode 的会话不提交且不以旧聊天冒充新聊天', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'model-preference-storage',
      JSON.stringify({
        version: 0,
        state: {
          groupVisibility: {},
          toolVisibility: {},
          modelVisibility: {},
          chatTabVisibility: { image: false },
        },
      }),
    )
  })
  await seedAuthenticatedSession(page)
  await installSessionMocks(page)

  await page.goto('/workspace')
  await openIndependentHistory(page)
  const focusSession = page.getByRole('button', { name: new RegExp(`^${FOCUS_SESSION_TITLE}`) })
  const hiddenSession = page.getByRole('button', { name: new RegExp(`^${HIDDEN_SESSION_TITLE}`) })
  await focusSession.click()
  await expect(page.getByText(FOCUS_ANSWER)).toBeVisible()

  await hiddenSession.click()
  await expect(page.getByText('该历史会话所属的对话模式当前已隐藏，请先在模型设置中启用后再打开')).toBeVisible()
  await expect(focusSession).toHaveAttribute('aria-current', 'true')
  await expect(hiddenSession).not.toHaveAttribute('aria-current')
  await expect(page.getByText(FOCUS_ANSWER)).toBeVisible()
  await expect(page.getByText(HIDDEN_ANSWER)).toHaveCount(0)
  await expect(page.getByText(`会话"${HIDDEN_SESSION_TITLE}"加载成功`)).toHaveCount(0)
})

test('会话列表项目 7 与详情项目 33 冲突时快速双击只提交最新详情项目到工作区和聊天', async ({
  page,
}) => {
  let releaseStaleDetail = () => {}
  const waitForStaleDetail = new Promise<void>((resolve) => {
    releaseStaleDetail = resolve
  })
  await page.addInitScript(() => {
    const observedWindow = window as Window & { __sessionSuccessToasts?: string[] }
    observedWindow.__sessionSuccessToasts = []
    const seen = new WeakSet<Element>()
    const observer = new MutationObserver(() => {
      document.querySelectorAll('[role="alert"], [role="status"]').forEach((element) => {
        const text = element.textContent?.trim() ?? ''
        if (!text.includes('加载成功') || seen.has(element)) return
        seen.add(element)
        observedWindow.__sessionSuccessToasts?.push(text)
      })
    })
    observer.observe(document, { childList: true, subtree: true })
  })
  await seedAuthenticatedSession(page)
  await installSessionMocks(page, {
    waitForChatDetail: waitForStaleDetail,
    authorityProjectIds: true,
  })

  const projectSessionsResponse = page.waitForResponse((response) => {
    const url = new URL(response.url())
    return (
      url.pathname === '/api/user/user/projectlist' &&
      url.searchParams.get('folder_id') === String(LIST_PROJECT_ID)
    )
  })
  await page.goto('/workspace')
  await page.getByRole('button', { name: '项目管理' }).click()
  const listProject = page.getByRole('article', { name: `项目: ${LIST_PROJECT_NAME}` })
  const staleSession = listProject.getByRole('button', {
    name: new RegExp(`^${CHAT_SESSION_TITLE}`),
  })
  const latestSession = listProject.getByRole('button', {
    name: new RegExp(`^${FOCUS_SESSION_TITLE}`),
  })
  if (!(await staleSession.isVisible())) {
    await listProject.getByRole('button', { name: /2 个会话/ }).click()
  }
  await projectSessionsResponse
  await expect(staleSession).toBeVisible()
  await expect(latestSession).toBeVisible()
  const staleResponse = page.waitForResponse((response) =>
    response.url().includes(`/api/user/user/projectdetail/${CHAT_SESSION_ID}`),
  )
  await staleSession.click()
  await expect(staleSession).toHaveAttribute('aria-busy', 'true')

  const latestResponse = page.waitForResponse((response) =>
    response.url().includes(`/api/user/user/projectdetail/${FOCUS_SESSION_ID}`),
  )
  await latestSession.click()
  await latestResponse
  await expect(latestSession).toHaveAttribute('aria-current', 'true')
  await expect(page.getByText(FOCUS_ANSWER)).toBeVisible()

  releaseStaleDetail()
  await staleResponse
  await expect(latestSession).toHaveAttribute('aria-current', 'true')
  await expect(staleSession).not.toHaveAttribute('aria-current')
  await expect(page.getByText(FOCUS_ANSWER)).toBeVisible()
  await expect(page.getByText(CHAT_ANSWER)).toHaveCount(0)
  await expect(page.getByText(`会话"${CHAT_SESSION_TITLE}"加载成功`)).toHaveCount(0)
  const successToasts = await page.evaluate(() => {
    const observedWindow = window as Window & { __sessionSuccessToasts?: string[] }
    return observedWindow.__sessionSuccessToasts ?? []
  })
  expect(successToasts).toEqual([`会话"${FOCUS_SESSION_TITLE}"加载成功`])

  const chatSurface = page.getByRole('region', { name: '对话工作区' })
  await expect(chatSurface.getByTitle(DETAIL_PROJECT_NAME)).toHaveText(DETAIL_PROJECT_NAME)

  const authoritativeProject = page.getByRole('article', {
    name: `项目: ${DETAIL_PROJECT_NAME}`,
  })
  await expect(authoritativeProject).toHaveClass(/border-emerald-400/)
  await expect(
    page.getByRole('article', { name: `项目: ${LIST_PROJECT_NAME}` }),
  ).not.toHaveClass(/border-emerald-400/)
})

test('旧式会话缺失 type 但包含 conversation 时进入聊天表面', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 })
  await seedAuthenticatedSession(page)
  await seedWorkspaceUiState(page, {
    showSidebar: true,
    chatMode: 'off',
    chatOpen: false,
  })
  await installSessionMocks(page)

  await page.goto('/workspace')
  await openIndependentHistory(page)
  const legacySession = page.getByRole('button', { name: new RegExp(`^${LEGACY_SESSION_TITLE}`) })
  await legacySession.click()

  const chatSurface = page.getByRole('region', { name: '对话工作区' })
  await expect(chatSurface).toBeVisible()
  await expect(chatSurface).toBeFocused()
  await expect(page.getByText(LEGACY_ANSWER)).toBeVisible()
  await expect(page.getByRole('complementary', { name: '工具与历史记录侧栏' })).toHaveCount(0)
  await page.getByRole('button', { name: '显示侧边栏' }).click()
  await openIndependentHistory(page)
  await expect(legacySession).toHaveAttribute('aria-current', 'true')
})

test('会话仅在详情成功后提交，并在聊天与工作流表面之间一致切换', async ({ page }) => {
  let releaseChatDetail = () => {}
  let releaseWorkflowDetail = () => {}
  const waitForChatDetail = new Promise<void>((resolve) => {
    releaseChatDetail = resolve
  })
  const waitForWorkflowDetail = new Promise<void>((resolve) => {
    releaseWorkflowDetail = resolve
  })
  const apiDetailBodies: unknown[] = []

  await seedAuthenticatedSession(page)
  await installSessionMocks(page, {
    waitForChatDetail,
    waitForWorkflowDetail,
    apiDetailBodies,
  })

  await page.goto('/workspace')
  await openIndependentHistory(page)

  const chatSession = page.getByRole('button', { name: new RegExp(`^${CHAT_SESSION_TITLE}`) })
  const chatDetailResponse = page.waitForResponse((response) =>
    response.url().includes(`/api/user/user/projectdetail/${CHAT_SESSION_ID}`),
  )
  await chatSession.click()
  await expect(chatSession).toHaveAttribute('aria-busy', 'true')
  await expect(chatSession).not.toHaveAttribute('aria-current')
  await expect(page.getByText('正在加载', { exact: true })).toBeVisible()

  releaseChatDetail()
  await chatDetailResponse
  await expect(chatSession).toHaveAttribute('aria-current', 'true')
  await expect(chatSession).toHaveAttribute('aria-busy', 'false')
  await expect(page.getByText(CHAT_QUESTION)).toBeVisible()
  await expect(page.getByText(CHAT_ANSWER)).toBeVisible()

  await page.getByRole('button', { name: '设置对话栏为 Full' }).click()
  const chatPanel = page.getByRole('complementary').filter({ hasText: CHAT_ANSWER })
  await expect(chatPanel).toBeVisible()
  await page.getByRole('button', { name: '显示侧边栏' }).click()

  const workflowSession = page.locator('button[aria-busy]').filter({ hasText: WORKFLOW_TOOL })
  await expect(workflowSession).toBeVisible()
  const workflowDetailResponse = page.waitForResponse((response) =>
    response.url().includes(`/api/user/user/projectdetail/${WORKFLOW_SESSION_ID}`),
  )
  await workflowSession.click()
  await expect(workflowSession).toHaveAttribute('aria-busy', 'true')
  await expect(chatSession).toHaveAttribute('aria-current', 'true')
  await expect(page.getByText(CHAT_ANSWER)).toBeVisible()

  releaseWorkflowDetail()
  await workflowDetailResponse
  await expect(workflowSession).toHaveAttribute('aria-current', 'true')
  await expect(chatSession).not.toHaveAttribute('aria-current')
  await expect(page.getByText(WORKFLOW_ANSWER)).toBeVisible()
  await expect(page.getByText(CHAT_ANSWER)).toHaveCount(0)
  await expect(chatPanel).toHaveCount(0)

  expect(apiDetailBodies).toEqual([{ name: 'session-display-workflow-e2e' }])
})

test('横向分栏和窄屏中的输入区标题与操作项保持横排且不溢出', async ({
  page,
}, testInfo) => {
  await seedAuthenticatedSession(page)
  await installSessionMocks(page, { includeLayoutStressProject: true })
  await page.setViewportSize({ width: 1280, height: 720 })
  await page.goto('/workspace')
  await openIndependentHistory(page)

  const workflowSession = page.locator('button[aria-busy]').filter({ hasText: WORKFLOW_TOOL })
  await expect(workflowSession).toBeVisible()
  const workflowDetailResponse = page.waitForResponse((response) =>
    response.url().includes(`/api/user/user/projectdetail/${WORKFLOW_SESSION_ID}`),
  )
  await workflowSession.click()
  await workflowDetailResponse
  await expect(page.getByText(WORKFLOW_ANSWER)).toBeVisible()

  const projectSelect = page.getByRole('combobox', { name: '选择关联项目' })
  await projectSelect.selectOption(String(LAYOUT_STRESS_PROJECT_ID))
  await expect(projectSelect).toHaveValue(String(LAYOUT_STRESS_PROJECT_ID))

  const title = page.getByText('输入材料 - 工作流输入', { exact: true })
  const newSessionButton = page.getByRole('button', { name: '新会话' })
  await expect(title).toBeVisible()
  await expect(newSessionButton).toBeVisible()

  const assertHeaderGeometry = async (viewport: { width: number; height: number }) => {
    const metrics = await title.evaluate((titleElement) => {
      const header = titleElement.closest('.sticky')?.querySelector<HTMLElement>('.border-b')
      const newSession = document.querySelector<HTMLElement>('button[aria-label="新会话"]')
      if (!header || !newSession) throw new Error('输入区标题栏几何节点缺失')

      const titleRect = titleElement.getBoundingClientRect()
      const newSessionRect = newSession.getBoundingClientRect()
      return {
        title: { width: titleRect.width, height: titleRect.height },
        newSession: { width: newSessionRect.width, height: newSessionRect.height },
        headerClientWidth: header.clientWidth,
        headerScrollWidth: header.scrollWidth,
      }
    })

    expect(metrics.title.height).toBeLessThanOrEqual(24)
    expect(metrics.title.width).toBeGreaterThan(metrics.title.height * 3)
    expect(metrics.newSession.height).toBeLessThanOrEqual(40)
    expect(metrics.newSession.width).toBeGreaterThan(metrics.newSession.height)
    expect(metrics.headerScrollWidth).toBeLessThanOrEqual(metrics.headerClientWidth)

    await testInfo.attach(`input-section-header-${viewport.width}x${viewport.height}`, {
      body: await page.screenshot(),
      contentType: 'image/png',
    })
  }

  await assertHeaderGeometry({ width: 1280, height: 720 })
  await page.getByRole('button', { name: '隐藏侧边栏' }).click()
  await page.getByRole('button', { name: '设置对话栏为 Off' }).click()

  for (const viewport of [
    { width: 375, height: 812 },
    { width: 320, height: 800 },
  ]) {
    await page.setViewportSize(viewport)
    await expect(title).toBeVisible()
    await expect(newSessionButton).toBeVisible()
    await assertHeaderGeometry(viewport)
  }
})

test('320px 全屏聊天受视口约束，返回桌面后恢复独立的用户宽度偏好', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 320, height: 800 })
  await seedAuthenticatedSession(page)
  await page.addInitScript(() => {
    localStorage.setItem(
      'workspace-ui-storage',
      JSON.stringify({
        version: 1,
        state: {
          showSidebar: true,
          chatOpen: false,
          chatMode: 'off',
          leftWidth: 320,
          preferredChatWidth: 520,
          layoutMode: 'auto',
          tooltipsEnabled: true,
        },
      }),
    )
  })
  await installSessionMocks(page)

  await page.goto('/workspace')
  await openIndependentHistory(page)
  const chatSession = page.getByRole('button', { name: new RegExp(`^${CHAT_SESSION_TITLE}`) })
  await chatSession.click()

  const chatPanel = page.getByRole('complementary').filter({ hasText: CHAT_ANSWER })
  await expect(chatPanel).toBeVisible()
  await expect(page.getByText(CHAT_ANSWER)).toBeVisible()
  const compactBox = await chatPanel.boundingBox()
  expect(compactBox).not.toBeNull()
  expect(compactBox!.x).toBeGreaterThanOrEqual(0)
  expect(compactBox!.x + compactBox!.width).toBeLessThanOrEqual(320)
  expect(compactBox!.width).toBeLessThanOrEqual(288)
  await expect(page.getByRole('separator', { name: '调整对话框宽度' })).toHaveCount(0)
  await page.screenshot({ path: testInfo.outputPath('workspace-session-display-320x800.png') })

  await page.setViewportSize({ width: 375, height: 812 })
  const mediumCompactBox = await chatPanel.boundingBox()
  expect(mediumCompactBox).not.toBeNull()
  expect(mediumCompactBox!.x).toBeGreaterThanOrEqual(0)
  expect(mediumCompactBox!.x + mediumCompactBox!.width).toBeLessThanOrEqual(375)
  expect(mediumCompactBox!.width).toBeLessThanOrEqual(343)
  await page.screenshot({ path: testInfo.outputPath('workspace-session-display-375x812.png') })

  await page.setViewportSize({ width: 1280, height: 720 })
  await page.getByRole('button', { name: '设置对话栏为 On' }).click()
  await expect.poll(async () => (await chatPanel.boundingBox())?.width).toBe(448)
  await page.getByRole('button', { name: '隐藏侧边栏' }).click()
  await expect.poll(async () => (await chatPanel.boundingBox())?.width).toBe(520)
  const separator = page.getByRole('separator', { name: '调整对话框宽度' })
  await separator.focus()
  await expect(separator).toBeFocused()
  await expect(separator).toHaveAttribute('aria-valuenow', '520')
  await page.keyboard.press('ArrowRight')
  await expect(separator).toHaveAttribute('aria-valuenow', '496')
  await page.keyboard.press('ArrowLeft')
  await expect(separator).toHaveAttribute('aria-valuenow', '520')
  const persistedPreference = await page.evaluate(() => {
    const raw = localStorage.getItem('workspace-ui-storage')
    return raw ? JSON.parse(raw).state.preferredChatWidth : null
  })
  expect(persistedPreference).toBe(520)
  await page.screenshot({ path: testInfo.outputPath('workspace-session-display-1280x720.png') })
})

test('320px/375px Workspace Toast 不遮挡对话底部操作', async ({ page }, testInfo) => {
  await seedAuthenticatedSession(page)
  await seedWorkspaceUiState(page, {
    showSidebar: true,
    chatMode: 'off',
    chatOpen: false,
  })
  await installSessionMocks(page)

  for (const viewport of [
    { width: 320, height: 800 },
    { width: 375, height: 812 },
  ]) {
    await page.setViewportSize(viewport)
    await page.goto('/workspace')
    await openIndependentHistory(page)
    await page.getByRole('button', { name: new RegExp(`^${CHAT_SESSION_TITLE}`) }).click()

    const toast = page
      .getByRole('alert')
      .filter({ hasText: `会话"${CHAT_SESSION_TITLE}"加载成功` })
    await expect(toast).toBeVisible()
    await expectSurfaceWithinViewport(toast, viewport)

    const criticalActions = [
      page.getByRole('button', { name: '搜索对话' }),
      page.getByRole('button', { name: '导出对话' }),
      page.getByRole('button', { name: '清空对话' }),
      page.getByRole('button', { name: '打开指令库' }),
    ]
    for (const action of criticalActions) {
      await expect(action).toBeVisible()
      await expectLocatorsNotToIntersect(toast, action)
    }

    const instructionButton = page.getByRole('button', { name: '打开指令库' })
    await instructionButton.focus()
    await expect(instructionButton).toBeFocused()
    await instructionButton.click({ trial: true })

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    )
    expect(hasHorizontalOverflow).toBe(false)
    await page.screenshot({
      path: testInfo.outputPath(`global-toast-${viewport.width}x${viewport.height}.png`),
    })
  }

  await page.setViewportSize({ width: 1280, height: 720 })
  await page.goto('/workspace')
  await openIndependentHistory(page)
  await page.getByRole('button', { name: new RegExp(`^${CHAT_SESSION_TITLE}`) }).click()
  const desktopToast = page
    .getByRole('alert')
    .filter({ hasText: `会话"${CHAT_SESSION_TITLE}"加载成功` })
  await expect(desktopToast).toBeVisible()
  await expect
    .poll(async () => {
      const box = await desktopToast.boundingBox()
      return box ? Math.abs(1280 - (box.x + box.width) - 16) : Number.POSITIVE_INFINITY
    })
    .toBeLessThanOrEqual(1)
  await expect
    .poll(async () => {
      const box = await desktopToast.boundingBox()
      return box ? Math.abs(720 - (box.y + box.height) - 16) : Number.POSITIVE_INFINITY
    })
    .toBeLessThanOrEqual(1)
  await page.screenshot({ path: testInfo.outputPath('global-toast-1280x720.png') })
})
