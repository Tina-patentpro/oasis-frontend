# Token 存储短期缓解 · Codex 修复说明(2026-06-22)

> 本文档供 codex / 执行代理直接消费。基于绿洲慧写3.0 前端真实代码生成,所有文件:行号已核对。
> 任务来源:`docs/audit/2026-06-22-comprehensive-audit-summary.md` 的 G-P1-1 短期缓解方案。

---

## 2026-06-25 续作补充:按当前仓库真实状态修订

> **执行优先级**:本节是 2026-06-25 基于当前工作区重新核对后的补充说明。若本节与下方 2026-06-22 原计划有冲突,以本节为准;下方原计划保留为历史背景和细节参考。

### A. 当前真实基线

只读核对结果:

1. 仓库已有多处未提交改动,其中包含本任务相关文件,也包含其他无关工作。后续执行时必须保护现有改动,不得用回滚、覆盖或重写方式处理。
2. `stripSensitiveFieldsForStorage(user)` 已存在于 `src/utils/auth-user-normalization.ts`,并已被接入以下写入点:
   - `src/stores/useAuthStore.ts`
   - `src/api/services/auth.service.ts`
   - `src/api/services/user.service.ts`
3. 已有测试覆盖了部分本地存储脱敏行为:
   - `src/utils/auth-user-normalization.test.ts`
   - `src/stores/useAuthStore.persistence.test.ts`
   - `src/api/services/auth.service.test.ts`
4. CSP 尚未收紧。`src/config/security.ts` 仍包含裸 `https:` 通配:
   - `img-src 'self' data: blob: https: ...`
   - `connect-src 'self' https: ...`
5. 项目真实环境变量名是:
   - `VITE_API_BASE_URL`
   - `VITE_SENTRY_DSN`
   - 不是 `VITE_APP_API_BASE_URL` / `VITE_APP_SENTRY_DSN`
6. `src/config/security.ts` 会被 `vite.config.ts` 直接导入,用于:
   - 构建时注入 `index.html` 的 CSP meta 标签
   - dev server headers
   因此**不能**在 `src/config/security.ts` 顶层直接读取 `import.meta.env`,否则会破坏 Vite 配置阶段的 Node 环境。

### B. 原计划需要修正的地方

1. **不要再按"从零实现 stripSensitiveFieldsForStorage"执行**。当前应改为"复核已实现代码是否完整、补测试、补注释、补漏点"。
2. **影响文件清单必须扩大**。除 `useAuthStore` 外,还要把 `auth.service.ts`、`user.service.ts` 视为正式写入点。
3. **CSP 白名单不能只来自 API 域名**。项目会加载或下载后端返回的远程文件/图片,并有支付二维码图片:
   - 生成内容中的远程图片、附件、下载链接
   - `src/components/settings/WeChatPayDialog.tsx` 中的 `https://api.qrserver.com`
   - 可能存在的 Sentry 上报域名
4. **CSP 测试不能简单禁止所有 `https://`**。应该禁止的是"裸 `https:` 通配",允许明确 origin,例如 `https://api.example.com`。
5. **验证不能只看响应头**。生产构建主要由 `vite.config.ts` 注入 CSP meta 标签,所以还必须检查 `dist/index.html`。

### C. 修订后的执行方案

#### C1. 先冻结范围和保护现有改动

执行前必须先看:

```bash
git status --short
git diff -- src/utils/auth-user-normalization.ts src/utils/auth-user-normalization.test.ts src/stores/useAuthStore.ts src/api/services/auth.service.ts src/api/services/user.service.ts src/config/security.ts src/config/security.test.ts vite.config.ts src/env.d.ts .env.example .env.production.example
```

完成标准:

- 确认哪些是本任务已有半成品,哪些是无关改动。
- 不回退 `src/api/services/user.service.ts` 中与数据导出拆分相关的无关改动。
- 不修改 `src/api/core/token-storage.ts`。

#### C2. 复核并补强 user 本地存储脱敏

需要确认所有写入 `localStorage.user` 的位置都经过 `stripSensitiveFieldsForStorage`:

```bash
rg -n "safeSetLocalStorageJson\('user'" src
```

当前应至少覆盖:

