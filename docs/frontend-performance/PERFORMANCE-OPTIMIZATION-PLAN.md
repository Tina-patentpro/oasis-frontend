# 性能优化计划 (Performance Optimization Plan)

**创建时间**: 2025-11-07  
**版本**: 1.0  
**负责人**: AI Assistant  
**项目**: OASIS 工作区应用

---

## 📋 执行概览

### 目标

识别并优化应用中的性能瓶颈，提升用户体验和应用响应速度，在不改变界面和功能的前提下，实现：

- 首屏加载时间减少 30%
- 打包体积减少 20%
- 组件渲染时间减少 40%
- Lighthouse 性能评分 > 90 分

### 原则

1. **数据驱动**: 所有优化基于实际测量数据
2. **渐进式优化**: 逐步优化，避免过度优化
3. **保持兼容**: 不破坏现有功能
4. **代码质量**: 保持可读性和可维护性
5. **ESLint 合规**: 所有修改通过代码质量检查

---

## 🎯 阶段1：性能分析与诊断 (2-3天)

### 1.1 构建性能分析基线

#### 1.1.1 Lighthouse 性能测试

**执行步骤**:

```bash
# 构建生产版本
npm run build

# 启动生产服务器
npm run preview

# 使用 Chrome DevTools 运行 Lighthouse
# 目标 URL: http://localhost:4173
```

**测量指标**:

- **FCP (First Contentful Paint)**: 首次内容绘制
- **LCP (Largest Contentful Paint)**: 最大内容绘制
- **FID (First Input Delay)**: 首次输入延迟
- **CLS (Cumulative Layout Shift)**: 累积布局偏移
- **TTI (Time to Interactive)**: 可交互时间
- **TBT (Total Blocking Time)**: 总阻塞时间
- **Speed Index**: 速度指数

**目标值**:
| 指标 | 优秀 | 良好 | 需改进 | 当前值 |
|------|------|------|--------|--------|
| FCP | < 1.8s | < 3.0s | ≥ 3.0s | TBD |
| LCP | < 2.5s | < 4.0s | ≥ 4.0s | TBD |
| FID | < 100ms | < 300ms | ≥ 300ms | TBD |
| CLS | < 0.1 | < 0.25 | ≥ 0.25 | TBD |
| TTI | < 3.8s | < 7.3s | ≥ 7.3s | TBD |

#### 1.1.2 打包体积分析

**执行步骤**:

```bash
# 安装分析工具
npm install -D rollup-plugin-visualizer

# 构建并生成分析报告
npm run build
```

**配置 vite.config.ts**:

```typescript
import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig({
  plugins: [
    // ... 其他插件
    visualizer({
      open: true,
      gzipSize: true,
      brotliSize: true,
      filename: 'docs/perf/bundle-analysis.html',
    }),
  ],
})
```

**分析重点**:

- 最大的打包块（chunks）
- 重复的依赖项
- 未使用的代码
- 第三方库的大小

#### 1.1.3 网络性能分析

**执行步骤**:

- 使用 Chrome DevTools Network 面板
- 记录页面加载时的网络请求
- 分析资源加载顺序和大小

**关注指标**:

- 总请求数
- 总传输大小
- 资源加载时间
- 关键路径资源

### 1.2 React 渲染性能分析

#### 1.2.1 React DevTools Profiler 分析

**测试场景**:

1. **工作区加载场景**
   - 打开应用
   - 登录进入工作区
   - 记录组件渲染情况

2. **聊天交互场景**
   - 发送消息
   - 接收消息
   - 滚动消息列表
   - 记录重渲染情况

3. **文件操作场景**
   - 上传文件
   - 浏览文件列表
   - 记录渲染性能

4. **侧边栏切换场景**
   - 展开/收起侧边栏
   - 切换不同标签
   - 记录渲染时间

**分析指标**:

- 组件渲染次数
- 组件渲染时长
- 渲染触发原因
- 渲染调用链

#### 1.2.2 识别性能瓶颈

**重点关注**:

- 渲染时间 > 16ms 的组件（60fps 要求）
- 不必要的重渲染
- 大型列表渲染
- 深层嵌套组件

### 1.3 代码静态分析

#### 1.3.1 useEffect 依赖检查

**检查工具**:

```bash
# ESLint 已配置 react-hooks/exhaustive-deps 规则
npm run lint
```

