> **归档说明**：本文档为历史归档资料，可能不代表当前实现与当前规范；请优先以仓库当前代码、docs/CHANGELOG.md、docs/api/ 与最新审计/计划文件为准。

# 📋 AI Coding 驱动的详细优化实施方案 _(2025-10-21 更新)_

- **关联文档**：`docs/IMPROVEMENT-PLAN.md`，`docs/RELEASE-READINESS-REPORT.md`
- **优先级**：中（发布后持续优化）
- **执行方式**：以 AI Coding 辅助（Codex、自动化脚本、Lint/CI 机器人）为核心，开发者负责评审与验收。

---

## 0. 当前基线与约束

| 指标               | 最新值（2025-10-21 Vite 7 构建）          | 数据来源/备注              |
| ------------------ | ----------------------------------------- | -------------------------- |
| 主入口 chunk       | `assets/index-*.js` ≈ **2.26 MB**         | `npm run build` 产物       |
| 最大独立 chunk     | `mermaid` 相关 ≈ **330 KB**               | Vite 7 + Rolldown 默认分包 |
| CSS/Tailwind       | Tailwind 3.4.18 + 自定义变量              | `src/index.css`            |
| Node Runtime       | 22.19.0（`.nvmrc`）                       | 已在阶段 1 完成            |
| React / Vite       | React 19.0.0 / Vite 7.1.11                | 阶段 2&3 完成              |
| ESLint / TS 工具链 | ESLint 9 + Flat Config / TypeScript 5.6.3 | 阶段 5 完成                |
| Git Hooks          | Husky 9 + lint-staged 16                  | 阶段 6 完成                |

> **阶段 4（Tailwind 4）已放弃**，后续计划基于 Tailwind 3.4.18。

---

## 1. 总体路线图（8 周，滚动执行）

| Phase                             | 时间窗    | 目标与量化指标                                                     | 关键里程碑                                    | 执行方式                                           |
| --------------------------------- | --------- | ------------------------------------------------------------------ | --------------------------------------------- | -------------------------------------------------- |
| **Phase A** – 首屏与 Bundle 优化  | 第 1–2 周 | 主包（index）**≤ 900 KB**，核心 chunk **≤ 400 KB**；FCP < 2 s      | 完成依赖分析 → 分包策略落地 → 懒加载上线      | **AI Assist** 生成分包脚本、懒加载代码；开发者验收 |
| **Phase B** – 监控 & 观测         | 第 3–4 周 | Sentry JS + Web Vitals 上线；错误捕获覆盖率 100%                   | Sentry 集成 → SourceMap 上传 → Dashboard 验证 | AI Coding 生成集成代码、脚本；Ops 配置密钥         |
| **Phase C** – TS 严格化与依赖治理 | 第 5–6 周 | `noImplicitAny` → 0 个告警；移除未使用依赖；核心模块 UT 覆盖 ≥ 60% | 分模块严格化 → 依赖清理报告 → UT 执行         | AI 生成类型修复、UT 模板；人工审查                 |
| **Phase D** – 代码债务与体验细节  | 第 7–8 周 | 关键组件（Workspace、Dialog）可维护性评级提升；UX 问题关闭 ≥ 80%   | UX 巡检列表 → 重点组件重构 → 回归测试         | AI 辅助重构、生成测试；QA 验收                     |

---

## 2. Phase A – Bundle & 首屏优化（第 1–2 周）

### 2.1 执行步骤

| 周次           | 任务                   | 说明                                                                                                  | AI Coding 角色                 |
| -------------- | ---------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------ |
| Week 1 Day 1–2 | **产出依赖分析报告**   | `npm run build -- --analyze` + `vite-bundle-analyzer`；存档到 `docs/perf/bundle-report-<date>.md`     | 自动生成分析脚本、报告模板     |
| Week 1 Day 3–5 | **制定并实现分包策略** | 在 `vite.config.ts` 中显式配置 `build.rollupOptions.output.manualChunks`（如需切回 Rollup，明确配置） | 生成初稿配置、识别循环依赖     |
| Week 2 Day 1–3 | **懒加载与按需引入**   | 对 `MermaidChart`、`KaTeX`、对话框组件等使用 `lazy + Suspense`                                        | 自动生成代码改造建议、覆盖测试 |
| Week 2 Day 4–5 | **缓存与构建验证**     | 验证 `chunkFileNames` hash、`optimizeDeps` 调整；运行 `npm run build` 比对体积                        | 生成对比脚本、输出差异报告     |

### 2.2 验收标准

- `dist/assets/index-*.js` gzipped ≤ **900 KB**
- 所有 > 500 KB 警告的 chunk 有明确行动项或文档说明
- 提供**前/后构建对比** (`docs/perf/bundle-comparison-<date>.md`) 与 Lighthouse 报告

### 2.3 风险与回滚

- **Rolldown 忽略 manualChunks**：若需要回退到 Rollup，在文档中注明并修改 `build: { target, modulePreload }`
- **懒加载导致闪烁**：在 `LazyLoader` 中补充 skeleton，并记录需要的 UX 调整
- **HMR 影响**：在 dev 环境自测关键工作流后再合并

