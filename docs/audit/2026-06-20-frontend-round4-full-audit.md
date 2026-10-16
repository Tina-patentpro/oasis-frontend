# 绿洲慧写 3.0 前端第四轮全量审计报告（无死角版）

- **审计日期**：2026-06-20（第四轮）
- **审计性质**：真正意义全量审计（17 维度无死角 + 纠正前三轮误判）
- **审计基线**：当前工作区
- **审计方式**：superpowers（计划 → 实施 → 反思 → 完善）+ 5 子代理（A1 重派 1 次）+ 主代理逐项亲验
- **前置报告**：第一/二/三轮审计（同目录）

---

## 0. 本轮定位与诚实声明

本轮是第四次审计，目标是"无死角全量"。启动前主代理发现前三轮存在误判（详见 §3），故本轮对所有子代理高风险结论**逐项独立核验**。

**核验纪律**（遵循 verification skill 铁律）：所有"通过/绿"结论基于本轮主代理亲读的命令输出；子代理每条 R1/R2 结论主代理独立复核。**本轮 5 子代理产出 2 处误判，均被主代理亲验纠正**（见 §3），误判率 2/14 ≈ 14%，证明"子代理结论必须复核"。

---

## 1. 基线（本轮主代理亲验）

| 检查项 | 结果 | 证据 |
|---|---|---|
| type-check | ✅ 0 错误 | 基线1 日志无输出 |
| lint | ✅ 0/0 | 基线1 日志无输出 |
| 测试 | ✅ **209 套件 / 1180 用例全过，0 失败** | 基线1 日志第 37-38 行 |
| **覆盖率** | ✅ **超门禁** | Statements 60.64%(门禁55)/Branches 54%(48)/Functions 55.31%(49)/Lines 61.26%(56) |
| build | ✅ 15.07s 成功 | 基线2 日志第 6 行 |
| size-check | ✅ 37 chunks，最大 596.33 KiB 通过 | 基线2 日志第 12 行 |
| audit（官方 registry） | ✅ `found 0 vulnerabilities` exit 0 | 基线2 日志第 14 行 |

**覆盖率说明**：实际值均超门禁 6-12%，门禁设计合理（防回归但不阻塞当前）。`coverage/lcov.info` 文件已过期（2026-06-05），**不能作为盲区判据**（A1 子代理曾误用它，见 §3）。

---

## 2. 全量发现（17 维度，按等级汇总）

### 🔴 R1 — 立即处理（6 项）

#### R1-1【测试真实性】ContentRenderer 富文本渲染管线从未被真实测试
- **位置**：`src/components/ContentRenderer/index.test.tsx:5,66,108`（`jest.mock('react-markdown')` + 手写 MockReactMarkdown 替身）+ `jest.config.ts:22-25`（4 个 markdown 插件 mock 成空）
- **主代理亲验**：grep 确认 `jest.mock('react-markdown')` + MockReactMarkdown 正则替身存在。
- **现象**：富文本关键路径零真实测试：
  - KaTeX 公式（`$...$`/`$$...$$`）：替身不解析，公式渲染零覆盖
  - GFM 表格（`|...|`）：正则替身不识别，表格渲染零覆盖
  - **XSS sanitize（rehype-sanitize）**：被 mock 成 `() => ({})`，sanitize 实际过滤逻辑从未被触发；`sanitize-schema.test.ts` 只断言配置项含 'data' 协议，不验证运行时是否真拦下 `<script>`
- **影响**："测试 100% 绿但富文本管线 0% 真实验证"。sanitize 是 XSS 防线，其运行时行为无回归保护，讽刺的是项目在 sanitize 上做了大量配置却没测它真的生效。
- **建议**：加至少 1 套集成测试用 `jest.requireActual('react-markdown')` + 不 mock sanitize，验证 `"<img onerror=alert(1)>"` 被剥离、`$$E=mc^2$$` 渲染出 katex 容器、`|a|b|\n|-|-|` 渲染出 `<table>`。

