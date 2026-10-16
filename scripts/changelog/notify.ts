#!/usr/bin/env node

import { execSync } from 'node:child_process'
import { appendFile, mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import nodemailer from 'nodemailer'

type Summary = {
  filePath: string
  heading: string
  excerpt: string[]
}

type NotificationStatus = 'sent' | 'skipped' | 'dry-run' | 'failed'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..', '..')

const CHANGELOG_PATHS = ['docs/CHANGELOG.md', 'docs/api/CHANGELOG.md']

const STAGE_D_TAG = '#StageD'

const dryRun = process.argv.includes('--dry-run')

async function main() {
  const changedFiles = await detectChangedFiles()
  const touchedChangelogs = CHANGELOG_PATHS.filter((file) => changedFiles.includes(file))

  if (touchedChangelogs.length === 0) {
    console.log('No changelog updates detected; skipping notifications.')
    process.exit(0)
  }

  const summaries: Summary[] = []

  for (const filePath of touchedChangelogs) {
    const content = await readFile(path.join(repoRoot, filePath), 'utf-8')
    summaries.push(extractSummary(filePath, content))
  }

  const payload = buildPayload(summaries)

  const slackStatus = await notifySlack(payload)
  const emailStatus = await notifyEmail(payload)
  const discussionStatus = await notifyDiscussion(payload)

  await writeSubscriptionLog(summaries, {
    slack: slackStatus,
    email: emailStatus,
    discussion: discussionStatus,
  })

  console.log('Notification flow completed.', {
    slack: slackStatus,
    email: emailStatus,
    discussion: discussionStatus,
  })
}

async function detectChangedFiles(): Promise<string[]> {
  const eventName = process.env.GITHUB_EVENT_NAME

  if (eventName === 'push') {
    const eventPath = process.env.GITHUB_EVENT_PATH

    if (eventPath) {
      try {
        const raw = await readFile(eventPath, 'utf-8')
        const event = JSON.parse(raw) as { before?: string; after?: string }
        if (event.before && event.after) {
          const output = runGit(`diff --name-only ${event.before} ${event.after}`)
          if (output.length > 0) {
            return uniquePaths(output)
          }
        }
      } catch (error) {
        console.warn('Failed to parse push event payload; falling back to HEAD diff.', error)
      }
    }
  }

  // Fallback: compare HEAD with its first parent.
  try {
    const fallbackOutput = runGit('diff --name-only HEAD^ HEAD')
    if (fallbackOutput.length > 0) {
      return uniquePaths(fallbackOutput)
    }
  } catch {
    // Might be the first commit; fall back to listing tracked files.
  }

  try {
    const lsTreeOutput = runGit('ls-tree --full-tree --name-only HEAD')
    if (lsTreeOutput.length > 0) {
      return uniquePaths(lsTreeOutput)
    }
  } catch (error) {
    console.error('Unable to determine changed files.', error)
  }

  return []
}

function extractSummary(filePath: string, content: string): Summary {
  const lines = content.replace(/\r\n/g, '\n').split('\n')

  let heading = ''
  const excerpt: string[] = []
  let capture = false

  for (const line of lines) {
    if (line.startsWith('## ')) {
      if (!heading) {
        heading = line.replace(/^##\s*/, '').trim()
        capture = true
        continue
      }
      if (capture) {
        break
      }
    }

    if (capture) {
      if (excerpt.length >= 8) {
        break
      }
      excerpt.push(line.trimEnd())
    }
  }

  const sanitizedExcerpt = excerpt
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .slice(0, 6)

  return {
    filePath,
    heading: heading || path.basename(filePath),
    excerpt: sanitizedExcerpt,
  }
}

function buildPayload(summaries: Summary[]) {
  const commitSha = process.env.GITHUB_SHA ?? runGit('rev-parse HEAD', true)
  const actor = process.env.GITHUB_ACTOR ?? runGit('config user.name', true) ?? 'unknown'
  const repository = process.env.GITHUB_REPOSITORY ?? runGit('rev-parse --show-toplevel', true)
  const commitUrl =
    process.env.GITHUB_SERVER_URL && process.env.GITHUB_REPOSITORY && commitSha
      ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/commit/${commitSha}`
      : ''

  const title = 'Stage D changelog updates'
  const summaryLines = summaries.map((summary) => {
    const excerptText = summary.excerpt.map((line) => `    ${line}`).join('\n')
    return `- ${summary.filePath} → ${summary.heading}\n${excerptText}`
  })

  const markdown = [
    `**${title}**`,
    '',
    ...summaryLines,
    '',
    `触发者：${actor}`,
    commitUrl ? `提交：${commitUrl}` : `提交：${commitSha}`,
    '',
    STAGE_D_TAG,
  ].join('\n')

  const plainText = [
    title,
    '',
    ...summaryLines.map((line) => line.replace(/^-\s/, '* ')),
    '',
    `triggered by ${actor}`,
    commitUrl ? `commit: ${commitUrl}` : `commit: ${commitSha}`,
    '',
    STAGE_D_TAG,
  ].join('\n')

  return {
    title,
    markdown,
    plainText,
    summaries,
    actor,
    commitSha,
    repository,
  }
}

async function notifySlack(payload: ReturnType<typeof buildPayload>): Promise<NotificationStatus> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL

  if (!webhookUrl) {
    console.log('Slack webhook not configured; skipping Slack notification.')
    return 'skipped'
  }

  if (dryRun) {
    console.log('[dry-run] Slack payload:\n', payload.markdown)
    return 'dry-run'
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: payload.markdown }),
    })

    if (!response.ok) {
      console.error(
        'Slack webhook responded with an error:',
        response.status,
        await response.text(),
      )
      return 'failed'
    }

    console.log('Slack notification sent.')
    return 'sent'
  } catch (error) {
    console.error('Slack notification failed.', error)
    return 'failed'
  }
}

async function notifyEmail(payload: ReturnType<typeof buildPayload>): Promise<NotificationStatus> {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM, SMTP_TO } = process.env

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASSWORD || !SMTP_TO) {
    console.log('SMTP settings incomplete; skipping email notification.')
    return 'skipped'
  }

  const port = Number(SMTP_PORT ?? 587)
  const secure = port === 465

  if (dryRun) {
    console.log('[dry-run] Email payload:\n', payload.plainText)
    return 'dry-run'
  }

  try {
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port,
      secure,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASSWORD,
      },
    })

    await transporter.sendMail({
      from: SMTP_FROM ?? SMTP_USER,
      to: SMTP_TO,
      subject: `[Stage D] ${payload.title}`,
      text: payload.plainText,
    })

    console.log('Email notification sent.')
    return 'sent'
  } catch (error) {
    console.error('Email notification failed.', error)
    return 'failed'
  }
}

async function notifyDiscussion(
  payload: ReturnType<typeof buildPayload>,
): Promise<NotificationStatus> {
  const token = process.env.GITHUB_TOKEN
  const repositoryId = process.env.GITHUB_REPOSITORY_ID
  const categoryId = process.env.GITHUB_DISCUSSIONS_CATEGORY_ID

  if (!token || !repositoryId || !categoryId) {
    console.log('GitHub Discussions configuration missing; skipping discussion notification.')
    return 'skipped'
  }

  if (dryRun) {
    console.log('[dry-run] GitHub discussion payload:\n', payload.markdown)
    return 'dry-run'
  }

  try {
    const response = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: {
        Authorization: `bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `
          mutation CreateDiscussion($input: CreateDiscussionInput!) {
            createDiscussion(input: $input) {
              discussion {
                url
              }
            }
          }
        `,
        variables: {
          input: {
            repositoryId,
            categoryId,
            title: `[Stage D] ${payload.title}`,
            body: payload.markdown,
          },
        },
      }),
    })

    const result = (await response.json()) as {
      errors?: Array<{ message: string }>
      data?: { createDiscussion?: { discussion?: { url?: string } } }
    }

    if (result.errors && result.errors.length > 0) {
      console.error('Failed to create GitHub discussion:', result.errors)
      return 'failed'
    }

    console.log(
      'GitHub discussion created:',
      result?.data?.createDiscussion?.discussion?.url ?? 'unknown URL',
    )
    return 'sent'
  } catch (error) {
    console.error('GitHub discussion notification failed.', error)
    return 'failed'
  }
}

