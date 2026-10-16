# 绿洲前端项目规则（Project AGENTS）

## 1. Scope and communication

- Applies only to `D:\OneDrive\4、董娣相关\3、绿洲慧写3.0\绿洲前端`.
- Default to Chinese, conclusion first, executable steps, and plain-language explanations for unavoidable technical terms.
- Start from current Git status/diff, package.json, routes, state/API flow, shared components/tokens, tests, and the actual browser surface.
- Before user-visible work, read `D:\OneDrive\4、董娣相关\Codex\docs\codex-effectiveness\agents-governance\frontend-agents-quality-standard.md`.

## 2. Planning and implementation

- Non-trivial work needs a target contract and concise plan with actions, reasons, acceptance criteria, and progress states.
- Use minimal correct changes, existing architecture/design patterns, stable props/API contracts, and explicit loading/error/cancel behavior. Preserve authorization, analytics, i18n, telemetry, sanitization, validation, and unrelated user changes.
- For new or materially redesigned surfaces, define target user, purpose, brand/tone, visual direction, differentiation, content hierarchy, responsive intent, accessibility, and performance budget. Existing surfaces preserve the established design system unless redesign is explicit.
- Do not silently add dependencies, migrate framework/router/state/build tools, redesign the visual system, or refactor unrelated modules.
- Roles are capability-based; do not hard-code permanent model names. Delegation requires user/higher-priority authorization and bounded non-overlapping work.

## 3. Repository-accurate validation

- Frontend code: `npm run type-check`, `npm run lint`, the closest test (`npm test -- <test-path>`), then `npm run build:verify` when build/bundle behavior is relevant.
- Security/dependencies: `npm run security:scan`, `npm run deps:check`, and applicable `npm run audit:prod:ci`.
- API contracts: use non-mutating `npm run api:validate:ci`, `npm run api:drift:strict`, and `npm run api:docs:check` as triggered. Do not use trend-updating commands merely for validation.
- Scripts/tooling: `npm run scripts:test` when scripts change.
- User-visible paths: `npm run test:e2e` or the closest focused Playwright project after a successful build/preview.
- Run only scripts that exist; record blockers and distinguish new from pre-existing failures.

## 4. Changelog and release

- User-facing changelog: `D:\OneDrive\4、董娣相关\3、绿洲慧写3.0\绿洲前端\docs\CHANGELOG.md`.
- Synced release notes: `D:\OneDrive\4、董娣相关\3、绿洲慧写3.0\绿洲前端\public\help\release-notes.md`.
- Edit the changelog first, then run `npm run changelog:sync`. `npm run changelog:notify` has an external side effect and requires explicit authorization.
- High-risk releases need containment/rollback evidence or the repository equivalent; preserve Sentry, web-vitals, analytics, correlation IDs, and actionable privacy-safe errors.

## 5. Browser Evidence — Playwright + Computer Use Chrome

- Playwright is the reproducible primary acceptance tool. Computer Use Chrome supplements it for real login state, real Chrome profile/cache/extensions, real account data, machine-specific visuals, or online environment differences.
- Trigger browser testing for pages/routes, dialogs, forms, upload/download, settings, chat input/output, sidebars/navigation, state feedback, responsive/scroll/focus/keyboard changes, or a user-reported visual/runtime issue.
- Prefer a successful `npm run build` followed by `npm run preview`; if only dev is possible, record why and the remaining risk.
- Playwright tests use user-visible role/label/text/test-id contracts, isolated deterministic state, controlled third parties, and web-first assertions; avoid fixed sleeps and implementation-detail selectors.
- Record command, URL, dev/preview, browser, viewport, exit code, screenshots, trace/failure screenshot, console errors, failed requests, account/data mode, and external side effects.
- Cover reachable normal, loading, empty, error, disabled, success, retry, narrow screen, keyboard/focus, overlay/scroll, and form validation/pending/server-error/cancel/reset states.
- If Playwright and Computer Use Chrome disagree, do not PASS until the environment difference is explained and resolved or explicitly classified.
- Evidence directory: `D:\OneDrive\4、董娣相关\3、绿洲慧写3.0\绿洲前端\output\browser-evidence\YYYY-MM-DD-任务名\`.

## 6. Quality gates

- Accessibility target: **WCAG 2.2 AA**, with automated checks plus manual keyboard/focus/contrast/zoom/reduced-motion and critical custom-widget assistive-technology review.
- **Core Web Vitals** p75 targets: LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1; compare `npm run build:size-check`, route assets, requests, fonts/images, rerenders, async waterfalls, and repeated computation to the repository baseline.
- Security baseline: **OWASP ASVS 5.0** applicable controls, authorization, secrets/dependencies, uploads/downloads, untrusted Markdown/HTML/Mermaid/KaTeX/API content, XSS/sanitization, CSP, privacy, and external provenance.
- Verify API/state ownership, cancellation/races, stale responses, cache/optimistic rollback, loading/empty/error/disabled/success behavior, responsive layout, and visual regression where stable.

## 7. Completion format and boundary

- Final summary order: task understanding, assumptions, files affected, implementation summary, validation run, risk list, manual QA checklist for UI, out-of-scope follow-up improvements.
- No browser evidence for user-visible work means `STATIC_ONLY` or `PASS_WITH_CONCERNS`, never full PASS.
- Login, real account state, production console, approval, credentials, or returned external evidence uses `BLOCKED_WAITING_FOR_USER` with exact actions.
- Final status for quality work is exactly one of `PASS`, `PASS_WITH_CONCERNS`, `STATIC_ONLY`, `BLOCKED_WAITING_FOR_USER`, or `FAIL`.
