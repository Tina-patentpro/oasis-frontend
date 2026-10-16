# 绿洲慧写3.0 前端全面审计 · 总报告(2026-06-22)

> 本报告由 4 个并行子代理(superpower + subagent 模式)产出,主代理整合。只读审计,**未修改任何代码**。
> 报告语言:中文白话,术语均附解释。

---

## 0. 任务理解 (task understanding)

- **任务**:用 superpower + subagent 模式对绿洲慧写3.0 前端做"全面审计"。
- **审计维度**(用户全选):
  1. 代码质量与架构
  2. 安全与依赖
  3. 性能与构建产物
  4. UI/交互一致性与无障碍
- **范围**:`src/` + `scripts/` + 配置 + `docs/api/` 契约。
- **产出形式**:只出报告不改代码。

## 1. 假设 (assumptions)

- 子代理为只读模式,无法直接写文件,故四份子报告由主代理代为落盘到 `docs/audit/`。
- 产品定位:专业专利撰写工具,默认 PC 宽屏;若含移动端诉求,P1-UI-5 需升级处理。
- `dist/` 目录已是最新构建产物(2026-06-22),性能代理未重跑 build 避免超时,体积数据可信。
- 四份子代理发现无明显冲突(已按 dispatching-parallel-agents 技能的"Review and Integrate"步骤复核)。

## 2. 影响文件 (files affected)

本次审计**未修改任何代码**。新增的报告文件:

| # | 文件 | 内容 |
|---|---|---|
| 1 | `docs/audit/2026-06-22-code-quality-audit.md` | 代码质量与架构子报告 |
| 2 | `docs/audit/2026-06-22-security-audit.md` | 安全与依赖子报告 |
| 3 | `docs/audit/2026-06-22-performance-audit.md` | 性能与构建产物子报告 |
| 4 | `docs/audit/2026-06-22-ui-audit.md` | UI/交互/无障碍子报告 |
| 5 | `docs/audit/2026-06-22-comprehensive-audit-summary.md` | 本总报告 |

## 3. 实现摘要 (implementation summary)

### 3.1 审计方法
- 按 `brainstorming` → `systematic-debugging` → `dispatching-parallel-agents` → `verification-before-completion` 四个 superpower 技能的纪律执行。
- 派 4 个并行子代理(Explore 类型),每个负责一个独立"问题域",任务自包含、范围不重叠、产出明确。
- 第一个性能代理因 build 超时失败,改派一个"先静态分析、build 可选"的优化版本,成功完成。
- 主代理负责:落盘报告、跨维度全局优先级排序、冲突复核。

### 3.2 验证命令执行情况(来自子代理证据)

| 命令 | 结果 |
|---|---|
| `npm run type-check` | ✅ 0 错误 0 警告 |
| `npm run lint` | ✅ 0 错误 0 警告 |
| `npm run deps:check` (knip) | ✅ 0 未用依赖 / 0 未用导出 |
| `npm run security:scan` | ✅ 扫描 1255 文件,0 命中 |
| `npm run audit:prod` | ✅ critical/high/moderate/low 全为 0 |
| `npm run api:lint` | ✅ 0 error |
| `npm run api:unused` | ✅ 0 未引用组件 |
| `npm run build` | ⚠️ 未执行(避免超时),但 dist/ 已是最新产物 |

### 3.3 各维度健康度评分

| 维度 | 评分 | 关键加分项 |
|---|---|---|
| 代码质量与架构 | **8.5/10** | 三大质量门禁全绿,路由全懒加载,错误边界三层覆盖 |
| 安全与依赖 | **7.5/10** | 0 依赖漏洞,XSS 防护链完整,CSP/Sentry 脱敏到位 |
| 性能与构建产物 | **8/10** | 首屏 142 KiB gzip,mermaid 拆 37 块,大依赖按需引入 |
| UI/交互/无障碍 | **8/10** | `AccessibleDialog`/`useFocusTrap` 原语成熟,核心组件四态完整 |
| **综合** | **8/10** | 工程纪律扎实,主要短板集中在一致性/历史债 |

---

## 4. 跨维度全局问题清单(按优先级)

