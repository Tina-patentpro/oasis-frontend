import test from 'node:test'
import assert from 'node:assert/strict'

import {
  DEV_TOOLING_EXCEPTION,
  REACT_ROUTER_EXCEPTION,
  evaluateFullAudit,
  evaluateProductionAudit,
} from './audit-production.mjs'

const allowedReport = {
  auditReportVersion: 2,
  vulnerabilities: {
    'react-router': {
      name: 'react-router',
      severity: 'high',
      via: [
        {
          name: 'react-router',
          severity: 'high',
          url: 'https://github.com/advisories/GHSA-qwww-vcr4-c8h2',
        },
      ],
    },
    'react-router-dom': {
      name: 'react-router-dom',
      severity: 'high',
      via: ['react-router'],
    },
  },
}

const declarativeContext = {
  packageJson: {
    dependencies: {
      'react-router-dom': '^7.18.1',
    },
    devDependencies: {},
  },
  packageLock: {
    packages: {
      'node_modules/react-router': { version: '7.18.1' },
      'node_modules/react-router-dom': { version: '7.18.1' },
    },
  },
  installedVersions: {
    'react-router': '7.18.1',
    'react-router-dom': '7.18.1',
  },
  sources: [
    {
      path: 'src/main.tsx',
      content:
        "import { BrowserRouter } from 'react-router-dom'\nroot.render(<BrowserRouter><App /></BrowserRouter>)",
    },
    {
      path: 'src/app/App.tsx',
      content:
        "import { Route, Routes } from 'react-router-dom'\nexport const App = () => <Routes><Route /></Routes>",
    },
  ],
  now: new Date('2026-07-27T00:00:00Z'),
}

test('allows only the pinned React Router RSC advisory in declarative mode', () => {
  const result = evaluateProductionAudit(allowedReport, declarativeContext)

  assert.deepEqual(result.allowedAdvisories, [
    REACT_ROUTER_EXCEPTION.advisoryId,
  ])
  assert.deepEqual(result.blockingFindings, [])
})

test('rejects any additional high-severity advisory', () => {
  const report = structuredClone(allowedReport)
  report.vulnerabilities['react-router'].via.push({
    name: 'react-router',
    severity: 'high',
    url: 'https://github.com/advisories/GHSA-unexpected-high',
  })

  assert.throws(
    () => evaluateProductionAudit(report, declarativeContext),
    /GHSA-unexpected-high/,
  )
})

test('rejects the exception when RSC or framework-mode imports appear', () => {
  const context = structuredClone(declarativeContext)
  context.sources.push({
    path: 'src/server.ts',
    content: "import { RSCHydratedRouter } from 'react-router/rsc'",
  })

  assert.throws(
    () => evaluateProductionAudit(allowedReport, context),
    /RSC or framework-mode runtime surface/,
  )
})

test('rejects the exception when the reviewed package version drifts', () => {
  const context = structuredClone(declarativeContext)
  context.installedVersions['react-router'] = '7.18.2'

  assert.throws(
    () => evaluateProductionAudit(allowedReport, context),
    /expected react-router@7\.18\.1/,
  )
})

test('rejects the exception after its review deadline', () => {
  const context = structuredClone(declarativeContext)
  context.now = new Date('2026-11-01T00:00:00Z')

  assert.throws(
    () => evaluateProductionAudit(allowedReport, context),
    /expired on 2026-10-31/,
  )
})

test('passes a clean audit without consuming an exception', () => {
  const result = evaluateProductionAudit(
    { auditReportVersion: 2, vulnerabilities: {} },
    declarativeContext,
  )

  assert.deepEqual(result, {
    allowedAdvisories: [],
    blockingFindings: [],
  })
})

test('rejects malformed or registry-error audit output', () => {
  assert.throws(
    () =>
      evaluateProductionAudit(
        { error: { summary: 'registry unavailable' } },
        declarativeContext,
      ),
    /registry unavailable/,
  )
})