#### R1-2【体积】KaTeX 字体三格式全量打包 = 1047.8 KB，其中 797.6 KB 是死重
- **位置**：`dist/assets/KaTeX_*.ttf`（20 文件，501.6KB）+ `KaTeX_*.woff`（20 文件，296.0KB）；源头 `src/components/ContentRenderer/index.tsx:35` `import 'katex/dist/katex.min.css'`
- **主代理亲验**：node 实测 59 文件 = 1047.8KB，ttf 501.6 + woff 296.0 = 797.6KB 现代浏览器不需要（woff2 250.2KB 已够）。
- **影响**：数学公式场景一次性多带 ~750KB 死字体，单点最大瘦身机会。
- **建议**：构建后处理删 dist 的 `KaTeX_*.ttf`+`KaTeX_*.woff`（保留 woff2），或用 vite 插件裁剪 `@font-face` src 列表。

#### R1-3【仓库卫生】根目录 9 个 git-tracked 垃圾文件（shell 误重定向产物）
- **位置**：`({text`、`1))`、`1)))`、`1]`、`4`、`document.body.innerText`、`r.text())`、`r.text()))()`、`!fs.existsSync(...)`
- **主代理亲验**：`git ls-files` 确认 9 个文件均在版本库。
- **现象**：node/shell 命令片段被误重定向成文件名（如 `node -e "...({text"` 截断）。
- **影响**：仓库污染，且这些文件名含特殊字符易引发跨平台脚本问题。
- **建议**：`git rm` 全部删除 + `.gitignore` 加规则防 shell `>` 误生成（如 `[{[(` 等开头的文件）。注意删除前确认无引用。

#### R1-4【CSS 死代码】`legacy-theme.css` 整文件失效（8 个 CSS 变量零消费）
- **位置**：`src/styles/legacy-theme.css`（17 行）；`src/index.css:1` 仍 `@import` 它
- **现象**：定义 8 个 `--legacy-*` 变量，grep `var(--legacy` 在所有 .tsx/.ts/.css 中 **0 消费**。其 `:13-16` 全局覆盖 body 背景/色，与 globals.css:22 的 body 规则可能冲突。
- **影响**：死代码 + 全局样式叠加，主题色难追源。
- **建议**：删 `index.css:1` 的 import 并删该文件。

#### R1-5【a11y】SessionExpiredDialog 是裸 fixed 弹窗，无对话框语义与焦点管理
- **位置**：`src/components/auth/SessionExpiredDialog.tsx:32-77`
- **现象**：用 `<div className="fixed inset-0">` 实现，未用 `AccessibleDialog`，无 `role="dialog"`/`aria-modal`/焦点陷阱/ESC 关闭/焦点还原。背景内容仍可 Tab 访问。
- **影响**：会话失效是高频路径，键盘/读屏用户无法操作拦截弹窗，可能卡死。
- **建议**：改用现有 `AccessibleDialog`（项目已有成熟组件，零成本获全部焦点管理）。

#### R1-6【安全】MermaidChart sanitize fail-open 路径
- **位置**：`src/components/ContentRenderer/MermaidChart.tsx:27-30`
- **现象**：`sanitizeSvgOutput` 在 DOMPurify 不可用时**直接返回未脱敏 svg**（`return svg`）。下游虽有 `UNSAFE_SVG_PATTERN` 正则二次校验（:146），但正则白名单不全（如 `onfocus`/`onpointerover`/SVG `<use href="data:">` 可能绕过）。这是全仓唯一 `dangerouslySetInnerHTML` 调用点。
- **缓解**：mermaid 已设 `securityLevel:'strict'`、`htmlLabels:false`，DOMPurify 不可用场景概率低。
- **建议**：DOMPurify 不可用时 fail-closed（返回空串或抛错），而非 fail-open。

### 🟠 R2 — 本迭代处理（13 项）

#### R2-1【安全】Sentry Replay 无隐私配置
- **位置**：`src/monitoring/index.ts:75` `new Replay()` 未传 `maskAllText`/`blockAllMedia`/`maskAllInputs`
- **影响**：会回放用户输入的敏感文本（密码、手机号等）。
- **建议**：配置 `maskAllText: true`、`blockAllMedia: true`、`maskAllInputs: ['password']`。

