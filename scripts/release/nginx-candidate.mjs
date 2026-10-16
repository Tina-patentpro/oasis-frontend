#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { extractMetaCsp } from '../build/check-production-output.mjs'

const DEFAULT_SECURITY_INCLUDE =
  '/etc/nginx/snippets/oasis-frontend-security-headers.conf'

function validateProductionCsp(csp) {
  if (!csp || /[\r\n"]/.test(csp)) {
    throw new Error('CSP is empty or unsafe for an nginx quoted header value.')
  }
  if (/localhost|127\.0\.0\.1/.test(csp)) {
    throw new Error('Refusing to generate nginx headers from a CSP with local origins.')
  }
  if (!csp.includes("form-action 'self'")) {
    throw new Error("Refusing to generate nginx headers without form-action 'self'.")
  }
}

export function buildSecurityHeaderSnippet(csp, phase) {
  validateProductionCsp(csp)
  if (phase !== 'report-only' && phase !== 'enforced') {
    throw new Error(`Unsupported nginx candidate phase: ${phase}`)
  }

  const cspWithFrameProtection = `${csp}; frame-ancestors 'none'`
  const cspHeader =
    phase === 'report-only'
      ? 'Content-Security-Policy-Report-Only'
      : 'Content-Security-Policy'
  const hstsMaxAge = phase === 'report-only' ? 300 : 31_536_000

  return [
    '# Include this file in every location that declares add_header.',
    `add_header ${cspHeader} "${cspWithFrameProtection}" always;`,
    'add_header X-Frame-Options "DENY" always;',
    'add_header X-Content-Type-Options "nosniff" always;',
    'add_header Referrer-Policy "strict-origin-when-cross-origin" always;',
    'add_header Permissions-Policy "camera=(), geolocation=(), microphone=()" always;',
    `add_header Strict-Transport-Security "max-age=${hstsMaxAge}" always;`,
    '',
  ].join('\n')
}

export function buildLocationSnippet({
  securityIncludePath = DEFAULT_SECURITY_INCLUDE,
} = {}) {
  if (!securityIncludePath.startsWith('/') || /[\r\n;]/.test(securityIncludePath)) {
    throw new Error('Security include path must be an absolute nginx path without delimiters.')
  }

  const includeSecurity = `include ${securityIncludePath};`
  return [
    '# Include inside the existing HTTPS server block after read-only baseline review.',
    '# Regex .map handling intentionally takes precedence over the /assets/ prefix.',
    'location ~* \\.map$ {',
    `    ${includeSecurity}`,
    '    add_header Cache-Control "no-store" always;',
    '    return 404;',
    '}',
    '',
    'location /assets/ {',
    `    ${includeSecurity}`,
    '    add_header Cache-Control "public, max-age=31536000, immutable" always;',
    '    try_files $uri =404;',
    '}',
    '',
    'location = /index.html {',
    `    ${includeSecurity}`,
    '    add_header Cache-Control "no-cache" always;',
    '    try_files $uri =404;',
    '}',
    '',
    'location ^~ /help/ {',
    `    ${includeSecurity}`,
    '    add_header Cache-Control "no-cache" always;',
    '    try_files $uri =404;',
    '}',
    '',
    'location = /api {',
    `    ${includeSecurity}`,
    '    add_header Cache-Control "no-store" always;',
    '    return 404;',
    '}',
    '',
    'location ^~ /api/ {',
    `    ${includeSecurity}`,
    '    add_header Cache-Control "no-store" always;',
    '    return 404;',
    '}',
    '',
    'location / {',
    `    ${includeSecurity}`,
    '    add_header Cache-Control "no-cache" always;',
    '    try_files $uri $uri/ /index.html;',
    '}',
    '',
  ].join('\n')
}

export function buildCandidateReadme({ securityIncludePath = DEFAULT_SECURITY_INCLUDE } = {}) {
  return `# Oasis frontend nginx candidate

This directory is a local candidate only. It must not overwrite an existing remote file.

1. Collect nginx -V, nginx -T, resolved document root, include graph and SHA-256 baselines.
2. Confirm the intended new include paths do not exist.
3. Start with oasis-frontend-security-headers-report-only.conf.
4. Install the selected security header content at ${securityIncludePath}, or update the
   locations include path after reviewing the active server context.
5. Include oasis-frontend-locations.conf inside the existing HTTPS server block.
6. Run nginx -t before reload, then run the read-only live verifier.
7. Promote to the enforced header only after real-account CSP review is clean.

Do not enable HSTS preload. Do not overwrite immutable assets at an existing URL.
`
}

export async function writeNginxCandidate({
  distDirectory,
  outputDirectory,
  securityIncludePath = DEFAULT_SECURITY_INCLUDE,
}) {
  const indexHtml = await readFile(path.join(distDirectory, 'index.html'), 'utf8')
  const csp = extractMetaCsp(indexHtml)
  validateProductionCsp(csp)
  await mkdir(outputDirectory, { recursive: true })

  const files = new Map([
    [
      'oasis-frontend-security-headers-report-only.conf',
      buildSecurityHeaderSnippet(csp, 'report-only'),
    ],
    [
      'oasis-frontend-security-headers-enforced.conf',
      buildSecurityHeaderSnippet(csp, 'enforced'),
    ],
    [
      'oasis-frontend-locations.conf',
      buildLocationSnippet({ securityIncludePath }),
    ],
    ['README.md', buildCandidateReadme({ securityIncludePath })],
  ])

  for (const [fileName, content] of files) {
    await writeFile(path.join(outputDirectory, fileName), content, {
      encoding: 'utf8',
      flag: 'wx',
    })
  }

  return [...files.keys()]
}

function parseArguments(argv) {
  const options = {
    distDirectory: 'dist',
    outputDirectory: '',
    securityIncludePath: DEFAULT_SECURITY_INCLUDE,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]
    const value = argv[index + 1]
    if (argument === '--dist' && value) {
      options.distDirectory = value
      index += 1
    } else if (argument === '--output' && value) {
      options.outputDirectory = value
      index += 1
    } else if (argument === '--security-include' && value) {
      options.securityIncludePath = value
      index += 1
    } else {
      throw new Error(`Unsupported nginx candidate argument: ${argument}`)
    }
  }

  if (!options.outputDirectory) {
    throw new Error('Missing required --output directory.')
  }
  return options
}

async function main() {
  const options = parseArguments(process.argv.slice(2))
  const files = await writeNginxCandidate(options)
  console.log(`Created nginx candidate without overwrites: ${files.join(', ')}`)
}

const isMain =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
}
