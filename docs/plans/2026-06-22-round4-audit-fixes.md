# Round4 Frontend Audit Fixes Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 修复第四轮全量审计中经当前代码复核后仍成立的高优先级问题，并保留“不做多语言”和“不清理 Git 历史 .env”的既定决策。

**Architecture:** 本计划按“先 R1、再 R2、最后复核”的顺序推进。每个任务都采用最小改动原则：先补测试或保护网，再改实现，最后运行对应验证，避免把长期重构混入本轮。

**Tech Stack:** React、TypeScript、Vite、Jest、Testing Library、Tailwind CSS、Sentry、DOMPurify、Mermaid、KaTeX。

---

## 当前复核结论

### 仍需处理的 R1

1. **R1-1 富文本真实测试不足**
   - 当前证据：`src/components/ContentRenderer/index.test.tsx` 仍存在 `MockReactMarkdown`，`jest.config.ts` 仍把 `rehype-sanitize` 指到测试替身。
   - 处理目标：补一组不依赖替身的集成测试，覆盖 XSS 过滤、公式、表格。

2. **R1-2 KaTeX 字体多格式打包**
   - 当前证据：`src/components/ContentRenderer/index.tsx` 仍直接导入 `katex/dist/katex.min.css`，`dist/assets` 仍包含 `.ttf`、`.woff`、`.woff2` 三类 KaTeX 字体。
   - 处理目标：保留现代浏览器需要的 `woff2`，裁剪无用字体格式，并让构建验证可重复。

3. **R1-3 根目录特殊垃圾文件仍在版本库**
   - 当前证据：`git ls-files` 仍列出 `({text`、`1))`、`1)))`、`1]`、`4`、`document.body.innerText`、`r.text())`、`r.text()))()`、`!fs.existsSync...` 等异常文件。
   - 处理目标：删除这些误生成文件，并增加忽略规则或检查脚本，降低再次误入库概率。

4. **R1-4 legacy-theme.css 死样式仍被导入**
   - 当前证据：`src/index.css` 第 1 行仍导入 `src/styles/legacy-theme.css`。
   - 处理目标：确认无消费后删除导入和文件，避免全局样式来源混乱。

5. **R1-5 SessionExpiredDialog 仍是裸弹窗**
   - 当前证据：`src/components/auth/SessionExpiredDialog.tsx` 未发现 `AccessibleDialog`、`role="dialog"`、`aria-modal`。
   - 处理目标：改用现有 `AccessibleDialog`，获得焦点管理、对话框语义和键盘体验。

6. **R1-6 MermaidChart sanitize fail-open 仍存在**
   - 当前证据：`src/components/ContentRenderer/MermaidChart.tsx` 中 `DOMPurify` 不可用时仍 `return svg`，下游使用 `dangerouslySetInnerHTML`。
   - 处理目标：改为 fail-closed（失败时不渲染未净化 SVG），并补测试。

### 仍需处理或部分处理的 R2

1. **R2-1 Sentry Replay 隐私配置缺失**
   - 当前证据：`src/monitoring/index.ts` 仍是 `new Replay()`，未配置 `maskAllText`、`blockAllMedia`、`maskAllInputs`。

2. **R2-2 logout 未级联清理业务 store**
   - 当前证据：`src/stores/useAuthStore.ts` 的 `clearStoredSession` 未调用异步工具、模型偏好等业务状态清理。

3. **R2-3 缺 skip-to-content 跳过链接**
   - 当前证据：`src/App.tsx` 和 `index.html` 未发现主内容跳转链接。

4. **R2-4 自定义弹窗与表单无障碍仍有缺口**
   - 当前证据：`NotificationCenter.tsx`、`AsyncTaskMenu.tsx` 未发现 `AccessibleDialog` 或对话框语义；`PasswordCard.tsx` 未发现 `aria-invalid` / `aria-describedby`。
   - 注意：`UserMenuPanel.tsx` 已发现 `AccessibleDialog`，本轮不再按“全部未修”处理。

5. **R2-5 手机号正则重复**
   - 当前证据：`LoginForm.tsx`、`RegisterForm.tsx`、`components/auth/hooks/useSmsCode.ts` 仍各自定义同一正则。

6. **R2-6 密码长度规则不一致**
   - 当前证据：注册页仍是至少 6 位，个人设置改密仍是至少 8 位。

7. **R2-7 充值自定义金额规则不一致**
   - 当前证据：`BalanceSettingsSection.tsx` 使用 `min_amount` / `max_amount`，`RechargeDialog.tsx` 仍主要围绕赠送门槛计算，规则口径不一致。