- `src/stores/useAuthStore.ts`
- `src/api/services/auth.service.ts`
- `src/api/services/user.service.ts`

补强要求:

- `stripSensitiveFieldsForStorage` 增加简短注释,说明只影响持久化缓存,不影响内存态 user。
- 保持 `balance: 0`,不要改成 `undefined`,避免破坏 `User` 类型。
- `phone` 保持 `undefined`。
- 内存里的 user 仍保留真实 `phone` / `balance`。

建议测试:

```bash
npm run test -- src/utils/auth-user-normalization.test.ts src/stores/useAuthStore.persistence.test.ts src/api/services/auth.service.test.ts src/api/services/__tests__/auth.service.test.ts --runInBand
```

#### C3. 用可配置白名单收紧 CSP

推荐新增环境变量:

```bash
# CSP 图片白名单:允许加载图片的 HTTPS origin,逗号分隔
VITE_CSP_IMG_ORIGINS=https://api.qrserver.com

# CSP 连接白名单:允许接口、下载、监控上报的 HTTPS origin,逗号分隔
VITE_CSP_CONNECT_ORIGINS=
```

规则:

1. `VITE_API_BASE_URL` 的 origin 自动加入 `connect-src`。
2. `VITE_SENTRY_DSN` 有值时,从 DSN 提取 origin 后加入 `connect-src`。
3. `VITE_CSP_IMG_ORIGINS` 加入 `img-src`。
4. `VITE_CSP_CONNECT_ORIGINS` 加入 `connect-src`,用于文件下载、外部上报等需要 `fetch` 的域名。
5. `img-src` 默认保留 `'self' data: blob:`。
6. `connect-src` 默认保留 `'self'`。
7. 开发环境继续保留:
   - `http://127.0.0.1:*`
   - `http://localhost:*`
   - `ws://127.0.0.1:*`
   - `ws://localhost:*`
8. 任何情况下都不能回退到裸 `https:`。

#### C4. CSP 代码结构必须适配 Vite 配置阶段

不要在 `src/config/security.ts` 顶层写:

```ts
import.meta.env.VITE_API_BASE_URL
```

正确结构:

1. `src/config/security.ts` 暴露纯函数,例如:

```ts
export interface SecurityCspSources {
  apiBaseUrl?: string
  sentryDsn?: string
  imgOrigins?: string[]
  connectOrigins?: string[]
}

export function createSecurityCspSources(input: SecurityCspSources): NormalizedSecurityCspSources {
  // 负责 extractOrigin、去重、过滤无效值
}

export function createSecurityHeaders(
  options?: SecurityPolicyOptions & { sources?: SecurityCspSources },
): Record<string, string> {
  // 使用 sources 生成 header CSP
}
```

2. `vite.config.ts` 使用 `loadEnv` 读取真实环境变量:

```ts
const cspSources = {
  apiBaseUrl: env.VITE_API_BASE_URL,
  sentryDsn: env.VITE_SENTRY_DSN,
  imgOrigins: splitEnvList(env.VITE_CSP_IMG_ORIGINS),
  connectOrigins: splitEnvList(env.VITE_CSP_CONNECT_ORIGINS),
}
```

3. `vite.config.ts` 用同一套 `cspSources` 生成:

```ts
const cspForMode = isDevMode
  ? createSecurityCsp({ allowInlineScripts: true, sources: cspSources })
  : createSecurityCsp({ sources: cspSources })

headers: createSecurityHeaders({ allowInlineScripts: isDevMode, sources: cspSources })
```

这样可以保证生产 meta CSP 和开发响应头不分叉。

#### C5. CSP 测试要测"裸通配"和"明确白名单"

`src/config/security.test.ts` 应增加类似测试:

