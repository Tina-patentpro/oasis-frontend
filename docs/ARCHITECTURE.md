# 绿洲慧写前端架构文档

> **文档版本：** v3.0
> **最后更新：** 2026-06-05
> **适用对象：** 前端开发者、后端工程师、测试与交接人员
> **权威来源：** 当前仓库文件、`package.json`、`src/` 目录和 CI 配置

本文档说明绿洲慧写前端当前真实架构。旧版文档中的过期技术栈、旧目录名和“规划中”描述已按当前项目修正。

## 1. 项目定位

绿洲慧写前端是一个 AI 驱动的专利撰写辅助工作区。核心界面是三栏工作台：

- 左侧：项目、工具、会话和工作流入口。
- 中间：输入区、输出区和流程步骤。
- 右侧：对话面板、历史会话、附件和辅助操作。

系统通过 HTTP、流式请求、轮询和后台任务状态与后端或 Dify 类工作流服务协作。

## 2. 当前技术栈

以 `D:\OneDrive\4、董娣相关\3、绿洲慧写3.0\绿洲前端\package.json` 为准：

| 类型            | 当前选型                                  |
| --------------- | ----------------------------------------- |
| UI 框架         | React 19 + TypeScript 5                   |
| 构建工具        | Vite 7                                    |
| 路由            | React Router DOM 7                        |
| 状态管理        | Zustand 5                                 |
| 样式            | Tailwind CSS + 全局 CSS                   |
| 动画            | Framer Motion                             |
| Markdown/富文本 | React Markdown、KaTeX、Mermaid、DOMPurify |
| 虚拟列表        | React Virtuoso                            |
| 监控            | Sentry、Web Vitals、业务指标收集          |
| 单元/集成测试   | Jest、React Testing Library               |
| 端到端测试      | Playwright                                |
| 代码质量        | ESLint、Prettier、Husky、lint-staged      |
| API 契约        | OpenAPI、Spectral、Node 测试脚本          |

## 3. 顶层运行结构

```text
src/main.tsx
  └─ BrowserRouter
     └─ AppProviders
        ├─ ErrorBoundary
        ├─ ThemeProvider
        ├─ NotificationProvider
        ├─ AuthProvider
        ├─ LayoutProvider
        └─ BackgroundTaskPoller
           └─ App routes
              ├─ /auth/*
              ├─ /workspace/*
              └─ /user/profile-reward
```

核心入口：

- `src/main.tsx`：初始化监控并挂载 React 应用。
- `src/app/App.tsx`：定义路由和懒加载页面。
- `src/app/providers/AppProviders.tsx`：组合主题、通知、鉴权、布局和后台任务轮询。
- `src/modules/workspace/WorkspaceApp.tsx`：工作区主入口。

## 4. 当前目录职责

```text
src/
├── api/          # API 客户端、错误处理、服务层、响应校验
├── app/          # 应用入口、路由保护、Provider、懒加载
├── components/   # 通用组件、工作区组件、设置、对话框、内容渲染
├── config/       # 安全策略等配置
├── constants/    # 常量和元信息
├── hooks/        # 跨模块自定义 Hooks
├── modules/      # 业务模块，当前核心是 workspace
├── monitoring/   # Sentry、Web Vitals、业务指标
├── pages/        # 页面级入口
├── services/     # 兼容或补充服务层
├── stores/       # 跨模块 Zustand store
├── styles/       # 全局动画和样式
├── types/        # TypeScript 类型
├── utils/        # 纯工具函数
├── workers/      # Web Worker
└── __tests__/    # 跨模块测试和测试初始化
```

## 5. 工作区模块结构

工作区由 `src/modules/workspace/WorkspaceApp.tsx` 组织。它主要组合：

- `WorkspaceMainLayout`：左侧栏、中间输入输出区和流程步骤。
- `WorkspaceRightPanel`：右侧对话面板和宽度调整。
- `useWorkspaceLayout`：把导航、侧栏、内容区、对话栏、弹窗和快捷键组合成页面状态。
- `useWorkspaceContentSections`：管理动态输入页、生成结果、历史数据、下载和异步任务。
- `useWorkspaceSidebar`：管理项目、会话、侧栏选择和会话恢复。
- `useWorkspaceChatPanel`：管理右侧对话栏。

