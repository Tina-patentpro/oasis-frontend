import { existsSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import { execSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..', '..')
const trendFile = path.join(rootDir, 'docs', 'api', 'api-quality-trend.json')

const loadTrend = async () => {
  if (!existsSync(trendFile)) {
    return []
  }

  try {
    const content = await readFile(trendFile, 'utf-8')
    if (!content.trim()) {
      return []
    }
    const parsed = JSON.parse(content)
    return Array.isArray(parsed) ? parsed : []
  } catch (error) {
    console.warn('[api:trend] 无法解析现有趋势文件, 将重新生成', error)
    return []
  }
}

const resolveCommit = () => {
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim()
  } catch {
    return 'unknown'
  }
}

const main = async () => {
  const trend = await loadTrend()
  const now = new Date().toISOString()
  const entry = {
    runAt: now,
    commit: resolveCommit(),
    lint: 'pass',
    metadata: 'pass',
    unused: 'pass',
    contracts: 'pass',
  }

  const limit = Number.parseInt(process.env.API_TREND_LIMIT ?? '50', 10)
  const nextTrend = [entry, ...trend]
  const truncated = Number.isFinite(limit) && limit > 0 ? nextTrend.slice(0, limit) : nextTrend

  await writeFile(trendFile, `${JSON.stringify(truncated, null, 2)}\n`, 'utf-8')
  console.log(`[api:trend] 已更新 ${path.relative(rootDir, trendFile)} (共 ${truncated.length} 条记录)`)
}

main().catch((error) => {
  console.error('[api:trend] 写入趋势数据失败', error)
  process.exitCode = 1
})