```ts
const hasBareHttpsSource = (directive: string) =>
  directive.split(/\s+/).some((part) => part === 'https:')

test('img-src does not allow bare https wildcard', () => {
  const csp = createSecurityCsp({
    sources: { imgOrigins: ['https://api.qrserver.com'] },
  })
  const imgDirective = csp.split('; ').find((item) => item.startsWith('img-src')) ?? ''
  expect(hasBareHttpsSource(imgDirective)).toBe(false)
  expect(imgDirective).toContain('https://api.qrserver.com')
})

test('connect-src allows configured origins without bare https wildcard', () => {
  const csp = createSecurityCsp({
    sources: {
      apiBaseUrl: 'https://api.example.com/api',
      sentryDsn: 'https://abc@sentry.example.com/1',
      connectOrigins: ['https://download.example.com'],
    },
  })
  const connectDirective = csp.split('; ').find((item) => item.startsWith('connect-src')) ?? ''
  expect(hasBareHttpsSource(connectDirective)).toBe(false)
  expect(connectDirective).toContain('https://api.example.com')
  expect(connectDirective).toContain('https://sentry.example.com')
  expect(connectDirective).toContain('https://download.example.com')
})
```

注意:测试应导入实际导出的函数名,不要为了测试临时复制 CSP 生成逻辑。

#### C6. 环境类型和模板必须同步

需要修改:

- `src/env.d.ts`
- `.env.example`
- `.env.production.example`

新增:

```ts
readonly VITE_CSP_IMG_ORIGINS?: string
readonly VITE_CSP_CONNECT_ORIGINS?: string
```

模板里必须说明:

- 多个 origin 用英文逗号分隔。
- 只填 origin,例如 `https://cdn.example.com`,不要填路径。
- 不要填裸 `https:`。

#### C7. 修订后的验证门禁

命令验证:

```bash
npm run type-check
npm run lint
npm run test -- src/utils/auth-user-normalization.test.ts src/stores/useAuthStore.persistence.test.ts src/api/services/auth.service.test.ts src/api/services/__tests__/auth.service.test.ts src/config/security.test.ts --runInBand
npm run test --runInBand
npm run security:scan
npm run build
```

构建产物检查:

```bash
rg -n "Content-Security-Policy" dist/index.html
rg -n "img-src[^;]* https:($|[ ;])" dist/index.html
rg -n "connect-src[^;]* https:($|[ ;])" dist/index.html
```

预期:

- 第一条能找到 CSP meta 标签。
- 后两条没有命中裸 `https:` 通配。

人工检查:

- 登录后刷新页面,`localStorage.user` 不再有 `phone`,且 `balance = 0`。
- 工作区用户名/头像正常。
- 设置页手机号/余额正常,说明内存态 user 未被破坏。
- 生成图片、Markdown 图片、文件下载正常。
- 支付二维码正常显示,或已明确改为其他安全方案。
- 浏览器 Console 无 CSP 违规报错。

### D. 续作完成标准

- `stripSensitiveFieldsForStorage` 相关半成品被复核并纳入正式验证。
- 所有 `localStorage.user` 写入点都脱敏。
- `src/api/core/token-storage.ts` 无修改。
- `src/config/security.ts` 不再含裸 `https:`。
- `vite.config.ts` 注入的 CSP meta 和 dev headers 使用同一套白名单。
- `.env.example`、`.env.production.example`、`src/env.d.ts` 与新增环境变量一致。
- 相关测试、全量测试、安全扫描、构建均通过。
- `git diff` 不包含无关回退或大范围重构。

---

## 0. 阅读须知(给 codex 的纪律)

1. **先全文读完再动手**,不要边读边改。
2. **每个步骤的"最小正确改动"都是强制的**,不要扩大范围。
3. **保留所有现有功能**:30 天免登录、首屏快速显示、mobile binding 校验都不能破坏。
4. **改动后必须跑验证门禁**(见第 6 节),任一项不通过即视为失败。
5. **遇到与说明不符的地方停下来问**,不要自行推测。

---

## 1. 任务理解

### 背景
绿洲慧写3.0 前端把 access token 和 user 对象(含手机号、余额)明文存进浏览器 localStorage(`src/api/core/token-storage.ts`、`src/stores/useAuthStore.ts:51`)。localStorage 对同源任意 JS 可读且无 HttpOnly 保护,一旦出现 XSS,攻击者可一行代码偷走 30 天有效的 token 和用户隐私。

### 本次范围(短期缓解,**前端独立完成**)
本次**不做** HttpOnly Cookie 改造(那需要后端配合,单独立项)。本次只做两件事:

