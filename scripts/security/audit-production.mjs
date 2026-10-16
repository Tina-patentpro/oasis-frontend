import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const SCRIPT_PATH = fileURLToPath(import.meta.url)
const REPO_ROOT = path.resolve(path.dirname(SCRIPT_PATH), '..', '..')
const BLOCKING_SEVERITIES = new Set(['high', 'critical'])

export const REACT_ROUTER_EXCEPTION = Object.freeze({
  advisoryId: 'GHSA-qwww-vcr4-c8h2',
  packageName: 'react-router',
  reviewedVersion: '7.18.1',
  declaredRange: '^7.18.1',
  expiresOn: '2026-10-31',
  applicability:
    'The advisory affects the unstable React Server Components surface; this application is guarded to React Router declarative mode.',
})

export const DEV_TOOLING_EXCEPTION = Object.freeze({
  advisoryId: 'GHSA-mh99-v99m-4gvg',
  packageName: 'brace-expansion',
  reviewedVersions: Object.freeze(['1.1.16', '2.1.2']),
  expiresOn: '2026-08-31',
  applicability:
    'The affected brace expansion copies are guarded to development-only lint and test tooling with repository-controlled patterns.',
})

const FORBIDDEN_RUNTIME_PATTERNS = [
  {
    label: 'React Router RSC subpath',
    pattern: /['"]react-router\/rsc(?:\/[^'"]*)?['"]/,
  },
  {
    label: 'React Router server or framework package',
    pattern: /['"]@react-router\/[^'"]+['"]/,
  },
  {
    label: 'RSC or framework-mode runtime surface',
    pattern:
      /\b(?:RSCHydratedRouter|RSCStaticRouter|routeRSCServerRequest|unstable_RSC\w*|createCallServer)\b/,
  },
]

function advisoryIdFrom(value) {
  const match = String(value ?? '').match(/\bGHSA-[a-z0-9-]+\b/i)
  return match?.[0] ?? null
}

function severityIsBlocking(severity) {
  return BLOCKING_SEVERITIES.has(String(severity ?? '').toLowerCase())
}

function auditErrorMessage(report) {
  const error = report?.error
  if (!error) return null
  if (typeof error === 'string') return error
  return error.summary ?? error.message ?? JSON.stringify(error)
}

