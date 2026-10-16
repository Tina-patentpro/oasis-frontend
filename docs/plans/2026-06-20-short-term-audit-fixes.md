# 前端审计短期修复计划（修订版）

- **基线报告**：`docs/audit/2026-06-20-frontend-audit-report.md`
- **来源**：对初版计划的代码评审（已逐条对照真实代码核验）
- **生成日期**：2026-06-20
- **状态**：待执行（pending）

---

## Summary（摘要）

- **目标模式**：短期优先 + 最小改动 + 保护已有未提交改动。
- **本轮范围**：R1-1、R1-2、R1-3、R3-4、R2-4。
- **暂缓**：R2-3（会触碰当前已有改动的 `useWorkspaceChatPanel.ts`，避免混入现有工作）。
- **与初版的差异**（评审修订点）：
  1. R1-2 扩大为「处理全部 5 个 overrides」，初版漏了 lodash-es/lodash/fast-xml-parser/js-yaml。
  2. R2-4 扩大为「改造所有读 `localInput` 的回调」，初版只点名 `handleOasisActionFill` 一个（实际有 8+ 个，只改一个收益≈0）。
  3. R3-4 补充「恢复 errorMapping 映射」的用户可见收益说明。
  4. 新增「提交策略」章节，避免与现有 9 个未提交文件混入同一 commit。

---

## Key Changes（关键改动）

### 1.【依赖安全】刷新 lockfile 并处理全部 5 个 overrides（R1-2 + R1-3）

- **做什么**：
  - 把 `package.json:52` 的 `dompurify` 直接依赖 **和** `package.json:113` 的 `overrides.dompurify` 一并升到 `3.4.11`（修复 3 条 CVE：GHSA-vxr8-fq34-vvx9 / gvmj-g25r-r7wr / cmwh-pvxp-8882）。
  - **新增决策点**（执行前确认）：
    - `overrides.lodash`（非 es）：审计指出 `node_modules` 里根本没装这个包。→ 若无依赖引入，**移除该 override**；若确实有传递依赖需要锁，保留并确认锁版本。
    - `overrides.lodash-es`：实际装 4.17.23，锁的是 4.18.1。→ 确认是否升到 4.18.1。
    - `overrides.fast-xml-parser` / `overrides.js-yaml`：保留，重装后确认对齐。
  - 删除 `node_modules` 与 `package-lock.json`，重新 `npm install`，让 overrides 真正写回 lockfile 根包。
- **为什么**：审计 R1-2 查实 lockfile 根包**完全没有 overrides 字段**，安全锁形同虚设；dompurify 锁了 3.4.7 实际跑 3.3.3（更老，漏洞面更大）。
- **完成标准**：
  - `npm ls dompurify lodash-es lodash fast-xml-parser js-yaml` **全部**不再报 `invalid`（不只是 dompurify）。
  - `npm audit --omit=dev`（官方 registry）不再报 dompurify 漏洞。
  - lockfile 根包 `""` 下**出现 `overrides` 字段**（脚本校验：`node -e "console.log(!!require('./package-lock.json').packages[''].overrides)"` 应输出 `true`）。
- **证据位置**：`package.json:49-69`（dependencies）、`package.json:112-118`（overrides）。

### 2.【删除死代码】删除根 useContentStore（R1-1）

- **做什么**：删除 `src/stores/useContentStore.ts`（整文件）。
- **为什么**：
  - 全仓 grep `from '@/stores/useContentStore'` **零匹配**（已核验）。
  - `src/stores/index.ts` **未导出**它（已核验，只导出 4 个 store）。
  - 它与模块版 `src/modules/workspace/stores/useContentStore.ts` 共用 localStorage 键 `content-storage`，且 partialize 字段集不一致，互相覆盖导致刷新后生成内容/版本历史丢失。
- **完成标准**：
  - 删除后全仓搜索 `useContentStore` 仅剩 `src/modules/workspace/stores/useContentStore.ts` 及其测试/调用。
  - `content-storage` 键仅模块版写入，冲突消除。