1. **从 localStorage 移除 user 对象里的敏感字段**(`phone`、`balance`),只保留非敏感字段(id/username/email/avatar/role/时间戳)用于首屏快速显示。
2. **收紧 CSP**(`img-src`、`connect-src` 的 `https:` 通配改为具体域名白名单),减轻一旦出现 XSS 的数据外带通道。

### 明确不做的事
- ❌ 不改 token 的存储介质(token 仍在 localStorage,留待 HttpOnly Cookie 专项)
- ❌ 不破坏 30 天免登录体验(`SESSION_TTL_MS = 30 天` 保持不变)
- ❌ 不破坏首屏快速显示(刷新页面时仍从 localStorage 读 user 骨架)
- ❌ 不改后端契约
- ❌ 不改 `binding` 校验逻辑(`navigator.language + userAgent`)

---

## 2. 前置知识:当前代码的真实状态(已核对)

### 2.1 User 类型定义(`src/types/api/user.ts:3-13`)
```ts
export interface User {
  id: number
  email: string
  username: string
  phone?: string        // ← 敏感:手机号
  avatarUrl?: string
  balance: number       // ← 敏感:余额
  role: 'user' | 'admin'
  createdAt: string
  updatedAt: string
}
```

### 2.2 user 写入 localStorage 的两个位置
- `src/stores/useAuthStore.ts:51` — 登录/注册成功后 `safeSetLocalStorageJson('user', normalizedUser)`
- `src/stores/useAuthStore.ts:128` — 刷新用户详情后 `safeSetLocalStorageJson('user', fetchedUser)`

### 2.3 user 从 localStorage 读出的位置(必须保持兼容)
- `src/stores/useAuthStore.ts:103` — 初始化时 `cachedUser = normalizeUser(safeReadLocalStorageJson('user'))`,用于首屏快速显示
- `src/api/services/user.service.ts:27` — `getCachedUser()` 返回缓存 user

### 2.4 CSP 配置(`src/config/security.ts:13,15`)
```ts
"img-src 'self' data: blob: https: http://127.0.0.1:* http://localhost:*",
"connect-src 'self' https: http://127.0.0.1:* http://localhost:* ws://127.0.0.1:* ws://localhost:*",
```
问题:`https:` 通配意味着任意 HTTPS 域都能加载图片/发请求。

### 2.5 现有测试
- `src/api/services/__tests__/auth.service.test.ts:115,239,248,263` — 断言 localStorage 的 user 行为
- `src/config/security.test.ts:14` — 断言 CSP 包含 `img-src 'self' data: blob: https:`(本任务会改这个断言)
- `src/utils/safe-storage.test.ts` — 通用 storage 工具测试

### 2.6 重要历史背景
仓库里有一份搁置的旧计划:`docs/plans/2026-02-15-security-hardening-xss-token-hygiene.md`(Task 3、4 是 token 改造)。**那份计划当时没执行**(代码里 `setAccessToken` 仍在写 localStorage),不要把它当作已执行;也**不要照搬它的实现**(它包含 HttpOnly Cookie,超出本任务范围)。本次只做短期缓解。

---

## 3. 影响文件清单

| 文件 | 改动类型 | 说明 |
|---|---|---|
| `src/utils/auth-user-normalization.ts` | 新增函数 | 新增 `stripSensitiveFields(user)` 工具,用于写入 localStorage 前剥离敏感字段 |
| `src/stores/useAuthStore.ts` | 修改 | 第 51、128、276 行三处 `safeSetLocalStorageJson('user', ...)` 改为先剥离敏感字段 |
| `src/api/core/token-storage.ts` | **不动** | token 持久化保持原样(留待 HttpOnly 专项) |
| `src/config/security.ts` | 修改 | `img-src` / `connect-src` 收紧为白名单 |
| `src/config/security.test.ts` | 修改 | 同步更新 CSP 断言 |
| `src/api/services/__tests__/auth.service.test.ts` | 修改 | 同步更新:断言"写入的 user 不含 phone/balance" |
| `.env.example`、`.env.production.example` | 可能新增字段 | 若 CSP 白名单通过环境变量配置(推荐),需补 example |

---

## 4. 实施步骤(按 TDD 顺序)