8. **R2-8 token 存 localStorage**
   - 当前证据：`src/api/core/token-storage.ts` 仍使用 `localStorage.setItem` 保存 token 记录。
   - 处理策略：本轮只做短期风险收敛，例如缩短保存周期或补充说明；httpOnly cookie 需要后端配合，单独排期。

9. **R2-9 window.onerror 同步错误兜底缺失**
   - 当前证据：`global-error-handlers.ts` 已有 `unhandledrejection`，但未发现 `error` 事件监听。

10. **R2-10 Sentry 版本落后**
    - 当前证据：`package.json` 中 `@sentry/browser` 为 `^7.116.0`。
    - 处理策略：升级属于依赖风险变更，建议单独任务做兼容验证，不和 R1 混在一个提交。

11. **R2-11 兼容性目标未显式声明**
    - 当前证据：`vite.config.ts` 未发现 `build.target`，`package.json` 未发现 `browserslist`，根目录无 `.browserslistrc`。

12. **R2-12 WorkspaceApp 业务块仍较大**
    - 当前证据：当前 `dist/assets/WorkspaceApp-*.js` 约 427,740 bytes。
    - 处理策略：这是结构优化，不建议和 R1 安全/可用性修复混在一起。

13. **R2-13 text-gray-400 对比度仍有多处**
    - 当前证据：登录页、通知中心、侧栏 tabs、聊天面板等仍有正文或可见信息使用 `text-gray-400`。

### 明确排除

1. **R4-6 i18n 多语言**
   - 用户已明确：不计划多语言。

2. **Git 历史里的 .env 清理**
   - 用户已明确：不清理 Git 历史里的 `.env` 内容。

---

## Task 1: 修复富文本真实测试缺口

**Files:**
- Modify: `jest.config.ts`
- Modify: `src/components/ContentRenderer/index.test.tsx` 或 Create: `src/components/ContentRenderer/rendering-pipeline.integration.test.tsx`
- Review: `src/components/ContentRenderer/index.tsx`
- Review: `src/components/ContentRenderer/sanitize-schema.ts`

**Step 1: 新增真实渲染测试**

新增测试覆盖：
- 恶意 HTML：`<img src=x onerror=alert(1)>` 不应保留 `onerror`。
- 公式：`$$E=mc^2$$` 应渲染出 KaTeX 相关节点或文本。
- 表格：`|a|b|\n|-|-|\n|1|2|` 应渲染出 `table`。

**Step 2: 避免测试替身影响该测试**

如果全局 `moduleNameMapper` 仍需要 mock markdown 插件，则在集成测试中使用 `jest.requireActual` 或单独测试入口，确保本测试使用真实 `react-markdown` 和真实 sanitize 插件。

**Step 3: 运行定向测试**

Run:

```cmd
npm test -- src/components/ContentRenderer/rendering-pipeline.integration.test.tsx --runInBand
```

Expected:
- 新增测试通过。
- 不再只依赖 `MockReactMarkdown` 证明富文本安全。

---

## Task 2: 修复 Mermaid SVG 净化失败时的 fail-open

**Files:**
- Modify: `src/components/ContentRenderer/MermaidChart.tsx`
- Create or Modify: `src/components/ContentRenderer/MermaidChart.test.tsx`

**Step 1: 写失败场景测试**

测试 DOMPurify 初始化失败或不可用时：
- 不应把原始 SVG 传给 `dangerouslySetInnerHTML`。
- 应显示安全的错误提示或空状态。

**Step 2: 改为 fail-closed**

把 `sanitizeSvgOutput` 中 DOMPurify 不可用时的 `return svg` 改为安全返回，例如：
- 返回空字符串；
- 或抛出受控错误并显示“图表渲染失败”。

**Step 3: 保留现有正常路径**

确保 DOMPurify 可用时仍正常渲染 Mermaid 图。

**Step 4: 运行定向测试**

Run:

```cmd
npm test -- src/components/ContentRenderer/MermaidChart.test.tsx --runInBand
```

Expected:
- 正常 Mermaid 渲染测试通过。
- DOMPurify 失败场景不会渲染未净化 SVG。

---

## Task 3: 修复 SessionExpiredDialog 无障碍问题

**Files:**
- Modify: `src/components/auth/SessionExpiredDialog.tsx`
- Review: `src/components/ui/feedback/AccessibleDialog.tsx`
- Create or Modify: `src/components/auth/SessionExpiredDialog.test.tsx`

**Step 1: 添加当前问题测试**

覆盖：
- 弹窗出现时有对话框语义。
- 有标题描述。
- 主要按钮可被键盘聚焦。

**Step 2: 改用 AccessibleDialog**

用现有 `AccessibleDialog` 包住会话失效内容，保留原文案和按钮行为。

**Step 3: 运行测试**

Run:

