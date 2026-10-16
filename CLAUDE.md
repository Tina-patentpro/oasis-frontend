# 绿洲慧写 前端项目规则

## 技术栈

- React 19 + TypeScript + Vite
- React Router DOM（路由）、Framer Motion（动画）
- Jest（测试）、ESLint + Prettier（代码规范）
- Husky + lint-staged（Git Hooks）

## Superpower 前端工作流

### 技能拓扑

```
主会话（Controller）
├─ brainstorming（硬门控：未审批禁止实现）
│   └─ 唯一出口 → writing-plans
├─ writing-plans（拆解为 2-5 分钟小任务）
└─ 执行选择
    ├─ subagent-driven（推荐：多组件可并行，需 git worktree 隔离）
    │   └─ subagent 内部按需调用：frontend-design、TDD
    └─ inline execution（小任务，使用 executing-plans 技能，按需调用 frontend-design、TDD）
...
→ finishing-a-development-branch（收尾：验证测试 → 决定合并/PR/清理）

Subagent 内部（Worker）
├─ frontend-design（大胆审美 + 生产级代码）
├─ test-driven-development（红-绿-重构）
├─ systematic-debugging（遇错四阶段根因分析）
└─ verification-before-completion（证据先行）
```

### 分级策略

**L0 微调**（≤1 文件，零设计决策的纯机械修改）

- 改颜色值、改文字、改 CSS 类名
- 直接改代码，不走技能链。若涉及设计判断，即使 1 个文件也必须走轻量 brainstorming

**L1 小型**（≤3 组件，需求清晰）

- 触发：单组件/页面，功能明确
- 流程：轻量 brainstorming（1-2 问题确认意图）→ inline 实现 → verification
- 例："加一个蓝色圆角按钮"、"给列表加个搜索框"

**L2 中型**（多组件，有设计决策）

- 触发：新页面、复杂交互、涉及状态管理
- 流程：完整 brainstorming（Visual Companion 展示方案）→ writing-plans → subagent-driven
- 例："做一个用户管理 Dashboard"、"落地页设计"

**L3 大型**（多页面/SSR/认证）

- 触发：涉及多个独立子系统
- 流程：分解子项目 → 每个子项目独立走 brainstorming → writing-plans → 实现
- 例："完整的用户注册登录流程"、"管理后台"

### 关键陷阱

1. **不得跳过 brainstorming 直接调用 frontend-design**
   - frontend-design 是 Worker 技能，只能由 subagent 在任务内调用
   - 但 L0 微调不触发技能链，直接改即可

2. **在现有项目中遵循已有模式**
   - brainstorming 原则："Follow existing patterns"
   - 不要在成熟项目中强行使用 frontend-design 的"大胆审美"
   - 新页面/独立模块可以使用 frontend-design 的创意方向

3. **TDD 策略性应用**
   - 逻辑组件（表单验证、状态管理、hooks）→ 必须用 TDD
   - 纯展示组件 → 视觉验证（浏览器截图）即可，不必强求 TDD
   - API 服务层 → 用 Jest mock 或 integration test

4. **subagent 模型选择**
   - 机械任务（1-2 文件，spec 完整）→ 快速廉价模型
   - 集成任务（多文件协调）→ 标准模型
   - 设计/审查 → 最强模型

### 验证命令

```
# 构建
npm run build

# 类型检查
npm run type-check

# 代码规范
npm run lint

# 测试
npm test

# 覆盖率
npm run test:coverage
```

完成任何非 L0 任务后，必须运行对应验证命令并在输出中确认通过，才能声称完成。

### 实操触发对照

| 你说的话                            | 应触发的流程                                                |
| ----------------------------------- | ----------------------------------------------------------- |
| "帮我做一个 XX 页面"                | L1-L2：brainstorming → 实现                                 |
| "改一下首页 banner 颜色"            | L0：直接改                                                  |
| "用 React 做一个用户管理 Dashboard" | L2-L3：完整 brainstorming → writing-plans → subagent-driven |
| "这个页面在手机上布局乱了"          | systematic-debugging → 修复 → verification                  |
| "页面做好了，检查一下"              | design-review + verification                                |
| "做得差不多了，收尾"                | finishing-a-development-branch                              |

### 项目目录约定

- `src/pages/` — 页面组件
- `src/components/` — 通用组件
- `src/hooks/` — 自定义 Hooks
- `src/services/` — API 服务层
- `src/stores/` — 状态管理
- `src/__tests__/` — 测试（unit / integration）
- `src/styles/` — 全局样式
- `src/types/` — TypeScript 类型定义

新文件应放入对应目录，遵循已有命名模式。