### 步骤 1:写失败测试 —— 敏感字段剥离

**文件**:`src/utils/auth-user-normalization.test.ts`(若不存在则新建)

新增测试用例:
```ts
import { stripSensitiveFieldsForStorage, normalizeUser } from './auth-user-normalization'

describe('stripSensitiveFieldsForStorage', () => {
  it('移除 phone 和 balance,保留其他字段', () => {
    const user = normalizeUser({
      id: 1, username: 'u', phone: 'YOUR_PHONE_HERE',
      balance: 999, email: 'a@b.com', role: 'user',
    })
    const stripped = stripSensitiveFieldsForStorage(user!)
    expect(stripped.phone).toBeUndefined()
    expect(stripped.balance).toBe(0)          // 用零值,不 undefined,避免类型错
    expect(stripped.id).toBe(1)
    expect(stripped.username).toBe('u')
    expect(stripped.email).toBe('a@b.com')
  })

  it('返回的对象与原 user 不是同一引用', () => {
    const user = normalizeUser({ id: 1, username: 'u' })!
    const stripped = stripSensitiveFieldsForStorage(user)
    expect(stripped).not.toBe(user)
  })
})
```

**文件**:`src/config/security.test.ts` 末尾加测试:
```ts
const getDirective = (csp: string, name: string) =>
  csp.split('; ').find((item) => item.startsWith(name)) ?? ''

const hasBareHttpsSource = (directive: string) =>
  directive.split(/\s+/).some((part) => part === 'https:')

test('CSP img-src 不含通配 https:', () => {
  expect(hasBareHttpsSource(getDirective(SECURITY_META_CSP, 'img-src'))).toBe(false)
})
test('CSP connect-src 不含通配 https:', () => {
  expect(hasBareHttpsSource(getDirective(SECURITY_META_CSP, 'connect-src'))).toBe(false)
})
test('CSP 仍允许自家 API 域(由 VITE_API_BASE_URL 推导)', () => {
  // 至少不能是空白名单
  expect(SECURITY_META_CSP).toMatch(/connect-src[^;]*self/)
})
```

**运行验证**:`npm run test -- src/utils/auth-user-normalization.test.ts src/config/security.test.ts --runInBand`
**预期**:FAIL(因为函数和白名单都还不存在)。

---

### 步骤 2:实现 `stripSensitiveFieldsForStorage`

**文件**:`src/utils/auth-user-normalization.ts` 末尾新增:

```ts
/**
 * 写入 localStorage 前剥离敏感字段。
 * 用途:localStorage 对同源任意 JS 可读,一旦出现 XSS,
 * phone/balance 等隐私数据会被偷走。这里只保留首屏显示必需的非敏感字段。
 *
 * 注意:返回对象的 balance 设为 0 而非 undefined,保持 User 类型完整。
 * 真实 balance 始终走内存(useAuthStore.user),不持久化。
 */
export function stripSensitiveFieldsForStorage(user: User): User {
  return {
    ...user,
    phone: undefined,
    balance: 0,
  }
}
```

**运行验证**:`npm run test -- src/utils/auth-user-normalization.test.ts --runInBand`
**预期**:PASS。

---

### 步骤 3:在写入 localStorage 前调用剥离函数

**文件**:`src/stores/useAuthStore.ts`

**改动 1**(第 46-57 行 `persistAuthResponse`):
```ts
// 改动前(第 50-52 行)
if (normalizedUser) {
  safeSetLocalStorageJson('user', normalizedUser)  // ← 整个 user 入 localStorage,含 phone/balance

// 改动后
if (normalizedUser) {
  // 写入 localStorage 前剥离敏感字段(phone/balance),
  // 真实数据只保留在内存(useAuthStore.user)
  safeSetLocalStorageJson('user', stripSensitiveFieldsForStorage(normalizedUser))
```

**改动 2**(第 127-128 行,`initialize` 后台刷新用户详情后):
```ts
// 改动前
safeSetLocalStorageJson('user', fetchedUser)

// 改动后
safeSetLocalStorageJson('user', stripSensitiveFieldsForStorage(fetchedUser))
```

