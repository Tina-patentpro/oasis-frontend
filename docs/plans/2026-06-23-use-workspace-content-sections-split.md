# useWorkspaceContentSections File Split Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将 `src/modules/workspace/hooks/useWorkspaceContentSections.ts` 从超大 hook 文件拆成可维护的小文件，并从 `eslint.config.js` 的 `max-lines` 豁免列表中移除。

**Architecture:** 本次只做结构拆分，不改变工作区输入区、输出区、生成流程、异步轮询、API 详情加载、会话恢复等行为。优先抽取 API 详情加载、输入页同步、性能指标收集等内部逻辑为小 hook/工具函数。

**Tech Stack:** React hooks、TypeScript、Jest、ESLint。

---

### Task 1: 基线与范围冻结

**Files:**
- Read: `src/modules/workspace/hooks/useWorkspaceContentSections.ts`
- Test: `src/modules/workspace/hooks/useWorkspaceContentSections.test.tsx`
- Test: `src/modules/workspace/hooks/useWorkspaceContentSections.restore-output.test.tsx`

**Step 1:** 运行现有定向测试作为拆分前基线。

Run: `npm test -- src/modules/workspace/hooks/useWorkspaceContentSections.test.tsx src/modules/workspace/hooks/useWorkspaceContentSections.restore-output.test.tsx --runInBand`

Expected: 全部通过。

### Task 2: 拆出 API 详情加载逻辑

**Files:**
- Create: `src/modules/workspace/hooks/content-sections/use-api-detail-loader.ts`
- Modify: `src/modules/workspace/hooks/useWorkspaceContentSections.ts`

**Step 1:** 抽取 `apiDetail`、`apiDetailStatus`、`fetchApiDetail`、`ensureApiDetailLoaded`、预加载 effect。

**Step 2:** 主 hook 改为调用新 hook。

Expected: API 详情加载、缓存、失败状态和重试行为不变。

### Task 3: 拆出性能指标逻辑

**Files:**
- Create: `src/modules/workspace/hooks/content-sections/use-generation-performance-metrics.ts`
- Modify: `src/modules/workspace/hooks/useWorkspaceContentSections.ts`

**Step 1:** 抽取生成开始、收集、首帧、渲染耗时等 metrics 状态和回调。

**Step 2:** 主 hook 改为使用返回的 metrics 与回调。

Expected: 输出区 props 中的性能指标字段不变。

### Task 4: 移除豁免并核对行数

**Files:**
- Modify: `eslint.config.js`
- Modify: `src/modules/workspace/hooks/useWorkspaceContentSections.ts`

**Step 1:** 从 `max-lines` override 中删除 `useWorkspaceContentSections.ts`。

**Step 2:** 核对主文件和新文件行数。

Expected: 主文件和新文件均不触发 `max-lines`。

### Task 5: 验证

Run:
- `npm test -- src/modules/workspace/hooks/useWorkspaceContentSections.test.tsx src/modules/workspace/hooks/useWorkspaceContentSections.restore-output.test.tsx --runInBand`
- `npm run type-check`
- `npm run lint`

Expected: 全部通过，且 lint 无 `max-lines` 警告。
