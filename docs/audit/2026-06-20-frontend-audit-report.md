# 绿洲慧写 3.0 前端全面审计报告

- **审计日期**：2026-06-20
- **审计范围**：代码质量与架构、性能与构建（用户选定维度）
- **审计方式**：superpowers 流程（计划 → 实施 → 反思 → 完善）+ 4 个并行只读子代理
- **基线**：`master` 分支当前工作区（含已暂存改动）
- **产出类型**：只读审计报告 + 分级风险清单（**未改动任何代码**）

---

## 0. 基线快照（客观状态）

| 检查项   | 命令                                 | 结果                                                  |
| -------- | ------------------------------------ | ----------------------------------------------------- |
| 类型检查 | `npm run type-check`（tsc --noEmit） | ✅ **0 错误**                                         |
| Lint     | `npm run lint`                       | ✅ **0 error / 0 warning**（607 文件，12 处显式抑制） |
| 死代码   | `npm run deps:check`（knip）         | ✅ 1 未用依赖 + 2 误报 devDep                         |
| 构建     | `npm run build`                      | ✅ 成功，5405 模块，16.76s                            |
| 体积门禁 | `npm run build:size-check`           | ✅ 通过，37 diagram chunks，最大 431 KiB              |

**结论**：仓库工程基线健康，无阻断性编译/lint/构建问题。审计发现的问题都是**质量、架构、性能、安全层面**的，不影响"能否构建运行"，但影响"长期可维护性、性能上限、安全暴露面"。

---

## 1. 风险等级说明

| 等级   | 含义                                              | 处理建议时机 |
| ------ | ------------------------------------------------- | ------------ |
| **R1** | 直接功能风险 / 构建可复现性硬伤 / 安全暴露        | 立即         |
| **R2** | 共享代码/store 复用风险 / 关键路径性能 / 体积红线 | 本迭代       |
| **R3** | 可维护性 / 重构债 / 次要性能 / 依赖卫生           | 排期         |
| **R4** | 契约/类型 / 可观测性 / 架构一致性                 | 跟进         |

---

## 2. 问题清单（按风险等级排序，已去重）

> 所有结论均经主代理复核验证（持久化键冲突、ApiError 参数顺序、ProfileSettings 吞错、download.pump 四项由主代理亲自读源码确认）。

### 🔴 R1 — 立即处理（3 项）

#### R1-1【架构】两个 `useContentStore` 共用持久化键 `'content-storage'`，相互覆写

- **位置**：`src/stores/useContentStore.ts:151`（根版本）与 `src/modules/workspace/stores/useContentStore.ts:166`（模块版本）
- **现象**：两个独立 `create(persist(...))` store 写同一个 localStorage 键，但 `partialize` 字段集不一致——根版本持久化 `generated/versions/showDiff`，模块版本注释掉了这三项。
- **影响**：谁后 hydrate 谁覆盖 localStorage；字段瘦身导致刷新后偶发**生成内容/版本历史丢失**。属直接功能风险。根版本经全仓核实零引用。
- **建议**：删除根版本（`src/stores/useContentStore.ts` 整文件死代码），一并消除键冲突。**主代理已验证根版本无任何 import。**

#### R1-2【构建/安全】`package.json` overrides（CVE 锁）与 lockfile/node_modules 严重脱节

- **位置**：`package.json:112-118`（overrides）、`package-lock.json`（根包无 overrides 字段）
- **现象**：overrides 声明 `dompurify@3.4.7`、`lodash-es@4.18.1`、`lodash@4.18.1`、`fast-xml-parser@5.8.0`、`js-yaml@4.1.1`；但 `npm ls` 对 dompurify 报 `invalid`（磁盘实际 3.3.3），lodash-es 实际 4.17.23（非 4.18.1）；lockfile 根包**完全没有 overrides 字段**。
- **影响**：① CI 可复现性硬伤（`npm ci` 得到的版本树与本地不同）；② **安全锁形同虚设**——锁了 3.4.7 实际跑 3.3.3，CVE 防护失效。
- **建议**：删除 `node_modules` 和 `package-lock.json` 后重新 `npm install`，让 overrides 真正写回 lockfile；重装后校验 `npm ls dompurify lodash-es` 应为 3.4.7 / 4.18.1 且无 invalid。

