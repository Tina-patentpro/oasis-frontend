import { mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { spawn } from 'node:child_process'
import os from 'node:os'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..', '..')
const docsDir = path.join(rootDir, 'docs', 'api')
const siteDir = path.join(docsDir, 'site')
const isCheckMode = process.argv.includes('--check')

const redoclyScript = (() => {
  const script = path.join(rootDir, 'node_modules', '@redocly', 'cli', 'bin', 'cli.js')
  if (!existsSync(script)) {
    throw new Error('未找到 @redocly/cli，请先运行 npm install')
  }
  return script
})()

const candidateSpecs = [
  { file: 'workflows.yaml', title: 'Workflows API', slug: 'workflows' },
  { file: 'chatflows.yaml', title: 'Chatflows API', slug: 'chatflows' },
  { file: 'conversations.yaml', title: 'Conversations API', slug: 'conversations' },
  { file: 'projects.yaml', title: 'Projects API', slug: 'projects' },
  { file: 'users-auth.yaml', title: 'Users & Auth API', slug: 'users-auth' },
  { file: 'billing.yaml', title: 'Billing API', slug: 'billing' },
  { file: 'support-feedback.yaml', title: 'Support & Feedback API', slug: 'support-feedback' },
  { file: 'utilities.yaml', title: 'Utilities API', slug: 'utilities' },
  { file: 'usage-insights.yaml', title: 'Usage Insights API', slug: 'usage-insights' },
]

const runRedocly = (args) =>
  new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [redoclyScript, ...args], {
      stdio: 'inherit',
      cwd: rootDir,
    })
    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`redocly build-docs failed with exit code ${code}`))
    })
  })

const ensureSiteDir = async (targetSiteDir) => {
  if (existsSync(targetSiteDir)) {
    await rm(targetSiteDir, { recursive: true, force: true })
  }
  await mkdir(targetSiteDir, { recursive: true })
}

const buildDocs = async (targetSiteDir) => {
  const specs = candidateSpecs.filter(({ file }) => existsSync(path.join(docsDir, file)))
  if (specs.length === 0) {
    console.warn('[api:docs] 未找到任何 OpenAPI 规范文件，跳过文档生成')
    return []
  }

  for (const { file, title, slug } of specs) {
    const source = path.join(docsDir, file)
    const target = path.join(targetSiteDir, `${slug}.html`)
    const args = [
      'build-docs',
      source,
      '--output',
      target,
      '--title',
      title,
      '--disableGoogleFont',
    ]
    console.log(`[api:docs] 生成 ${title} → ${path.relative(rootDir, target)}`)
    await runRedocly(args)
  }

  return specs
}

const buildIndex = async (specs, targetSiteDir) => {
  const trendPath = path.join(docsDir, 'api-quality-trend.json')
  let trendRows = ''
  if (existsSync(trendPath)) {
    try {
      const trend = JSON.parse(await readFile(trendPath, 'utf-8')) ?? []
      trendRows = trend
        .map(
          (entry) => `
          <tr>
            <td>${entry.runAt ?? '-'}</td>
            <td>${entry.commit ?? '-'}</td>
            <td>${entry.lint ?? '-'}</td>
            <td>${entry.metadata ?? '-'}</td>
            <td>${entry.unused ?? '-'}</td>
            <td>${entry.contracts ?? '-'}</td>
          </tr>`,
        )
        .join('\n')
    } catch (error) {
      console.warn('[api:docs] 无法解析 api-quality-trend.json', error)
    }
  }

  const navLinks = specs
    .map(({ slug, title }) => `<li><a href="./${slug}.html">${title}</a></li>`)
    .join('\n')
  const trendTableRows =
    trendRows || '<tr><td colspan="6">尚未记录趋势数据，运行 npm run api:validate 后自动更新。</td></tr>'

  const indexHtml = `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <title>API 文档索引</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body { font-family: system-ui, sans-serif; margin: 2rem; color: #1f2933; }
      h1 { margin-bottom: 0.5rem; }
      .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1.5rem; margin-bottom: 2rem; }
      .card { border: 1px solid #e5e7eb; border-radius: 12px; padding: 1.25rem; box-shadow: 0 10px 24px rgba(31, 41, 55, 0.08); background: #fff; }
      ul { padding-left: 1.2rem; margin: 0.5rem 0 0; }
      a { color: #0f766e; text-decoration: none; font-weight: 600; }
      a:hover { text-decoration: underline; }
      table { width: 100%; border-collapse: collapse; }
      th, td { border: 1px solid #e5e7eb; padding: 0.5rem; text-align: left; font-size: 0.9rem; }
      th { background: #f9fafb; }
      caption { text-align: left; margin-bottom: 0.5rem; font-weight: 600; }
      @media (prefers-color-scheme: dark) {
        body { background: #111827; color: #e5e7eb; }
        .card { background: #1f2937; border-color: #374151; box-shadow: 0 10px 24px rgba(0,0,0,0.35); }
        a { color: #5eead4; }
        table, th, td { border-color: #374151; }
        th { background: #1f2937; }
      }
    </style>
  </head>
  <body>
    <h1>API 文档索引</h1>
    <p>以下文档由 <code>npm run api:docs</code> 自动生成。</p>
    <div class="grid">
      <div class="card">
        <h2>OpenAPI 规范</h2>
        <ul>${navLinks}</ul>
      </div>
      <div class="card">
        <h2>交付指引</h2>
        <ul>
          <li><a href="../DELIVERY-CHECKLIST.md">交付检查清单</a></li>
          <li><a href="../Automation.md">自动化与发布流程</a></li>
          <li><a href="../INTEGRATION-FAQ.md">集成常见问题</a></li>
        </ul>
      </div>
    </div>
    <section class="card">
      <table>
        <caption>API 质量趋势（最近 ${trendRows ? '' : '暂无数据'}）</caption>
        <thead>
          <tr>
            <th>执行时间</th>
            <th>Commit</th>
            <th>Lint</th>
            <th>Metadata</th>
            <th>Unused</th>
            <th>Contracts</th>
          </tr>
        </thead>
        <tbody>
${trendTableRows}
        </tbody>
      </table>
    </section>
  </body>
</html>`

  await writeFile(path.join(targetSiteDir, 'index.html'), indexHtml, 'utf-8')
}

