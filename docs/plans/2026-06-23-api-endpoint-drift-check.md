# API 端点漂移检查 Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 修复 G-P1-2 的前端可执行部分：让 `auth` / `notification` 真实调用端点与 `docs/api/users-auth.yaml` 的不一致可被脚本稳定报告出来。

**Architecture:** 不改真实 API 调用，不改后端接口，不直接重写 OpenAPI 契约。新增一个只读脚本扫描 `src/api/services/auth.service.ts`、`src/api/services/notification.service.ts` 中的 `apiClient` 端点，再与 `docs/api/users-auth.yaml` 的 `paths` 对比；默认报告不阻断，`--strict` 模式才用失败码，方便后续 CI 分阶段接入。

**Tech Stack:** Node.js ESM、内置 `node:test`、`yaml`、现有 `scripts/api` 目录。

---

### Task 1: 新增端点漂移检测脚本

**Files:**
- Create: `scripts/api/check-endpoint-drift.mjs`

**做什么：**
脚本需要导出纯函数：
- `normalizeCodeEndpoint(endpoint)`
- `extractApiClientEndpoints(sourceText)`
- `findEndpointDrift({ codeEndpoints, specPaths })`

命令行默认扫描：
- `src/api/services/auth.service.ts`
- `src/api/services/notification.service.ts`
- `docs/api/users-auth.yaml`

**为什么做：**
现有 `api:lint` / `api:unused` 只检查契约自身，不能发现“代码调的接口契约没有写，契约写的接口代码没有调”。

**完成标准：**
运行 `node scripts/api/check-endpoint-drift.mjs` 能输出 missing-in-spec 和 unused-in-code 两类结果。

---

### Task 2: 新增脚本单元测试

**Files:**
- Create: `scripts/api/check-endpoint-drift.test.mjs`

**做什么：**
测试覆盖：
- `/auth/pwdlogin` 会标准化成 `/api/auth/pwdlogin`。
- 模板字符串 `/user/userhasread/${id}` 会标准化成 `/api/user/userhasread/{param}`。
- 当代码端点和契约路径不一致时，会分别报告“代码缺契约”和“契约未被代码使用”。

**为什么做：**
确保漂移检查不是靠人工观察，也避免后续脚本重构时失效。

**完成标准：**
运行：
`node --test scripts/api/check-endpoint-drift.test.mjs`

预期：全部通过。

---

### Task 3: 接入 package 脚本

**Files:**
- Modify: `package.json`

**做什么：**
新增：
- `api:drift`: `node scripts/api/check-endpoint-drift.mjs`
- `api:drift:strict`: `node scripts/api/check-endpoint-drift.mjs --strict`

**为什么做：**
默认先报告，不影响当前发布校验；后续契约回填完成后，可把 strict 模式接入 `api:validate:ci`。

**完成标准：**
`npm run api:drift` 能输出当前漂移报告，退出码为 0。

---

### Task 4: 验证

**Files:**
- No production frontend files expected.

**做什么：**
运行：
- `node --test scripts/api/check-endpoint-drift.test.mjs`
- `npm run api:drift`
- `npm run api:validate:ci`
- `npm run type-check`
- `npm run lint`

**为什么做：**
确认新增治理脚本可用，且不破坏现有 API 校验、类型检查和代码规范。

**完成标准：**
除了 `api:drift` 会报告当前已知漂移外，其余校验保持通过。
