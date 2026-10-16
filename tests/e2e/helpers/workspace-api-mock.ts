import type { Page, Request, Route } from 'playwright/test'

export interface StrictApiResponse {
  body: unknown
  status?: number
}

export interface StrictApiFixture {
  method: string
  path: string | RegExp
  respond: (request: Request, url: URL) => StrictApiResponse | Promise<StrictApiResponse>
}

interface SeedAuthenticatedSessionOptions {
  token?: string
  user?: Record<string, unknown>
}

const defaultUser = {
  id: 1,
  username: '会话显示验证用户',
  email: 'session-display-e2e@example.com',
  phone: '13800000000',
  balance: 0,
  role: 'user',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

const defaultUserDetail = {
  id: 1,
  user_id: 1,
  username: '会话显示验证用户',
  avatar: '',
  phone: '13800000000',
  email: 'session-display-e2e@example.com',
  balance: 0,
  invite_code: 'SESSION01',
}

function fulfillJson(route: Route, response: StrictApiResponse): Promise<void> {
  return route.fulfill({
    status: response.status ?? 200,
    contentType: 'application/json',
    body: JSON.stringify(response.body),
  })
}

function matchesPath(path: string | RegExp, pathname: string): boolean {
  return typeof path === 'string' ? pathname === path : path.test(pathname)
}

export async function seedAuthenticatedSession(
  page: Page,
  options: SeedAuthenticatedSessionOptions = {},
): Promise<void> {
  await page.addInitScript(
    ({ token, user }) => {
      const now = Date.now()
      sessionStorage.setItem(
        'auth_access_token_v1',
        JSON.stringify({
          version: 1,
          token,
          issuedAt: now,
          expiresAt: now + 30 * 60 * 1000,
          binding: `${navigator.language}|${navigator.userAgent}`,
        }),
      )
      localStorage.setItem('user', JSON.stringify(user))
    },
    {
      token: options.token ?? 'workspace-session-display-token',
      user: { ...defaultUser, ...options.user },
    },
  )
}

export async function installStrictWorkspaceApiMock(
  page: Page,
  fixtures: StrictApiFixture[] = [],
): Promise<void> {
  const defaults: StrictApiFixture[] = [
    {
      method: 'GET',
      path: '/api/user/detail',
      respond: () => ({ body: defaultUserDetail }),
    },
    {
      method: 'GET',
      path: '/api/user/usermessagelist',
      respond: () => ({ body: { items: [], total: 0 } }),
    },
    {
      method: 'GET',
      path: '/api/apicategories/detail',
      respond: () => ({ body: {} }),
    },
    {
      method: 'GET',
      path: '/api/apicategories/configdetail',
      respond: () => ({ body: { item: [] } }),
    },
    {
      method: 'GET',
      path: '/api/apicategories/chatflowprompt',
      respond: () => ({ body: { 通用对话: [], 工作聚焦: [], 语义生图: [] } }),
    },
    {
      method: 'GET',
      path: '/api/apicategories/instructionlist',
      respond: () => ({ body: { items: [], total: 0 } }),
    },
    {
      method: 'GET',
      path: '/api/user/user/folderlist',
      respond: () => ({ body: { items: [], total: 0 } }),
    },
    {
      method: 'GET',
      path: '/api/user/folderlist',
      respond: () => ({ body: { items: [], total: 0 } }),
    },
    {
      method: 'GET',
      path: '/api/user/user/projectlist',
      respond: () => ({ body: { items: [], total: 0 } }),
    },
  ]

  await page.route('**/api/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    if (!url.pathname.startsWith('/api/')) {
      await route.fallback()
      return
    }
    const method = request.method().toUpperCase()
    const fixture = [...fixtures, ...defaults].find(
      (candidate) =>
        candidate.method.toUpperCase() === method && matchesPath(candidate.path, url.pathname),
    )

    if (fixture) {
      await fulfillJson(route, await fixture.respond(request, url))
      return
    }

    await route.fallback()
  })
}