#### R1-3【安全】dompurify 存在 3 条活跃 CVE，且锁定版本仍受影响

- **位置**：`package.json:113`、`npm audit`
- **现象**：`npm audit --omit=dev` 报 1 条 moderate（含 GHSA-vxr8-fq34-vvx9 / gvmj-g25r-r7wr / cmwh-pvxp-8882），受影响范围 `<=3.4.10`，建议升到 `3.4.11`。dompurify 被 `MermaidChart.tsx:27-38` 用于 sanitize mermaid 输出 SVG（**XSS 防线**）。
- **影响**：mermaid 图表输出若含恶意 SVG，sanitize 绕过可能导致 XSS；当前磁盘 3.3.3 比 3.4.7 更老，漏洞面更大。
- **建议**：与 R1-2 合并处理，把 `overrides.dompurify` 与直接依赖一并提到 `3.4.11+` 后重装。

---

### 🟠 R2 — 本迭代处理（6 项）

#### R2-1【架构】两个 `useUIStore` 并存，职责重叠，被同文件混用

- **位置**：`src/stores/useUIStore.ts:120`（键 `app-ui-storage`）与 `src/modules/workspace/stores/useUIStore.ts:92`（键 `workspace-ui-storage`）
- **现象**：根 store 实际只承载 `showToast`/`tooltipsEnabled`；模块 store 承载真正的 chat/布局/对话框状态。两者字段大量重名（`chatOpen`/`chatMode`/`chatWidth`/`layoutMode`/`settingsOpen`…）。同文件混用例：`useNotifications.ts:4,7`、`AsyncTaskDaemon.tsx:4,5`、`BackgroundTaskPoller.tsx:4,5`。
- **影响**：心智负担大，易"改错 store 导致状态看起来没生效"；是 R1 store 双轨问题的姊妹债。
- **建议**：把 toast 相关收敛到单一 UI store，删其中一个；最小改动是把根 store 砍到只剩 toast。

#### R2-2【架构】两套异步任务 store 同时追踪 `tasks`，由同一 hook 双写

- **位置**：`src/stores/useBackgroundTaskStore.ts:86`（sessionStorage）与 `src/modules/workspace/stores/async-task.store.ts:39`（sessionStorage）
- **现象**：`useWorkspaceContentSections.ts:207,460` 动态 import 写 `useBackgroundTaskStore.markCompleted`；同时 `useAsyncTaskStore` 被 daemon/poller/notifications 写入。两份任务终态易漂移。
- **影响**：任务去重/通知逻辑可能漏触发或重复触发；`useBackgroundTaskStore.ts:34-37` 注释也承认"不是主来源"。
- **建议**：以 `useAsyncTaskStore` 为唯一真相源，删除 `useBackgroundTaskStore` 或将其并入。

#### R2-3【性能】多个 store 被"整对象解构"订阅，无细粒度 selector

- **位置**（均为 `useXxxStore()` 无 selector）：
  - `src/modules/workspace/hooks/useWorkspaceLayout.ts:34`（`useUIStore()`）
  - `src/modules/workspace/hooks/useWorkspaceContentSections.ts:124-139`（`useContentStore()` 解构十几个字段）
  - `useWorkspaceDialogs.ts:96`、`useWorkspaceNavigation.ts:49`、`useWorkspaceSidebar.ts:545`、`useWorkspaceChatPanel.ts:88`、`ModelPreferenceSection.tsx:29`
- **现象**：不传 selector 订阅整个 store，Zustand 默认 `Object.is` 浅比较，store 任一字段变更都触发重渲染。
- **影响**：工作区根级 hook 放大渲染扇出——输入框键入（`inputSections` 变）与输出生成（`generated` 变）互相牵连；toast 弹出会让 `useWorkspaceLayout` 依赖方重算。**这是当前最容易产生可感知卡顿的点。**
- **建议**：改细粒度 selector `useContentStore((s) => s.generated)`，多字段用 `useShallow`。

#### R2-4【性能】`OutputSection` 未 memo + `handleOasisActionFill` 回调引用每次输入都变

