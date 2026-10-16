# Security Hardening for XSS, Token Handling, and Repo Hygiene Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Eliminate the Mermaid/XSS takeover path, migrate away from `localStorage` token exposure, and prevent secret leakage recurrence from repo/process gaps.

**Architecture:** Apply a staged security hardening strategy: first remove the immediate client-side injection sink and add defense-in-depth, then replace browser-readable auth persistence with a safer auth transport model, and finally enforce repository-level guardrails that block sensitive data from entering git history again. Use feature flags for backward-compatible rollout where backend coupling is required.

**Tech Stack:** React 19 + TypeScript + Vite + Jest (`ts-jest`) + Husky + lint-staged

---

### Task 1: Lock Down Mermaid Rendering Surface (Audit #2 Core)

**Files:**

- Modify: `src/components/ContentRenderer/MermaidChart.tsx`
- Create: `src/components/ContentRenderer/MermaidChart.test.tsx`
- Modify: `src/components/ContentRenderer/index.tsx`

**Step 1: Write the failing test**

```tsx
// src/components/ContentRenderer/MermaidChart.test.tsx
import { render, screen } from '@testing-library/react'
import { MermaidChart } from './MermaidChart'

jest.mock('mermaid', () => ({
  __esModule: true,
  default: {
    initialize: jest.fn(),
    parse: jest.fn().mockResolvedValue(undefined),
    render: jest.fn().mockResolvedValue({
      svg: '<svg><script>alert(1)</script><rect width="10" height="10"/></svg>',
    }),
  },
}))

test('blocks unsafe mermaid svg payload', async () => {
  render(<MermaidChart chart={'graph TD;A-->B'} />)
  expect(await screen.findByText(/Chart Error/i)).toBeInTheDocument()
  expect(document.querySelector('script')).toBeNull()
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- src/components/ContentRenderer/MermaidChart.test.tsx --runInBand`  
Expected: FAIL because current implementation still accepts unsafe SVG injection path.

**Step 3: Write minimal implementation**

```tsx
// Mermaid init
mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  securityLevel: 'strict',
  fontFamily: 'inherit',
  logLevel: 'error',
})

// sanitize before render
const sanitizedSvg = window.DOMPurify?.sanitize(svg, {
  USE_PROFILES: { svg: true, svgFilters: true },
  FORBID_TAGS: ['script', 'foreignObject'],
  FORBID_ATTR: [/^on/i],
})

if (!sanitizedSvg || UNSAFE_SVG_PATTERN.test(sanitizedSvg)) {
  throw new Error('SVG output contains potentially unsafe content')
}
setSvgContent(sanitizedSvg)
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- src/components/ContentRenderer/MermaidChart.test.tsx --runInBand`  
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/ContentRenderer/MermaidChart.tsx src/components/ContentRenderer/MermaidChart.test.tsx src/components/ContentRenderer/index.tsx
git commit -m "fix(security): harden mermaid rendering and add xss regression test"
```

### Task 2: Add Browser-Level Defense-in-Depth for Script Injection

**Files:**

- Modify: `index.html`
- Modify: `vite.config.ts`
- Create: `src/config/security.ts`

**Step 1: Write the failing test**

```ts
// src/config/security.test.ts
import { SECURITY_HEADERS } from './security'