```cmd
npm test -- src/components/auth/SessionExpiredDialog.test.tsx --runInBand
```

Expected:
- 弹窗仍能触发重新登录或关闭逻辑。
- 对话框语义和焦点行为有基础测试保护。

---

## Task 4: 清理仓库垃圾文件和 legacy-theme 死样式

**Files:**
- Delete: `({text`
- Delete: `1))`
- Delete: `1)))`
- Delete: `1]`
- Delete: `4`
- Delete: `document.body.innerText`
- Delete: `r.text())`
- Delete: `r.text()))()`
- Delete: `!fs.existsSync...` 开头的异常文件（以 `git ls-files` 实际输出为准）
- Modify: `.gitignore`
- Modify: `src/index.css`
- Delete: `src/styles/legacy-theme.css`

**Step 1: 删除前确认无引用**

Run:

```cmd
git ls-files
```

Expected:
- 只删除根目录异常文件和确认无消费的 legacy 样式文件。

**Step 2: 删除异常文件**

使用 Git 删除，避免只删本地不删版本库记录。

**Step 3: 删除 legacy-theme 导入**

移除 `src/index.css` 对 `legacy-theme.css` 的导入，并删除 `src/styles/legacy-theme.css`。

**Step 4: 增加防误入库规则**

在 `.gitignore` 增加窄规则或注释，尽量防止 shell 误重定向产物再次进入版本库。

**Step 5: 运行样式与构建验证**

Run:

```cmd
npm run lint
npm run build
```

Expected:
- 构建成功。
- 页面基础样式不丢失。

---

## Task 5: 裁剪 KaTeX 多余字体格式

**Files:**
- Modify: `vite.config.ts` 或 Create: `scripts/build/strip-katex-fonts.mjs`
- Modify: `package.json`
- Review: `dist/assets/KaTeX_*`

**Step 1: 选择最小方案**

优先采用构建后处理脚本：
- 删除 `dist/assets/KaTeX_*.ttf`
- 删除 `dist/assets/KaTeX_*.woff`
- 保留 `dist/assets/KaTeX_*.woff2`

**Step 2: 接入构建流程**

把脚本接入现有 build 或 size-check 前后，确保每次构建都可重复裁剪。

**Step 3: 运行构建与体积检查**

Run:

```cmd
npm run build
npm run size-check
```

Expected:
- 构建成功。
- KaTeX `.ttf` 和 `.woff` 不再出现在最终产物。
- `.woff2` 仍存在，公式样式仍可用。

---

## Task 6: 修复 Sentry Replay 隐私配置和全局同步错误兜底

**Files:**
- Modify: `src/monitoring/index.ts`
- Modify: `src/monitoring/global-error-handlers.ts`
- Modify: `src/monitoring/global-error-handlers.test.ts`

**Step 1: 配置 Replay 隐私参数**

给 `new Replay()` 增加：
- `maskAllText: true`
- `blockAllMedia: true`
- `maskAllInputs: true` 或项目版本支持的等效配置

**Step 2: 增加 window error 兜底**

在 `registerGlobalErrorHandlers` 中增加 `error` 事件监听，并和已有 `unhandledrejection` 一样支持卸载。

**Step 3: 补测试**

覆盖：
- 注册后同时监听 `error` 和 `unhandledrejection`。
- cleanup 后两个监听都移除。

**Step 4: 运行定向测试**

Run:

```cmd
npm test -- src/monitoring/global-error-handlers.test.ts --runInBand
```

Expected:
- 两类全局错误都有保护。
- 清理函数仍可靠。

---

## Task 7: 修复登出后的跨账号状态残留

**Files:**
- Modify: `src/stores/useAuthStore.ts`
- Review: `src/stores/useAsyncToolStore.ts`
- Review: `src/stores/useModelPreferenceStore.ts`
- Create or Modify: `src/stores/useAuthStore.logout.test.ts`

**Step 1: 识别需要清理的业务 store**

先确认这些 store 是否已有 reset/clear 方法：
- 异步工具状态
- 模型偏好
- 工作区输入或后台任务通知

**Step 2: 增加统一清理函数**

在登出和强制登出路径调用统一清理函数，避免只清 token 和用户信息。

**Step 3: 补测试**

测试用户登出后：
- token 被清理；
- user 被清理；
- 业务 store 被清理。

**Step 4: 运行测试**

Run:

```cmd
npm test -- src/stores/useAuthStore.logout.test.ts --runInBand
```

Expected:
- 登出路径和强制登出路径都清理业务状态。

---