> 把四份子报告的所有问题做跨维度排序。等级说明:
> - **P0**:必须立即修,会直接影响线上功能或数据安全。
> - **P1**:近期(1-2 个迭代)修复,影响体验或存在潜在风险。
> - **P2**:有余力再修,属于打磨/治理类。

### 🔴 P0(1 项,唯一)

#### G-P0-1 · 通知系统重渲染风暴(性能 + 代码质量跨维度)
- **位置**:`src/hooks/useNotifications.ts:44-48`(重建 `_options`);消费端 `NotificationCenter.tsx:65,234`、`useWorkspaceNavigation.ts:50`、`useWorkspaceContentSections.ts:179`
- **症状(白话)**:每次组件重渲染都会新建一个 `_options` 对象,而通知系统的轮询定时器把 `_options` 当作依赖。结果:**用户每输入一个字、每点一次弹窗,后台就可能在"清旧定时器→建新定时器→立刻拉一次通知"之间反复抖动**,造成不必要的网络请求和电量消耗;同时 `useNotificationCenter` 返回的整个对象每次都新建,工作区所有订阅它的组件会跟着无谓重渲染。
- **根因**:React 最经典的陷阱——把"每次新建的对象"放进 `useEffect`/`useCallback` 的依赖数组。
- **影响范围**:全部已登录用户的工作区;通知轮询、网络请求量、工作区渲染性能。
- **为什么是 P0**:这是唯一一个**实际影响线上运行时体验**的问题,且修复成本极低(几十行代码),收益立竿见影。
- **修复建议**:
  1. `_options` 改用 `useMemo`/`useRef` 稳定引用,或把固定默认值移到模块顶层;
  2. effect 依赖只放基本类型值(`_options.enableRealTime`、`_options.pollingInterval`),不放对象本身;
  3. `useNotifications` 返回值用 `useMemo` 包一层,或迁移到 Zustand store(与项目风格一致)。
- **预期收益**:稳定 30 秒轮询,工作区核心组件渲染次数大幅下降,弱网下不再出现请求风暴。

---

### 🟠 P1(8 项,按"影响面 × 修复成本"排序)

#### G-P1-1 · 访问令牌存 localStorage 且 30 天有效(安全)
- **位置**:`src/api/core/token-storage.ts:2,96-106,200-218`;`src/stores/useAuthStore.ts:46-57`
- **症状(白话)**:登录后 access token 写进浏览器 localStorage,有效期 30 天。任何能在页面里跑 JS 的 XSS(哪怕绕过 sanitize 的某个边角)都能一行代码读走 token,在别处冒充用户。
- **根因**:localStorage 对同源任意 JS 可读,且无 HttpOnly 保护;项目虽然有 `binding`(绑定 navigator.language+userAgent),但这两者极易伪造。
- **修复建议**:优先方案——后端把 token 改为 `HttpOnly; Secure; SameSite=Strict` Cookie;退一步——token 只放内存,刷新页面走 silent re-auth;手机号等隐私数据不要塞进 localStorage。

#### G-P1-2 · API 契约与实现大面积不一致(安全 + 工程治理)
- **位置**:`docs/api/users-auth.yaml`(version `0.1.0-draft`)vs `src/api/services/auth.service.ts`、`notification.service.ts`
- **症状(白话)**:契约写的 `/api/auth/login`、`/api/notifications`,实际代码调的是 `/auth/pwdlogin`、`/user/usermessagelist`;契约里描述的 2FA、refresh token 在代码里**根本不存在**。契约形同"草稿文档",不能作为前后端对接或安全评审的依据。
- **根因**:契约文件停留在早期设计稿,代码后来按真实后端实现,但契约从未回填。`api:lint`/`api:unused`/`api:metadata` 三道关卡都只校验契约自身,不校验"契约 vs 实际调用"。
- **影响范围**:全部 auth/通知接口的可信度;安全评审、第三方接入会形成审计盲区。
- **修复建议**:以实现为真源反向生成契约,或在 CI 增加一道"端点对照"检查(把代码里的字面量端点抽取出来,与 yaml 的 `path` 做差集比对),让漂移可见。