**检查重点**:

- 缺失的依赖项
- 过多的依赖项
- 频繁触发的 effect

#### 1.3.2 未优化的回调和计算

**检查清单**:

- [ ] 查找所有内联函数定义
- [ ] 查找所有 props 传递的函数
- [ ] 查找所有复杂计算
- [ ] 查找所有数组操作（map、filter、sort）

**工具**:

```bash
# 搜索内联箭头函数
grep -r "onClick={() =>" src/components/
grep -r "onChange={() =>" src/components/
```

#### 1.3.3 大型列表检查

**检查目标**:

- 消息列表组件
- 文件列表组件
- 通知列表组件
- 搜索结果列表

**评估标准**:

- 列表项数量 > 100: 考虑虚拟滚动
- 列表项数量 > 50: 考虑优化渲染
- 列表项数量 < 50: 保持现状

---

## ⚡ 阶段2：优化实施 (3-5天)

### 2.1 组件优化

#### 2.1.1 React.memo 优化

**优化策略**:

```typescript
// 1. 简单的 props 比较（默认）
export const Component = memo(({ prop1, prop2 }) => {
  return <div>{prop1} {prop2}</div>;
});

// 2. 自定义比较函数（复杂对象）
export const Component = memo(
  ({ data }) => <div>{data.name}</div>,
  (prevProps, nextProps) => {
    return prevProps.data.id === nextProps.data.id &&
           prevProps.data.version === nextProps.data.version;
  }
);

// 3. 使用 displayName 便于调试
Component.displayName = 'OptimizedComponent';
```

**目标组件列表**:

1. **高优先级**:
   - [ ] `NavigationBar` - 导航栏
   - [ ] `MessageList` - 消息列表（如存在）
   - [ ] `FileList` - 文件列表（如存在）
   - [ ] `Sidebar` 子组件

2. **中优先级**:
   - [ ] `Toolbar` 组件
   - [ ] `StatusBar` 组件
   - [ ] `Avatar` 组件
   - [ ] `Badge` 组件

3. **低优先级**:
   - [ ] 其他纯展示组件

#### 2.1.2 useMemo 优化

**优化模式**:

```typescript
// 1. 列表过滤和排序
const sortedItems = useMemo(() => {
  return items.filter((item) => item.status === 'active').sort((a, b) => b.timestamp - a.timestamp)
}, [items])

// 2. 复杂计算
const statistics = useMemo(() => {
  return {
    total: items.length,
    completed: items.filter((i) => i.done).length,
    pending: items.filter((i) => !i.done).length,
  }
}, [items])

// 3. 样式对象
const containerStyle = useMemo(
  () => ({
    width: `${width}px`,
    height: `${height}px`,
    transform: `translate(${x}px, ${y}px)`,
  }),
  [width, height, x, y],
)
```

**目标场景**:

- [ ] 消息列表过滤
- [ ] 文件列表排序
- [ ] 统计数据计算
- [ ] 动态样式计算
- [ ] 数据格式转换

#### 2.1.3 useCallback 优化

**优化模式**:

```typescript
// 1. 事件处理器
const handleClick = useCallback(
  (id: string) => {
    dispatch({ type: 'SELECT', payload: id })
  },
  [dispatch],
)

// 2. 带参数的事件处理器
const handleItemClick = useCallback(
  (item: Item) => {
    setSelectedItem(item)
    onSelect?.(item)
  },
  [onSelect],
)

// 3. useEffect 依赖函数
const fetchData = useCallback(async () => {
  const data = await api.getData(userId)
  setData(data)
}, [userId])

useEffect(() => {
  void fetchData()
}, [fetchData])
```

**目标场景**:

- [ ] 传递给子组件的事件处理器
- [ ] useEffect 的依赖函数
- [ ] 防抖/节流函数
- [ ] Context 提供的回调

### 2.2 代码分割与懒加载

#### 2.2.1 路由级代码分割

**实施步骤**:

```typescript
// src/App.tsx 或路由配置文件
import { lazy, Suspense } from 'react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

// 懒加载页面组件
const AdminPage = lazy(() => import('@/pages/admin/AdminPage'));
const SettingsPage = lazy(() => import('@/pages/SettingsPage'));
const ProfilePage = lazy(() => import('@/pages/ProfilePage'));

// 使用 Suspense 包裹
function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Routes>
    </Suspense>
  );
}
```