test('csp blocks inline scripts', () => {
  expect(SECURITY_HEADERS['Content-Security-Policy']).toContain("script-src 'self'")
  expect(SECURITY_HEADERS['Content-Security-Policy']).not.toContain("'unsafe-inline'")
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- src/config/security.test.ts --runInBand`  
Expected: FAIL because security header config does not exist yet.

**Step 3: Write minimal implementation**

```ts
// src/config/security.ts
export const SECURITY_HEADERS = {
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "connect-src 'self' https: wss:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
  ].join('; '),
}
```

```ts
// vite.config.ts
server: {
  headers: SECURITY_HEADERS,
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- src/config/security.test.ts --runInBand`  
Expected: PASS

**Step 5: Commit**

```bash
git add index.html vite.config.ts src/config/security.ts src/config/security.test.ts
git commit -m "feat(security): add csp baseline and header config"
```

### Task 3: Remove Browser-Readable Token Persistence (Audit #3 Phase 1)

**Files:**

- Modify: `src/api/core/token-storage.ts`
- Modify: `src/api/core/client-helpers.ts`
- Modify: `src/stores/useAuthStore.ts`
- Modify: `src/api/services/auth.service.ts`
- Create: `src/api/core/token-storage.test.ts`

**Step 1: Write the failing test**

```ts
// src/api/core/token-storage.test.ts
import { setAccessToken, getAccessToken, clearAccessToken } from './token-storage'

test('does not persist token into localStorage in secure mode', () => {
  localStorage.clear()
  setAccessToken('token-123')
  expect(localStorage.getItem('access_token')).toBeNull()
  expect(getAccessToken()).toBe('token-123')
  clearAccessToken()
  expect(getAccessToken()).toBeNull()
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- src/api/core/token-storage.test.ts --runInBand`  
Expected: FAIL because current implementation writes into `localStorage`.

**Step 3: Write minimal implementation**

```ts
// token-storage.ts (phase 1)
let memoryToken: string | null = null

export function getAccessToken(): string | null {
  return memoryToken
}

export function setAccessToken(token: string): void {
  memoryToken = token.trim()
}

export function clearAccessToken(): void {
  memoryToken = null
}
```

Add feature flag fallback in `auth.service.ts`/`useAuthStore.ts`:

- `VITE_AUTH_STORAGE_MODE=legacy_local_storage | memory_only`
- default to `memory_only` for security builds.

**Step 4: Run test to verify it passes**

Run: `npm run test -- src/api/core/token-storage.test.ts --runInBand`  
Expected: PASS

**Step 5: Commit**

```bash
git add src/api/core/token-storage.ts src/api/core/token-storage.test.ts src/api/core/client-helpers.ts src/stores/useAuthStore.ts src/api/services/auth.service.ts
git commit -m "refactor(auth): remove localstorage token persistence via memory token provider"
```

### Task 4: Move to HttpOnly Cookie Session (Audit #3 Phase 2, Backend-Coupled)

**Files:**

- Create: `docs/security/2026-02-15-cookie-session-contract.md`
- Modify: `src/api/core/client-helpers.ts`
- Modify: `src/api/services/auth.service.ts`
- Modify: `src/stores/useAuthStore.ts`
- Create: `src/api/core/auth-mode.test.ts`

**Step 1: Write the failing test**

```ts
// src/api/core/auth-mode.test.ts
import { buildAuthFetchOptions } from './client-helpers'

test('cookie auth mode uses credentials include and no bearer header', () => {
  const options = buildAuthFetchOptions({ authMode: 'cookie', token: 'abc' })
  expect(options.credentials).toBe('include')
  expect((options.headers as Record<string, string>).Authorization).toBeUndefined()
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- src/api/core/auth-mode.test.ts --runInBand`  
Expected: FAIL because current helper always injects bearer token.

**Step 3: Write minimal implementation**

```ts
// client-helpers.ts
if (authMode === 'cookie') {
  fetchOptions.credentials = 'include'
  delete headers.Authorization
} else if (token) {
  headers.Authorization = `Bearer ${token}`
}
```

Document backend requirements in `docs/security/2026-02-15-cookie-session-contract.md`:

- `Set-Cookie: HttpOnly; Secure; SameSite=Lax/Strict`
- CSRF token endpoint and validation header
- login/logout/session-refresh contract

**Step 4: Run test to verify it passes**

Run: `npm run test -- src/api/core/auth-mode.test.ts --runInBand`  
Expected: PASS

**Step 5: Commit**

```bash
git add docs/security/2026-02-15-cookie-session-contract.md src/api/core/client-helpers.ts src/api/core/auth-mode.test.ts src/api/services/auth.service.ts src/stores/useAuthStore.ts
git commit -m "feat(auth): add cookie-session auth mode and backend contract doc"
```

### Task 5: Enforce Repo Hygiene Guardrails (Audit #5 Prevention)

**Files:**

- Modify: `.gitignore`
- Modify: `.husky/pre-commit`
- Modify: `package.json`
- Create: `scripts/security/scan-secrets.mjs`
- Create: `scripts/security/scan-secrets.test.mjs`

**Step 1: Write the failing test**

```js
// scripts/security/scan-secrets.test.mjs
import { detectSecrets } from './scan-secrets.mjs'

test('detects leaked sk key and app key patterns', () => {
  const text = 'api_key=sk-EXAMPLE-REDACTED'
  const findings = detectSecrets(text, 'tmp/test.json')
  expect(findings.length).toBeGreaterThan(0)
})
```

**Step 2: Run test to verify it fails**

Run: `node --test scripts/security/scan-secrets.test.mjs`  
Expected: FAIL because scanner does not exist yet.

**Step 3: Write minimal implementation**

```js
// scripts/security/scan-secrets.mjs
const PATTERNS = [/sk-[A-Za-z0-9]{20,}/g, /app-[A-Za-z0-9]{20,}/g, /AKIA[0-9A-Z]{16}/g]
```

Update `.gitignore`:

- ignore `tmp/**`
- keep only curated sanitized fixtures via allowlist (example: `!tmp/README.md` if needed)

Update pre-commit:

```sh
npm run lint-staged
npm run security:scan-staged
```

**Step 4: Run test to verify it passes**

Run: `node --test scripts/security/scan-secrets.test.mjs`  
Expected: PASS

**Step 5: Commit**

```bash
git add .gitignore .husky/pre-commit package.json scripts/security/scan-secrets.mjs scripts/security/scan-secrets.test.mjs
git commit -m "chore(security): add secret scanning guardrails and tmp ignore policy"
```

### Task 6: Clean Existing Tracked Artifacts and Rotate Compromised Credentials (Audit #5 Remediation)

**Files:**

- Modify: `tmp/workspace-generate-flow-check.json` (sanitize or remove from tracking)
- Modify: `tmp/api-doc-baseline-check.json` (sanitize or remove from tracking)
- Modify: `tmp/api_doc_from_git.md` (sanitize or remove from tracking)
- Create: `docs/security/2026-02-15-credential-rotation-runbook.md`

**Step 1: Write the failing test**

```bash
git grep -n -E "sk-[A-Za-z0-9]{20,}|app-[A-Za-z0-9]{20,}|api_key|credentials" -- tmp
```

Expected initially: non-empty output.

**Step 2: Run check to verify it fails**

Run: `git grep -n -E "sk-[A-Za-z0-9]{20,}|app-[A-Za-z0-9]{20,}" -- tmp`  
Expected: matches leaked values.

**Step 3: Write minimal implementation**

- De-track unsafe temp artifacts (`git rm --cached` for sensitive files).
- Replace with sanitized fixture samples if workflow evidence must be retained.
- Write runbook for credential rotation:
  - revoke old keys
  - issue new keys
  - invalidate dependent tokens/sessions
  - verify no old key accepted

**Step 4: Run check to verify it passes**

Run: `git grep -n -E "sk-[A-Za-z0-9]{20,}|app-[A-Za-z0-9]{20,}" -- tmp`  
Expected: no output.

**Step 5: Commit**

```bash
git add tmp docs/security/2026-02-15-credential-rotation-runbook.md
git commit -m "chore(security): purge tracked sensitive artifacts and add rotation runbook"
```

### Task 7: Full Verification Gate (Cross-Issue Closure)

**Files:**

- Modify: `docs/security/2026-02-15-security-closure-checklist.md`

**Step 1: Write the failing check list**

```md
- [ ] Mermaid XSS regression tests pass
- [ ] Auth token is not readable from localStorage
- [ ] Secret scanner blocks staged leaks
- [ ] tmp no longer contains raw secret payloads
```

**Step 2: Run verification to verify current gaps**

Run:

- `npm run test -- --runInBand`
- `npm run lint`
- `npm run type-check`
- `npm run security:scan`
- `git grep -n -E "sk-[A-Za-z0-9]{20,}|app-[A-Za-z0-9]{20,}" -- .`

Expected: at least one check fails before all remediation tasks complete.

**Step 3: Write minimal implementation**

- Close all pending checklist items by applying Task 1-6 outputs.
- Record command outputs and timestamps in closure doc.

**Step 4: Re-run verification to verify it passes**

Expected:

- all commands exit `0`
- grep returns no leaked key signatures in tracked files

**Step 5: Commit**

```bash
git add docs/security/2026-02-15-security-closure-checklist.md
git commit -m "docs(security): add closure checklist and verification evidence"
```
