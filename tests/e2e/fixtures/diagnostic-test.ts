import {
  expect,
  test as base,
  type ConsoleMessage,
  type Page,
  type Request,
  type Response,
  type TestInfo,
} from 'playwright/test'

export { expect }

export type OccurrenceBounds = { minOccurrences: number; maxOccurrences: number }
export type ExpectedDiagnostic =
  | ({ kind: 'http'; method: string; pathname: RegExp; status: number } & OccurrenceBounds)
  | ({
      kind: 'console'
      level: 'error' | 'warning'
      sourcePathname?: RegExp
      message: RegExp
      argumentCount?: number
    } & OccurrenceBounds)
  | ({ kind: 'pageerror'; name?: RegExp; message: RegExp } & OccurrenceBounds)
  | ({
      kind: 'requestfailed'
      method: string
      pathname: RegExp
      failureText?: RegExp
    } & OccurrenceBounds)

export interface DiagnosticController {
  expect(expected: ExpectedDiagnostic): void
}

type ActualDiagnostic =
  | {
      kind: 'http'
      method: string
      pathname: string
      status: number
    }
  | {
      kind: 'console'
      level: 'error' | 'warning'
      sourcePathname: string
      message: string
      argumentCount: number
    }
  | {
      kind: 'pageerror'
      name: string
      message: string
    }
  | {
      kind: 'requestfailed'
      method: string
      pathname: string
      failureText: string
    }

type UnknownApiRequest = {
  method: string
  pathname: string
}

type DiagnosticFixtures = {
  diagnostics: DiagnosticController
}

function pathnameFromUrl(value: string): string {
  if (!value) return ''
  try {
    return new URL(value).pathname
  } catch {
    return value
  }
}

function matchesRegex(pattern: RegExp, value: string): boolean {
  pattern.lastIndex = 0
  const matched = pattern.test(value)
  pattern.lastIndex = 0
  return matched
}

function diagnosticMatches(expected: ExpectedDiagnostic, actual: ActualDiagnostic): boolean {
  if (expected.kind !== actual.kind) return false

  switch (expected.kind) {
    case 'http':
      return (
        actual.kind === 'http' &&
        actual.method === expected.method.toUpperCase() &&
        actual.status === expected.status &&
        matchesRegex(expected.pathname, actual.pathname)
      )
    case 'console':
      return (
        actual.kind === 'console' &&
        actual.level === expected.level &&
        matchesRegex(expected.message, actual.message) &&
        (expected.sourcePathname === undefined ||
          matchesRegex(expected.sourcePathname, actual.sourcePathname)) &&
        (expected.argumentCount === undefined ||
          expected.argumentCount === actual.argumentCount)
      )
    case 'pageerror':
      return (
        actual.kind === 'pageerror' &&
        matchesRegex(expected.message, actual.message) &&
        (expected.name === undefined || matchesRegex(expected.name, actual.name))
      )
    case 'requestfailed':
      return (
        actual.kind === 'requestfailed' &&
        actual.method === expected.method.toUpperCase() &&
        matchesRegex(expected.pathname, actual.pathname) &&
        (expected.failureText === undefined ||
          matchesRegex(expected.failureText, actual.failureText))
      )
  }
}

function formatActualDiagnostic(actual: ActualDiagnostic): string {
  switch (actual.kind) {
    case 'http':
      return `http ${actual.method} ${actual.pathname} ${actual.status}`
    case 'console':
      return `console.${actual.level} ${actual.sourcePathname} ${actual.message}`
    case 'pageerror':
      return `pageerror ${actual.name}: ${actual.message}`
    case 'requestfailed':
      return `requestfailed ${actual.method} ${actual.pathname} ${actual.failureText}`
  }
}

function assertDiagnostics(
  expected: ExpectedDiagnostic[],
  actual: ActualDiagnostic[],
  unknownApis: UnknownApiRequest[],
): void {
  const failures: string[] = []
  if (unknownApis.length > 0) {
    failures.push(
      `Unknown API requests: ${unknownApis
        .map((request) => `${request.method} ${request.pathname}`)
        .join(', ')}`,
    )
  }

  const occurrences = expected.map(() => 0)
  const unmatched: ActualDiagnostic[] = []
  for (const diagnostic of actual) {
    const expectedIndex = expected.findIndex(
      (contract, index) =>
        occurrences[index] < contract.maxOccurrences && diagnosticMatches(contract, diagnostic),
    )
    if (expectedIndex < 0) {
      unmatched.push(diagnostic)
    } else {
      occurrences[expectedIndex] += 1
    }
  }

  expected.forEach((contract, index) => {
    const count = occurrences[index]
    if (count < contract.minOccurrences || count > contract.maxOccurrences) {
      failures.push(
        `Expected diagnostic ${index + 1} occurred ${count} times; required ${contract.minOccurrences}..${contract.maxOccurrences}.`,
      )
    }
  })

  if (unmatched.length > 0) {
    failures.push(`Unexpected diagnostics: ${unmatched.map(formatActualDiagnostic).join(' | ')}`)
  }

  if (failures.length > 0) {
    throw new Error(failures.join('\n'))
  }
}

