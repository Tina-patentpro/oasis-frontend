# Monorepo迁移计划 - 前后端统一技术栈

## 概述

将AdminS后端管理系统从纯HTML/CSS/JS迁移到与前端相同的技术栈（React + TypeScript + Vite + Tailwind CSS），采用Monorepo架构，实现代码共享和独立部署。

## 架构设计

### 目录结构

```
codex/
├── src/                          # 前端应用源码
│   ├── main.tsx                  # 前端入口
│   ├── App.tsx                   # 前端主组件
│   └── ...
├── src/modules/                  # 面向域的子应用
│   ├── admin/                    # 管理端React模块
│   ├── workspace/                # 工作区模块
│   └── ...
├── src/components/shared/        # 跨模块共享UI
├── public/                       # 静态资源
├── scripts/legacy/admin/         # 历史管理端入口备份
├── index.html                    # 单一HTML入口
├── vite.config.ts                # Vite配置（更新）
└── package.json                  # 依赖管理
```

### 访问地址配置

- **统一入口**: `http://localhost:5173` → `index.html` → `src/main.tsx`
- **路由划分**: `/`（落地页）、`/workspace/*`（工作区）、`/admin/*`（管理端）

### 共享资源

1. **UI组件库**: `shared/components/ui/`
   - Button, Dialog, Input等基础组件
   - 前后端统一风格

2. **工具函数**: `shared/utils/`
   - errorHandler, helpers, animations等

3. **类型定义**: `shared/types/`
   - API类型、通用类型等

4. **API客户端**: `shared/api/`
   - 统一的API调用逻辑

5. **主题系统**: `shared/stores/useThemeStore.ts`
   - 前后端共享主题配置

## 实施步骤

### 第一阶段：项目结构重组

- [ ] 在 `src/modules` 下创建 admin 子模块
- [ ] 创建 `src/components/shared` 并迁移共享代码
- [ ] 配置统一入口的 Vite 构建与路由
- [ ] 更新TypeScript配置支持路径别名

### 第二阶段：后端基础架构

- [ ] 更新 `src/main.tsx` 统一挂载 Providers
- [ ] 在 `src/app/App.tsx` 注册 `/admin/*` 路由
- [ ] 实现AdminLayout布局组件
- [ ] 实现AdminSidebar导航组件
- [ ] 配置React Router路由

### 第三阶段：页面迁移（优先级）

1. **Dashboard（首页）** - 高优先级
2. **UserManagement（用户管理）** - 高优先级
3. **APIManagement（API管理）** - 高优先级
4. **RechargeManagement（充值管理）** - 中优先级
5. **ConsumptionManagement（消费管理）** - 中优先级
6. **CMSPages（内容管理）** - 低优先级

### 第四阶段：数据集成

- [ ] 创建后端专用API服务
- [ ] 实现数据表格组件
- [ ] 实现表单组件
- [ ] 添加数据验证逻辑

### 第五阶段：测试与优化

- [ ] 功能测试
- [ ] 响应式测试
- [ ] 性能优化
- [ ] 构建优化

## 技术细节

### Vite多入口配置

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      input: resolve(__dirname, 'index.html'),
    },
  },
  server: {
    port: 5173,
    open: '/',
  },
})
```

### 开发服务器配置

- 统一开发: `npm run dev` (端口5173)
- 管理端入口: `npm run dev:admin`（同一端口，自动打开 `/admin/dashboard`）

### 路径别名配置

```typescript
// tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"],
      "@shared/*": ["./src/components/shared/*"]
    }
  }
}
```

## 优势

1. **代码复用**: 组件、工具、类型等可在前后端共享
2. **统一风格**: UI/UX保持一致性
3. **类型安全**: TypeScript提供完整类型检查
4. **开发效率**: 共享开发工具链和构建配置
5. **独立部署**: 前后端可独立构建和部署
6. **维护性**: 统一技术栈降低维护成本

## 迁移时间估算

- 第一阶段: 2-3小时
- 第二阶段: 3-4小时
- 第三阶段: 8-12小时（根据页面复杂度）
- 第四阶段: 4-6小时
- 第五阶段: 2-3小时

**总计**: 约19-28小时

## 风险与应对

### 风险1: 构建配置复杂

**应对**: 使用成熟的Vite多入口方案，参考官方文档

### 风险2: 代码迁移工作量大

**应对**: 分阶段迁移，优先核心功能，保持旧版本可用

### 风险3: 共享代码冲突

**应对**: 明确共享边界，使用命名空间区分

## 下一步行动

立即开始第一阶段：创建目录结构并配置构建系统。