async function writeSubscriptionLog(
  summaries: Summary[],
  status: { slack: NotificationStatus; email: NotificationStatus; discussion: NotificationStatus },
) {
  if (process.env.CI === 'true') {
    console.log('CI environment detected; subscription log entry skipped.')
    return
  }

  const logDir = path.join(repoRoot, 'docs', 'governance', 'subscription-log')
  const now = new Date()
  const dateKey = now.toISOString().split('T')[0]
  const logPath = path.join(logDir, `${dateKey}.md`)

  const header = `# ${dateKey} Stage D 订阅推送\n\n`
  const entryLines = [
    `## ${now.toISOString()}`,
    '',
    ...summaries.map((summary) => `- ${summary.filePath} → ${summary.heading}`),
    '',
    `Slack: ${status.slack}`,
    `Email: ${status.email}`,
    `Discussion: ${status.discussion}`,
    '',
    STAGE_D_TAG,
    '',
  ]
  const entry = entryLines.join('\n')

  await mkdir(logDir, { recursive: true })

  try {
    await stat(logPath)
  } catch {
    await writeFile(logPath, header, 'utf-8')
  }

  await appendFile(logPath, entry, 'utf-8')
  console.log(`Subscription log updated: ${path.relative(repoRoot, logPath)}`)
}

function runGit(command: string, suppressError = false): string {
  try {
    return execSync(`git ${command}`, {
      cwd: repoRoot,
      encoding: 'utf-8',
    })
      .toString()
      .trim()
  } catch (error) {
    if (!suppressError) {
      console.error(`Failed to run "git ${command}"`, error)
    }
    return ''
  }
}

function uniquePaths(raw: string): string[] {
  const set = new Set<string>()
  raw
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .forEach((line) => set.add(line.replace(/\\/g, '/')))
  return Array.from(set)
}

main().catch((error) => {
  console.error('changelog:notify execution failed.', error)
  process.exit(1)
})
