import type { Page } from 'playwright/test'

import { expect, test } from './fixtures/diagnostic-test'
import {
  installStrictWorkspaceApiMock,
  seedAuthenticatedSession,
} from './helpers/workspace-api-mock'

const SEMANTIC_SESSION_ID = 7001
const SEMANTIC_SESSION_TITLE = '语义生图：端到端图片'
const SEMANTIC_IMAGE_PATH = '/files/e2e/semantic-result.png'
const SEMANTIC_IMAGE_BYTES = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=',
  'base64',
)

async function mockWorkspaceApis(page: Page): Promise<void> {
  await installStrictWorkspaceApiMock(page, [
    {
      method: 'GET',
      path: '/api/apicategories/detail',
      respond: () => ({
        body: {
          专利撰写: [
            {
              id: 1,
              name: '语义生图',
              group: '专利撰写',
              sort: 1,
              is_active: true,
              apis: [
                {
                  id: 1,
                  sub_category_id: 1,
                  aimodel: '语义生图',
                  api_description: '端到端测试用工具',
                  api_endpoint: '',
                  api_process: '',
                },
              ],
            },
          ],
        },
      }),
    },
    {
      method: 'GET',
      path: '/api/user/user/projectlist',
      respond: (_request, url) => ({
        body: {
          total: url.searchParams.get('folder_id') === '0' ? 1 : 0,
          items:
            url.searchParams.get('folder_id') === '0'
              ? [
                  {
                    id: SEMANTIC_SESSION_ID,
                    name: SEMANTIC_SESSION_TITLE,
                    api_name: SEMANTIC_SESSION_TITLE,
                    user_id: 1,
                    folder_id: 0,
                    created_at: '2026-01-01T00:00:00.000Z',
                    type: 2,
                    answer_text: '列表摘要',
                    inputs: JSON.stringify({
                      type: 2,
                      query: '画一只猫',
                      conversation_id: 'conv-semantic-e2e',
                    }),
                  },
                ]
              : [],
        },
      }),
    },
    {
      method: 'GET',
      path: `/api/user/user/projectdetail/${SEMANTIC_SESSION_ID}`,
      respond: () => ({
        body: {
          id: SEMANTIC_SESSION_ID,
          user_id: 1,
          folder_id: 0,
          api_name: SEMANTIC_SESSION_TITLE,
          type: 2,
          created_at: '2026-01-01T00:00:00.000Z',
          answer_text: '已生成图片',
          file_url: SEMANTIC_IMAGE_PATH,
          file_output: [
            {
              filename: 'semantic-result.png',
              download_url: SEMANTIC_IMAGE_PATH,
              mime_type: 'image/png',
            },
          ],
          inputs: JSON.stringify({
            type: 2,
            query: '画一只猫',
            conversation_id: 'conv-semantic-e2e',
          }),
        },
      }),
    },
  ])

  await page.route(`**${SEMANTIC_IMAGE_PATH}`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'image/png',
      body: SEMANTIC_IMAGE_BYTES,
    })
  })

}

test('语义生图历史详情能恢复并显示生成图片', async ({ page }, testInfo) => {
  await seedAuthenticatedSession(page, {
    token: 'semantic-history-e2e-token',
    user: { username: '语义生图用户', email: 'semantic-e2e@example.com' },
  })
  await mockWorkspaceApis(page)

  await page.goto('/workspace')

  await expect(page.getByText('绿洲慧写 · 工作区')).toBeVisible()
  const historyTab = page.getByRole('button', { name: '独立会话历史' })
  await expect(historyTab).toBeVisible()
  const sessionButton = page.getByRole('button', {
    name: new RegExp(`^${SEMANTIC_SESSION_TITLE}`),
  })
  try {
    await expect(sessionButton).toBeVisible({ timeout: 5_000 })
  } catch {
    await historyTab.click({ force: true })
  }
  await expect(sessionButton).toBeVisible()

  const detailResponse = page.waitForResponse(
    (response) =>
      response.url().includes(`/api/user/user/projectdetail/${SEMANTIC_SESSION_ID}`) &&
      response.status() === 200,
  )
  await sessionButton.dispatchEvent('click')
  await detailResponse

  await expect(page.getByText('已生成图片')).toBeVisible()
  const restoredImage = page.getByRole('img', { name: 'semantic-result.png' })
  await expect(restoredImage).toBeVisible()
  await expect(restoredImage).toHaveAttribute('src', new RegExp(SEMANTIC_IMAGE_PATH))
  await expect
    .poll(async () => restoredImage.evaluate((img) => (img as HTMLImageElement).complete))
    .toBe(true)

  const previewTrigger = page.getByRole('button', {
    name: '打开图片预览：semantic-result.png',
  })
  await previewTrigger.click()
  await expect(page.getByRole('dialog', { name: '图片全屏预览' })).toBeVisible()
  await expect(page.getByRole('button', { name: '关闭图片预览' })).toBeFocused()
  await page.screenshot({ path: testInfo.outputPath('semantic-history-image-preview.png') })
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog', { name: '图片全屏预览' })).toHaveCount(0)
  await expect(previewTrigger).toBeFocused()

})
