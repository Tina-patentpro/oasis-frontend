# Session Expiry Banner Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 增加会话过期前 5 分钟顶部横幅提示，避免用户在无感知状态下掉登录态。

**Architecture:** 在 `token-storage` 提供过期元信息读取接口，新增 `SessionExpiryBanner` 全局组件基于剩余时长判断显示，并挂载到 `AuthProvider`。保持现有强制登出与失效弹窗链路不变，横幅仅承担提前提醒职责。

**Tech Stack:** React 18, TypeScript, Zustand, React Router, Jest, Testing Library

---

### Task 1: Expose Session Expiry Metadata

**Files:**

- Modify: `src/api/core/token-storage.test.ts`
- Modify: `src/api/core/token-storage.ts`

**Step 1: Write the failing test**

```ts
test('returns expiry timestamp when token exists', () => {
  setAccessToken('token-12345')
  expect(getAccessTokenExpiryAt()).not.toBeNull()
  expect(getAccessTokenRemainingMs()).not.toBeNull()
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- src/api/core/token-storage.test.ts --runInBand`  
Expected: FAIL with missing export/function

**Step 3: Write minimal implementation**

```ts
export function getAccessTokenExpiryAt(): number | null
export function getAccessTokenRemainingMs(): number | null
```

Implementation returns values from persisted/memory session and handles expiry.

**Step 4: Run test to verify it passes**

Run: `npm run test -- src/api/core/token-storage.test.ts --runInBand`  
Expected: PASS

**Step 5: Commit**

```bash
git add src/api/core/token-storage.ts src/api/core/token-storage.test.ts
git commit -m "feat(auth): expose session expiry metadata"
```

### Task 2: Implement Session Expiry Banner Component

**Files:**

- Create: `src/components/auth/SessionExpiryBanner.tsx`
- Create: `src/components/auth/SessionExpiryBanner.test.tsx`

**Step 1: Write the failing test**

```tsx
test('shows banner in last 5 minutes before expiry', () => {
  // mock remainingMs in warning window
  // render with MemoryRouter('/workspace')
  // expect warning text and actions visible
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- src/components/auth/SessionExpiryBanner.test.tsx --runInBand`  
Expected: FAIL because component does not exist

**Step 3: Write minimal implementation**

```tsx
export const SessionExpiryBanner = () => {
  // check auth + route + remainingMs
  // timer refresh every 30s
  // buttons: relogin, dismiss
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- src/components/auth/SessionExpiryBanner.test.tsx --runInBand`  
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/auth/SessionExpiryBanner.tsx src/components/auth/SessionExpiryBanner.test.tsx
git commit -m "feat(auth): add session expiry warning banner"
```

### Task 3: Wire Banner into Auth Provider

**Files:**

- Modify: `src/app/providers/AuthProvider.tsx`

**Step 1: Write the failing test**

```tsx
test('banner is mounted by auth provider', () => {
  // render AppProviders/AuthProvider
  // assert banner can appear in warning window
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- src/components/auth/SessionExpiryBanner.test.tsx --runInBand`  
Expected: FAIL because provider does not mount banner

**Step 3: Write minimal implementation**

```tsx
return (
  <>
    {children}
    <SessionExpiryBanner />
    <SessionExpiredDialog />
  </>
)
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- src/components/auth/SessionExpiryBanner.test.tsx --runInBand`  
Expected: PASS

**Step 5: Commit**

```bash
git add src/app/providers/AuthProvider.tsx
git commit -m "feat(auth): mount session expiry banner in auth provider"
```

### Task 4: Verification

**Files:**

- Verify: `src/api/core/token-storage.test.ts`
- Verify: `src/components/auth/SessionExpiryBanner.test.tsx`
- Verify: `src/components/auth/SessionExpiredDialog.tsx`

**Step 1: Run targeted tests**

Run: `npm run test -- src/api/core/token-storage.test.ts src/components/auth/SessionExpiryBanner.test.tsx --runInBand`  
Expected: PASS

**Step 2: Run type checks**

Run: `npm run type-check`  
Expected: PASS

**Step 3: Optional regression sweep**

Run: `npm run test -- --runInBand`  
Expected: PASS