#### R2-2【安全】logout 不级联清理业务 store（多账号残留）
- **位置**：`src/stores/useAuthStore.ts:51-55`（`clearStoredSession`）+ `:235-253`（logout）+ `:284-296`（forceLogout）
- **现象**：未调用 `useAsyncToolStore.clearAll()`、`useModelPreferenceStore.reset()`、工作区清输入逻辑。
- **影响**：用户 A 登出后 B 登录，A 的异步工具配置/模型偏好/后台任务通知残留，跨账号数据泄露面。
- **建议**：在 `clearStoredSession` 调各业务 store reset，或引入 `resetAllStores()` 聚合。

#### R2-3【a11y 缺失】无 skip-to-content 跳过链接
- **位置**：全仓无；`App.tsx`/`index.html` 未提供
- **影响**：WCAG 2.4.1 Bypass Blocks（A 级）不达标；键盘用户每次需逐个 Tab 穿过导航。
- **建议**：App.tsx 顶层加 `sr-only focus:not-sr-only` 锚点链接。

#### R2-4【a11y】4 个自定义弹窗绕过 AccessibleDialog，缺焦点陷阱/还原
- **位置**：`NotificationCenter.tsx:259-296`、`AsyncTaskMenu.tsx:285-316`、`UserMenuPanel.tsx:160-189`、`PasswordCard.tsx:41-98`（无 aria-invalid/describedby）
- **影响**：Tab 焦点泄漏；PasswordCard 错误无法定位到字段。
- **建议**：复用 AccessibleDialog 的 trap 逻辑或抽 `useFocusTrap`。

#### R2-5【表单】手机号正则 3 处重复定义
- **位置**：`LoginForm.tsx:24`、`RegisterForm.tsx:21`、`useSmsCode.ts:5`（均 `/^1[3-9]\d{9}$/`）
- **建议**：抽到 `src/utils/validators.ts`。

#### R2-6【表单】密码强度规则跨场景不一致
- **位置**：`RegisterForm.tsx:103`（≥6）vs `ProfileSettingsSection.tsx:128`（≥8）
- **影响**：6-7 位密码注册后改密被拒，体验割裂。
- **建议**：统一阈值（建议 ≥8）。

#### R2-7【表单】RechargeDialog 自定义金额校验与 BalanceSettings 不一致（无上限）
- **位置**：`constants/rechargePackages.ts:40`（固定最低1元无上限）vs `BalanceSettingsSection.tsx:64-88`（动态 min/max）
- **建议**：统一为基于 config 的校验。

#### R2-8【安全】token 存 localStorage（XSS 可直读）
- **位置**：`src/api/core/token-storage.ts:101`（明文 JSON）
- **缓解**：session binding（navigator.language+userAgent）+ TTL 90 天 + 字符集校验。
- **建议**：评估后端是否支持 httpOnly cookie；短期缩短 TTL。

#### R2-9【可观测性】window.onerror 同步错误兜底缺失
- **位置**：`src/monitoring/global-error-handlers.ts`（只有 unhandledrejection，无 'error' 事件）
- **注意**：unhandledrejection **已有**（见 §3 纠正误判）；React ErrorBoundary 兜住渲染期错误。但 React 生命周期外的同步抛错（事件回调、setTimeout）有盲区。
- **建议**：`registerGlobalErrorHandlers` 增加 `addEventListener('error', handler)`。

#### R2-10【依赖】@sentry/browser 落后 3 个大版本（7.120.4 → 10.59.0）
- **位置**：`package.json`（7.x 已 EOL）
- **影响**：安全/性能收益损失，且 v7 的 metrics API 在新版有变化。
- **建议**：升级到 10.x（注意 Replay/web-vitals API 变化）。

#### R2-11【兼容性】build.target 未显式声明 + 无 browserslist
- **位置**：`vite.config.ts`（无 build.target）、无 `.browserslistrc`/package.json browserslist 字段
- **影响**：autoprefixer 用默认目标，可能与实际 target 脱钩；升级 vite 时行为可能变。
- **建议**：显式 `build.target: 'es2020'` + 加 browserslist 字段对齐。