**目标页面**:

- [ ] 管理员页面
- [ ] 设置页面
- [ ] 个人资料页面
- [ ] 帮助文档页面
- [ ] 其他低频页面

#### 2.2.2 组件级懒加载

**实施策略**:

```typescript
// 按需加载重型组件
const RichTextEditor = lazy(() => import('@/components/RichTextEditor'));
const ChartComponent = lazy(() => import('@/components/ChartComponent'));
const CodeEditor = lazy(() => import('@/components/CodeEditor'));

// 使用时
function MyComponent() {
  const [showEditor, setShowEditor] = useState(false);

  return (
    <div>
      <button onClick={() => setShowEditor(true)}>打开编辑器</button>
      {showEditor && (
        <Suspense fallback={<div>加载中...</div>}>
          <RichTextEditor />
        </Suspense>
      )}
    </div>
  );
}
```

**目标组件**:

- [ ] 富文本编辑器
- [ ] 图表组件
- [ ] 代码编辑器
- [ ] PDF 查看器
- [ ] 视频播放器

#### 2.2.3 优化第三方库导入

**优化前**:

```typescript
import _ from 'lodash' // ❌ 导入整个库 (~70KB)
import moment from 'moment' // ❌ 导入整个库 (~200KB)
```

**优化后**:

```typescript
import debounce from 'lodash/debounce' // ✅ 按需导入
import throttle from 'lodash/throttle' // ✅ 按需导入
import dayjs from 'dayjs' // ✅ 使用更轻量的替代品 (~2KB)
```

**检查清单**:

- [ ] lodash 使用情况
- [ ] moment 使用情况（考虑替换为 dayjs）
- [ ] 其他大型库的导入方式

### 2.3 列表优化

#### 2.3.1 虚拟滚动实现

**推荐库**: `react-window` 或 `@tanstack/react-virtual`

**实施示例**:

```typescript
import { FixedSizeList } from 'react-window';

function MessageList({ messages }: { messages: Message[] }) {
  const Row = ({ index, style }: { index: number; style: CSSProperties }) => (
    <div style={style}>
      <MessageItem message={messages[index]} />
    </div>
  );

  return (
    <FixedSizeList
      height={600}
      itemCount={messages.length}
      itemSize={80}
      width="100%"
    >
      {Row}
    </FixedSizeList>
  );
}
```

**目标列表**:

- [ ] 消息列表（如 > 100 条消息）
- [ ] 文件列表（如 > 100 个文件）
- [ ] 通知列表（如 > 50 条通知）

#### 2.3.2 列表项优化

**优化技巧**:

```typescript
// 1. 使用 key 优化
const MessageItem = memo(({ message }: { message: Message }) => {
  return <div>{message.content}</div>;
});

// 2. 避免内联样式
const itemStyle = { padding: '10px', borderBottom: '1px solid #eee' };

// 3. 使用 CSS 类而不是内联样式
```

### 2.4 资源优化

#### 2.4.1 图片优化

**策略**:

1. 使用 WebP 格式
2. 图片懒加载
3. 响应式图片
4. 图片压缩

**实施**:

```typescript
// 懒加载图片
<img
  src={imageSrc}
  alt="description"
  loading="lazy"
/>

// 响应式图片
<picture>
  <source srcSet="image.webp" type="image/webp" />
  <source srcSet="image.jpg" type="image/jpeg" />
  <img src="image.jpg" alt="fallback" />
</picture>
```

#### 2.4.2 静态资源压缩