const copyChangelog = async (targetSiteDir) => {
  const files = await readdir(docsDir)
  const markdownFiles = files.filter((file) => file.endsWith('.md') && !['site', 'templates'].includes(file))

  const changelogDir = path.join(targetSiteDir, 'docs')
  await mkdir(changelogDir, { recursive: true })

  await Promise.all(
    markdownFiles.map(async (file) => {
      const source = path.join(docsDir, file)
      const target = path.join(changelogDir, file)
      const content = await readFile(source, 'utf-8')
      return writeFile(target, content, 'utf-8')
    }),
  )
}

const listFiles = async (directory, baseDirectory = directory) => {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await listFiles(entryPath, baseDirectory)))
    } else if (entry.isFile()) {
      files.push(path.relative(baseDirectory, entryPath).replace(/\\/g, '/'))
    }
  }

  return files.sort()
}

const compareSiteDirectories = async (expectedDir, actualDir) => {
  if (!existsSync(actualDir)) {
    throw new Error(`API 静态站点目录不存在：${path.relative(rootDir, actualDir)}`)
  }

  const expectedFiles = await listFiles(expectedDir)
  const actualFiles = await listFiles(actualDir)
  const expectedSet = new Set(expectedFiles)
  const actualSet = new Set(actualFiles)
  const missingFiles = expectedFiles.filter((file) => !actualSet.has(file))
  const extraFiles = actualFiles.filter((file) => !expectedSet.has(file))
  const changedFiles = []

  for (const file of expectedFiles) {
    if (!actualSet.has(file)) {
      continue
    }
    const expectedPath = path.join(expectedDir, file)
    const actualPath = path.join(actualDir, file)
    const [expectedStats, actualStats] = await Promise.all([stat(expectedPath), stat(actualPath)])
    if (expectedStats.size !== actualStats.size) {
      changedFiles.push(file)
      continue
    }
    const [expectedContent, actualContent] = await Promise.all([
      readFile(expectedPath),
      readFile(actualPath),
    ])
    if (!expectedContent.equals(actualContent)) {
      changedFiles.push(file)
    }
  }

  if (missingFiles.length > 0 || extraFiles.length > 0 || changedFiles.length > 0) {
    const details = [
      missingFiles.length ? `缺少文件：${missingFiles.slice(0, 10).join(', ')}` : '',
      extraFiles.length ? `多余文件：${extraFiles.slice(0, 10).join(', ')}` : '',
      changedFiles.length ? `内容不同：${changedFiles.slice(0, 10).join(', ')}` : '',
    ]
      .filter(Boolean)
      .join('\n')
    throw new Error(`API 静态站点未同步，请运行 npm run api:docs 后提交生成结果。\n${details}`)
  }
}

const main = async () => {
  const targetSiteDir = isCheckMode
    ? await mkdtemp(path.join(os.tmpdir(), 'oasis-api-site-'))
    : siteDir

  try {
    await ensureSiteDir(targetSiteDir)
    const specs = await buildDocs(targetSiteDir)
    await copyChangelog(targetSiteDir)
    await buildIndex(specs, targetSiteDir)

    if (isCheckMode) {
      await compareSiteDirectories(targetSiteDir, siteDir)
      console.log('[api:docs] 静态站点已同步')
      return
    }

    console.log(`[api:docs] 文档生成完成，输出目录：${path.relative(rootDir, siteDir)}`)
  } finally {
    if (isCheckMode) {
      await rm(targetSiteDir, { recursive: true, force: true })
    }
  }
}

main().catch((error) => {
  console.error('[api:docs] 构建失败', error)
  process.exitCode = 1
})