**改动 3**(第 275-277 行,`setUser`):
```ts
// 改动前
if (normalizedUser) {
  safeSetLocalStorageJson('user', normalizedUser)

// 改动后
if (normalizedUser) {
  safeSetLocalStorageJson('user', stripSensitiveFieldsForStorage(normalizedUser))
```

**改动 4**(文件顶部 import):
```ts
import {
  mergeUserDetailWithFallback,
  normalizeUser,
  stripSensitiveFieldsForStorage,  // ← 新增
} from '@/utils/auth-user-normalization'
```

**注意**:`useAuthStore` 内部的 `set({ user: normalizedUser })`(第 166、193、220 行等)**不改**——内存里的 user 仍保留完整 phone/balance,这是 UI 显示和业务逻辑要用的。**只有写 localStorage 时才剥离**。

**运行验证**:`npm run type-check && npm run test -- src/stores --runInBand`
**预期**:type-check PASS;store 相关测试若有失败,按"写入的 user 不含 phone/balance"原则修测试断言。

---

### 步骤 4:收紧 CSP 白名单

#### 4.1 先搞清楚真实需要哪些域名

**必须做的事**(在动手前):
- `rg -n "VITE_API_BASE_URL" .env* src vite.config.ts scripts` 列出 API 域名配置
- `rg -n "VITE_SENTRY_DSN" .env* src vite.config.ts scripts` 列出 Sentry 配置
- `rg -n "https://" src public index.html` 列出前端代码里直接使用的外部 HTTPS 域名
- 看 `.env.production` 实际值(若不存在,问用户:"生产环境后端 API 域名、OSS 域名、Sentry DSN 域名分别是什么?")
- 查 Sentry 初始化(`src/monitoring/`)拿 DSN 域名(通常是 `sentry.io`)

#### 4.2 改 `src/config/security.ts`

> **2026-06-25 修订**:下面这段是 2026-06-22 原始示例,不能直接照抄。当前仓库的 `src/config/security.ts` 会被 `vite.config.ts` 在 Node 环境导入,所以不要在该文件顶层直接读取 `import.meta.env`。实际执行时按上方 "C4. CSP 代码结构必须适配 Vite 配置阶段" 改成纯函数 + `vite.config.ts` 传参。

```ts
// 顶部新增:从环境变量读白名单(推荐做法)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''
const OSS_HOSTS = (import.meta.env.VITE_CSP_IMG_ORIGINS ?? '')
  .split(',').map((s: string) => s.trim()).filter(Boolean)
const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN ?? ''

// 从 URL 提取 origin(协议+域名+端口)
function extractOrigin(url: string): string | null {
  if (!url) return null
  try {
    const u = new URL(url)
    return u.origin
  } catch {
    return null
  }
}

// 收集所有需要的 https 白名单 origin
const SAFE_HTTPS_ORIGINS = Array.from(new Set([
  extractOrigin(API_BASE_URL),
  extractOrigin(SENTRY_DSN),
  ...OSS_HOSTS.map(extractOrigin),
].filter(Boolean) as string[]))
```

