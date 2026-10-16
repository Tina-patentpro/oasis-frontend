# 状态管理优化实施文档

## 📋 实施概述

使用Zustand替代组件内部useState,实现更清晰的状态管理和自动持久化。

**实施日期**: 2025-10-01
**状态**: ✅ Stores创建完成 → 🔄 待迁移App.tsx

---

## ✅ 已完成的工作

### 1. 安装依赖

```bash
npm install zustand
```

**包含功能**:

- 核心状态管理
- persist中间件(自动持久化)
- TypeScript完整支持

---

### 2. 创建Store结构

#### 📁 目录结构

```
src/stores/
├── index.ts                 # 统一导出
├── useThemeStore.ts        # 主题状态
├── useUIStore.ts           # UI状态
├── useWorkspaceStore.ts    # 工作区状态
└── useContentStore.ts      # 内容状态
```

---

## 📦 Store详细说明

### useThemeStore - 主题管理

**管理内容**:

- 当前主题选择
- 主题配置信息

**特性**:

- ✅ 自动持久化到localStorage
- ✅ 包含4个预设主题
- ✅ 实时更新CSS变量

**使用示例**:

```typescript
import { useThemeStore } from '@/stores';

function ThemeSelector() {
  const { theme, currentTheme, setTheme } = useThemeStore();

  return (
    <button onClick={() => setTheme('blue')}>
      当前主题: {currentTheme.name}
    </button>
  );
}
```

---

### useUIStore - UI状态管理

**管理内容**:

- 侧边栏显示/隐藏
- 对话面板开关
- 各种对话框状态
- 面板宽度
- 布局模式
- Toast通知

**特性**:

- ⚡ 不持久化(临时UI状态)
- 🎯 集中管理所有UI交互
- 🔔 内置Toast通知管理

**使用示例**:

```typescript
import { useUIStore } from '@/stores';

function Sidebar() {
  const { showSidebar, toggleSidebar } = useUIStore();

  return showSidebar && <div>侧边栏内容</div>;
}
```

---

### useWorkspaceStore - 工作区状态

**管理内容**:

- 当前工具标签
- 工具配置
- 管理标签选择
- 版本信息显示
- 选中的项目名称

**特性**:

- ✅ 自动持久化
- 🔄 保持用户工作环境

**使用示例**:

```typescript
import { useWorkspaceStore } from '@/stores';

function ToolSelector() {
  const { tool, setTool } = useWorkspaceStore();

  return (
    <div>
      当前工具: {tool.name} {tool.ver}
    </div>
  );
}
```

---

### useContentStore - 内容管理

**管理内容**:

- 文档标题
- 输入章节内容
- 生成的内容
- 版本历史
- 生成状态

**特性**:

- ✅ 自动持久化(草稿保存)
- 📝 支持多章节管理
- 📜 版本历史记录
- ⚡ 部分状态持久化

**使用示例**:

```typescript
import { useContentStore } from '@/modules/workspace/stores';

function Editor() {
  const {
    inputSections,
    setInputSection,
    inputPage
  } = useContentStore();

  return (
    <textarea
      value={inputSections[inputPage]}
      onChange={(e) => setInputSection(inputPage, e.target.value)}
    />
  );
}
```

---

## 🔄 迁移计划

### 阶段1: 准备工作 ✅

- [x] 安装Zustand
- [x] 创建所有store文件
- [x] 设置统一导出

### 阶段2: App.tsx重构 (待进行)

需要替换的useState状态:

#### Theme相关 (→ useThemeStore)

```typescript
// 原代码
const [theme, setTheme] = useState<ThemeKey>('green')

// 新代码
const { theme, currentTheme, setTheme } = useThemeStore()
```

#### UI状态 (→ useUIStore)

```typescript
// 原代码
const [showSidebar, setShowSidebar] = useState(true)
const [chatOpen, setChatOpen] = useState(true)
const [settingsOpen, setSettingsOpen] = useState(false)
// ... 更多状态

// 新代码
const {
  showSidebar,
  chatOpen,
  settingsOpen,
  toggleSidebar,
  setChatOpen,
  setSettingsOpen,
  // ...
} = useUIStore()
```

#### 工具状态 (→ useWorkspaceStore)

```typescript
// 原代码
const [tab, setTab] = useState('draft')
const [tool, setTool] = useState({ name: '...', ver: '...' })

// 新代码
const { tab, tool, setTab, setTool } = useWorkspaceStore()
```

#### 内容状态 (→ useContentStore)

```typescript
// 原代码
const [title, setTitle] = useState('');
const [inputSections, setInputSections] = useState({...});
const [generated, setGenerated] = useState('');

// 新代码
const {
  title,
  inputSections,
  generated,
  setTitle,
  setInputSection,
  setGenerated,
} = useContentStore();
```

### 阶段3: 测试验证

- [ ] 主题切换测试
- [ ] UI交互测试
- [ ] 内容保存测试
- [ ] 持久化测试
- [ ] 页面刷新测试

---

## 📊 改进对比

### 改进前

**问题**:

- ❌ App.tsx中20+个useState
- ❌ Props drilling严重
- ❌ 状态逻辑分散
- ❌ 无持久化
- ❌ 难以维护

**代码行数**: ~1200行

### 改进后

**优势**:

- ✅ 状态集中管理
- ✅ 自动持久化
- ✅ 减少props传递
- ✅ 更好的TypeScript支持
- ✅ 更清晰的代码结构

**预期代码减少**: ~100-150行

---

## 🎯 预期收益

### 开发体验

- ⚡ 状态访问更简单
- 🎯 逻辑更清晰
- 🔍 调试更方便(Zustand DevTools)
- 📝 TypeScript智能提示更好

### 用户体验

- 💾 自动保存草稿
- 🔄 刷新保持状态
- ⚡ 更快的响应速度

### 可维护性

- 📦 代码组织更好
- 🔧 易于扩展
- 🧪 易于测试
- 📚 易于理解

---

## 🛠️ 使用指南

### 基本用法

```typescript
// 1. 导入store
import { useThemeStore, useUIStore } from '@/stores';

// 2. 在组件中使用
function MyComponent() {
  // 获取状态和actions
  const { theme, setTheme } = useThemeStore();
  const { showSidebar, toggleSidebar } = useUIStore();

  // 使用状态
  return (
    <div>
      <button onClick={() => setTheme('blue')}>
        切换主题
      </button>
      <button onClick={toggleSidebar}>
        {showSidebar ? '隐藏' : '显示'}侧边栏
      </button>
    </div>
  );
}
```

### 选择性订阅(性能优化)

```typescript
// 只订阅需要的状态
const theme = useThemeStore((state) => state.theme)
const setTheme = useThemeStore((state) => state.setTheme)
```

### DevTools集成

```typescript
import { devtools } from 'zustand/middleware';

export const useThemeStore = create<ThemeStore>()(
  devtools(
    persist(
      (set) => ({...}),
      { name: 'theme-storage' }
    ),
    { name: 'ThemeStore' }
  )
);
```

---

## 📝 最佳实践

### 1. Store设计原则

- ✅ 单一职责: 每个store管理相关状态
- ✅ 扁平化: 避免深层嵌套
- ✅ 不可变: 使用展开运算符更新
- ✅ TypeScript: 完整类型定义

### 2. 命名规范

- Store名称: `use[Domain]Store`
- 状态名称: 描述性名词
- Actions: 动词开头 (set, toggle, add, remove)

### 3. 性能优化

```typescript
import { useContentStore } from '@/modules/workspace/stores'

// ✅ 好 - 选择性订阅
const title = useContentStore((state) => state.title)

// ❌ 差 - 订阅整个store
const store = useContentStore()
```

### 4. 持久化策略

```typescript
persist(
  (set) => ({...}),
  {
    name: 'storage-key',
    partialize: (state) => ({
      // 只持久化部分状态
      title: state.title,
      content: state.content,
    }),
  }
)
```

---

## 🔍 调试工具

### Redux DevTools

安装浏览器扩展后可以:

- 查看状态变化
- 时间旅行调试
- 状态快照

### 使用方法

```typescript
import { devtools } from 'zustand/middleware';

export const useUIStore = create<UIStore>()(
  devtools(
    (set) => ({...}),
    { name: 'UIStore' }
  )
);
```

---

## 📈 下一步

### 短期 (本周)

1. ✅ 创建所有stores
2. 🔄 迁移App.tsx
3. ⏳ 测试所有功能
4. ⏳ 更新文档

### 中期 (下周)

1. ⏳ 添加DevTools支持
2. ⏳ 优化性能(选择性订阅)
3. ⏳ 添加store单元测试

### 长期

1. ⏳ 考虑状态持久化策略优化
2. ⏳ 考虑添加undo/redo功能
3. ⏳ 考虑状态同步(多标签页)

---

## 🐛 常见问题

### Q: 为什么选择Zustand而不是Redux?

**A**:

- 更简单的API
- 更小的包大小(~1KB)
- 无需Provider包裹
- 更好的TypeScript支持
- 更少的样板代码

### Q: 持久化的数据存在哪里?

**A**: localStorage, key为store配置的name

查看: 浏览器DevTools → Application → Local Storage

### Q: 如何清除持久化数据?

**A**:

```typescript
// 方法1: 编程清除
localStorage.removeItem('theme-storage')

// 方法2: 重置store
useThemeStore.persist.clearStorage()
```

### Q: 状态更新不触发重渲染?

**A**: 确保使用不可变更新:

```typescript
// ✅ 正确
set((state) => ({ count: state.count + 1 }))

// ❌ 错误 - 直接修改
state.count++
```

---

## 📚 参考资源

- [Zustand官方文档](https://docs.pmnd.rs/zustand)
- [Zustand GitHub](https://github.com/pmndrs/zustand)
- [Zustand最佳实践](https://docs.pmnd.rs/zustand/guides/best-practices)

---

**文档版本**: 1.0.0  
**最后更新**: 2025-10-01  
**状态**: 🔄 进行中