- **位置**：`src/components/workspace/OutputSection.tsx:57`（无 memo）；`src/components/ChatPanel.tsx:1049`（`handleOasisActionFill` 依赖 `localInput`）；`src/components/ContentRenderer/index.tsx:165-284`（`components` useMemo 依赖该回调）
- **现象**：`handleOasisActionFill` 的 `useCallback` 依赖受控输入值 `localInput`，每键入一字重建 → `ContentRenderer.components` memo 失效 → 整套 markdown 组件映射表重建。
- **影响**：对话面板有 N 条历史助手消息时，输入框每次键入让当前消息的 markdown+KaTeX+语法高亮管线全量重跑。`OutputSection` 未 memo 加剧问题。
- **建议**：`handleOasisActionFill` 改用 ref 读最新 `localInput`，依赖列表去掉 `localInput`；`OutputSection` 用 `memo()` 包裹。

#### R2-5【架构】缺少全局 `unhandledrejection` / `window.onerror` 兜底

- **位置**：`src/main.tsx:1-21`（仅挂 `initMonitoring`）
- **现象**：grep 全仓无 `window.onerror`/`'unhandledrejection'` 监听。`reportError` 只在 `componentDidCatch` 调用，覆盖不到事件回调里的异步崩溃。
- **影响**：生产环境异步崩溃（轮询回调、SSE onError、`void xxx()` fire-and-forget）无上报、无降级。
- **建议**：在 `initMonitoring` 注册 `window.addEventListener('unhandledrejection', ...)` 与 `('error', ...)`，统一调 `reportError`。

#### R2-6【构建】`markdown-vendor`(494 KiB) 离 600 KiB 红线仅剩 ~17%

- **位置**：`dist/assets/markdown-vendor-*.js`（494 KiB / gzip 151 KiB）、阈值 `scripts/build/check-bundle-size.mjs:9-12`
- **现象**：markdown-vendor 含 react-markdown + remark/rehype + katex，未按需化。当前无 chunk 超 600 KiB，但余量很小，新增任一插件即超标。
- **影响**：体积红线压力；虽属懒加载（首屏不加载），但首次渲染消息时拉取较大。
- **建议**：把 `katex` + `remark-math` + `rehype-katex` 改为首次遇数学公式时动态 import（bundle-report Stage B 计划项，未落地），可压到 ~325 KiB。

---

### 🟡 R3 — 排期处理（13 项）

> 以下为可维护性/重构债与次要优化，逐条简述。详细位置见子代理原始报告。

#### 代码质量类

- **R3-1**【质量】`tsconfig.json` 未整体开启 `strict: true`，仅手动开 `noImplicitAny`+`strictNullChecks`，缺 `noUnusedLocals/Parameters`、`noUncheckedIndexedAccess`、`noImplicitOverride`、`noFallthroughCasesInSwitch`、`noPropertyAccessFromIndexSignature`。`arr[i]` 返回 `T` 而非 `T|undefined`，数组越界无保护。建议分步推进。
- **R3-2**【质量/UX】`ProfileSettingsSection.tsx:52-68` 加载用户详情失败仅 `console.error`，无 `loadError` state，UI 显示空白表单。**主代理已验证。** 建议补 `loadError` state + 重试/错误占位。
- **R3-3**【质量】`download.ts:231-252` 的 `pump()` `.then()` 链无 `.catch`，`reader.read()` reject 产生 unhandled rejection。**主代理已验证。** 建议补 `.catch` 或改 async/await。

#### API 层类

