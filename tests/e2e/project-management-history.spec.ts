import { expect, test } from './fixtures/diagnostic-test'
import {
  installStrictWorkspaceApiMock,
  seedAuthenticatedSession,
} from './helpers/workspace-api-mock'

const PROJECT_ID = 7
const DETAIL_PROJECT_ID = 33
const PROJECT_NAME = 'E2E项目-历史场景'
const PROJECT_SESSION_ID = 9201
const PROJECT_SESSION_TITLE = '项目管理历史：复现渲染'
const SECOND_PROJECT_SESSION_ID = 9202
const SECOND_PROJECT_SESSION_TITLE = '项目管理历史：最终点击'
const PROJECT_SESSION_COUNT_TEXT = '2 个会话'
const PROJECT_IMAGE_PATH = '/files/e2e/project-result.png'
const PROJECT_IMAGE_BYTES = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAMAAABFaP0WAAAAA1BMVEUAAACnej3aAAAAAXRSTlMAQObYZgAAABhJREFUCNdjYGRiYMAAAB8AAc4BqY3AAAAAElFTkSuQmCC',
  'base64',
)
const PROJECT_MGMT_E2E_DEBUG = process.env.PROJECT_MGMT_E2E_DEBUG === '1'

function debugProjectMgmtE2E(...args: unknown[]) {
  if (PROJECT_MGMT_E2E_DEBUG) {
    console.warn(...args)
  }
}

function buildProjectListResponse(
  folderId: string | null,
  deletedSessionIds: ReadonlySet<number> = new Set(),
) {
  if (folderId === `${PROJECT_ID}`) {
    const items = [
      {
        id: PROJECT_SESSION_ID,
        name: PROJECT_SESSION_TITLE,
        title: PROJECT_SESSION_TITLE,
        api_name: PROJECT_SESSION_TITLE,
        user_id: 1,
        folder_id: PROJECT_ID,
        created_at: '2026-06-12T10:00:00.000Z',
        type: 1,
        answer_text: '生成完成',
        inputs: JSON.stringify({
          type: 2,
          query: 'project management test',
          conversation_id: 'conv-project-mgmt-e2e',
        }),
        file_url: PROJECT_IMAGE_PATH,
      },
      {
        id: SECOND_PROJECT_SESSION_ID,
        name: SECOND_PROJECT_SESSION_TITLE,
        title: SECOND_PROJECT_SESSION_TITLE,
        api_name: SECOND_PROJECT_SESSION_TITLE,
        user_id: 1,
        folder_id: PROJECT_ID,
        created_at: '2026-06-12T10:01:00.000Z',
        type: 1,
        answer_text: '第二条生成完成',
        inputs: JSON.stringify({
          type: 2,
          query: 'project management final click test',
          conversation_id: 'conv-project-mgmt-e2e-final',
        }),
        file_url: PROJECT_IMAGE_PATH,
      },
    ].filter((item) => !deletedSessionIds.has(item.id))

    return {
      total: items.length,
      items,
    }
  }

  // 独立会话列表：本场景下不展示
  return {
    total: 0,
    items: [],
  }
}

function buildProjectDetailResponse(sessionId: number | string) {
  if (String(sessionId) === String(SECOND_PROJECT_SESSION_ID)) {
    return {
      id: SECOND_PROJECT_SESSION_ID,
      user_id: 1,
      folder_id: DETAIL_PROJECT_ID,
      api_name: SECOND_PROJECT_SESSION_TITLE,
      type: 1,
      created_at: '2026-06-12T10:01:00.000Z',
      answer_text: `### 第二条最终内容

最后一次点击应该显示这条历史记录。`,
      file_url: PROJECT_IMAGE_PATH,
      file_output: [
        {
          filename: 'project-result.png',
          download_url: PROJECT_IMAGE_PATH,
        },
      ],
      inputs: JSON.stringify({
        type: 2,
        query: 'project management final click test',
        conversation_id: 'conv-project-mgmt-e2e-final',
      }),
    }
  }

  if (String(sessionId) !== String(PROJECT_SESSION_ID)) {
    return { code: 404, message: 'not found' }
  }

  return {
    id: PROJECT_SESSION_ID,
    user_id: 1,
    folder_id: DETAIL_PROJECT_ID,
    api_name: PROJECT_SESSION_TITLE,
    type: 1,
    created_at: '2026-06-12T10:00:00.000Z',
    answer_text: `### 项目管理历史复现

\`\`\`mermaid
graph TD
A[输入] --> B[渲染测试]
B --> C[成功]
\`\`\`

![项目还原图](${PROJECT_IMAGE_PATH})`,
    file_url: PROJECT_IMAGE_PATH,
    file_output: [
      {
        filename: 'project-result.png',
        download_url: PROJECT_IMAGE_PATH,
      },
    ],
    inputs: JSON.stringify({
      type: 2,
      query: 'project management test',
      conversation_id: 'conv-project-mgmt-e2e',
    }),
  }
}

