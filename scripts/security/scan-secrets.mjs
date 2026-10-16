import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const SECRET_PATTERNS = [
  { name: 'openai-sk', regex: /\bsk-[A-Za-z0-9]{20,}\b/g },
  { name: 'app-key', regex: /\bapp-[A-Za-z0-9]{20,}\b/g },
  { name: 'aws-akia', regex: /\bAKIA[0-9A-Z]{16}\b/g },
  { name: 'aws-asia', regex: /\bASIA[0-9A-Z]{16}\b/g },
]

const PRODUCTION_PASSWORD_LOGIN_PATTERN =
  /https:\/\/lzhxpy\.oasisintwrite\.com\/api\/auth\/pwdlogin/i
const PHONE_PASSWORD_COMBO_PATTERN =
  /(?:phone|mobile|tel|username)['"]?\s*:\s*['"]1[3-9]\d{9}['"][\s\S]{0,240}(?:password|pwd)['"]?\s*:\s*['"][^'"\s]{4,}['"]/i

const ALLOWLIST_PATTERNS = [/YOUR_[A-Z_]+_HERE/, /sk-\*+/, /app-\*+/]

const IGNORE_PATH_SEGMENTS = ['node_modules/', 'dist/', 'coverage/', '.git/']

const TEXT_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.json',
  '.md',
  '.yaml',
  '.yml',
  '.env',
  '.txt',
  '.py',
  '.sh',
  '.ps1',
  '.html',
  '.css',
  '.scss',
])

function isIgnoredPath(filePath) {
  const normalized = filePath.replace(/\\/g, '/')
  return IGNORE_PATH_SEGMENTS.some((segment) => normalized.includes(segment))
}

function isLikelyTextFile(filePath) {
  const ext = path.extname(filePath).toLowerCase()
  return TEXT_EXTENSIONS.has(ext) || ext.length === 0
}

function isAllowlisted(text) {
  return ALLOWLIST_PATTERNS.some((pattern) => pattern.test(text))
}

function isTestFilePath(filePath) {
  const normalized = filePath.replace(/\\/g, '/')
  return (
    normalized.includes('/__tests__/') ||
    normalized.endsWith('.test.ts') ||
    normalized.endsWith('.test.tsx') ||
    normalized.endsWith('.test.js') ||
    normalized.endsWith('.test.mjs')
  )
}

function maskSecret(secret) {
  if (secret.length <= 8) {
    return '********'
  }
  return `${secret.slice(0, 4)}****${secret.slice(-4)}`
}

export function detectSecrets(content, filePath) {
  const findings = []
  const lines = content.split(/\r?\n/)
  const skipBusinessCredentialRules = isTestFilePath(filePath)

  if (!skipBusinessCredentialRules && PRODUCTION_PASSWORD_LOGIN_PATTERN.test(content)) {
    findings.push({
      filePath,
      line: findFirstMatchingLine(lines, PRODUCTION_PASSWORD_LOGIN_PATTERN),
      kind: 'production-password-login',
      secret: 'production pwdlogin endpoint',
      masked: 'production-pwdlogin',
    })
  }

  if (!skipBusinessCredentialRules && PHONE_PASSWORD_COMBO_PATTERN.test(content)) {
    findings.push({
      filePath,
      line: findFirstMatchingLine(lines, /(?:phone|mobile|tel|username)['"]?\s*:/i),
      kind: 'phone-password-combo',
      secret: 'phone/password credential pair',
      masked: 'phone/password',
    })
  }

  lines.forEach((line, index) => {
    if (isAllowlisted(line)) {
      return
    }
    SECRET_PATTERNS.forEach(({ name, regex }) => {
      regex.lastIndex = 0
      let match = regex.exec(line)
      while (match) {
        findings.push({
          filePath,
          line: index + 1,
          kind: name,
          secret: match[0],
          masked: maskSecret(match[0]),
        })
        match = regex.exec(line)
      }
    })
  })

  return findings
}

function findFirstMatchingLine(lines, regex) {
  for (let index = 0; index < lines.length; index += 1) {
    regex.lastIndex = 0
    if (regex.test(lines[index])) {
      return index + 1
    }
  }
  return 1
}

function readUtf8Safe(filePath) {
  try {
    return readFileSync(filePath, 'utf8')
  } catch {
    return null
  }
}

function getStagedFiles() {
  const output = execSync('git diff --cached --name-only --diff-filter=ACMRTUXB', {
    encoding: 'utf8',
  }).trim()
  if (!output) {
    return []
  }
  return output.split(/\r?\n/).filter(Boolean)
}

function getTrackedFiles() {
  const output = execSync('git ls-files', { encoding: 'utf8' }).trim()
  if (!output) {
    return []
  }
  return output.split(/\r?\n/).filter(Boolean)
}

function getUntrackedFiles() {
  const output = execSync('git ls-files --others --exclude-standard', {
    encoding: 'utf8',
  }).trim()
  if (!output) {
    return []
  }
  return output.split(/\r?\n/).filter(Boolean)
}

export function mergeUniqueFiles(...fileGroups) {
  return [...new Set(fileGroups.flat().filter(Boolean))]
}

export function resolveScanFiles(args, fileSources) {
  if (args.has('--all')) {
    return mergeUniqueFiles(fileSources.tracked(), fileSources.untracked())
  }
  if (args.has('--all-tracked')) {
    return fileSources.tracked()
  }
  return fileSources.staged()
}

function scanFiles(files) {
  const findings = []
  files.forEach((filePath) => {
    if (isIgnoredPath(filePath) || !isLikelyTextFile(filePath)) {
      return
    }
    const content = readUtf8Safe(filePath)
    if (content == null) {
      return
    }
    findings.push(...detectSecrets(content, filePath))
  })
  return findings
}

function main() {
  const args = new Set(process.argv.slice(2))
  const files = resolveScanFiles(args, {
    staged: getStagedFiles,
    tracked: getTrackedFiles,
    untracked: getUntrackedFiles,
  })

  if (files.length === 0) {
    process.stdout.write('[security-scan] no files to scan\n')
    return
  }

  const findings = scanFiles(files)
  if (findings.length === 0) {
    process.stdout.write(`[security-scan] scanned ${files.length} files, no leaks found\n`)
    return
  }

  process.stderr.write(`[security-scan] found ${findings.length} potential secrets\n`)
  findings.forEach((item) => {
    process.stderr.write(
      `- ${item.filePath}:${item.line} [${item.kind}] ${item.masked}\n`,
    )
  })
  process.exitCode = 1
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main()
}