- **R3-4**【质量】`parseResponse`（`response-parser.ts:51-55`）`new ApiError('INVALID_RESPONSE', error.message, status)` **参数顺序写反**——`message` 与 `code` 错位，导致 `errorMapping` 按 code 查表失败，用户提示退化为默认"操作失败"。**主代理已验证。** 建议改为 `new ApiError(error.message || '响应解析失败', 'INVALID_RESPONSE', status)`。
- **R3-5**【架构】`performRequest` 与 `uploadFileRequest`（`client-helpers.ts:154-191` / `381-417`）错误封装逻辑大段重复。建议抽 `buildApiErrorFromResponse` 公共函数。
- **R3-6**【架构】SSE 流式基础设施（`client.ts:142-170` 的 `postStream`/`stream`、`client-helpers.ts:216-358` 的 `createStreamSubscription`、`stream-recovery.ts`）约 150 行**当前无业务调用者**。**史实订正**（据 `docs/reports/后端补齐接口清单-按页面影响-2026-02-09.md:20-21`）：项目曾接入流式链路（`useStream.ts`/`useStreamGenerate.ts`/`generateStream/sendChatStream`），2026-02-09 因后端接口缺失主动删除业务层，但**底层管道被保留**。当前聊天走非流式 `sendChatflow`（`ai.service.ts:643-668`，POST `/apicategories/charteflowcreate`，一次性返回）。属"半拆除"遗留——要么重新接入流式业务，要么移除底层管道。详见专题分析「SSE 流式基础设施的去留」。

#### 死代码/重复类

- **R3-7**【架构】`src/api/services/chat.service.ts` 整文件零业务调用（仅包一层 `aiService.sendChat`）。建议删。
- **R3-8**【架构】`src/api/sdk/workflows.ts` + `src/api/index.ts:7` 导出零调用。建议删 `api/sdk` 目录。
- **R3-9**【架构】`src/utils/errorHandler.ts` 的 `retryAsync`/`withErrorHandler`/`logError` 仅被自身测试引用，且与 `retry-policy.executeWithRetry` 功能重复。建议删这三个函数。
- **R3-10**【架构】`getErrorMessage` 在 4 处重复定义（`errorHandler.ts:15`、`useSmsCode.ts:15`、`LoginForm.tsx:30`、`view-state.ts:46`）。建议统一引用。
- **R3-11**【架构】根 `useUIStore`（`src/stores/useUIStore.ts:67-115`）大量字段（`theme`/`themeColor`/`language`/`fontSize`/`workspaceLayout`/`chatOpen`…）被持久化但**无读取者**。建议删除死字段。

#### 性能类

- **R3-12**【性能】`LeftSidebar.renderSessionItem`（`LeftSidebar.tsx:171-441`）依赖含 `sessionMenuOpen`/`renamingSessionId`/`renameValue`，任一变化重建整列会话项。会话列表未虚拟化（仅"加载更多"）。建议把会话项抽 `memo` 子组件。
- **R3-13**【性能】`Tooltip.tsx:60-91` 每次打开都创建临时 DOM 节点测量尺寸再销毁。指令库面板等密集区域微卡顿。建议缓存尺寸或用隐藏节点测量。

---

### 🟢 R4 — 跟进处理（7 项）

- **R4-1**【契约】`parseResponse`（`response-parser.ts:39`）非 JSON 响应无 validator 时直接 `text as unknown as T`，类型系统被欺骗。建议 `T` 非 string 时强制要求 validator 或 dev 断言。
- **R4-2**【契约】`ai.service.ts:37-47` `ChatflowResponse` 容忍 `answer?/answer_text?/content?/text?/output?/result?` 六字段兜底，契约过宽。建议与后端对齐单一字段。
- **R4-3**【架构】`user.service.exportUserData`（`user.service.ts:186-207`）绕过 `apiClient` 直接 `fetch`，丢失统一 401/重试/错误封装。建议给 `apiClient` 增二进制支持。
- **R4-4**【架构】组件直接 import `@/api/core/*`（`SessionExpiryBanner.tsx:4`、`useInstructionLibrary.ts:11`、`SettingsPanel.tsx:5`、`AsyncTaskDaemon.tsx:6`），越层依赖。建议通过 service/client 重新导出。
- **R4-5**【架构】`'user'` localStorage 键被 4 处独立直写（`useAuthStore`/`auth.service`/`user.service` + `useUserStore` 另键），无统一封装，`auth.service.getCurrentUser()` 直接 `JSON.parse` 无 try/catch。建议抽 `user-storage` 工具。
- **R4-6**【安全】`useAsyncToolStore`/`useModelPreferenceStore` 登出未级联清理，多账号/公共设备切换有残留面。建议在 `logout()` 统一调各业务 store reset。
- **R4-7**【架构】`useThemeStore.theme`（配色键 `'green'`）与 `useUIStore.theme`（亮暗 `'light'/'dark'`）同名不同义，且后者是死字段。建议移除后者或改名 `colorScheme`。
- **R4-8**【可观测性】web-vitals 用 `captureMessage`（info 级）+ `reportAllChanges: true`（`monitoring/index.ts:23-39,163-168`），事件量大，污染 Sentry 信噪比。建议用 `setMeasurement` 或只最终值上报。
- **R4-9**【可观测性】工作区输出有完整 `Profiler` 埋点，但聊天侧 `ChatMessageItem`→`ContentRenderer` 无 Profiler，流式/长回复渲染耗时无数据。建议补埋点。