#### R2-12【体积】WorkspaceApp 单体 417.7 KB（gzip 126.6 KB）
- **位置**：`dist/assets/WorkspaceApp-*.js`
- **影响**：除 vendor 外最大业务块。
- **建议**：进一步路由级 lazy split。

#### R2-13【对比度】text-gray-400 用于实时可见正文（白底）
- **位置**：`LoginForm.tsx:379`、`NotificationCenter.tsx:184`、`UserMenuPanel.tsx:49`、`tabs.tsx:42,289,297`、`ChatConversationPane.tsx:97`、`ChatPanel.tsx:369` 等（grep 共 44 处）
- **影响**：#9ca3af 白底对比度 ~2.8:1，低于 WCAG AA 正文 4.5:1。
- **建议**：正文用 `text-gray-500`（~4.6:1）。前三轮已发现，仍未修。

### 🟡 R3 — 排期（11 项）

- **R3-1**【测试】useAuthStore 无专门单元测试文件（鉴权逻辑靠 LoginForm/auth-refresh 间接覆盖）。**主代理修正**：A1 子代理称"零测试"是误判（见 §3），实际有 `.unauthorized.test.ts` + 10 个间接测试文件，降为 R3。建议补直接单测。
- **R3-2**【测试】ChatPanel 系列 3 文件共 47 个 mock，测 UI 交互不测业务逻辑（消息发送/流式/重试）。配合 R1-1 的 markdown 替身，聊天端到端真实性打折。
- **R3-3**【安全】Sentry beforeSend 只过滤键名不过滤值（手机号/邮箱/URL 内 token 仍泄露）。
- **R3-4**【安全】sanitize-schema `*` 通配允许 style 属性（CSS 注入/点击劫持面）。
- **R3-5**【表单】聊天/文本输入无 maxLength 上限（无前端兜底）。
- **R3-6**【可观测性】web-vitals 用 captureMessage + reportAllChanges 噪声大。
- **R3-7**【存储】useAuthStore/useUserStore 的 `setItem('user',...)` 4 处裸调用无 QuotaExceededError 兜底（token 侧已修）。
- **R3-8**【表单】EditProjectDialog 用字符串比对定位字段错误、PasswordCard placeholder 与校验不符（"含数字与字母"但只校验长度）。
- **R3-9**【文档】根目录缺 CHANGELOG/CONTRIBUTING（只在 docs/ 下）；archives 65 篇无统一过时头部；`docs/baseline/code-metrics.json` 含已删文件路径未注日期。
- **R3-10**【兼容性】无 polyfill 策略（依赖现代浏览器原生能力），面向老旧 WebView 有风险。
- **R3-11**【CSS】动画 `@keyframes spin`/`fadeIn` 三处重复定义（animations.css + index.css + Tailwind animate-spin）。

### 🟢 R4 — 跟进（8 项）

- **R4-1**【代码重复】`getErrorMessage` 在 4 处局部重复定义（规范版已存在于 errorHandler.ts，3 处未收敛）。`isRecord` 类型守卫 3 处。
- **R4-2**【死代码】UI 组件新旧双轨：`ui/LoadingSpinner.tsx` 与 `ui/feedback/LoadingSpinner.tsx` 同名且均零引用（死代码）。
- **R4-3**【services】barrel 漏导（导 9 个实际 15 个）+ 实现风格不统一（12 class vs 2 对象字面量）。
- **R4-4**【资源】wechat-qrcode.png 97.2KB 可转 webp（<30KB）。
- **R4-5**【类型契约】`api/validation.ts` 的 ResponseValidator 仅类型别名，无运行时 schema 校验。
- **R4-6**【i18n】无 i18n 框架，全量中文硬编码（单语言产品可接受，出海需评估）。
- **R4-7**【测试覆盖】business-metrics 仅 1 用例；beforeSend 脱敏/web-vitals/initMonitoring 无测试。
- **R4-8**【license】package.json 未设 `license` 字段（license-checker 报 UNKNOWN）。