然后改 `buildCspDirectives`:
```ts
const imgHttpsWhitelist = SAFE_HTTPS_ORIGINS.length > 0
  ? SAFE_HTTPS_ORIGINS.join(' ')
  : "'self'"  // fallback:若环境变量没配,退化为 'self'(比 https: 通配安全得多)

const connectHttpsWhitelist = SAFE_HTTPS_ORIGINS.length > 0
  ? SAFE_HTTPS_ORIGINS.join(' ')
  : "'self'"

const buildCspDirectives = ({ ... }): string[] => [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${imgHttpsWhitelist} http://127.0.0.1:* http://localhost:*`,
  "font-src 'self' data:",
  `connect-src 'self' ${connectHttpsWhitelist} http://127.0.0.1:* http://localhost:* ws://127.0.0.1:* ws://localhost:*`,
  "object-src 'none'",
  "base-uri 'self'",
  ...(includeFrameAncestors ? ["frame-ancestors 'none'"] : []),
]
```

**关键安全约束**:
- `img-src` 和 `connect-src` 都**不能**保留独立的 `https:` 通配
- 如果环境变量没配,用 `'self'` 兜底,**绝不能**回退到 `https:` 通配
- 开发环境的 `127.0.0.1:*` / `localhost:*` 保留(本地联调需要)

#### 4.3 同步更新 `.env.example` 和 `.env.production.example`

新增字段:
```bash
# CSP 白名单:图片和接口允许的 HTTPS 域名,逗号分隔
VITE_CSP_IMG_ORIGINS=https://your-oss-bucket.aliyuncs.com,https://cdn.example.com
VITE_CSP_CONNECT_ORIGINS=https://download.example.com
```
(`VITE_API_BASE_URL`、`VITE_SENTRY_DSN` 项目里已有类型或模板,确认实际值是否存在;CSP 新增变量还要同步到 `src/env.d.ts`)

#### 4.4 更新 `src/config/security.test.ts`

把第 14 行原来的断言改掉,同时**新增**白名单测试(见步骤 1 末尾的测试)。原来的 `expect(csp).toContain("img-src 'self' data: blob: https:")` 要删掉或改成 `'self'`。

**运行验证**:`npm run test -- src/config/security.test.ts --runInBand && npm run type-check`
**预期**:PASS。

---

### 步骤 5:更新 auth.service 测试断言

**文件**:`src/api/services/__tests__/auth.service.test.ts`

第 115 行附近的 `JSON.parse(localStorage.getItem('user'))` 断言:改成验证**写入的 user 不含 phone/balance**,但**内存态(useAuthStore.getState().user)仍保留**。

示例改法:
```ts
// 改动前
const storedUser = JSON.parse(localStorage.getItem('user') as string)
expect(storedUser.phone).toBe('YOUR_PHONE_HERE')

// 改动后
const storedUser = JSON.parse(localStorage.getItem('user') as string)
expect(storedUser.phone).toBeUndefined()       // localStorage 里剥掉了
expect(storedUser.balance).toBe(0)
// 但内存里还在
expect(useAuthStore.getState().user?.phone).toBe('YOUR_PHONE_HERE')
```

**运行验证**:`npm run test -- src/api/services/__tests__/auth.service.test.ts --runInBand`

---

## 5. 迁移与兼容性:已登录用户怎么办?

### 5.1 老用户刷新页面会发生什么
- 老的 localStorage 里存的 user **还含 phone/balance**(写入时是旧逻辑)
- `initialize()` 读出来后(`useAuthStore.ts:103`),内存 user 仍带 phone/balance,**不影响 UI 显示**
- 下次 `initialize` 后台刷新 `getUserDetail()` 成功后(第 128 行),localStorage 会被覆写成新格式(剥掉了)

**结论**:无需主动迁移,几次请求后自然收敛。但**为了彻底清理老数据**,建议在 `initialize()` 末尾加一次主动覆写:

```ts
// useAuthStore.ts initialize() 末尾,在 set({ user: fetchedUser, ... }) 之后
// 顺手用新格式覆写一次 localStorage,清理老版本残留
if (fetchedUser) {
  safeSetLocalStorageJson('user', stripSensitiveFieldsForStorage(fetchedUser))
}
```

(其实第 128 行已经做了,确认一下位置即可。)

### 5.2 不要破坏的功能
- ✅ 30 天免登录(`SESSION_TTL_MS`)— 本次不动 token
- ✅ 首屏快速显示(`initialize` 先用 cachedUser 显示,再后台拉详情)— 本次保留 cachedUser 机制,只是 cachedUser 不再含 phone/balance(影响极小:首屏显示用户名/头像即可,phone/balance 等 `getUserDetail` 回来再显示)
- ✅ `binding` 校验(navigator.language + userAgent)— 本次不动
- ✅ `apiClient.setToken / clearToken` — 本次不动

---

## 6. 验证门禁(全部 PASS 才算完成)

按 AGENTS.md 10.9 顺序:

```bash
# 1. typecheck
npm run type-check

# 2. lint
npm run lint

# 3. 相关测试
npm run test -- src/utils/auth-user-normalization.test.ts src/config/security.test.ts src/api/services/__tests__/auth.service.test.ts --runInBand

# 4. 全量测试(确认没有其他回归)
npm run test --runInBand