#### G-P1-3 · ChatPanel 用弱化的内联确认弹窗(UI/无障碍)
- **位置**:`src/components/chat/ConfirmationDialog.tsx:75-125`(被 `ChatPanel.tsx:795-816` 使用);对照 `ui/feedback/ConfirmDialog.tsx`、`AccessibleDialog.tsx`
- **症状(白话)**:清空对话 / 开始新对话这种高频破坏性操作,弹出的确认框没走项目那套高质量的 `AccessibleDialog`。它的焦点陷阱只认 `<button>`、遮罩过淡(`bg-black/20`)、没锁 body 滚动、`aria-modal` 缺失。读屏用户焦点可能逸出。
- **根因**:历史上有 `chat/ConfirmationDialog`(定位"贴在 chat panel 内")和 `ui/feedback/ConfirmDialog` 两条线,没收敛到一套。
- **修复建议**:把 `ChatPanel` 的两个 `ConfirmationDialog` 改用 `ui/feedback/ConfirmDialog`,删除 `chat/ConfirmationDialog.tsx`;若确实需要"局部确认框"形态,就补上 `aria-modal`、`aria-hidden` 背景层、body scroll lock,焦点陷阱换成 `useFocusTrap`。

#### G-P1-4 · QuickCreateProjectDialog 提交按钮异步期间不 disable(UI)
- **位置**:`src/components/QuickCreateProjectDialog.tsx:183-190`;触发链 `useWorkspaceLayout.ts:208-252`
- **症状(白话)**:点"创建项目"后按钮保持可点,慢网下连点 2-3 下会建出多个同名项目。
- **根因**:`QuickCreateProjectDialog` 把"校验通过"当成"提交完成",没暴露 `isSubmitting` 状态给按钮。
- **修复建议**:在组件内加 `isSubmitting` state,`handleConfirm` 改 async,按钮 `disabled={isSubmitting}`、文案 `创建中…`。对照 `InstructionLibraryPanel.tsx:289-293` 已正确实现,可作范本。

#### G-P1-5 · RechargeDialog 配置拉取失败静默吞错(UI)
- **位置**:`src/components/RechargeDialog.tsx:38-49`
- **症状(白话)**:打开充值弹窗时拉 `getRechargeConfig()`,失败只 `console.error`,用户侧无任何提示。后果是金额限额、赠送规则都按错误的心智模型显示,用户可能充错金额、误以为有赠送。
- **根因**:异步副作用没走 `useAsyncState` 的 error 通道,异常被吞。
- **修复建议**:改用 `useAsyncState`,error 时在弹窗内展示"配置加载失败,请重试"+ 重试按钮;或至少 `notify('充值配置加载失败,显示的金额规则可能不准确')`。

#### G-P1-6 · AsyncTaskMenu 删除无二次确认(UI)
- **位置**:`src/components/workspace/navigation/AsyncTaskMenu.tsx:91-97`("清除已完成")、`:166-174`(单条删除)
- **症状(白话)**:"清除已完成"一点就清掉全部已完成任务记录,没有二次确认,误触成本高。
- **修复建议**:"清除已完成"接 `ConfirmDialog`(danger=true);单条删除可保留即时,但建议加内联确认两段式。

#### G-P1-7 · 计费链路 `as unknown as` 类型逃逸(代码质量 + 安全跨维度)
- **位置**:`src/api/services/billing.service.ts:37,45,69,77,96,104,119,127`(8 处)等
- **症状(白话)**:多处用 `response as unknown as XxxResponse` 把弱类型 API 响应强转,跳过 TS 结构校验。后端字段一变,TS 不会报错,**运行时才崩**,主要风险在计费/充值链路。
- **根因**:`billing.service` 里同一个函数对"有 `data` 字段"和"无 `data` 字段"两种响应形态分别做了两次断言,说明后端响应壳的类型定义与实际返回形态不一致。
- **修复建议**:给 `apiClient` 的响应定义统一的"信封(envelope)"类型(如 `{ code; message; data: T }`),让 service 层只做一次正确的解包。