**Vite 配置**:

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // 生产环境移除 console
        drop_debugger: true,
      },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          utils: ['lodash', 'dayjs'],
        },
      },
    },
  },
})
```

---

## 📊 阶段3：性能验证 (1-2天)

### 3.1 自动化性能测试

#### 3.1.1 Lighthouse CI 集成

**配置文件** `.lighthouserc.json`:

```json
{
  "ci": {
    "collect": {
      "url": ["http://localhost:4173"],
      "numberOfRuns": 3
    },
    "assert": {
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.9 }],
        "first-contentful-paint": ["error", { "maxNumericValue": 2000 }],
        "largest-contentful-paint": ["error", { "maxNumericValue": 2500 }],
        "cumulative-layout-shift": ["error", { "maxNumericValue": 0.1 }]
      }
    }
  }
}
```

#### 3.1.2 打包体积监控

**配置文件** `package.json`:

```json
{
  "scripts": {
    "analyze": "vite build && vite-bundle-visualizer"
  }
}
```

### 3.2 真实场景测试

#### 3.2.1 关键用户流程测试

**测试场景**:

1. 用户登录流程
2. 创建新会话
3. 发送消息
4. 上传文件
5. 浏览历史记录

**测试设备**:

- 高端设备（模拟）
- 中端设备（模拟）
- 低端设备（模拟）

#### 3.2.2 性能指标对比

**对比表格**:
| 指标 | 优化前 | 优化后 | 改进 |
|------|--------|--------|------|
| FCP | TBD | TBD | TBD |
| LCP | TBD | TBD | TBD |
| FID | TBD | TBD | TBD |
| CLS | TBD | TBD | TBD |
| TTI | TBD | TBD | TBD |
| 打包大小 | TBD | TBD | TBD |
| 首屏时间 | TBD | TBD | TBD |

### 3.3 性能监控集成

#### 3.3.1 性能预算配置

**配置文件** `performance-budget.json`:

```json
{
  "budget": {
    "javascript": 300,
    "css": 50,
    "image": 200,
    "font": 100,
    "total": 1000
  },
  "timing": {
    "fcp": 2000,
    "lcp": 2500,
    "tti": 3800
  }
}
```

#### 3.3.2 持续监控

**集成方案**:

- 使用 Web Vitals 库收集实时数据
- 集成到现有的性能监控系统
- 配置性能告警阈值

---

## 📝 交付物清单

### 必需文档

- [ ] 性能分析报告 (`PERFORMANCE-ANALYSIS-REPORT.md`)
- [ ] 性能优化实施报告 (`PERFORMANCE-OPTIMIZATION-REPORT.md`)
- [ ] 性能监控指南 (`PERFORMANCE-MONITORING-GUIDE.md`)

### 代码修改

- [ ] 组件优化代码
- [ ] 路由懒加载配置
- [ ] Vite 构建配置
- [ ] 性能监控集成代码

### 数据报告

- [ ] Lighthouse 测试报告（优化前后）
- [ ] 打包体积分析报告（优化前后）
- [ ] React Profiler 分析报告

---

## ⚠️ 风险和注意事项

### 技术风险

1. **过度优化**: 可能导致代码复杂度增加
   - 缓解措施：只优化有明显性能问题的部分
2. **兼容性问题**: 某些优化可能影响浏览器兼容性
   - 缓解措施：测试主流浏览器

3. **功能破坏**: 优化可能意外破坏现有功能
   - 缓解措施：充分测试，保持代码审查

### 项目风险

1. **时间超期**: 性能优化可能比预期耗时更长
   - 缓解措施：按优先级执行，必要时调整范围

2. **收益不明显**: 某些优化可能收益不大
   - 缓解措施：基于数据决策，及时调整策略

---

## 📅 执行时间表

### 第1周（3天）

- **Day 1**: 阶段1.1 - 性能分析基线
- **Day 2**: 阶段1.2 - React 性能分析
- **Day 3**: 阶段1.3 - 代码静态分析 + 阶段2.1 开始

### 第2周（5天）

- **Day 4-5**: 阶段2.1 - 组件优化
- **Day 6-7**: 阶段2.2 - 代码分割
- **Day 8**: 阶段2.3 - 列表优化

### 第3周（2天）

- **Day 9**: 阶段2.4 - 资源优化
- **Day 10**: 阶段3 - 性能验证

**总计**: 10 个工作日

---

## ✅ 成功标准

### 性能指标

- ✅ Lighthouse 性能评分 > 90
- ✅ FCP < 1.8s
- ✅ LCP < 2.5s
- ✅ FID < 100ms
- ✅ CLS < 0.1
- ✅ 打包体积减少 20%

### 代码质量

- ✅ 所有修改通过 ESLint
- ✅ 所有修改通过 TypeScript 检查
- ✅ 无功能回归
- ✅ 代码可读性保持良好

### 文档质量

- ✅ 完整的性能分析报告
- ✅ 详细的优化实施记录
- ✅ 清晰的性能监控指南

---

**最后更新**: 2025-11-07  
**状态**: 📝 计划阶段