test('项目管理中的会话历史恢复后应落到右侧 ContentRenderer 渲染流程', async ({ page }) => {
  let delayedProjectDetailSessionId: number | null = null
  const deletedSessionIds = new Set<number>()
  const legacySessionDeleteRequests: string[] = []
  const projectDeleteRequests: string[] = []
  let legacySessionDeleteAttempts = 0

  page.on('request', (request) => {
    const { pathname } = new URL(request.url())
    const method = request.method().toUpperCase()
    if (method === 'GET' && pathname.includes('/api/user/user/workflowdelete/')) {
      legacySessionDeleteRequests.push(pathname)
    }
    if (method === 'DELETE' && pathname.startsWith('/api/projects/')) {
      projectDeleteRequests.push(pathname)
    }
  })

  await seedAuthenticatedSession(page, {
    token: 'project-management-e2e-token',
    user: {
      username: '项目管理历史 e2e',
      email: 'project-mgmt-e2e@example.com',
    },
  })
  await page.addInitScript(() => {
    localStorage.setItem('debugWorkspaceSessionClick', '1')
    sessionStorage.setItem('debugWorkspaceSessionClick', '1')
    ;(
      window as Window & {
        __workspaceSessionClickDebugEvents?: Array<{
          message: string
          detail: Record<string, unknown>
        }>
      }
    ).__workspaceSessionClickDebugEvents = []
  })

  await installStrictWorkspaceApiMock(page)

  await page.route('**/api/user/**', async (route) => {
    const request = route.request()
    const method = request.method().toUpperCase()
    const requestUrl = new URL(request.url())
    const { pathname, searchParams } = requestUrl

    if (method === 'GET' && pathname === '/api/user/detail') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 1,
          user_id: 1,
          username: '项目管理历史 e2e',
          avatar: '',
          phone: '13800000000',
          email: 'project-mgmt-e2e@example.com',
          balance: 0,
          invite_code: 'E2EPM',
        }),
      })
      return
    }

    if (method === 'GET' && pathname === '/api/apicategories/detail') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          文案创作: [
            {
              id: 1,
              name: '语义生图',
              group: '文案创作',
              sort: 1,
              is_active: true,
              apis: [],
            },
          ],
        }),
      })
      return
    }

    if (method === 'GET' && pathname === '/api/apicategories/instructionlist') {
      const type = searchParams.get('type')
      if (type === '1') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            items: [
              {
                id: 101,
                name: '语法支持',
                prompt: '请你帮助完善指令',
              },
            ],
            total: 1,
          }),
        })
        return
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      })
      return
    }

    if (method === 'GET' && pathname === '/api/apicategories/configdetail') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ item: [] }),
      })
      return
    }

    if (method === 'GET' && pathname === '/api/apicategories/chatflowprompt') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [] }),
      })
      return
    }

    if (
      method === 'GET' &&
      (pathname === '/api/user/user/folderlist' || pathname === '/api/user/folderlist')
    ) {
      const keyword = searchParams.get('keyword')?.trim() ?? ''
      const archive = searchParams.get('archive')
      const isArchived = archive === '1'
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          total: 2,
          items: [
            {
              id: PROJECT_ID,
              name: PROJECT_NAME,
              coustomer_name: '测试客户',
              user_id: 1,
              parent_id: 0,
              created_at: '2026-01-01T00:00:00.000Z',
              status: isArchived ? 1 : 0,
              child_count: 0,
              session_count: keyword ? 2 : 2,
            },
            {
              id: DETAIL_PROJECT_ID,
              name: '详情权威项目',
              coustomer_name: '详情客户',
              user_id: 1,
              parent_id: 0,
              created_at: '2026-01-01T00:00:00.000Z',
              status: isArchived ? 1 : 0,
              child_count: 0,
              session_count: 0,
            },
          ],
        }),
      })
      return
    }

    if (
      method === 'GET' &&
      (pathname === '/api/user/user/folderdetail' ||
        pathname.startsWith('/api/user/user/folderdetail/'))
    ) {
      const projectIdMatch = pathname.match(/\/folderdetail\/(\d+)$/)
      const folderId = projectIdMatch ? projectIdMatch[1] : `${PROJECT_ID}`
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: Number(folderId),
          name: PROJECT_NAME,
          session_count: 2,
          project_count: 1,
          user_id: 1,
          parent_id: 0,
        }),
      })
      return
    }

    if (method === 'GET' && pathname === '/api/user/user/projectlist') {
      const folderId = searchParams.get('folder_id')
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(buildProjectListResponse(folderId, deletedSessionIds)),
      })
      return
    }

    if (method === 'GET' && /\/api\/user\/user\/projectdetail\//.test(pathname)) {
      const matched = pathname.match(/\/projectdetail\/(\d+)$/)
      const detailId = matched ? matched[1] : ''
      if (String(detailId) === String(delayedProjectDetailSessionId)) {
        await new Promise((resolve) => setTimeout(resolve, 600))
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(buildProjectDetailResponse(detailId)),
      })
      return
    }

    if (
      method === 'GET' &&
      pathname === `/api/user/user/workflowdelete/${SECOND_PROJECT_SESSION_ID}`
    ) {
      legacySessionDeleteAttempts += 1
      if (legacySessionDeleteAttempts === 1) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ code: 500, msg: '删除失败', data: null }),
        })
        return
      }
      deletedSessionIds.add(SECOND_PROJECT_SESSION_ID)
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ code: 0, msg: '删除成功', data: null }),
      })
      return
    }

    if (method === 'GET' && pathname === '/api/user/user/workflowupd') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ code: 0 }),
      })
      return
    }

    await route.fallback()
  })

  await page.route('**/api/apicategories/**', async (route) => {
    const request = route.request()
    const method = request.method().toUpperCase()
    const requestUrl = new URL(request.url())
    const { pathname, searchParams } = requestUrl
    if (method === 'GET' && pathname === '/api/apicategories/detail') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          文案创作: [
            {
              id: 1,
              name: '语义生图',
              group: '文案创作',
              sort: 1,
              is_active: true,
              apis: [],
            },
          ],
        }),
      })
      return
    }

    if (method === 'GET' && pathname === '/api/apicategories/configdetail') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ item: [] }),
      })
      return
    }

    if (method === 'GET' && pathname === '/api/apicategories/instructionlist') {
      const type = searchParams.get('type')
      if (type === '1') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            items: [
              {
                id: 101,
                name: '语法支持',
                prompt: '请你帮助完善指令',
              },
            ],
            total: 1,
          }),
        })
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        })
      }
      return
    }

    await route.fallback()
  })

  await page.route(`**${PROJECT_IMAGE_PATH}`, async (route) => {
    if (route.request().method().toUpperCase() !== 'GET') {
      await route.fallback()
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'image/png',
      body: PROJECT_IMAGE_BYTES,
    })
  })

  await page.goto('/workspace')
  const storageBeforeAssertion = await page.evaluate(() => ({
    pathname: window.location.pathname,
    authToken: sessionStorage.getItem('auth_access_token_v1'),
    legacyAuthToken: localStorage.getItem('auth_access_token_v1'),
    user: localStorage.getItem('user'),
  }))
  debugProjectMgmtE2E('[ProjectMgmtE2E] Boot storage state:', storageBeforeAssertion)
  const pageText = await page.locator('body').innerText()
  debugProjectMgmtE2E('[ProjectMgmtE2E] Body preview:', pageText.slice(0, 600))

  await expect(page.getByText('绿洲慧写 · 工作区')).toBeVisible()
  await expect(page.getByRole('button', { name: '项目管理' })).toBeVisible()

  await expect(page.getByRole('button', { name: '独立会话历史' })).toBeVisible()
  const projectListResponse = page.waitForResponse(
    (response) =>
      response.url().includes('/api/user/user/projectlist') &&
      response.status() === 200 &&
      searchParamsContains(response.url(), PROJECT_ID),
  )
  await page.getByRole('button', { name: '项目管理' }).click()
  debugProjectMgmtE2E(
    '[ProjectMgmtE2E] After click project tab body:',
    (await page.locator('body').innerText()).slice(0, 600),
  )
  const projectButtons = page.getByRole('button', { name: /E2E项目/ })
  debugProjectMgmtE2E('[ProjectMgmtE2E] Project-like buttons count:', await projectButtons.count())
  const projectButtonText = await projectButtons.allTextContents()
  debugProjectMgmtE2E(
    '[ProjectMgmtE2E] Project-like button texts:',
    JSON.stringify(projectButtonText),
  )

  await expect(page.getByText('进行中')).toBeVisible()

  const projectButton = page.locator(`text="${PROJECT_NAME}"`).first()
  const projectLoadButton = page.locator(`text="${PROJECT_SESSION_COUNT_TEXT}"`).first()
  await expect(page.getByRole('button', { name: PROJECT_IMAGE_PATH })).toHaveCount(0)
  await expect(projectButton).toBeVisible()
  await expect(projectLoadButton).toBeVisible()

  debugProjectMgmtE2E(
    '[ProjectMgmtE2E] Project button count before click:',
    await page.getByRole('button').count(),
  )
  debugProjectMgmtE2E(
    '[ProjectMgmtE2E] Project button sample texts:',
    JSON.stringify(
      await page
        .getByRole('button')
        .allTextContents()
        .then((items) => items.slice(0, 30)),
    ),
  )
  const rawSessionExpanders = await page
    .locator(`text="${PROJECT_SESSION_COUNT_TEXT}"`)
    .allTextContents()
  debugProjectMgmtE2E(
    '[ProjectMgmtE2E] pre-click 1个会话 node texts:',
    JSON.stringify(rawSessionExpanders),
  )

  const expandedControl = page
    .locator('button[aria-expanded="true"]')
    .filter({ hasText: /会话|加载/ })
  if ((await expandedControl.count()) === 0) {
    await projectLoadButton.click({ force: true })
  }
  await projectListResponse
  const projectLoadRequest = page
    .locator('button[aria-expanded="true"]')
    .filter({ hasText: /会话|加载/ })
  const hasExpanded = (await projectLoadRequest.count()) > 0
  debugProjectMgmtE2E('[ProjectMgmtE2E] Expanded controls count:', await projectLoadRequest.count())
  if (!hasExpanded) {
    const projectButtonsAfterState = await page.getByRole('button').allTextContents()
    debugProjectMgmtE2E(
      '[ProjectMgmtE2E] Project button texts after click:',
      JSON.stringify(projectButtonsAfterState),
    )
  } else {
    debugProjectMgmtE2E(
      '[ProjectMgmtE2E] Expanded controls:',
      await projectLoadRequest.allTextContents(),
    )
  }
  const projectCardButtons = page.getByRole('button')
  debugProjectMgmtE2E(
    '[ProjectMgmtE2E] project card buttons:',
    await projectCardButtons.allTextContents(),
  )
  const sessionButton = page.getByRole('button', { name: new RegExp(`^${PROJECT_SESSION_TITLE}`) })
  await expect(sessionButton).toBeVisible({ timeout: 10_000 })

  const rawProjectSessions = await sessionButton
    .locator('..')
    .locator('..')
    .locator('button')
    .allTextContents()
  debugProjectMgmtE2E('[ProjectMgmtE2E] Session list sibling buttons:', rawProjectSessions)

  const detailLoad = page.waitForResponse(
    (response) =>
      response.url().includes(`/api/user/user/projectdetail/${PROJECT_SESSION_ID}`) &&
      response.status() === 200,
  )
  await sessionButton.click()
  await detailLoad

  await expect(sessionButton).toHaveAttribute('aria-current', 'true')
  debugProjectMgmtE2E(
    '[ProjectMgmtE2E] After detail load selected status:',
    await sessionButton.getAttribute('aria-current'),
  )
  const afterSessionBody = await page.locator('body').innerText()
  debugProjectMgmtE2E('[ProjectMgmtE2E] After session click body:', afterSessionBody.slice(0, 1200))
  debugProjectMgmtE2E(
    '[ProjectMgmtE2E] mermaid/chat/image selectors:',
    JSON.stringify({
      mermaidCount: await page.locator('.mermaid-chart-container').count(),
      imageByAltCount: await page.getByRole('img', { name: '项目还原图' }).count(),
      toastVisibleCount: await page.getByText(`会话"${PROJECT_SESSION_TITLE}"加载成功`).count(),
      contentRendererCount: await page.locator('.content-renderer').count(),
    }),
  )

  const sessionClickEventLogs = await page.evaluate(() => {
    const debugWindow = window as Window & {
      __workspaceSessionClickDebugEvents?: Array<{
        message?: string
        detail?: unknown
      }>
    }
    return (debugWindow.__workspaceSessionClickDebugEvents ?? []).map((item) => {
      const detailText = item.detail ? JSON.stringify(item.detail) : ''
      return `[session-click-debug] ${item.message ?? ''} ${detailText}`.trim()
    })
  })
  const normalizedDebugLogs = sessionClickEventLogs.map((item) => item.trim())
  const uniqueDebugLogs = new Set(normalizedDebugLogs)
  const branchStates = {
    workflow: normalizedDebugLogs.some((line) => line.includes('session click branch workflow')),
    chatflow: normalizedDebugLogs.some((line) => line.includes('session click branch chatflow')),
    fallback: normalizedDebugLogs.some((line) => line.includes('session click branch fallback')),
  }
  const hasSessionBranchLog =
    branchStates.workflow || branchStates.chatflow || branchStates.fallback
  debugProjectMgmtE2E(
    '[ProjectMgmtE2E] Session branch logs:',
    JSON.stringify(branchStates, null, 2),
  )
  debugProjectMgmtE2E(
    '[ProjectMgmtE2E] All session-click debug logs:',
    JSON.stringify(normalizedDebugLogs, null, 2),
  )
  expect(uniqueDebugLogs.size).toBe(normalizedDebugLogs.length)
  expect(normalizedDebugLogs.length).toBeGreaterThan(0)
  expect(normalizedDebugLogs.some((line) => line.includes('session click start'))).toBe(true)
  expect(
    normalizedDebugLogs.some(
      (line) => line.includes('session click start') && line.includes('"projectId":33'),
    ),
  ).toBe(true)
  expect(hasSessionBranchLog).toBe(true)

  await expect(page.locator('.mermaid-chart-container')).toBeVisible({ timeout: 10_000 })
  const imageNode = page.getByRole('img', { name: '项目还原图' })
  await expect(imageNode).toBeVisible()
  await expect(imageNode).toHaveAttribute('src', new RegExp(PROJECT_IMAGE_PATH.replace('/', '\\/')))

  const secondSessionButton = page.getByRole('button', {
    name: new RegExp(`^${SECOND_PROJECT_SESSION_TITLE}`),
  })
  await expect(secondSessionButton).toBeVisible({ timeout: 10_000 })

  delayedProjectDetailSessionId = PROJECT_SESSION_ID
  const staleDetailAfterRapidClick = page.waitForResponse(
    (response) =>
      response.url().includes(`/api/user/user/projectdetail/${PROJECT_SESSION_ID}`) &&
      response.status() === 200,
  )
  const latestDetailAfterRapidClick = page.waitForResponse(
    (response) =>
      response.url().includes(`/api/user/user/projectdetail/${SECOND_PROJECT_SESSION_ID}`) &&
      response.status() === 200,
  )

  await sessionButton.click()
  await secondSessionButton.click()
  await latestDetailAfterRapidClick
  await staleDetailAfterRapidClick
  delayedProjectDetailSessionId = null

  await expect(secondSessionButton).toHaveAttribute('aria-current', 'true')
  await expect(page.getByText('第二条最终内容')).toBeVisible({ timeout: 10_000 })
  await expect(page.getByText('最后一次点击应该显示这条历史记录。')).toBeVisible()
  await expect(page.getByText('项目管理历史复现')).toHaveCount(0)
  await expect(page.getByRole('button', { name: '下载文件', exact: true })).toBeEnabled()

  await sessionButton.focus()
  await page.keyboard.press('Tab')
  const inactiveMenuButton = page.getByRole('button', {
    name: `打开会话菜单：${PROJECT_SESSION_TITLE}`,
  })
  await expect(inactiveMenuButton).toBeFocused()
  await expect(inactiveMenuButton).toHaveCSS('opacity', '1')
  await page.keyboard.press('Enter')
  await expect(page.getByRole('menu', { name: `会话操作：${PROJECT_SESSION_TITLE}` })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(inactiveMenuButton).toBeFocused()

  await page.getByRole('button', { name: `打开会话菜单：${SECOND_PROJECT_SESSION_TITLE}` }).click()
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('menuitem', { name: '导出会话' }).click()
  const download = await downloadPromise

  expect(download.suggestedFilename()).toMatch(/\.zip$/)
  await expect(page.getByText(`会话"${SECOND_PROJECT_SESSION_TITLE}"导出成功`)).toBeVisible()

  await page.getByRole('button', { name: `打开会话菜单：${SECOND_PROJECT_SESSION_TITLE}` }).click()
  await page.getByRole('menuitem', { name: '删除会话' }).click()
  const deleteDialog = page.getByRole('dialog', { name: '删除会话' })
  await expect(deleteDialog).toBeVisible()
  const legacyDeleteResponse = page.waitForResponse(
    (response) =>
      response.url().includes(`/api/user/user/workflowdelete/${SECOND_PROJECT_SESSION_ID}`) &&
      response.status() === 200,
  )
  await deleteDialog.getByRole('button', { name: '确认', exact: true }).click()
  await legacyDeleteResponse

  await expect(page.getByText('删除会话失败，请稍后重试')).toBeVisible()
  await expect(deleteDialog).toBeHidden()
  await expect(secondSessionButton).toHaveCount(1)
  expect(legacySessionDeleteRequests).toEqual([
    `/api/user/user/workflowdelete/${SECOND_PROJECT_SESSION_ID}`,
  ])
  expect(projectDeleteRequests).toEqual([])

  await page.getByRole('button', { name: `打开会话菜单：${SECOND_PROJECT_SESSION_TITLE}` }).click()
  await page.getByRole('menuitem', { name: '删除会话' }).click()
  await expect(deleteDialog).toBeVisible()
  const successfulLegacyDeleteResponse = page.waitForResponse(
    (response) =>
      response.url().includes(`/api/user/user/workflowdelete/${SECOND_PROJECT_SESSION_ID}`) &&
      response.status() === 200,
  )
  await deleteDialog.getByRole('button', { name: '确认', exact: true }).click()
  await successfulLegacyDeleteResponse

  await expect(page.getByText(`会话"${SECOND_PROJECT_SESSION_TITLE}"已删除`)).toBeVisible()
  await expect(deleteDialog).toBeHidden()
  await expect(secondSessionButton).toHaveCount(0)
  expect(legacySessionDeleteRequests).toEqual([
    `/api/user/user/workflowdelete/${SECOND_PROJECT_SESSION_ID}`,
    `/api/user/user/workflowdelete/${SECOND_PROJECT_SESSION_ID}`,
  ])
  expect(projectDeleteRequests).toEqual([])
})

function searchParamsContains(url: string, projectId: number) {
  const parsed = new URL(url)
  return parsed.searchParams.get('folder_id') === String(projectId)
}