- **补充说明（避免执行者困惑）**：根版本**没有对应测试文件**（`src/stores/useContentStore.test.ts` 不存在），无需删测试。

### 3.【Bug 修复】parseResponse 错误参数顺序（R3-4，TDD）

- **做什么**：
  - 先在 `src/api/core/response-parser.test.ts` 加失败用例：构造一段非法 JSON 响应，断言抛出的 `ApiError` 满足 `err.code === 'INVALID_RESPONSE'` **且** `err.message` 为真实解析错误（而非 `'INVALID_RESPONSE'` 字面量）。
  - 再改 `src/api/core/response-parser.ts:51-55`：
    - 现（错误）：`new ApiError('INVALID_RESPONSE', error.message, status)`
    - 改后：`new ApiError(error instanceof Error ? error.message : '响应解析失败', 'INVALID_RESPONSE', status)`
- **为什么**：`ApiError` 签名是 `(message, code, statusCode)`，现把 code/message 写反，导致 `errorMapping` 按 code 查 `INVALID_RESPONSE` 查不到，用户只看到兜底"操作失败"。
- **附带收益（已核验 `errorMapping.ts:55-59`）**：改对后，用户错误提示从兜底"操作失败"**升级为映射好的「数据解析失败，请稍后重试」**，且 `retryable: true` 会启用重试按钮。
- **回归核对（已做）**：全仓搜 `INVALID_RESPONSE`/`响应解析失败`，仅 `response-parser.ts` 自身和 `errorMapping.ts:55` 命中，**无任何 catch 代码依赖当前（错误）的字段值**，可安全修改。
- **完成标准**：新增测试先失败（红灯）→ 修复后通过（绿灯）。

### 4.【性能】统一改造 ChatPanel 中读 localInput 的回调 + OutputSection memo（R2-4，扩大范围）

- **做什么**：
  - 用 `useRef` 保存最新 `localInput`（在 `setLocalInput` 处同步更新 ref），改造**所有**依赖 `localInput` 的 `useCallback`，依赖列表去掉 `localInput`、改读 ref：
    - `handleOasisActionFill`（`ChatPanel.tsx:1049`）
    - `handleSuggestionPrepend`（`ChatPanel.tsx:1070`，干的事几乎一样）
    - `ChatPanel.tsx:1169` / `1198` / `1203` 等处的回调
    - 其余依赖 `localInput` 的 useCallback（逐个评估是否传给了会触发重渲染的子组件）
  - `src/components/workspace/OutputSection.tsx:57` 用 `React.memo()` 包裹；确保 `performanceMetrics` 等对象 prop 在上层引用稳定。
- **为什么**：审计 R2-4 痛点是 `ContentRenderer.components` 的 useMemo 依赖 `onOasisActionFill`，每键入失效。**初版只改一个回调是无效的**——因为还有 7+ 个回调同样依赖 `localInput`，只要它们也传给子组件，重渲染依旧。
- **完成标准**：
  - 现有行为测试通过（必要条件）：`ChatPanel.test.tsx`、`OutputSection.test.tsx` 全绿。
  - **新增断言（充分条件）**：验证键入时传给 ContentRenderer 的回调引用不变——可在测试里 mock ContentRenderer，连续两次键入后断言 `onOasisActionFill` 引用相同（`expect(onChange1).toBe(onChange2)`）。否则只能证明"没改坏"，证明不了"性能改善"。
- **证据位置**：`ChatPanel.tsx:883`（`localInput` state 定义）、`1049/1070/1169/1198/1203`（依赖 localInput 的回调）、`ContentRenderer/index.tsx:165-284`（components useMemo）、`OutputSection.tsx:57`（无 memo）。

---

## Public Interfaces / Types（对外接口影响）

- 不改用户可见功能入口。
- 不新增 API。
- 依赖版本变化：`dompurify` `3.4.7` → `3.4.11`；可能涉及 `lodash-es` 升至 `4.18.1`、移除 `overrides.lodash`。
- 删除的根 `src/stores/useContentStore.ts` 无公开导出、无业务引用，删除断面为零。
- `ApiError` 字段语义修正后符合其类定义（`message`/`code` 各归其位），不破坏类型契约。