test('full audit allows only the guarded dev-only brace-expansion advisory chain', () => {
  const report = structuredClone(allowedReport)
  report.vulnerabilities['brace-expansion'] = {
    name: 'brace-expansion',
    severity: 'high',
    via: [
      {
        name: 'brace-expansion',
        severity: 'high',
        url: 'https://github.com/advisories/GHSA-mh99-v99m-4gvg',
      },
    ],
  }
  report.vulnerabilities.minimatch = {
    name: 'minimatch',
    severity: 'high',
    via: ['brace-expansion'],
  }
  report.vulnerabilities.eslint = {
    name: 'eslint',
    severity: 'high',
    via: ['minimatch'],
  }
  const context = structuredClone(declarativeContext)
  context.packageJson.devDependencies.eslint = '^9.38.0'
  context.packageLock.packages['node_modules/brace-expansion'] = {
    version: '2.1.2',
    dev: true,
  }
  context.packageLock.packages[
    'node_modules/eslint/node_modules/brace-expansion'
  ] = {
    version: '1.1.16',
    dev: true,
  }

  const result = evaluateFullAudit(report, context)

  assert.deepEqual(result.allowedAdvisories, [
    REACT_ROUTER_EXCEPTION.advisoryId,
    DEV_TOOLING_EXCEPTION.advisoryId,
  ].sort())
  assert.deepEqual(result.blockingFindings, [])
})

test('full audit rejects brace-expansion when any reviewed copy is not dev-only', () => {
  const report = {
    auditReportVersion: 2,
    vulnerabilities: {
      'brace-expansion': {
        name: 'brace-expansion',
        severity: 'high',
        via: [
          {
            name: 'brace-expansion',
            severity: 'high',
            url: 'https://github.com/advisories/GHSA-mh99-v99m-4gvg',
          },
        ],
      },
    },
  }
  const context = structuredClone(declarativeContext)
  context.packageLock.packages['node_modules/brace-expansion'] = {
    version: '2.1.2',
    dev: false,
  }

  assert.throws(
    () => evaluateFullAudit(report, context),
    /must remain dev-only/,
  )
})

test('full audit rejects runtime imports of the guarded glob toolchain', () => {
  const report = {
    auditReportVersion: 2,
    vulnerabilities: {
      'brace-expansion': {
        name: 'brace-expansion',
        severity: 'high',
        via: [
          {
            name: 'brace-expansion',
            severity: 'high',
            url: 'https://github.com/advisories/GHSA-mh99-v99m-4gvg',
          },
        ],
      },
    },
  }
  const context = structuredClone(declarativeContext)
  context.packageLock.packages['node_modules/brace-expansion'] = {
    version: '2.1.2',
    dev: true,
  }
  context.sources.push({
    path: 'src/runtime-glob.ts',
    content: "import { minimatch } from 'minimatch'",
  })

  assert.throws(
    () => evaluateFullAudit(report, context),
    /runtime source imports guarded development tooling/,
  )
})

test('full audit rejects an unreviewed brace-expansion version', () => {
  const report = {
    auditReportVersion: 2,
    vulnerabilities: {
      'brace-expansion': {
        name: 'brace-expansion',
        severity: 'high',
        via: [
          {
            name: 'brace-expansion',
            severity: 'high',
            url: 'https://github.com/advisories/GHSA-mh99-v99m-4gvg',
          },
        ],
      },
    },
  }
  const context = structuredClone(declarativeContext)
  context.packageLock.packages['node_modules/brace-expansion'] = {
    version: '2.1.3',
    dev: true,
  }

  assert.throws(
    () => evaluateFullAudit(report, context),
    /expected one of 1\.1\.16, 2\.1\.2/,
  )
})

test('full audit rejects the dev-tooling exception after its deadline', () => {
  const report = {
    auditReportVersion: 2,
    vulnerabilities: {
      'brace-expansion': {
        name: 'brace-expansion',
        severity: 'high',
        via: [
          {
            name: 'brace-expansion',
            severity: 'high',
            url: 'https://github.com/advisories/GHSA-mh99-v99m-4gvg',
          },
        ],
      },
    },
  }
  const context = structuredClone(declarativeContext)
  context.packageLock.packages['node_modules/brace-expansion'] = {
    version: '2.1.2',
    dev: true,
  }
  context.now = new Date('2026-09-01T00:00:00Z')

  assert.throws(
    () => evaluateFullAudit(report, context),
    /expired on 2026-08-31/,
  )
})
