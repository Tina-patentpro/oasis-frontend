import type { Locator, Page } from 'playwright/test'

import { expect, test } from './fixtures/diagnostic-test'
import {
  installStrictWorkspaceApiMock,
  seedAuthenticatedSession,
  type StrictApiFixture,
} from './helpers/workspace-api-mock'

const TOKEN_STORAGE_KEY = 'auth_access_token_v1'

const userDetail = {
  id: 1,
  user_id: 1,
  username: '端到端用户',
  avatar: '',
  phone: '13800000000',
  email: 'e2e@example.com',
  balance: 0,
  invite_code: 'E2E001',
}

async function installWorkspaceApiMocks(
  page: Page,
  options: { userDetailStatus?: number; allowPasswordLogin?: boolean } = {},
) {
  const fixtures: StrictApiFixture[] = [
    {
      method: 'GET',
      path: '/api/user/detail',
      respond: () => ({
        status: options.userDetailStatus ?? 200,
        body:
          options.userDetailStatus === 401 ? { detail: '登录状态已过期' } : userDetail,
      }),
    },
    {
      method: 'GET',
      path: '/api/apicategories/detail',
      respond: () => ({
        body: {
          工作聚焦: [
            {
              id: 1,
              name: '专利优化',
              group: '工作聚焦',
              sort: 1,
              is_active: true,
              apis: [],
            },
          ],
        },
      }),
    },
  ]

  if (options.allowPasswordLogin) {
    fixtures.push({
      method: 'POST',
      path: '/api/auth/pwdlogin',
      respond: () => ({
        body: {
          code: 0,
          msg: 'success',
          data: {
          id: 1,
          username: userDetail.username,
          phone: userDetail.phone,
          balance: 0,
          invite_code: userDetail.invite_code,
          token: 'test-token-123',
          register_time: '2026-01-01T00:00:00.000Z',
            last_login_time: '2026-07-13T00:00:00.000Z',
          },
        },
      }),
    })
  }

  await installStrictWorkspaceApiMock(page, fixtures)
}

async function expectWithinViewport(locator: Locator, page: Page) {
  const box = await locator.boundingBox()
  const viewport = page.viewportSize()
  expect(box).not.toBeNull()
  expect(viewport).not.toBeNull()
  expect(box!.x).toBeGreaterThanOrEqual(0)
  expect(box!.y).toBeGreaterThanOrEqual(0)
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport!.width)
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport!.height)
}

test('未登录访问工作区会跳转登录页', async ({ page }) => {
  await installWorkspaceApiMocks(page)

  await page.goto('/workspace')

  await expect(page).toHaveURL(/\/auth\/login/)
  await expect(page.getByRole('button', { name: '登录账号' })).toBeVisible()
})

test('契约化 Mock 下登录态工作区保持可用且不访问真实后端', async ({ page }) => {
  await seedAuthenticatedSession(page, { token: 'test-token-123', user: userDetail })
  await installWorkspaceApiMocks(page)

  await page.goto('/workspace')

  await expect(page.getByRole('navigation')).toBeVisible()
  await expect(page.getByRole('button', { name: '用户菜单' })).toBeVisible()
  await page.waitForLoadState('networkidle')
})

test('任一受保护启动请求返回 401 时清除会话并回到登录页', async ({
  page,
  diagnostics,
}) => {
  diagnostics.expect({
    kind: 'http',
    method: 'GET',
    pathname: /^\/api\/user\/detail$/,
    status: 401,
    minOccurrences: 1,
    maxOccurrences: 1,
  })
  diagnostics.expect({
    kind: 'console',
    level: 'error',
    sourcePathname: /^\/api\/user\/detail$/,
    message: /Failed to load resource.*401/i,
    minOccurrences: 0,
    maxOccurrences: 1,
  })
  diagnostics.expect({
    kind: 'requestfailed',
    method: 'GET',
    pathname: /^\/api\/user\/usermessagelist$/,
    failureText: /net::ERR_ABORTED/,
    minOccurrences: 0,
    maxOccurrences: 1,
  })
  await seedAuthenticatedSession(page, { token: 'test-token-123', user: userDetail })
  await installWorkspaceApiMocks(page, { userDetailStatus: 401 })

  await page.goto('/workspace')

  await expect(page).toHaveURL(/\/auth\/login/)
  await expect(page.getByRole('button', { name: '登录账号' })).toBeVisible()
  const storage = await page.evaluate((storageKey) => ({
    sessionToken: sessionStorage.getItem(storageKey),
    localToken: localStorage.getItem(storageKey),
  }), TOKEN_STORAGE_KEY)
  expect(storage).toEqual({ sessionToken: null, localToken: null })
})