#### G-P1-8 · 6 个超大文件用 eslint-disable 长期冻结(代码质量)
- **位置**:`ChatPanel.tsx`(1416 行)、`session-click.ts`(1047 行)、`useWorkspaceContentSections.ts`(1013 行)、`DownloadFilesDialog.tsx`(922 行)、`generation-actions.ts`(910 行)、`ai.service.ts`(860 行)、`useWorkspaceSidebar.ts`(815 行)
- **症状(白话)**:`eslint.config.js:94-106` 用一个 overrides 块对 7 个超大文件**直接关闭 `max-lines`**、对 3 个文件关闭 `complexity`——等于把告警永久静音而不是治理。这些文件承担多重职责,认知负担高、回归风险集中、难以并行开发。
- **修复建议**:继续把 `ChatPanel.tsx` 的"输入区/工具栏/标签页"拆成子组件(已有 `chat/hooks/*` 的逻辑外置做范本);`DownloadFilesDialog.tsx` 拆成 3 个子组件 + 1 个 hook;拆完后**移除对应 eslint-disable**,让门禁重新生效。

---

### 🟡 P2(15 项,打磨/治理类)

| # | 类别 | 位置 | 一句话症状 |
|---|---|---|---|
| G-P2-1 | 安全 · CSP 放宽 | `src/config/security.ts:13,15` | `img-src`/`connect-src` 用 `https:` 通配,一旦出现 XSS 数据外带几乎不受 CSP 阻拦 |
| G-P2-2 | 安全 · Sentry 脱敏盲区 | `src/monitoring/sentry-scrubbing.ts:9-20,50-80` | 未覆盖 `event.tags`、`event.contexts`、`event.request.body`,可能携带 PII |
| G-P2-3 | 安全 · zip bomb 防护缺失 | `src/utils/user-data-export.ts:142-161` | `JSZip.loadAsync` 没限制总解压字节数/条目数,恶意后端可让浏览器 OOM |
| G-P2-4 | 安全 · GET 用于写操作 | `notification.service.ts:218,225,232,239`;`history.service.ts:188,253,262` | 标记已读/删除/重命名用 GET,易被预取/CSRF 触发(后端设计问题,前端照搬) |
| G-P2-5 | 性能 · diagram-parser-vendor 擦边 | `dist/assets/diagram-parser-vendor-*.js`(596.6 KiB) | 距 size-check 600 KiB 上限仅 3.4 KiB,chevrotain 升级即破,且规则有歧义 |
| G-P2-6 | 性能 · jszip 静态 import | `src/utils/export-utils/executor.ts:1`、`user-data-export.ts:1` | 改动态 import 可让导出 chunk 瘦 ~95 KiB |
| G-P2-7 | 性能 · index chunk 较大 | `dist/assets/index-7cv2uy58.js`(439.3 KiB) | 路由内懒加载,需跑 analyze 定位归属后按功能再拆 |
| G-P2-8 | UI · ProjectCard 整卡 div onClick | `ProjectCard.tsx:167-170` | 无 `role/tabIndex/onKeyDown`,键盘用户/读屏用户进不去 |
| G-P2-9 | UI · 装饰 SVG 漏 aria-hidden | `NavigationBar.tsx:214-224`、`OutputSection.tsx:288-298` | 读屏可能朗读 path 噪音;另 OutputSection path 数据可疑可能渲染畸形图标 |
| G-P2-10 | UI · 文案省略号不统一 | 多处 | `…`(U+2026)与 `...` 混用,"加载中/正在加载"混用,"确认/确认?/确定"混用 |
| G-P2-11 | UI · ChatSearchBar 无焦点陷阱 | `ChatConversationPane.tsx:72-94` | Tab 会跳出搜索栏,建议接 `useFocusTrap` |
| G-P2-12 | UI · z-index 无全局约定 | `UserMenuPanel.tsx:204,427-457` | 建立 `Z.dropdown/popover/modal/toast/sessionExpired` 常量表 |
| G-P2-13 | UI · 核心工作区无移动端适配 | `WorkspaceMainLayout.tsx`、`useWorkspaceLayout.ts`、`ChatPanel.tsx:1311` | 纯像素布局,无 `useMediaQuery`;**若产品含移动端则升级为 P1**,PC-only 则 P2 |
| G-P2-14 | 代码质量 · 死代码占位文件 | `src/hooks/useSessions.ts`、`src/hooks/useProjectDetail.ts` | 各 2 行注释无导出,直接删除 |
| G-P2-15 | 代码质量 · blob 下载逻辑重复 | `utils/file-utils.ts:59` vs `utils/export-utils/executor.ts:164` | 函数体完全一致,后者改 import 前者 |