---

## 3. Phase B – 监控与观测（第 3–4 周）

### 3.1 关键任务

| 顺序 | 任务                  | 详细说明                                                                        | 输出物                                  |
| ---- | --------------------- | ------------------------------------------------------------------------------- | --------------------------------------- |
| B1   | Sentry SDK 集成       | 安装 `@sentry/react`、`@sentry/tracing`；在 `src/main.tsx` 初始化；配置隐私过滤 | `src/sentry.ts`、`.env.example` 更新    |
| B2   | Source Map 上传       | 配置 `@sentry/vite-plugin` 或自行 `sentry-cli`；CI 中添加上传步骤               | CI 脚本 PR、发布检查表                  |
| B3   | Error Boundary 增强   | 在顶层 `ErrorBoundary` 中添加 fallback UI、Sentry 反馈                          | 更新 `src/components/ErrorBoundary.tsx` |
| B4   | Web Vitals & 性能日志 | 集成 `web-vitals`，将数据发送到 Sentry 或自建 API                               | `src/utils/metrics.ts`、仪表盘截图      |

### 3.2 验收

- Sentry Dashboard 中能看到错误、性能数据
- 生产构建生成 SourceMap 并成功上传
- 监控文档：`docs/observability/sentry-setup.md`（含密钥管理、隐私策略）

---

## 4. Phase C – TypeScript 严格化与依赖治理（第 5–6 周）

### 4.1 严格化策略

1. **Week 5**：针对 `src/hooks`、`src/components/ui` 开启 `noImplicitAny`，AI Coding 自动修复类型提示 → 评审后合并
2. **Week 5 末**：生成 TS 报错统计（`tsc --noEmit`）与 TODO 列表
3. **Week 6**：逐模块（`modules/workspace` → `components/chat` → `api`) 开启严格模式，必要时引入 `satisfies`/泛型工具

### 4.2 依赖治理

- 使用 `depcheck` + `npm ls` 识别未使用/重复依赖
- 将结果整理成 `docs/tech-debt/dependency-cleanup-<date>.md`
- 对 Tailwind 插件、老版本库（如 `@emailjs/browser`）评估替换或升级路径

### 4.3 测试与 CI

- 新增 `npm run test`（若缺失，可由 AI Coding 生成基础 Jest/Playwright 脚本）
- 在 CI 中加入 `npm run type-check` 与 `npm run lint`

---

## 5. Phase D – 代码债务与体验细节（第 7–8 周，与 Phase C 部分并行）

### 5.1 待清理事项（示例）

- **重复 Store**：`src/stores/useWorkspaceStore.ts` vs `modules/workspace/stores`
- **UI 主题变量**：统一 `:root` 与 Tailwind 变量映射，输出 `docs/style-guide/theme.md`
- **Mock 数据归档**：将 `legacy/` 与 `mock/` 迁移到 `backups/` 或删除，更新 README
- **Accessibility 提升**：确保按钮、Dialog 有 aria 属性，AI Coding 可生成自动化校验脚本

### 5.2 验收

- `docs/tech-debt/cleanup-report-<date>.md` 列出完成项 & 影响面
- 关键交互（聊天、项目关联、导出）经手动和自动化回归验证

---

## 6. AI Coding 协作模式

| 类型           | 工具/流程                        | 应用场景                            |
| -------------- | -------------------------------- | ----------------------------------- |
| **代码生成**   | Codex CLI / VSCode AI 扩展       | 懒加载、分包、Sentry 集成、类型修复 |
| **脚本自动化** | AI 生成脚本 + Shell/Python       | 构建对比、bundle 报告、Lint 修复    |
| **文档产出**   | AI 总结 → 人工校对               | 各阶段报告、监控手册、风险记录      |
| **测试模板**   | AI 生成 Jest/Playwright 基本用例 | 提升 UT 覆盖，快速搭建 E2E 框架     |

> 所有 AI 生成代码需通过代码评审与自动化检查；提交前运行 `npm run lint-staged`。

---

## 7. 验收与回滚机制

1. **数据证据**：每阶段提供“前/后”构建体积、性能指标、错误率截图。
2. **回滚策略**：所有变更分支化，合并前打标签；若性能下降，可通过 Git revert + 恢复旧构建。
3. **风险登记**：在 `docs/RELEASE-READINESS-REPORT.md` 中增设“优化风险”章节，记录潜在问题与处理人。

---

## 8. 下一步行动（从即日起）

- ✅ 在 `docs/perf/` 下创建 `bundle-report-2025-10-21.md`，记录当前构建详情（AI 可自动生成初稿）。
- ✅ 创建 `feat/phase-a-bundle` 分支，开始执行 Phase A Week 1 任务。
- ✅ 建立每周例会（或异步同步）流程，审阅 AI 生成成果与性能数据。

> 按此计划执行，可在两个月内形成“性能可观测 + 类型严格 + 代码整洁”的持续优化闭环，并持续利用 AI Coding 降低重复劳动、提高交付效率。\*\*\*