## Task 8: 修复可快速落地的无障碍和对比度问题

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/NotificationCenter.tsx`
- Modify: `src/components/workspace/navigation/AsyncTaskMenu.tsx`
- Modify: `src/components/settings/sections/profile/PasswordCard.tsx`
- Modify: `src/components/auth/LoginForm.tsx`
- Modify: `src/components/workspace/left-sidebar/management/tabs.tsx`
- Modify: `src/components/chat/ChatConversationPane.tsx`
- Modify: `src/components/ChatPanel.tsx`

**Step 1: 添加 skip-to-content 链接**

在应用顶层添加“跳到主内容”的隐藏链接，并确保主内容区域有对应 id。

**Step 2: 修复 PasswordCard 字段错误关联**

给密码字段补 `aria-invalid` 和 `aria-describedby`。

**Step 3: 收敛 text-gray-400**

只替换正文、说明文字、状态文字中的 `text-gray-400` 为 `text-gray-500`。禁用态图标或纯装饰项可保留。

**Step 4: 针对 NotificationCenter / AsyncTaskMenu 制定最小修复**

若它们是弹出层而非真正模态框，至少补齐：
- 合理的 role；
- 关闭方式；
- 焦点返回；
- 键盘可达。

**Step 5: 运行相关测试**

Run:

```cmd
npm test -- src/components --runInBand
```

Expected:
- 现有组件测试通过。
- 无障碍属性不会破坏原交互。

---

## Task 9: 统一表单校验口径

**Files:**
- Create: `src/utils/validators.ts`
- Modify: `src/components/auth/LoginForm.tsx`
- Modify: `src/components/auth/RegisterForm.tsx`
- Modify: `src/components/auth/hooks/useSmsCode.ts`
- Modify: `src/components/settings/sections/ProfileSettingsSection.tsx`
- Modify: `src/components/RechargeDialog.tsx`
- Review: `src/components/settings/sections/BalanceSettingsSection.tsx`

**Step 1: 抽手机号校验**

把 `/^1[3-9]\d{9}$/` 移到 `src/utils/validators.ts`。

**Step 2: 统一密码最低长度**

建议统一为 8 位。同步注册页和改密页文案。

**Step 3: 统一充值金额校验**

让 `RechargeDialog` 使用与 `BalanceSettingsSection` 相同的 `min_amount` / `max_amount` / 小数规则。

**Step 4: 运行表单相关测试**

Run:

```cmd
npm test -- src/components/auth src/components/RechargeDialog.test.tsx src/components/settings/sections/BalanceSettingsSection.test.tsx --runInBand
```

Expected:
- 登录、注册、短信、充值相关测试通过。
- 用户看到的规则一致。

---

## Task 10: 明确构建兼容目标

**Files:**
- Modify: `vite.config.ts`
- Modify: `package.json` 或 Create: `.browserslistrc`

**Step 1: 设置 Vite build target**

建议设置：

```ts
build: {
  target: 'es2020',
}
```

**Step 2: 增加 browserslist**

让 CSS 和 JS 目标保持一致。可在 `package.json` 增加 browserslist 字段，或新增 `.browserslistrc`。

**Step 3: 运行构建验证**

Run:

```cmd
npm run build
```

Expected:
- 构建成功。
- 浏览器目标清晰，不依赖工具默认值。

---

## Task 11: 延后处理的项目

以下不建议混入本轮短期修复：

1. **Sentry 7 → 10 升级**
   - 原因：大版本升级可能改 API，应单独计划、单独验证。

2. **WorkspaceApp 进一步拆包**
   - 原因：涉及路由级拆分和性能验证，容易扩大改动面。

3. **token 改 httpOnly cookie**
   - 原因：需要后端配合，前端不能单独闭环。

4. **i18n 多语言**
   - 原因：用户已明确不计划多语言。

5. **Git 历史 .env 清理**
   - 原因：用户已明确不清理历史。

---

## Final Validation

完成所有短期任务后运行：

```cmd
npm run type-check
npm run lint
npm test -- --runInBand
npm run build
npm run build:size-check
npm audit --registry=https://registry.npmjs.org
git status --short --branch
```

Expected:
- type-check 通过。
- lint 通过。
- 全量测试通过。
- build 通过。
- size-check 通过。
- npm audit 官方源 0 漏洞或明确解释剩余项。
- Git 状态只包含本轮计划内变更。

---

## Suggested Commit Slices

1. `test: cover content renderer real pipeline`
2. `fix: harden mermaid svg sanitization`
3. `fix: improve session expiry dialog accessibility`
4. `chore: remove tracked junk and legacy theme`
5. `perf: strip unused katex font formats`
6. `fix: harden monitoring privacy and global errors`
7. `fix: clear user-scoped stores on logout`
8. `fix: improve accessibility and contrast`
9. `fix: unify form validation rules`
10. `chore: declare frontend browser targets`
