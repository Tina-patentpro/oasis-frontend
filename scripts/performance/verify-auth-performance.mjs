#!/usr/bin/env node

import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { chromium } from 'playwright'

const VIEWPORTS = [
  { width: 375, height: 812 },
  { width: 1280, height: 720 },
]

export function median(values) {
  if (values.length === 0) return 0
  const sorted = [...values].sort((left, right) => left - right)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle]
}

export function assessPerformanceResults(
  results,
  {
    coldLcpMs = 2_500,
    warmLcpMs = 1_000,
    cls = 0.1,
    requestCount = 14,
    transferBytes = 300 * 1024,
  } = {},
) {
  const failures = []
  for (const result of results) {
    const label = `${result.viewport.width}x${result.viewport.height}`
    const coldMedian = median(result.cold.map((run) => run.lcpMs))
    const warmMedian = median(result.warm.map((run) => run.lcpMs))
    const allRuns = [...result.cold, ...result.warm]

    if (coldMedian > coldLcpMs) {
      failures.push(`${label} cold LCP median ${coldMedian}ms exceeds ${coldLcpMs}ms`)
    }
    if (warmMedian > warmLcpMs) {
      failures.push(`${label} warm LCP median ${warmMedian}ms exceeds ${warmLcpMs}ms`)
    }
    for (const run of allRuns) {
      if (run.cls > cls) failures.push(`${label} CLS ${run.cls} exceeds ${cls}`)
      if (run.longTasks.length > 0) failures.push(`${label} contains long tasks`)
      if (run.diagnostics.length > 0) failures.push(`${label} contains runtime diagnostics`)
      if (run.requestCount > requestCount) {
        failures.push(`${label} request count ${run.requestCount} exceeds ${requestCount}`)
      }
      if (run.transferBytes > transferBytes) {
        failures.push(`${label} transfer ${run.transferBytes} exceeds ${transferBytes}`)
      }
    }
  }
  return failures
}

async function installPerformanceObservers(page) {
  await page.addInitScript(() => {
    window.__oasisAuthPerformance = {
      lcpMs: 0,
      lcpElement: '',
      cls: 0,
      longTasks: [],
    }

    new PerformanceObserver((list) => {
      const entries = list.getEntries()
      const lastEntry = entries.at(-1)
      if (lastEntry) {
        window.__oasisAuthPerformance.lcpMs = lastEntry.startTime
        window.__oasisAuthPerformance.lcpElement =
          lastEntry.element?.tagName?.toLowerCase?.() ?? ''
      }
    }).observe({ type: 'largest-contentful-paint', buffered: true })

    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) window.__oasisAuthPerformance.cls += entry.value
      }
    }).observe({ type: 'layout-shift', buffered: true })

    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        window.__oasisAuthPerformance.longTasks.push({
          startTime: entry.startTime,
          duration: entry.duration,
        })
      }
    }).observe({ type: 'longtask', buffered: true })
  })
}