---

## 3. 正向结论（项目强项）

1. **工程基线健康**：type-check / lint / build / size-check 全部 0 错误通过，5405 模块构建 16.76s。
2. **类型卫生优秀**：生产代码 `any`/`as any`/`@ts-ignore` **零使用**，`as unknown as` 全部带 runtime guard。
3. **异步数据空值防御是强项**：`oasis-actions` 解析白名单+长度上限+ID 去重+黑名单；billing/ai service 普遍 runtime guard + 兜底空值。
4. **重型库懒加载到位**：mermaid（拆成 ~20 个按图类型 chunk）、katex、syntax-highlighter、Sentry、web-vitals 全部 `lazy`/动态 import，首屏同步 JS 仅 ~330 KiB。
5. **聊天列表虚拟化 + 精细 memo**：`react-virtuoso` + `MessageItem` 逐字段自定义比较器。
6. **API core 拆分合理且有测试**：token-storage / auth-refresh（401 单飞去重）/ retry / timeout / response-guards 各司其职。
7. **size gate 设计严谨**：强制 diagram chunk ≥6 个、单 chunk ≤600 KiB，且有 `check-bundle-size.test.mjs` + `vite-manual-chunks.test.ts` 双断言保护。

---

## 4. 修复优先级建议（短期 / 中期 / 长期）

### 短期（1-2 周，R1 + 关键 R2）

1. **R1-2 + R1-3**：删 lockfile 重装，让 dompurify 等安全锁生效并升 3.4.11。
2. **R1-1**：删除根 `useContentStore.ts`（死代码 + 键冲突）。
3. **R3-4**：修 `parseResponse` ApiError 参数顺序（一行改动，直接影响用户错误提示）。
4. **R2-3 + R2-4**：store selector 细粒度化 + `handleOasisActionFill` 用 ref + `OutputSection` memo。

### 中期（1 个月，R2 + 高频 R3）

5. **R2-1 + R2-2**：收敛双轨 store（UIStore / 任务 store）。
6. **R2-5**：补全局异步错误兜底。
7. **R2-6**：katex/remark-math 按需化，释放体积余量。
8. **R3-2 + R3-3**：ProfileSettings 错误态 + download.pump catch（用户可见改进）。
9. **R3-7~R3-11**：批量清理死代码/重复逻辑（knip 与 grep 已定位）。

### 长期（持续推进，R4 + 严格度）

10. **R3-1**：分步推进 `strict: true`（先 `noUnusedLocals` → 最后 `noUncheckedIndexedAccess`）。
11. **R4-1~R4-9**：契约收敛、越层 import 整改、可观测性补齐。

---

## 5. 子代理分工与覆盖率

| 子代理       | 维度      | 发现项数            | 主代理复核              |
| ------------ | --------- | ------------------- | ----------------------- |
| 架构审计     | 质量+架构 | 15 项               | R1-1 复核通过           |
| 代码质量审计 | 质量+架构 | 4 项（+ 正向结论）  | R3-2/R3-3/R3-4 复核通过 |
| 性能审计     | 性能+构建 | 9 项                | R2-3/R2-4 复核通过      |
| 构建审计     | 性能+构建 | 6 项（+ knip 汇总） | R1-2/R1-3 复核通过      |

**反思阶段交叉比对**：4 份报告范围不重叠，去重后无冲突项；store 双轨问题被架构 + 性能两个子代理从不同角度印证（架构看"双 store 冲突"，性能看"selector 缺失"），相互佐证提升可信度。

---

_本报告为只读审计产物，未修改任何源代码。修复时请逐项创建独立任务并遵循项目 AGENTS §10.2 决策顺序。_