---

## 3. 前三轮误判纠正清单（主代理亲验）

本轮最重要的价值之一——**纠正前三轮 3 处误判**，并**纠正本轮 2 处子代理误报**。

### 纠正 A：第二/三轮 R2-5/R2-D「全仓无 unhandledrejection 兜底」= 误判
- **真相**：`src/monitoring/global-error-handlers.ts:33` 已注册 `unhandledrejection`，经 `main.tsx:11 → monitoring/index.ts:53` 接入，有测试 `global-error-handlers.test.ts`。
- **遗留真问题**：`window.onerror`（同步错误）确缺失（R2-9），但与"无兜底"完全不同。
- **教训**：子代理当时没查 `monitoring/` 目录。说明全量审计必须覆盖每个目录。

### 纠正 B：第三轮「nul 是构建持续重生」= 误判
- **真相**：nul 内容是 bash 报错（`/usr/bin/bash: line 1: type: .gitignore: not found`），是一次性命令副产物，非构建重生。

### 纠正 C：本轮 A3「overrides.lodash 4.18.1 是不存在的版本号」= 子代理误报
- **主代理亲验**：`npm view lodash-es@4.18.1` 返回 `4.18.1`，`npm view lodash@4.18.1` 返回 `4.18.1`，**版本确实存在**。A3 基于"lodash 最新是 4.17.21"的过时知识误判。
- **结论**：overrides 没问题。`overrides.lodash`（非 es，无消费者）仍是死锁（可保留可移除），但不是因为"版本不存在"。

### 纠正 D：本轮 A1「useAuthStore 310 行零测试」= 子代理误判
- **主代理亲验**：有 `src/stores/useAuthStore.unauthorized.test.ts` + 10 个间接测试文件（LoginForm/RegisterForm/auth-refresh/SessionExpiryBanner 等引用 useAuthStore）。A1 用过期的 lcov.info + 局部 jest 跑误推"零测试"。
- **结论**：鉴权逻辑有测试保护（间接覆盖），只是缺专门单元测试。从 A1 的 R1 降为 R3-1。
- **教训**：`coverage/lcov.info` 过期不可信；"零测试"类绝对判断必须用 find/grep 核验。

### 纠正 E：第二/三轮「CI audit 用淘宝镜像裸跑会误导」= 误判
- **真相**：`package.json:34-37` 四个 audit 脚本全部显式带 `--registry=https://registry.npmjs.org`，CI 正确指向官方源。

---

## 4. 前三轮发现项现状复核（维度 17）

| 项 | 前轮 | 本轮现状 | 证据 |
|---|---|---|---|
| R1-1 删根 useContentStore | 已修 | ✅ 已修 | 文件不存在 |
| R1-2/R1-3 dompurify 3.4.11 | 已修 | ✅ 已修 | package.json:52,113 |
| R3-4 parseResponse 参数 | 已修 | ✅ 已修 | response-parser.ts:51-55 |
| R2-4 ChatPanel ref 改造 | 已修 | ✅ 保持 | ChatPanel.tsx:884 localInputRef |
| R1-A 10 lazy 弹窗 ErrorBoundary | 第三轮发现 | ✅ **已修** | WorkspaceApp.tsx 用 LazyDialogBoundary 包裹 |
| R2-A .env 误入库 | 第三轮发现 | ✅ **已修** | git ls-files 仅 .env.example |
| R3-F 文档路径 | 第三轮发现 | ✅ **已修** | 3 份文档已改 |
| R2-B 文案三套体系 | 第三轮发现 | ⚠️ 依旧 | 无统一文案层 |
| R2-C text-gray-400 对比度 | 第三轮发现 | ⚠️ 依旧 | 44 处未替换 |
| R3-E localStorage quota | 第三轮发现 | 📈 部分恶化 | token 侧修好，auth/user 侧 4 处仍裸调用 |
| nul 垃圾文件 | 第三轮发现 | ✅ 脱离版本库 | git ls-files 无 nul |
| **R2-5 unhandledrejection 缺失** | 第一/三轮报告 | ❌ **误判** | 实际已存在（§3 纠正A）|
| R2-1 双轨 useUIStore | 第一轮 | ⚠️ 依旧（轻微恶化，字段分叉）| 13 文件用根版 |
| R2-2 双轨任务 store | 第一轮 | ⚠️ 依旧（7/9 死方法）| useBackgroundTaskStore |
| R3-6 SSE 死代码 | 第一轮 | ⚠️ 依旧 | 零业务调用 |
| R3-7~11 死代码 | 第一轮 | ⚠️ 依旧 | chat.service/sdk-workflows/errorHandler/根 useUIStore 死字段 |
| R3-1 tsconfig strict:false | 第一轮 | ⚠️ 依旧 | 类型逃逸密度仍零（健康）|

