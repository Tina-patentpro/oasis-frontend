import { gzipSync } from 'node:zlib'
import type { Locator, Page, Response } from 'playwright/test'

import { expect, test } from './fixtures/diagnostic-test'

type AuthMode = 'sms' | 'password' | 'register'

const viewports = [
  { width: 280, height: 653 },
  { width: 320, height: 800 },
  { width: 375, height: 812 },
  { width: 414, height: 896 },
  { width: 473, height: 900 },
  { width: 474, height: 900 },
  { width: 1280, height: 720 },
]

async function selectAuthMode(page: Page, mode: AuthMode) {
  if (mode === 'password') {
    await page.getByRole('button', { name: '密码登录' }).click()
  } else if (mode === 'register') {
    await page.getByRole('button', { name: '立即注册' }).click()
  }
}

async function expectWithinHorizontalViewport(locator: Locator, page: Page) {
  const box = await locator.boundingBox()
  const viewport = page.viewportSize()

  expect(box).not.toBeNull()
  expect(viewport).not.toBeNull()
  expect(box!.x).toBeGreaterThanOrEqual(0)
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport!.width)
}

async function expectAuthLayoutWithinViewport(page: Page, mode: AuthMode) {
  await expect(page.locator('html')).toHaveJSProperty(
    'scrollWidth',
    await page.locator('html').evaluate((element) => element.clientWidth),
  )
  await expect(page.locator('body')).toHaveJSProperty(
    'scrollWidth',
    await page.locator('body').evaluate((element) => element.clientWidth),
  )

  const form = page.locator('form')
  await expectWithinHorizontalViewport(form, page)

  if (mode === 'password') {
    await expectWithinHorizontalViewport(page.getByLabel('手机号码'), page)
    await expectWithinHorizontalViewport(page.getByLabel('密码'), page)
    await expectWithinHorizontalViewport(page.getByRole('button', { name: '登录账号' }), page)
    return
  }

  await expectWithinHorizontalViewport(page.getByLabel('短信验证码'), page)
  await expectWithinHorizontalViewport(page.getByRole('button', { name: '发送验证码' }), page)
  await expectWithinHorizontalViewport(
    page.getByRole('button', { name: mode === 'register' ? '注册账号' : '登录账号' }),
    page,
  )
}

for (const viewport of viewports) {
  for (const mode of ['sms', 'password', 'register'] as const) {
    test(`${viewport.width}px ${mode} 认证布局不产生横向溢出`, async ({ page }) => {
      await page.setViewportSize(viewport)
      await page.goto('/auth/login')
      await selectAuthMode(page, mode)
      await expectAuthLayoutWithinViewport(page, mode)
    })
  }
}

test('认证页仅暴露一个主地标且跳转链接聚焦主内容', async ({ page }) => {
  await page.goto('/auth/login')

  await expect(page.locator('main')).toHaveCount(1)
  await expect(page.locator('main#main-content')).toHaveCount(1)

  const skipLink = page.getByRole('link', { name: '跳到主内容' })
  await skipLink.focus()
  await expect(skipLink).toBeFocused()
  await skipLink.press('Enter')
  await expect(page.locator('main#main-content')).toBeFocused()
})

test('认证首屏保持在压缩资源和请求数预算内', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  const firstPartyResponses = new Map<string, Response>()
  const budgetedResourceTypes = new Set(['document', 'script', 'stylesheet', 'font'])

  page.on('response', (response) => {
    const request = response.request()
    const url = new URL(response.url())
    if (
      url.origin === 'http://127.0.0.1:4173' &&
      response.status() === 200 &&
      budgetedResourceTypes.has(request.resourceType())
    ) {
      firstPartyResponses.set(response.url(), response)
    }
  })

  await page.goto('/auth/login')
  await page.waitForLoadState('networkidle')

  let compressedBytes = 0
  for (const response of firstPartyResponses.values()) {
    compressedBytes += gzipSync(await response.body()).byteLength
  }

  expect(firstPartyResponses.size).toBeLessThanOrEqual(14)
  expect(compressedBytes).toBeLessThanOrEqual(300 * 1024)
})
