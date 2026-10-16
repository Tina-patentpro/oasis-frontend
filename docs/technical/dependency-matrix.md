# 最终版本依赖矩阵

## 项目信息

- 项目名称: Oasis Workspace
- 版本: 1.0.0
- 更新日期: 2025-10-21

## 核心技术栈

| 组件       | 版本    | 说明                        |
| ---------- | ------- | --------------------------- |
| Node.js    | 22.x    | 运行环境 (通过 .nvmrc 配置) |
| React      | ^19.0.0 | UI 框架，最新稳定版         |
| React DOM  | ^19.0.0 | React DOM 绑定              |
| TypeScript | ^5.6.3  | 类型系统                    |
| Vite       | ^7.0.0  | 构建工具和开发服务器        |

## 开发工具链

### 代码质量

| 工具                     | 版本    | 说明                    |
| ------------------------ | ------- | ----------------------- |
| ESLint                   | ^9.38.0 | 代码检查工具 (扁平配置) |
| TypeScript ESLint Parser | ^8.46.2 | TypeScript 解析器       |
| TypeScript ESLint Plugin | ^8.46.2 | TypeScript 规则插件     |
| ESLint Import Resolver   | ^3.6.1  | 导入解析器              |
| ESLint Config Prettier   | ^9.1.2  | Prettier 兼容配置       |
| Prettier                 | ^3.3.3  | 代码格式化工具          |

### Git 钩子

| 工具        | 版本    | 说明             |
| ----------- | ------- | ---------------- |
| Husky       | ^9.1.6  | Git 钩子管理工具 |
| lint-staged | ^16.2.5 | 暂存文件检查工具 |

### 构建工具

| 工具                | 版本     | 说明                |
| ------------------- | -------- | ------------------- |
| Vite React Plugin   | ^5.0.0   | React 插件          |
| Vite TSConfig Paths | ^5.0.0   | TypeScript 路径解析 |
| PostCSS             | ^8.4.41  | CSS 处理工具        |
| Tailwind CSS        | ^3.4.18  | CSS 框架            |
| Autoprefixer        | ^10.4.20 | CSS 前缀自动添加    |

## 生产依赖

### UI 组件

| 组件          | 版本      | 说明     |
| ------------- | --------- | -------- |
| Framer Motion | ^12.23.24 | 动画库   |
| Lucide React  | ^0.546.0  | 图标库   |
| Zustand       | ^5.0.8    | 状态管理 |

### 内容处理

| 组件                     | 版本     | 说明                 |
| ------------------------ | -------- | -------------------- |
| React Markdown           | ^10.1.0  | Markdown 渲染        |
| React Syntax Highlighter | ^15.6.6  | 代码高亮             |
| Remark GFM               | ^4.0.1   | GitHub 风格 Markdown |
| Remark Math              | ^6.0.0   | 数学公式支持         |
| Rehype Katex             | ^7.0.1   | KaTeX 数学渲染       |
| Rehype Raw               | ^7.0.0   | HTML 解析            |
| KaTeX                    | ^0.16.25 | 数学公式渲染         |

### 其他

| 组件             | 版本     | 说明     |
| ---------------- | -------- | -------- |
| React Router DOM | ^7.9.4   | 路由管理 |
| Mermaid          | ^11.12.0 | 图表渲染 |
| EmailJS Browser  | ^4.4.1   | 邮件服务 |

## 类型定义

| 包名                            | 版本     | 说明                        |
| ------------------------------- | -------- | --------------------------- |
| @types/node                     | ^24.8.1  | Node.js 类型定义            |
| @types/react                    | ^19.0.2  | React 类型定义              |
| @types/react-dom                | ^19.0.2  | React DOM 类型定义          |
| @types/react-syntax-highlighter | ^15.5.13 | Syntax Highlighter 类型定义 |

## lint-staged 配置

```json
{
  "*.{ts,tsx,js,jsx}": "eslint --fix && prettier --write",
  "*.{md,json,css,scss}": "prettier --write"
}
```

## 版本升级说明

### 已完成升级

- ✅ Node.js 22 环境支持 (跳过了 Node 20 中间版本)
- ✅ React 19 兼容性升级
- ✅ Vite 7 性能优化
- ✅ ESLint 9 扁平配置迁移
- ✅ Husky 9 现代化配置
- ✅ lint-staged 16 字符串命令优化
- ✅ TypeScript 5.6 最新特性支持
- ✅ Tailwind CSS 4 提前适配 (CSS 配置迁移到 @theme block)

### 兼容性保证

- 🔒 TypeScript 严格类型检查
- 🔒 ESLint 代码质量保障
- 🔒 Prettier 代码格式化一致性
- 🔒 Git 钩子自动化检查
- 🔒 生产构建优化(通过 Vite 7)

## 构建输出预期

- 开发服务器: `npm run dev` (Vite 7 热重载)
- 生产构建: `npm run build` (TypeScript + Vite 优化)
- 类型检查: `npm run type-check` (TypeScript 编译检查)
- 代码检查: `npm run lint` (ESLint 扁平配置)

## 监控要点

- Vite 构建 Bundle 大小 (预期警告: chunk size 限制)
- ESLint 规则兼容性 (React 19 Hooks 检查)
- TypeScript 类型覆盖率
- Git 钩子执行性能