---

## 提交策略（新增章节，评审补充）

- **核心原则**：所有修复**单独提交**，不与现有 9 个未提交文件（`session.service.ts`、`oasis-actions.ts` 等）混入同一 commit。
- **建议顺序**：
  1. 修复前：先把现有未提交工作**单独提交**（或 `git stash`），保持工作区干净。
  2. 按改动项逐一提交，每个 commit 可独立 review / 回滚：
     - commit A：依赖安全（R1-2/R1-3，含 package.json + package-lock.json）
     - commit B：删除根 useContentStore（R1-1）
     - commit C：parseResponse 参数顺序（R3-4，含测试）
     - commit D：ChatPanel 回调改造 + OutputSection memo（R2-4，含测试）
- **理由**：符合项目 AGENTS §9（不得覆盖与当前任务无关的用户改动）；且依赖锁文件、删文件、改逻辑混在一个 commit 会极难 review 和回滚。
- **安全红线**：禁止 `git reset --hard`、`git checkout --`（除非用户明确授权）。

---

## Test Plan（验证计划）

按顺序执行（快测试在前，慢 build 在后）：

1. `npm test -- src/api/core/response-parser.test.ts --runInBand`（R3-4 单测）
2. `npm test -- src/components/ChatPanel.test.tsx src/components/workspace/OutputSection.test.tsx --runInBand`（R2-4 回归）
3. `npm ls dompurify lodash-es lodash fast-xml-parser js-yaml`（R1-2 全 5 项复验，无 invalid）
4. `npm audit --omit=dev`（官方 registry，R1-3 验证 dompurify 漏洞清零）
5. `npm run type-check`（全量类型）
6. `npm run lint`（全量 lint）
7. `npm run build:size-check`（体积门禁，防 memo/改造引入意外体积）
8. `npm run build`（完整构建）

> 注：步骤 3/4 要求全部 5 个 overrides 对齐，与 Key Changes 第 1 条保持一致（初版此处与 Key Changes 矛盾，已统一）。

---

## Assumptions（假设）

- 因未收到选择反馈，默认采用「短期优先（推荐）」范围。
- 当前已有未提交改动保持不动；不触碰 `src/modules/workspace/hooks/useWorkspaceChatPanel.ts` 等已改文件（R2-3 暂缓原因）。
- `docs/audit/` 报告与异常未跟踪文件 `nul` 不纳入本次修复。
- R2-1、R2-2、R2-3、R2-5、R2-6 另开后续批次处理（见报告「修复优先级建议」中期/长期档）。
- 重装 lockfile 用的 npm 版本需支持 lockfileVersion 3 的 overrides 透传（项目当前为该版本）。

---

## 风险提示

| 风险                                                                     | 等级 | 缓解                                                                                         |
| ------------------------------------------------------------------------ | ---- | -------------------------------------------------------------------------------------------- |
| 重装 lockfile 改变其它传递依赖版本，引入未知回归                         | R2   | 重装后跑全量 test + build + size-check；若 CI 有 lockfile diff 审查更佳                      |
| R2-4 ref 改造遗漏某个读 localInput 的回调，导致行为偏差                  | R2   | 完成标准要求「新增引用不变断言」+ 现有行为测试全绿                                           |
| `overrides.lodash` 移除后，若实际有隐藏传递依赖，可能回退到带 CVE 的版本 | R3   | 移除前用 `npm ls lodash` 确认无消费者；保留则确认锁版本                                      |
| R3-4 改动后，若有未发现的代码依赖旧字段值                                | R3   | 已全仓 grep 核对（仅 errorMapping 一处，且修对后更匹配）；提交后观察 Sentry 错误归类是否变化 |

---

_本计划为只读评审产物，尚未修改任何文件。执行时请遵循项目 AGENTS §4（最小改动）与 §9（安全规则）。_