# 5. security:scan(确认没引入新的硬编码)
npm run security:scan

# 6. build(确认 CSP 在产物里正确)
npm run build
# 然后 grep dist 里的 CSP 头,确认没有 https: 通配
```

### 6.1 必须人工确认的点
- [ ] 登录成功 → 刷新页面 → DevTools Application → localStorage 的 `user` 键里**不再有 phone 字段**,balance = 0
- [ ] DevTools Application → localStorage 的 `user` 键里**仍能看到** id/username/email/avatarUrl/role
- [ ] DevTools Network → 任意接口请求头 → 仍能正常带 Authorization(说明 token 没受影响)
- [ ] 工作区页 → 用户名/头像正常显示(说明 cachedUser 机制没坏)
- [ ] 设置页 → 手机号、余额正常显示(说明内存态 user 没受影响,只是 localStorage 剥离)
- [ ] 充值、修改手机号等操作正常(写回时再次剥离,内存仍保留真实值)
- [ ] DevTools Network → 检查响应头 `Content-Security-Policy` → `img-src`/`connect-src` 不再有 `https:` 通配,只有具体域名 + `'self'`
- [ ] 浏览器 Console 无 CSP 违规报错(打开工作区、看 Mermaid 图、看 Markdown 图片,确认白名单够用)

### 6.2 任一项不通过的处置
- **CSP 违规**(某域名漏配):不要把裸 `https:` 加回去,按用途改 `VITE_CSP_IMG_ORIGINS` 或 `VITE_CSP_CONNECT_ORIGINS` 加具体 origin
- **测试断言失败**:按"写入的 user 不含 phone/balance"原则改断言,**不要**为了过测试把剥离逻辑去掉
- **type-check 失败**:优先修类型,不要用 `as any` 绕过

---

## 7. 风险列表

| 等级 | 风险 | 缓解 |
|---|---|---|
| R1 | CSP 白名单漏配域名 → 某些图片加载失败 / 接口被拦 | 先在 dev 环境跑一遍全部页面,Network 面板看 CSP 违规 |
| R1 | 测试断言改错 → 假装通过但剥离逻辑没生效 | 必须跑步骤 6.1 的人工确认,不能只靠单元测试 |
| R2 | 老用户 localStorage 残留 phone/balance | 第 5.1 节已说明:几次请求后自然收敛,无需主动迁移 |
| R3 | 开发环境图床 / Mock 接口域名被 CSP 拦 | `127.0.0.1:*` / `localhost:*` 已保留 |

---

## 8. 完成标准(Definition of Done)

- [ ] 步骤 1-5 全部完成
- [ ] 第 6 节验证门禁全部 PASS(命令全部绿 + 6.1 人工确认全部 ✓)
- [ ] 改动文件清单与第 3 节一致(无范围蔓延)
- [ ] git diff 里**没有**对 `token-storage.ts` 的修改
- [ ] git diff 里**没有** `https:` 通配保留在 CSP 里
- [ ] 提交信息建议:`security(auth): strip sensitive fields from persisted user and tighten CSP`

---

## 9. 范围外(本次不做,提示给后续)

- **HttpOnly Cookie 改造**(G-P1-1 根治方案):需后端配合,单独立项
- **token 从 localStorage 迁出**:同上,留给 HttpOnly 专项
- **Trusted Types**(防 DOM 型 XSS):成本高,单独立项评估
- **API 契约回填**(G-P1-2):见总报告
- **`binding` 校验强化**(当前 navigator.language+userAgent 易伪造):HttpOnly Cookie 后自然失效

---

## 10. 如果遇到说明没覆盖的情况

1. **环境变量在仓库里找不到**:`rg -n "VITE_" .env* src vite.config.ts scripts` 先列全;还找不到就停下来问用户,不要瞎猜域名
2. **某个测试改了之后大量其他测试连锁失败**:停下来报告失败清单,不要硬改
3. **CSP 收紧后工作区某功能报错**:先确认是不是漏配域名,不要回退到 `https:` 通配
4. **`stripSensitiveFieldsForStorage` 的 balance 用 0 还是 undefined 引起类型争议**:按说明用 0(保持 User 类型完整),如有争议停下来问