test('密码登录后恢复工作区 query 与 hash 且令牌仅进入 sessionStorage', async ({ page }) => {
  await installWorkspaceApiMocks(page, { allowPasswordLogin: true })

  await page.goto('/workspace?project=42#composer')
  await expect(page).toHaveURL(/\/auth\/login/)

  await page.getByRole('button', { name: '密码登录' }).click()
  await page.getByLabel('手机号码').fill('13800000000')
  await page.getByLabel('密码').fill('E2e-password-123')
  await page.getByRole('button', { name: '登录账号' }).click()

  await expect(page).toHaveURL(/\/workspace\?project=42#composer$/)
  const storage = await page.evaluate((storageKey) => ({
    sessionToken: sessionStorage.getItem(storageKey),
    localToken: localStorage.getItem(storageKey),
  }), TOKEN_STORAGE_KEY)
  expect(storage.sessionToken).not.toBeNull()
  expect(storage.localToken).toBeNull()
  await page.waitForLoadState('networkidle')
})

test('320px 工作区顶栏分为两行且弹层不越出视口', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 })
  await seedAuthenticatedSession(page, { token: 'test-token-123', user: userDetail })
  await installWorkspaceApiMocks(page)

  await page.goto('/workspace')

  const navigation = page.getByRole('navigation')
  const sidebarButton = page.getByRole('button', { name: /侧边栏/ })
  const modeButton = page.getByRole('button', { name: '设置对话栏为 Off' })
  await expect(navigation).toBeVisible()
  await expect(sidebarButton).toBeVisible()
  await expect(modeButton).toBeVisible()
  await expect(page.getByRole('button', { name: '异步任务' })).toBeVisible()
  await expect(page.getByRole('button', { name: '通知中心' })).toBeVisible()
  await expect(page.getByRole('button', { name: '用户菜单' })).toBeVisible()

  const navigationBox = await navigation.boundingBox()
  const sidebarBox = await sidebarButton.boundingBox()
  const modeBox = await modeButton.boundingBox()
  expect(navigationBox).not.toBeNull()
  expect(navigationBox!.height).toBeGreaterThanOrEqual(80)
  expect(sidebarBox).not.toBeNull()
  expect(modeBox).not.toBeNull()
  expect(modeBox!.y).toBeGreaterThan(sidebarBox!.y + sidebarBox!.height - 1)
  expect(await navigation.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true)

  const asyncTrigger = page.getByRole('button', { name: '异步任务' })
  await asyncTrigger.click()
  const asyncDialog = page.getByRole('dialog', { name: '后台任务中心' })
  await expect(asyncDialog).toBeVisible()
  await expectWithinViewport(asyncDialog, page)
  await page.keyboard.press('Escape')
  await expect(asyncTrigger).toBeFocused()

  const notificationTrigger = page.getByRole('button', { name: '通知中心' })
  await notificationTrigger.click()
  const notificationDialog = page.getByRole('dialog', { name: '通知中心' })
  await expect(notificationDialog).toBeVisible()
  await expectWithinViewport(notificationDialog, page)
  await page.keyboard.press('Escape')
  await expect(notificationTrigger).toBeFocused()

  const userTrigger = page.getByRole('button', { name: '用户菜单' })
  await userTrigger.click()
  const userDialog = page.getByRole('dialog', { name: '用户菜单' })
  await expect(userDialog).toBeVisible()
  await expectWithinViewport(userDialog, page)
  await page.keyboard.press('Escape')
  await expect(userTrigger).toBeFocused()

})
