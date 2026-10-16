import { expect, test } from './fixtures/diagnostic-test'

const categoriesPayload = {
  文案创作: [
    {
      id: 1,
      name: '设置验收工具',
      group: '文案创作',
      sort: 1,
      is_active: true,
      apis: [],
    },
  ],
}

const emptyWorkspaceResponses: Record<string, unknown> = {
  '/api/user/usermessagelist': { items: [], total: 0 },
  '/api/user/user/folderlist': { items: [], total: 0 },
  '/api/user/folderlist': { items: [], total: 0 },
  '/api/user/user/projectlist': { items: [], total: 0 },
  '/api/apicategories/configdetail': { item: [] },
  '/api/apicategories/chatflowprompt': {
    通用对话: [],
    工作聚焦: [],
    语义生图: [],
  },
  '/api/apicategories/instructionlist': { items: [], total: 0 },
  '/api/recharge/list': [],
}

function hasEmptyWorkspaceResponse(pathname: string): boolean {
  return Object.prototype.hasOwnProperty.call(emptyWorkspaceResponses, pathname)
}

test('设置页只展示后端推荐数据并保持桌面端交互可用', async (
  { context, page, baseURL },
  testInfo,
) => {
  if (!baseURL) {
    throw new Error('Playwright baseURL 未配置，无法安全授予剪贴板权限')
  }
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], {
    origin: new URL(baseURL).origin,
  })

  await page.addInitScript(() => {
    const now = Date.now()
    sessionStorage.setItem(
      'auth_access_token_v1',
      JSON.stringify({
        version: 1,
        token: 'settings-e2e-token',
        issuedAt: now,
        expiresAt: now + 30 * 60 * 1000,
        binding: `${navigator.language}|${navigator.userAgent}`,
      }),
    )
    localStorage.setItem(
      'user',
      JSON.stringify({
        id: 1,
        username: '设置验收用户',
        email: 'settings-e2e@example.com',
        phone: '13800000000',
        balance: 100,
        role: 'user',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      }),
    )
  })

  await page.route('**/api/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())

    if (!url.pathname.startsWith('/api/')) {
      await route.fallback()
      return
    }

    if (request.method() === 'GET' && url.pathname === '/api/apicategories/detail') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(categoriesPayload),
      })
      return
    }

    if (request.method() === 'GET' && url.pathname === '/api/user/detail') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          username: '设置验收用户',
          avatar: '',
          phone: '13800000000',
          email: 'settings-e2e@example.com',
          balance: 100,
          invite_code: 'REAL2026',
        }),
      })
      return
    }

    if (request.method() === 'GET' && url.pathname === '/api/user/userinviteslist') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          total: 0,
          totalreward_amount: 0,
          config: { usage_limit: 0, referrer_reward: 12 },
          items: [],
        }),
      })
      return
    }

    if (request.method() === 'GET' && hasEmptyWorkspaceResponse(url.pathname)) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(emptyWorkspaceResponses[url.pathname]),
      })
      return
    }

    await route.fallback()
  })

  await page.goto('/workspace')
  await expect(page.getByRole('button', { name: '用户菜单' })).toBeVisible()

  await page.getByRole('button', { name: '用户菜单' }).click()
  await page.getByRole('button', { name: /个人信息和推荐奖励/ }).click()

  const settingsDialog = page.getByRole('dialog', { name: '设置面板' })
  await expect(settingsDialog).toBeVisible()
  await expect(settingsDialog.getByText('REAL2026', { exact: true })).toBeVisible()
  await expect(settingsDialog.getByText('0/不限', { exact: true })).toBeVisible()
  await expect(settingsDialog.getByText('DEMO2024', { exact: true })).toHaveCount(0)
  await expect(settingsDialog.getByRole('button', { name: '生成我的推荐码' })).toHaveCount(0)

  await settingsDialog.getByRole('button', { name: /复制/ }).click()
  await expect(page.getByRole('status')).toHaveText('推荐码已复制到剪贴板！')

  await settingsDialog
    .getByRole('heading', { name: '推荐奖励', exact: true })
    .scrollIntoViewIfNeeded()
  await page.screenshot({
    path: testInfo.outputPath('settings-profile-desktop.png'),
    fullPage: true,
  })

  await page.keyboard.press('Escape')
  await expect(settingsDialog).toBeHidden()
  await expect(page.getByRole('button', { name: '用户菜单' })).toBeFocused()

})

test('没有推荐码时通过后端接口生成并展示真实推荐码', async ({ page }, testInfo) => {
  let generateRequestCount = 0

  await page.addInitScript(() => {
    const now = Date.now()
    sessionStorage.setItem(
      'auth_access_token_v1',
      JSON.stringify({
        version: 1,
        token: 'settings-generate-e2e-token',
        issuedAt: now,
        expiresAt: now + 30 * 60 * 1000,
        binding: `${navigator.language}|${navigator.userAgent}`,
      }),
    )
    localStorage.setItem(
      'user',
      JSON.stringify({
        id: 1,
        username: '推荐码验收用户',
        email: 'referral-e2e@example.com',
        phone: '13800000000',
        balance: 100,
        role: 'user',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      }),
    )
  })

  await page.route('**/api/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())

    if (!url.pathname.startsWith('/api/')) {
      await route.fallback()
      return
    }

    if (request.method() === 'GET' && url.pathname === '/api/apicategories/detail') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(categoriesPayload),
      })
      return
    }

    if (request.method() === 'GET' && url.pathname === '/api/user/detail') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          username: '推荐码验收用户',
          avatar: '',
          phone: '13800000000',
          email: 'referral-e2e@example.com',
          balance: 100,
          invite_code: '',
        }),
      })
      return
    }

    if (request.method() === 'POST' && url.pathname === '/api/referral/generate') {
      generateRequestCount += 1
      expect(request.postDataJSON()).toEqual({})
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          referralCode: {
            code: 'REALGEN2026',
            maxUses: 10,
            rewardAmount: 50,
            createdAt: '2026-07-11',
          },
        }),
      })
      return
    }

    if (request.method() === 'GET' && hasEmptyWorkspaceResponse(url.pathname)) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(emptyWorkspaceResponses[url.pathname]),
      })
      return
    }

    await route.fallback()
  })

  await page.goto('/workspace')
  await page.getByRole('button', { name: '用户菜单' }).click()
  await page.getByRole('button', { name: /个人信息和推荐奖励/ }).click()

  const settingsDialog = page.getByRole('dialog', { name: '设置面板' })
  const generateButton = settingsDialog.getByRole('button', { name: '生成我的推荐码' })
  await expect(generateButton).toBeVisible()
  await generateButton.click()

  await expect(settingsDialog.getByText('REALGEN2026', { exact: true })).toBeVisible()
  expect(generateRequestCount).toBe(1)
  await page.screenshot({
    path: testInfo.outputPath('settings-generated-referral-code.png'),
    fullPage: true,
  })

})
