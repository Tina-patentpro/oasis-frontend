import { expect, test } from './fixtures/diagnostic-test'

test('独立推荐奖励页通过后端接口生成邀请码', async ({ page }, testInfo) => {
  let generateRequestCount = 0

  await page.addInitScript(() => {
    const now = Date.now()
    sessionStorage.setItem(
      'auth_access_token_v1',
      JSON.stringify({
        version: 1,
        token: 'profile-reward-e2e-token',
        issuedAt: now,
        expiresAt: now + 30 * 60 * 1000,
        binding: `${navigator.language}|${navigator.userAgent}`,
      }),
    )
    localStorage.setItem(
      'user',
      JSON.stringify({
        id: 1,
        username: '推荐奖励验收用户',
        email: 'profile-reward-e2e@example.com',
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

    if (request.method() === 'GET' && url.pathname === '/api/user/detail') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          username: '推荐奖励验收用户',
          avatar: '',
          phone: '13800000000',
          email: 'profile-reward-e2e@example.com',
          balance: 100,
          invite_code: '',
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
          config: { usage_limit: 10, referrer_reward: 50 },
          items: [],
        }),
      })
      return
    }

    if (request.method() === 'GET' && url.pathname === '/api/user/usermessagelist') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: [], total: 0 }),
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
            code: 'PROFILEE2E2026',
            maxUses: 10,
            rewardAmount: 50,
            createdAt: '2026-07-11',
          },
        }),
      })
      return
    }

    await route.fallback()
  })

  await page.goto('/user/profile-reward')

  const generateButton = page.getByRole('button', { name: '生成邀请码' })
  await expect(generateButton).toBeVisible()
  await expect(page.getByRole('button', { name: '复制邀请码' })).toHaveCount(0)

  await generateButton.click()

  await expect(page.getByText('PROFILEE2E2026', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: '复制邀请码' })).toBeVisible()
  expect(generateRequestCount).toBe(1)
  await page.screenshot({
    path: testInfo.outputPath('profile-reward-generated-code.png'),
    fullPage: true,
  })

})