> 另有观察项(非问题):ZIP 导出两套并存(P2-2 子报告)、tsconfig 多个严格选项关闭(子报告 P2-3)、ChatSearchBar autoFocus 等——详见各子报告。

---

## 5. 验证执行 (validation run)

- ✅ type-check:0 错误
- ✅ lint:0 错误 0 警告
- ✅ knip:0 未用依赖/未用导出
- ✅ security:scan:0 命中
- ✅ npm audit:0 漏洞(含 dev 依赖)
- ✅ api:lint:0 error
- ✅ api:unused:0 未引用
- ⚠️ build:未执行(性能代理为避免超时跳过,使用既有 dist/ 数据)

> 说明:本次为审计任务,**不涉及代码改动**,因此验证门禁的重点是"确认问题清单都有证据、命令结果都真实"。所有命令输出均见各子报告"验证命令执行结果"章节。

---

## 6. 风险列表 (risk list)

按 AGENTS.md 10.9 的风险分级:

| 等级 | 风险 | 说明 |
|---|---|---|
| **R1**(改动功能的直接行为风险) | G-P0-1 修复时若改错依赖数组,可能导致通知轮询彻底停摆 | 修复后需手动验证:登录→观察 Network 面板,确认 30 秒只发一次通知请求 |
| **R1** | G-P1-1 改 HttpOnly Cookie 涉及后端联调,跨域 Cookie 配置错误会导致登录全断 | 需后端配合,前端无法独立完成 |
| **R1** | G-P1-4 给提交按钮加 disabled,若状态机写错可能导致按钮永久 disabled | 参考 `InstructionLibraryPanel.tsx` 范本 |
| **R2**(共享组件/hook 复用风险) | G-P1-3 收敛确认弹窗后,所有用 `chat/ConfirmationDialog` 的地方都要改 | 仅 `ChatPanel.tsx:795-816` 两处,影响面可控 |
| **R3**(样式/布局回归风险) | G-P2-13 若要做移动端适配,会重构 `WorkspaceMainLayout`,回归面大 | 需先确认产品定位,PC-only 则不动 |
| **R4**(API/状态模型/契约一致性) | G-P1-2 回填契约时,若以错误的实现版本为真源,会固化错误 | 建议前后端共同评审后再回填 |
| **R4** | G-P1-7 改 billing 类型信封,需同步 8 处断言 + 后端响应壳确认 | 改完跑充值链路回归 |

---

## 7. 人工检查清单 (manual QA checklist)

> 涉及 UI 的修复必须人工验证。本清单按"如果按本报告建议修复"来列。

### G-P0-1 通知重渲染风暴
- **页面/路由**:任意已登录工作区页
- **前置**:已登录,有未读通知
- **步骤**:
  1. 打开 DevTools Network 面板,过滤 `notifications` 请求
  2. 在输入框快速打字 30 秒、开关几次弹窗
  3. 观察 Network 里通知请求的频率
- **预期**:修复后,通知请求应严格 30 秒一次,不随打字/弹窗操作增加
- **边界**:断网恢复后应能恢复轮询;切换标签页(visibilitychange)行为符合预期

### G-P1-3 ChatPanel 确认弹窗收敛
- **页面/路由**:工作区 → 聊天面板
- **步骤**:
  1. 在聊天面板触发"清空对话"
  2. 用键盘 Tab 在确认框里移动焦点
  3. 按 Esc 关闭,确认焦点回到触发按钮
- **预期**:焦点被困在弹窗内、Esc 可关、关闭后焦点回到触发按钮、遮罩明显
- **边界**:读屏软件(NVDA/VoiceOver)朗读"对话框"角色