## 6. 数据流

```text
用户操作
  → 组件事件
  → Hook 处理业务逻辑
  → API service / Zustand store
  → 组件重新渲染
  → 通知、弹窗、后台任务轮询或内容渲染
```

常见数据路径：

- 工作流生成：输入区 → `useWorkspaceContentSections` → API service → 异步任务或流式结果 → 输出区。
- 会话恢复：侧栏会话点击 → `useWorkspaceSidebar` / `session-click` → 内容区和右侧对话栏同步。
- 右侧对话：`ChatPanel` → `useChatManagement` → 会话服务、附件处理、内容渲染。
- 下载与历史：工作区内容 Hook → 下载/历史弹窗 → API service 或本地历史。

## 7. API 与契约

API 相关代码集中在：

- `src/api/client.ts`
- `src/api/core/`
- `src/api/services/`
- `src/api/types/`
- `src/api/validation.ts`
- `docs/api/`

契约验证命令：

```bash
npm run api:validate:ci
npm run api:docs:check
```

接口层应保持：

- 请求入口统一经过 API client。
- 响应尽量经过 validator（响应校验器）。
- 错误通过统一错误映射和通知反馈给用户。
- 401/403/422/429/500 等状态要有明确用户反馈或恢复路径。

## 8. 安全与内容渲染

当前安全基础包括：

- `src/config/security.ts`：CSP（内容安全策略）和安全响应头。
- `src/api/core/token-storage.ts`：登录凭证存储和失效判断。
- `src/components/ContentRenderer/`：Markdown、图片、代码块、Mermaid、数学公式和 `oasis-actions` 渲染。
- `DOMPurify`、`rehype-sanitize` 和 URL 转换逻辑用于降低内容注入风险。

安全验证命令：

```bash
npm run security:scan
npm run audit:prod:ci
```

## 9. 性能与包体积

性能基础包括：

- 路由级懒加载。
- `vite.config.ts` 中的 manualChunks 分包。
- Mermaid 相关依赖拆分。
- `scripts/build/check-bundle-size.mjs` 包体积门禁。
- Web Vitals 和业务指标收集。

性能验证命令：

```bash
npm run build:verify
```

后续性能优化应以真实场景测量为准，重点看：

- 首次进入 `/workspace`。
- 长会话滚动。
- 大段 Markdown / Mermaid 渲染。
- 文件很多时的下载弹窗。
- 右侧对话栏打开、拖拽和切换。

## 10. 测试策略

当前测试体系：

- Jest：单元测试和集成测试。
- React Testing Library：组件交互测试。
- Playwright：端到端测试。
- Node test：脚本和 API 契约辅助测试。

常用验证命令：

```bash
npm run type-check
npm run lint
npm run test:ci
npm run scripts:test
npm run test:e2e -- --project=chromium
```

覆盖率门槛在 `jest.config.ts` 中维护。后续提高覆盖率时，应优先覆盖核心用户链路，而不是只追求数字。

## 11. 当前质量风险

当前最需要持续关注的风险：

1. 核心文件体积较大，例如 `ChatPanel.tsx`、`useWorkspaceContentSections.ts`、`generation-actions.ts`。
2. 工作区交互复杂，左侧栏、中间生成区和右侧对话栏之间容易出现状态同步问题。
3. Markdown、Mermaid、图片和文件链接属于高风险内容渲染路径，需要持续测试安全和边界。
4. 文档、架构和真实代码必须持续同步，否则会影响后端联调和新人接手。
5. 当前分支已有大量未提交代码改动，后续修复应先保护用户已有改动。

## 12. 维护规则

- 面向用户的版本记录主文件：`docs/CHANGELOG.md`。
- 用户端版本更新同步文件：`public/help/release-notes.md`。
- 更新版本说明后必须运行：

```bash
npm run changelog:sync
```

- 当前健康度基线：`docs/reports/frontend-health-baseline.md`。
- 当前质量打磨计划：`docs/plans/2026-06-05-frontend-improvement-plan.md`。

---

**维护者：** Codex 开发团队