function validateDeclarativeModeContext(context) {
  const exception = REACT_ROUTER_EXCEPTION
  const { packageJson, packageLock, installedVersions, sources, now } = context
  const errors = []

  const declaredVersion = packageJson?.dependencies?.['react-router-dom']
  if (declaredVersion !== exception.declaredRange) {
    errors.push(
      `expected react-router-dom dependency ${exception.declaredRange}, received ${declaredVersion ?? 'missing'}`,
    )
  }

  for (const packageName of ['react-router', 'react-router-dom']) {
    const lockedVersion =
      packageLock?.packages?.[`node_modules/${packageName}`]?.version
    const installedVersion = installedVersions?.[packageName]
    if (lockedVersion !== exception.reviewedVersion) {
      errors.push(
        `expected locked ${packageName}@${exception.reviewedVersion}, received ${lockedVersion ?? 'missing'}`,
      )
    }
    if (installedVersion !== exception.reviewedVersion) {
      errors.push(
        `expected ${packageName}@${exception.reviewedVersion}, received ${installedVersion ?? 'missing'}`,
      )
    }
  }

  const dependencyNames = [
    ...Object.keys(packageJson?.dependencies ?? {}),
    ...Object.keys(packageJson?.devDependencies ?? {}),
  ]
  const frameworkDependencies = dependencyNames.filter((name) =>
    name.startsWith('@react-router/'),
  )
  if (frameworkDependencies.length > 0) {
    errors.push(
      `RSC or framework-mode runtime surface detected in dependencies: ${frameworkDependencies.join(', ')}`,
    )
  }

  for (const source of sources ?? []) {
    for (const forbidden of FORBIDDEN_RUNTIME_PATTERNS) {
      if (forbidden.pattern.test(source.content)) {
        errors.push(`${forbidden.label} detected in ${source.path}`)
      }
    }
  }

  const mainSource = (sources ?? []).find(
    (source) => source.path.replaceAll('\\', '/') === 'src/main.tsx',
  )
  const usesDeclarativeRouter =
    mainSource?.content.includes('BrowserRouter') &&
    /from\s+['"]react-router-dom['"]/.test(mainSource.content)
  if (!usesDeclarativeRouter) {
    errors.push(
      'declarative BrowserRouter entry was not found in src/main.tsx',
    )
  }

  const expiry = new Date(`${exception.expiresOn}T23:59:59.999Z`)
  const reviewTime = now instanceof Date ? now : new Date(now)
  if (
    Number.isNaN(reviewTime.getTime()) ||
    reviewTime.getTime() > expiry.getTime()
  ) {
    errors.push(`dependency exception expired on ${exception.expiresOn}`)
  }

  if (errors.length > 0) {
    throw new Error(
      `React Router contextual exception guard failed:\n- ${errors.join('\n- ')}`,
    )
  }
}

function validateDevToolingContext(context) {
  const exception = DEV_TOOLING_EXCEPTION
  const { packageJson, packageLock, sources, now } = context
  const errors = []
  const braceRecords = Object.entries(packageLock?.packages ?? {}).filter(
    ([packagePath]) => packagePath.endsWith('node_modules/brace-expansion'),
  )

  if (braceRecords.length === 0) {
    errors.push('no reviewed brace-expansion package-lock entries were found')
  }
  for (const [packagePath, record] of braceRecords) {
    if (record.dev !== true) {
      errors.push(`${packagePath} must remain dev-only`)
    }
    if (!exception.reviewedVersions.includes(record.version)) {
      errors.push(
        `${packagePath} expected one of ${exception.reviewedVersions.join(', ')}, received ${record.version ?? 'missing'}`,
      )
    }
  }

  const runtimeDependencies = ['brace-expansion', 'glob', 'minimatch'].filter(
    (name) => packageJson?.dependencies?.[name],
  )
  if (runtimeDependencies.length > 0) {
    errors.push(
      `guarded development tooling appears in runtime dependencies: ${runtimeDependencies.join(', ')}`,
    )
  }

  const runtimeImportPattern =
    /(?:from\s+|import\s*\(|require\s*\()\s*['"](?:brace-expansion|glob|minimatch)['"]/
  for (const source of sources ?? []) {
    if (runtimeImportPattern.test(source.content)) {
      errors.push(
        `runtime source imports guarded development tooling in ${source.path}`,
      )
    }
  }

  const expiry = new Date(`${exception.expiresOn}T23:59:59.999Z`)
  const reviewTime = now instanceof Date ? now : new Date(now)
  if (
    Number.isNaN(reviewTime.getTime()) ||
    reviewTime.getTime() > expiry.getTime()
  ) {
    errors.push(`dependency exception expired on ${exception.expiresOn}`)
  }

  if (errors.length > 0) {
    throw new Error(
      `Development tooling contextual exception guard failed:\n- ${errors.join('\n- ')}`,
    )
  }
}

function isAllowedRootAdvisory(packageName, advisoryId, allowDevTooling) {
  if (
    packageName === REACT_ROUTER_EXCEPTION.packageName &&
    advisoryId === REACT_ROUTER_EXCEPTION.advisoryId
  ) {
    return true
  }
  return (
    allowDevTooling &&
    packageName === DEV_TOOLING_EXCEPTION.packageName &&
    advisoryId === DEV_TOOLING_EXCEPTION.advisoryId
  )
}

function evaluateAudit(report, context, { allowDevTooling, scopeLabel }) {
  const registryError = auditErrorMessage(report)
  if (registryError) {
    throw new Error(`npm audit failed: ${registryError}`)
  }
  if (report?.auditReportVersion !== 2 || !report.vulnerabilities) {
    throw new Error('npm audit returned an unsupported or malformed report')
  }

  const blockingRecords = Object.entries(report.vulnerabilities).filter(
    ([, vulnerability]) => severityIsBlocking(vulnerability?.severity),
  )
  const allowedPackages = new Set()
  const allowedAdvisories = new Set()
  const pending = new Map()

  for (const [packageName, vulnerability] of blockingRecords) {
    pending.set(packageName, {
      advisories: (vulnerability.via ?? [])
        .filter(
          (via) =>
            typeof via === 'object' &&
            via !== null &&
            severityIsBlocking(via.severity ?? vulnerability.severity),
        )
        .map((via) => ({
          id:
            advisoryIdFrom(via.url) ??
            advisoryIdFrom(via.title) ??
            advisoryIdFrom(via.name),
          label: via.title,
        })),
      inheritedPackages: (vulnerability.via ?? []).filter(
        (via) => typeof via === 'string',
      ),
    })
  }

  let madeProgress = true
  while (madeProgress && pending.size > 0) {
    madeProgress = false
    for (const [packageName, finding] of pending) {
      const hasAttribution =
        finding.advisories.length > 0 ||
        finding.inheritedPackages.length > 0
      const advisoriesAllowed = finding.advisories.every(
        (advisory) =>
          advisory.id &&
          isAllowedRootAdvisory(
            packageName,
            advisory.id,
            allowDevTooling,
          ),
      )
      const inheritedAllowed = finding.inheritedPackages.every(
        (inheritedPackage) => allowedPackages.has(inheritedPackage),
      )

      if (hasAttribution && advisoriesAllowed && inheritedAllowed) {
        allowedPackages.add(packageName)
        for (const advisory of finding.advisories) {
          allowedAdvisories.add(advisory.id)
        }
        pending.delete(packageName)
        madeProgress = true
      }
    }
  }

  const blockingFindings = [...pending].map(([packageName, finding]) => {
    const advisoryLabels = finding.advisories.map(
      (advisory) =>
        advisory.id ??
        advisory.label ??
        'unidentified high-severity advisory',
    )
    const inheritedLabels = finding.inheritedPackages.map(
      (dependency) => `inherits from ${dependency}`,
    )
    const labels = [...advisoryLabels, ...inheritedLabels]
    return `${packageName}: ${labels.join(', ') || 'high-severity vulnerability has no attributable advisory'}`
  })

  if (blockingFindings.length > 0) {
    throw new Error(
      `${scopeLabel} dependency audit blocked:\n- ${blockingFindings.join('\n- ')}`,
    )
  }

  if (allowedAdvisories.has(REACT_ROUTER_EXCEPTION.advisoryId)) {
    validateDeclarativeModeContext(context)
  }
  if (allowedAdvisories.has(DEV_TOOLING_EXCEPTION.advisoryId)) {
    validateDevToolingContext(context)
  }

  return {
    allowedAdvisories: [...allowedAdvisories].sort(),
    blockingFindings,
  }
}

export function evaluateProductionAudit(report, context) {
  return evaluateAudit(report, context, {
    allowDevTooling: false,
    scopeLabel: 'Production',
  })
}

export function evaluateFullAudit(report, context) {
  return evaluateAudit(report, context, {
    allowDevTooling: true,
    scopeLabel: 'Full',
  })
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function collectRuntimeSources(repoRoot) {
  const sources = []
  const sourceRoot = path.join(repoRoot, 'src')
  const acceptedExtensions = new Set(['.js', '.jsx', '.ts', '.tsx'])

  function visit(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const entryPath = path.join(directory, entry.name)
      if (entry.isDirectory()) {
        visit(entryPath)
      } else if (acceptedExtensions.has(path.extname(entry.name))) {
        sources.push({
          path: path.relative(repoRoot, entryPath),
          content: fs.readFileSync(entryPath, 'utf8'),
        })
      }
    }
  }

  visit(sourceRoot)
  const viteConfigPath = path.join(repoRoot, 'vite.config.ts')
  sources.push({
    path: path.relative(repoRoot, viteConfigPath),
    content: fs.readFileSync(viteConfigPath, 'utf8'),
  })
  return sources
}

function loadRepositoryContext(repoRoot) {
  const installedVersions = {}
  for (const packageName of ['react-router', 'react-router-dom']) {
    const installedPackage = readJson(
      path.join(repoRoot, 'node_modules', packageName, 'package.json'),
    )
    installedVersions[packageName] = installedPackage.version
  }

  return {
    packageJson: readJson(path.join(repoRoot, 'package.json')),
    packageLock: readJson(path.join(repoRoot, 'package-lock.json')),
    installedVersions,
    sources: collectRuntimeSources(repoRoot),
    now: new Date(),
  }
}

function resolveNpmCli() {
  if (process.env.npm_execpath && fs.existsSync(process.env.npm_execpath)) {
    return process.env.npm_execpath
  }
  return path.join(
    path.dirname(process.execPath),
    'node_modules',
    'npm',
    'bin',
    'npm-cli.js',
  )
}

function runAudit({
  repoRoot = REPO_ROOT,
  spawn = spawnSync,
  includeDev,
  evaluate,
}) {
  const npmCli = resolveNpmCli()
  if (!fs.existsSync(npmCli)) {
    throw new Error(`npm CLI not found: ${npmCli}`)
  }

  const auditArguments = [
    npmCli,
    'audit',
    ...(includeDev ? [] : ['--omit=dev']),
    '--audit-level=high',
    '--json',
    '--registry=https://registry.npmjs.org',
  ]
  const audit = spawn(
    process.execPath,
    auditArguments,
    {
      cwd: repoRoot,
      encoding: 'utf8',
      maxBuffer: 16 * 1024 * 1024,
      windowsHide: true,
    },
  )

  if (audit.error) {
    throw audit.error
  }
  let report
  try {
    report = JSON.parse(audit.stdout)
  } catch {
    const detail = audit.stderr.trim() || audit.stdout.trim() || 'no output'
    throw new Error(`npm audit did not return JSON: ${detail}`)
  }

  if (audit.status !== 0 && audit.status !== 1) {
    const registryError = auditErrorMessage(report)
    throw new Error(
      `npm audit exited with ${audit.status}: ${registryError ?? audit.stderr.trim()}`,
    )
  }

  return evaluate(report, loadRepositoryContext(repoRoot))
}

export function runProductionAudit(options = {}) {
  return runAudit({
    ...options,
    includeDev: false,
    evaluate: evaluateProductionAudit,
  })
}

export function runFullAudit(options = {}) {
  return runAudit({
    ...options,
    includeDev: true,
    evaluate: evaluateFullAudit,
  })
}

function main() {
  try {
    const result = runProductionAudit()
    if (result.allowedAdvisories.length > 0) {
      console.log(
        `[audit:prod:ci] PASS with guarded contextual exception: ${result.allowedAdvisories.join(', ')}`,
      )
      console.log(
        `[audit:prod:ci] Scope: react-router@${REACT_ROUTER_EXCEPTION.reviewedVersion}, declarative mode only; review by ${REACT_ROUTER_EXCEPTION.expiresOn}.`,
      )
    } else {
      console.log('[audit:prod:ci] PASS: no high or critical findings.')
    }
  } catch (error) {
    console.error(`[audit:prod:ci] FAIL: ${error.message}`)
    process.exitCode = 1
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === SCRIPT_PATH) {
  main()
}