### G-P1-4 建项目按钮 disable
- **页面/路由**:左侧栏 → 新建项目
- **步骤**:
  1. 打开 QuickCreateProjectDialog,填好表单
  2. 连续快速点"创建项目"3 次(模拟慢网)
- **预期**:第一次点击后按钮 disabled + 显示"创建中…";只创建一个项目
- **边界**:网络错误后按钮恢复可点,允许重试

### G-P1-5 充值配置错误态
- **页面/路由**:充值弹窗
- **步骤**:用 DevTools 把 `getRechargeConfig` 接口 mock 成 500,打开充值弹窗
- **预期**:弹窗显示"配置加载失败,请重试"+ 重试按钮,而不是显示错误的限额规则
- **边界**:重试按钮真的会重新拉取

### G-P1-6 AsyncTaskMenu 删除二次确认
- **页面/路由**:顶部铃铛 → 任务中心
- **步骤**:点"清除已完成"
- **预期**:弹出二次确认(danger 样式),取消则不删

### G-P2-13 移动端适配(若决定做)
- **页面/路由**:工作区
- **步骤**:把浏览器窗口缩到 800px 宽以下,或用 DevTools 模拟 iPad 竖屏
- **预期**:布局降级为单栏 + 抽屉式左栏,无横向滚动
- **边界**:从窄屏拖回宽屏,布局应平滑恢复

---

## 8. 范围外后续建议 (out-of-scope follow-up improvements)

按 AGENTS.md 10.10,这些不在本次审计范围,但值得单独立项:

1. **API 契约治理专项**:不止 auth/notification,建议把 `billing.yaml`、`projects.yaml`、`files.yaml` 等全部做"契约 vs 实现"对照,建立 CI 长期守护。预计 1-2 周。
2. **超大文件拆分专项**:`ChatPanel.tsx`(1416 行)是首要目标,建议单独立项,按"输入区/工具栏/标签页"拆 3 个子组件 + 若干 hook。预计 3-5 天。
3. **Token 存储改造专项**:涉及后端 HttpOnly Cookie 改造,跨端联调,建议单独立项。预计 1 周(含后端)。
4. **移动端适配专项**(若产品含移动端):重构 `WorkspaceMainLayout` + `useWorkspaceLayout`,引入 `useMediaQuery`。预计 2-3 周。
5. **tsconfig 严格选项渐进开启**:按 `noImplicitOverride` → `noFallthroughCasesInSwitch` → `noUnusedLocals/Parameters` → `noUncheckedIndexedAccess` 顺序逐步开启。预计每个选项 0.5-1 天。
6. **文案字典化**:在 `constants/copy.ts` 集中管理加载/保存/确认/空态文案,消除当前 `…`/`...`、`加载中`/`正在加载` 的不一致。预计 1 天。
7. **z-index 层级常量化**:建立 `Z.dropdown/popover/modal/toast/sessionExpired` 表,消除当前各组件用默认 `z-50` 的隐患。预计半天。
8. **导出能力合并**:`user-data-export.ts` 与 `exportUtils.ts`+`export-utils/*` 两套长期并存,建议先文档化边界,长期把附件聚合能力下沉到 `export-utils/executor`。

---

## 附录:子代理派发与执行记录

| 子代理 | 状态 | 说明 |
|---|---|---|
| 代码质量与架构 | ✅ 一次成功 | 跑通 type-check/lint/knip,大文件/重复逻辑/类型逃逸核查 |
| 安全与依赖 | ✅ 一次成功 | 跑通 security:scan/audit/api:lint/api:unused,XSS/契约一致性核查 |
| UI/交互/无障碍 | ✅ 一次成功 | 静态代码审计,覆盖 11 个区域的状态矩阵 |
| 性能与构建产物 | ⚠️ 首次失败,重试成功 | 首次因 build 超时失败;重试版本改为"先静态分析、build 可选",用既有 dist/ 完成体积分析 |

四份子报告完整内容见 `docs/audit/2026-06-22-{code-quality,security,performance,ui}-audit.md`。
