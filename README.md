# 绿洲慧写 (Oasis Writing) 前端

AI 驱动的专利撰写辅助工作区。三栏布局：侧边栏导航 + 中心工作区 + 对话面板。

## 技术栈（以 `package.json` 为准）

- **框架:** React 19 + TypeScript 5
- **构建:** Vite 7
- **路由:** React Router DOM 7
- **状态管理:** Zustand 5
- **动画:** Framer Motion
- **样式:** Tailwind CSS
- **内容渲染:** React Markdown、KaTeX、Mermaid
- **监控:** Sentry、Web Vitals
- **测试:** Jest、React Testing Library、Playwright
- **代码规范:** ESLint + Prettier
- **Git Hooks:** Husky + lint-staged

## 环境要求

- Node.js 20.19.0（见 `.nvmrc`）
- npm

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览生产构建
npm run preview
```

## 开发命令

| 命令                       | 说明                                   |
| -------------------------- | -------------------------------------- |
| `npm run dev`              | 启动开发服务器（会先同步版本更新说明） |
| `npm run build`            | 生产构建（会先同步版本更新说明）       |
| `npm run build:verify`     | 生产构建 + 包体积检查                  |
| `npm run type-check`       | TypeScript 类型检查                    |
| `npm run lint`             | ESLint 代码检查                        |
| `npm run format`           | Prettier 格式化 `src` 和 `docs`        |
| `npm test`                 | 运行 Jest 测试                         |
| `npm run test:unit`        | 运行单元测试                           |
| `npm run test:integration` | 运行集成测试                           |
| `npm run test:e2e`         | 运行 Playwright 端到端测试             |
| `npm run test:coverage`    | 输出测试覆盖率                         |
| `npm run test:ci`          | CI 模式 Jest 测试                      |
| `npm run api:validate:ci`  | API 契约 CI 校验                       |
| `npm run api:validate`     | API 契约校验并更新趋势                 |
| `npm run security:scan`    | 全量敏感信息扫描                       |
| `npm run deps:check`       | 检查依赖声明                           |
| `npm run audit:prod:ci`    | 生产依赖高危审计                       |
| `npm run scripts:test`     | 运行脚本测试                           |
| `npm run analyze`          | 构建产物分析                           |

## 项目结构

```
src/
├── api/          # API 服务层（SDK、客户端、错误处理）
├── app/          # 应用入口、路由、Provider
├── components/   # 通用 UI 组件
├── config/       # 配置（安全策略、环境变量）
├── constants/    # 常量和应用元信息
├── hooks/        # 自定义 Hooks
├── modules/      # 业务模块（workspace 为核心模块）
├── monitoring/   # Sentry、Web Vitals、业务指标
├── pages/        # 页面级入口
├── services/     # 兼容或补充服务层
├── stores/       # Zustand 全局状态
├── styles/       # 全局样式
├── types/        # TypeScript 类型定义
├── utils/        # 工具函数
├── workers/      # Web Worker
└── __tests__/    # 跨模块测试与测试初始化
```

## 质量基线与改进计划

- 当前健康度基线：`docs/reports/frontend-health-baseline.md`
- 当前质量打磨计划：`docs/plans/2026-06-05-frontend-improvement-plan.md`
- 面向用户的版本记录主文件：`docs/CHANGELOG.md`
- 用户端版本更新同步文件：`public/help/release-notes.md`

更新版本说明时，优先修改 `docs/CHANGELOG.md`，然后执行：

```bash
npm run changelog:sync
```

## 环境变量

复制 `.env.example` 为 `.env.development` 并填入配置：

```bash
cp .env.example .env.development
```

关键变量：

- `VITE_API_BASE_URL` — API 地址
- `VITE_CLIENT_APP` — 客户端标识（workarea）
- `VITE_ENABLE_MOCK` — 是否启用 Mock 数据