**回归总结**：前三轮修复项 **7 项已修 ✅**（R1-1/R1-2-3/R3-4/R2-4/R1-A/R2-A/R3-F），误判纠正 **1 项**（R2-5），其余中期项依旧。第三轮新发现的 R1-A（ErrorBoundary）和 R2-A（.env）**已被修复**——说明第三轮报告发挥了作用。

---

## 5. 整体评价与优先级路线图

### 项目强项（四轮累计确认）
1. 工程基线健康（type-check/lint/build/test/audit 全绿，覆盖率超门禁）。
2. 类型卫生优秀且稳定（四轮均为零类型逃逸）。
3. 测试断言密度健康（2.44/测试），弱断言占比低（1.8%）。
4. XSS 防线多层（sanitize schema + urlTransform + Mermaid DOMPurify + 正则）。
5. 内存/timer cleanup 规范，sendChat 竞态防护充分。
6. AccessibleDialog 是高质量 a11y 基础组件（21 复用）+ semantic-accessibility.test.ts 静态防护网。
7. 文件上传校验完整，API 契约文档与前端一致。
8. treeshaking 干净（零全量导入），依赖许可证干净（无传染性）。

### 短期优先（R1，立即）
1. **R1-1**（markdown 替身）：补富文本集成测试，这是测试真实性的最大漏洞。
2. **R1-2**（KaTeX 字体）：裁剪 ttf+woff，单点减 750KB。
3. **R1-3**（9 垃圾文件）：git rm + .gitignore。
4. **R1-4**（legacy-theme.css）：删除死主题。
5. **R1-5**（SessionExpiredDialog）：改用 AccessibleDialog。
6. **R1-6**（MermaidChart fail-open）：改 fail-closed。

### 中期（R2）
7. **R2-1**（Sentry Replay 隐私）、**R2-2**（logout 级联）、**R2-9**（window.onerror）。
8. **R2-3~R2-7**（a11y + 表单一致性）。
9. **R2-10**（Sentry 升级）、**R2-11**（build.target）。

### 长期（R3/R4）
10. 测试补强（useAuthStore/ChatPanel 减 mock）、双轨 store 合并、strict 模式推进、i18n。

---

## 6. 审计方法论反思（本轮新增）

本轮 5 子代理 + 主代理复核，发现子代理**误报率约 14%**（2/14 高风险结论误报）。规律：
1. **"绝对化判断"易误报**：A3"版本不存在"、A1"零测试"都是基于过时知识/过期数据，需用 `npm view`/`grep`/`find` 实证核验。
2. **"目录盲区"导致遗漏**：前三轮 unhandledrejection 误判源于没查 monitoring/ 目录。全量审计必须覆盖每个目录。
3. **过期 coverage 数据有毒**：lcov.info 15 天前的数据与实际严重矛盾，A1 据此误判。报告引用覆盖率必须用本轮 fresh 数据。
4. **子代理结论按风险分级采信**已连续四轮验证有效，应固化为团队审计规范。

---

*本报告为只读审计产物，未修改任何源代码。四轮审计构成完整链：第一轮全量摸底 → 第二轮修复验证+反思纠误 → 第三轮增量深挖+纠正 → 第四轮无死角全量+系统性纠正误判。*
