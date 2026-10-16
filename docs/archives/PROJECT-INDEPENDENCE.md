> **归档说明**：本文档为历史归档资料，可能不代表当前实现与当前规范；请优先以仓库当前代码、docs/CHANGELOG.md、docs/api/ 与最新审计/计划文件为准。

# 绿洲慧写前台项目 - 独立性说明

> 本项目与管理后台完全独立
>
> 项目名称：codex（前台用户系统）

---

## 📍 项目位置

**当前项目：** `C:\Users\TinaD\Desktop\codex`  
**管理后台：** `C:\Users\TinaD\Desktop\AdminS`（完全独立的项目）

---

## ✅ 独立性声明

### 本项目（前台）特点

1. **技术栈独立**
   - React 18 + TypeScript
   - Vite 构建工具
   - Tailwind CSS
   - Zustand 状态管理
   - 完整的现代化前端技术栈

2. **运行方式独立**

   ```bash
   npm install    # 安装依赖
   npm run dev    # 启动开发服务器
   npm run build  # 生产构建
   ```

3. **部署方式独立**
   - 构建后得到静态文件（dist/）
   - 可部署到任何静态文件服务器
   - CDN、Nginx、Vercel、Netlify等

4. **与后台完全无关**
   - ❌ 不依赖管理后台的任何文件
   - ❌ 不共享任何代码或资源
   - ✅ 通过API与后端通信
   - ✅ 完全独立开发和部署

---

## 🎯 项目用途

### 面向用户

本项目是面向**最终用户**的前台系统：

- 专利文件生成
- 项目管理
- 用户工作空间
- 在线编辑和导出

### 与管理后台的区别

| 特性     | 前台（本项目） | 管理后台（AdminS） |
| -------- | -------------- | ------------------ |
| 用户群体 | 普通用户       | 管理员             |
| 技术栈   | React + TS     | 纯HTML             |
| 构建方式 | Vite构建       | 无需构建           |
| 认证方式 | JWT Token      | Session            |
| 部署方式 | 静态服务器     | ASP.NET集成        |

---

## 🚀 快速开始

### 1. 安装依赖

```bash
cd C:\Users\TinaD\Desktop\codex
npm install
```

### 2. 启动开发服务器

```bash
npm run dev
```

访问：http://localhost:5173

### 3. 生产构建

```bash
npm run build
```

构建产物在 `dist/` 目录

---

## 📁 项目结构

```
codex/
├── src/                    # 源代码
│   ├── components/         # React组件
│   │   ├── workspace/     # 工作区组件
│   │   ├── ui/            # UI组件库
│   │   └── ...            # 其他组件
│   ├── hooks/             # 自定义Hooks
│   ├── stores/            # Zustand状态管理
│   ├── api/               # API服务层
│   │   └── services/      # 各种API服务
│   ├── types/             # TypeScript类型定义
│   ├── utils/             # 工具函数
│   ├── constants/         # 常量配置
│   └── styles/            # 全局样式
├── docs/                  # 项目文档
├── public/                # 静态资源
├── package.json           # 依赖配置
├── vite.config.ts         # Vite配置
├── tsconfig.json          # TypeScript配置
└── tailwind.config.js     # Tailwind配置
```

---

## 🔌 后端对接

### API配置

本项目通过环境变量配置后端API地址：

```env
# .env.development（开发环境）
VITE_API_BASE_URL=http://localhost:3000/api

# .env.production（生产环境）
VITE_API_BASE_URL=https://api.oasisintwrite.com
```

### API服务层

所有API调用都通过服务层：

- `src/api/services/auth.service.ts` - 认证服务
- `src/api/services/user.service.ts` - 用户服务
- `src/api/services/project.service.ts` - 项目服务
- `src/api/services/ai.service.ts` - AI服务
- `src/api/services/file.service.ts` - 文件服务
- ... 等

---

## 🔐 认证机制

### 前台认证流程

1. 用户登录 → 后端返回JWT Token
2. Token存储在 localStorage
3. 每次API请求自动携带Token（通过拦截器）
4. Token过期自动跳转登录页

### 与管理后台的认证独立

- 前台使用 JWT Token
- 管理后台使用 ASP.NET Session
- 两者完全独立，互不影响

---

## 📝 开发规范

### 代码规范

- TypeScript 严格模式
- ESLint 代码检查
- 组件化开发
- 自定义Hooks复用逻辑

### 样式规范

- Tailwind CSS 优先
- CSS变量统一配置
- 响应式设计
- 主题系统支持

### 状态管理

- 使用 Zustand
- 按功能模块划分 store
- 持久化存储（需要时）

---

## 📚 相关文档

### 本项目文档

- `docs/README.md` - 文档总览
- `docs/ARCHITECTURE.md` - 架构说明
- `docs/USER-MANUAL.md` - 使用手册
- `docs/features/` - 功能文档
- `docs/technical/` - 技术文档

### 项目分离文档

- `C:\Users\TinaD\Desktop\PROJECT-SEPARATION-GUIDE.md`
  完整的前后台分离说明

---

## ⚠️ 重要提醒

### 不要做的事

1. ❌ 不要引用 `AdminS/` 目录中的任何文件
2. ❌ 不要在本项目中添加管理后台功能
3. ❌ 不要直接访问数据库（必须通过API）
4. ❌ 不要使用 Session 认证（应使用Token）

### 应该做的事

1. ✅ 保持前台项目的独立性
2. ✅ 所有数据通过API获取
3. ✅ 使用 TypeScript 保证类型安全
4. ✅ 遵循 React 最佳实践

---

## 🎉 总结

**本项目（codex）是一个完全独立的前台用户系统：**

- ✅ 独立的技术栈（React + TypeScript）
- ✅ 独立的运行环境（Vite开发服务器）
- ✅ 独立的部署方式（静态文件部署）
- ✅ 独立的认证机制（JWT Token）
- ✅ 与管理后台完全隔离

**管理后台（AdminS）是另一个完全独立的项目：**

- 位置：`C:\Users\TinaD\Desktop\AdminS`
- 技术：纯HTML + CSS + JavaScript
- 用途：管理员后台管理
- 运行：直接打开HTML文件
- 部署：集成到ASP.NET项目

**两个项目通过后端API通信，完全独立开发和部署！**

---

**项目版本：** 1.0.0  
**最后更新：** 2025-10-05  
**维护团队：** 前端开发团队