function collectConsoleDiagnostic(message: ConsoleMessage): ActualDiagnostic | null {
  const type = message.type()
  if (type !== 'error' && type !== 'warning') return null
  return {
    kind: 'console',
    level: type,
    sourcePathname: pathnameFromUrl(message.location().url),
    message: message.text(),
    argumentCount: message.args().length,
  }
}

function collectFailedRequest(request: Request): ActualDiagnostic {
  return {
    kind: 'requestfailed',
    method: request.method().toUpperCase(),
    pathname: pathnameFromUrl(request.url()),
    failureText: request.failure()?.errorText ?? '',
  }
}

function collectFailedResponse(response: Response): ActualDiagnostic {
  return {
    kind: 'http',
    method: response.request().method().toUpperCase(),
    pathname: pathnameFromUrl(response.url()),
    status: response.status(),
  }
}

async function captureFinalScreenshot(
  errors: unknown[],
  page: Page,
  testInfo: TestInfo,
): Promise<void> {
  if (process.env.OASIS_E2E_FULL_EVIDENCE === '1' && !page.isClosed()) {
    try {
      await page.screenshot({ path: testInfo.outputPath('final.png'), fullPage: true })
    } catch (error) {
      errors.push(error)
    }
  }
}

async function preserveTeardownFailure(errors: unknown[], testInfo: TestInfo): Promise<void> {
  if (errors.length === 0) return
  const bodyAlreadyFailed = Boolean(
    testInfo.status && testInfo.status !== testInfo.expectedStatus,
  )
  if (bodyAlreadyFailed) {
    await testInfo.attach('diagnostic-teardown-errors.txt', {
      body: Buffer.from(
        errors
          .map((error) => (error instanceof Error ? error.message : String(error)))
          .join('\n\n'),
      ),
      contentType: 'text/plain',
    })
    return
  }

  if (errors.length === 1) throw errors[0]
  throw new AggregateError(errors, 'E2E diagnostics teardown failed.')
}

export const test = base.extend<DiagnosticFixtures>({
  diagnostics: [
    async ({ page }, use, testInfo) => {
      const expected: ExpectedDiagnostic[] = []
      const actual: ActualDiagnostic[] = []
      const unknownApis: UnknownApiRequest[] = []
      const controller: DiagnosticController = {
        expect(contract) {
          expected.push(contract)
        },
      }

      page.on('console', (message) => {
        const diagnostic = collectConsoleDiagnostic(message)
        if (diagnostic) actual.push(diagnostic)
      })
      page.on('pageerror', (error) => {
        actual.push({
          kind: 'pageerror',
          name: error.name,
          message: error.message,
        })
      })
      page.on('requestfailed', (request) => {
        actual.push(collectFailedRequest(request))
      })
      page.on('response', (response) => {
        if (response.status() < 200 || response.status() >= 300) {
          actual.push(collectFailedResponse(response))
        }
      })
      await page.route('**/api/**', async (route) => {
        const request = route.request()
        const url = new URL(request.url())
        if (!url.pathname.startsWith('/api/')) {
          await route.fallback()
          return
        }
        const unknown = {
          method: request.method().toUpperCase(),
          pathname: url.pathname,
        }
        unknownApis.push(unknown)
        await route.fulfill({
          status: 501,
          contentType: 'application/json',
          body: JSON.stringify({
            error: {
              code: 'UNMOCKED_E2E_API',
              message: `${unknown.method} ${unknown.pathname}`,
            },
          }),
        })
      })

      const teardownErrors: unknown[] = []
      try {
        await use(controller)
      } finally {
        await captureFinalScreenshot(teardownErrors, page, testInfo)
        try {
          assertDiagnostics(expected, actual, unknownApis)
        } catch (error) {
          teardownErrors.push(error)
        }
        await preserveTeardownFailure(teardownErrors, testInfo)
      }
    },
    { auto: true },
  ],
})