async function collectRun(context, targetUrl, viewport) {
  const page = await context.newPage()
  await page.setViewportSize(viewport)
  await installPerformanceObservers(page)
  const diagnostics = []

  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') {
      diagnostics.push(`console.${message.type()}: ${message.text()}`)
    }
  })
  page.on('pageerror', (error) => diagnostics.push(`pageerror: ${error.message}`))
  page.on('requestfailed', (request) => {
    diagnostics.push(
      `requestfailed ${request.method()} ${new URL(request.url()).pathname}: ${
        request.failure()?.errorText ?? ''
      }`,
    )
  })
  page.on('response', (response) => {
    if (response.status() < 200 || response.status() >= 300) {
      diagnostics.push(
        `http ${response.status()} ${response.request().method()} ${
          new URL(response.url()).pathname
        }`,
      )
    }
  })

  await page.goto(targetUrl, { waitUntil: 'networkidle' })
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  )

  const metrics = await page.evaluate(() => {
    const navigation = performance.getEntriesByType('navigation')[0]
    const resources = performance.getEntriesByType('resource')
    const duplicateCounts = new Map()
    for (const resource of resources) {
      const pathname = new URL(resource.name).pathname
      duplicateCounts.set(pathname, (duplicateCounts.get(pathname) ?? 0) + 1)
    }

    return {
      ...window.__oasisAuthPerformance,
      ttfbMs: navigation.responseStart,
      dnsMs: navigation.domainLookupEnd - navigation.domainLookupStart,
      tcpMs: navigation.connectEnd - navigation.connectStart,
      tlsMs:
        navigation.secureConnectionStart > 0
          ? navigation.connectEnd - navigation.secureConnectionStart
          : 0,
      requestCount: resources.length + 1,
      transferBytes:
        navigation.transferSize +
        resources.reduce((total, resource) => total + resource.transferSize, 0),
      protocols: Array.from(
        new Set(
          [navigation.nextHopProtocol, ...resources.map((resource) => resource.nextHopProtocol)]
            .filter(Boolean),
        ),
      ),
      duplicateRequests: Array.from(duplicateCounts)
        .filter(([, count]) => count > 1)
        .map(([pathname, count]) => ({ pathname, count })),
      resources: resources.map((resource) => ({
        pathname: new URL(resource.name).pathname,
        initiatorType: resource.initiatorType,
        nextHopProtocol: resource.nextHopProtocol,
        transferSize: resource.transferSize,
        encodedBodySize: resource.encodedBodySize,
        startTime: resource.startTime,
        responseStart: resource.responseStart,
        duration: resource.duration,
      })),
    }
  })

  await page.close()
  return { ...metrics, diagnostics }
}

export async function measureAuthPerformance({
  targetUrl,
  coldRuns = 5,
  warmRuns = 3,
  launch = chromium.launch,
}) {
  const browser = await launch.call(chromium, { headless: true })
  const results = []

  try {
    for (const viewport of VIEWPORTS) {
      const cold = []
      for (let index = 0; index < coldRuns; index += 1) {
        const context = await browser.newContext()
        cold.push(await collectRun(context, targetUrl, viewport))
        await context.close()
      }

      const warmContext = await browser.newContext()
      await collectRun(warmContext, targetUrl, viewport)
      const warm = []
      for (let index = 0; index < warmRuns; index += 1) {
        warm.push(await collectRun(warmContext, targetUrl, viewport))
      }
      await warmContext.close()

      results.push({ viewport, cold, warm })
    }
  } finally {
    await browser.close()
  }

  return results
}

function parseArguments(argv) {
  const options = {
    targetUrl: '',
    outputPath: '',
    coldRuns: 5,
    warmRuns: 3,
    enforce: false,
  }
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]
    const value = argv[index + 1]
    if (argument === '--url' && value) {
      options.targetUrl = value
      index += 1
    } else if (argument === '--output' && value) {
      options.outputPath = value
      index += 1
    } else if (argument === '--cold-runs' && value) {
      options.coldRuns = Number.parseInt(value, 10)
      index += 1
    } else if (argument === '--warm-runs' && value) {
      options.warmRuns = Number.parseInt(value, 10)
      index += 1
    } else if (argument === '--enforce') {
      options.enforce = true
    } else {
      throw new Error(`Unsupported auth performance argument: ${argument}`)
    }
  }
  if (!options.targetUrl || !options.outputPath) {
    throw new Error('Missing required --url or --output argument.')
  }
  if (options.coldRuns < 1 || options.warmRuns < 1) {
    throw new Error('Performance run counts must be positive integers.')
  }
  return options
}

async function main() {
  const options = parseArguments(process.argv.slice(2))
  const results = await measureAuthPerformance(options)
  const failures = assessPerformanceResults(results)
  const report = {
    schemaVersion: 1,
    target: new URL(options.targetUrl).origin + new URL(options.targetUrl).pathname,
    measuredAt: new Date().toISOString(),
    mode: options.enforce ? 'enforced' : 'report-only',
    failures,
    results,
  }

  await mkdir(path.dirname(options.outputPath), { recursive: true })
  await writeFile(options.outputPath, `${JSON.stringify(report, null, 2)}\n`, {
    encoding: 'utf8',
    flag: 'wx',
  })
  console.log(`Auth performance report created without overwrite: ${options.outputPath}`)

  if (options.enforce && failures.length > 0) {
    throw new Error(failures.join('\n'))
  }
}

const isMain =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
}
