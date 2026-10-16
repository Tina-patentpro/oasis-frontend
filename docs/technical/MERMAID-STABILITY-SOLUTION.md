# Mermaid Chart Rendering - Stability Solution

## 问题描述 (Problem Description)

在 React 应用中,Mermaid 图表渲染经常出现不稳定的情况:

- 图表在重新渲染时消失
- 多个图表之间相互干扰
- `data-processed` 属性阻止更新
- React 的虚拟 DOM 与 Mermaid 的真实 DOM 操作冲突

## 解决方案 (Solution)

我们实现了一个健壮的多策略方法来确保稳定的 Mermaid 渲染:

### 核心特性 (Key Features)

#### 1. **基于 API 的渲染**

- 使用 `mermaid.render()` 而不是自动扫描
- 显式控制渲染生命周期
- React 保持 DOM 所有权

```typescript
const { svg } = await mermaid.render(uniqueId, chart)
setSvgContent(svg)
```

#### 2. **唯一 ID 生成**

- 每个图表每次渲染都获得唯一 ID
- 防止同一页面上的图表冲突
- 避免 ID 冲突问题

```typescript
const uniqueId = `${chartIdRef.current}-${Date.now()}`
```

#### 3. **语法验证**

- 使用 `mermaid.parse()` 预验证图表语法
- 显示清晰的错误消息
- 防止无效语法导致崩溃

```typescript
await mermaid.parse(chart)
```

#### 4. **正确的清理机制**

- AbortController 防止内存泄漏
- 取消卸载时的待处理渲染
- 优雅处理快速重新渲染

```typescript
const abortController = new AbortController()
return () => abortController.abort()
```

#### 5. **useLayoutEffect 时序**

- 确保 DOM 在渲染前准备就绪
- 防止未样式化内容的闪烁
- React 更新后同步渲染

#### 6. **错误边界**

- 优雅的错误处理
- 显示带有图表定义的错误消息
- 不会破坏整个应用

## 使用方法 (Usage)

### 基础用法

```tsx
import MermaidChart from './components/ContentRenderer/MermaidChart'

function MyComponent() {
  const chartDefinition = `
    graph TD
    A[开始] --> B[结束]
  `

  return <MermaidChart chart={chartDefinition} />
}
```

### 动态内容

```tsx
function DynamicChart() {
  const [nodes, setNodes] = useState(['A', 'B', 'C'])

  const chart = `graph LR
    ${nodes.map((n, i) => `${n}${nodes[i + 1] ? ` --> ${nodes[i + 1]}` : ''}`).join('\n')}
  `

  return <MermaidChart chart={chart} id="dynamic-chart" />
}
```

### 多个图表

```tsx
function MultipleCharts() {
  return (
    <>
      <MermaidChart chart={flowchart} id="chart-1" />
      <MermaidChart chart={sequence} id="chart-2" />
      <MermaidChart chart={gantt} id="chart-3" />
    </>
  )
}
```

## 支持的图表类型 (Supported Chart Types)

- 流程图 (`graph`, `flowchart`)
- 时序图 (`sequenceDiagram`)
- 类图 (`classDiagram`)
- 状态图 (`stateDiagram-v2`)
- 实体关系图 (`erDiagram`)
- 甘特图 (`gantt`)
- 饼图 (`pie`)
- 思维导图 (`mindmap`)
- 时间轴 (`timeline`)
- Git 图 (`gitGraph`)

## 配置 (Configuration)

组件使用安全的默认配置初始化 Mermaid:

```typescript
mermaid.initialize({
  startOnLoad: false, // 手动控制
  theme: 'default', // 或 'dark', 'forest', 'neutral'
  securityLevel: 'loose', // 允许交互
  fontFamily: 'inherit', // 使用应用字体
  logLevel: 'error', // 减少控制台噪音
})
```

## 样式 (Styling)

组件包括:

- 响应式 SVG 尺寸
- 深色模式支持
- 悬停效果
- 可选的点击缩放
- 加载状态
- 错误样式

## 性能 (Performance)

- 仅在内容更改时渲染
- 取消过时的渲染请求
- 在 ContentRenderer 中记忆化
- 最小化重新渲染

## 故障排查 (Troubleshooting)

### 图表未渲染

- 检查浏览器控制台的语法错误
- 验证图表定义是否有效
- 确保已安装 mermaid 包

### 更新时图表消失

- 我们的实现应该已修复此问题
- 如果仍然存在,检查是否有冲突的 useEffect 钩子

### 多个图表冲突

- 确保每个图表都有唯一的 `id` 属性
- 检查页面中是否有重复的 ID

### 性能问题

- 限制图表复杂度
- 为图表定义使用记忆化
- 对于大量图表考虑延迟加载

## 技术实现细节 (Technical Implementation)

### 文件结构

```
src/components/ContentRenderer/
├── MermaidChart.tsx      # 稳定的 Mermaid 组件
├── index.tsx             # 更新的 ContentRenderer
└── styles.css            # Mermaid 样式
```

### 关键代码模式

#### 1. 初始化模式

```typescript
let mermaidInitialized = false

const initializeMermaid = () => {
  if (!mermaidInitialized) {
    mermaid.initialize({
      /* config */
    })
    mermaidInitialized = true
  }
}
```

#### 2. 渲染模式

```typescript
useLayoutEffect(() => {
  const renderChart = async () => {
    await mermaid.parse(chart) // 验证
    const { svg } = await mermaid.render(uniqueId, chart) // 渲染
    setSvgContent(svg) // 更新状态
  }

  renderChart()
}, [chart])
```

#### 3. 清理模式

```typescript
const abortControllerRef = useRef<AbortController | null>(null)

useLayoutEffect(() => {
  abortControllerRef.current = new AbortController()
  // ... 渲染逻辑 ...
  return () => {
    abortControllerRef.current?.abort()
  }
}, [chart])
```

## 集成到项目 (Integration)

### 步骤 1: 安装依赖

```bash
npm install mermaid
```

### 步骤 2: 导入组件

```tsx
import MermaidChart from './components/ContentRenderer/MermaidChart'
```

### 步骤 3: 在 ContentRenderer 中使用

```tsx
if (language === 'mermaid') {
  return <MermaidChart chart={codeContent} />
}
```

## 测试 (Testing)

创建测试用例验证稳定性:

```tsx
// 测试场景
1. 初始渲染
2. 动态内容更新
3. 同一页面多个图表
4. 错误处理
5. 重新渲染稳定性
```

## 最佳实践 (Best Practices)

1. **始终提供唯一 ID**: 对于静态图表使用描述性 ID
2. **记忆化图表定义**: 避免不必要的重新渲染
3. **验证语法**: 在生产环境前测试图表定义
4. **处理错误**: 显示用户友好的错误消息
5. **性能优化**: 对于大型图表考虑代码分割

## 参考资料 (References)

- [Mermaid 官方文档](https://mermaid.js.org/)
- [React + Mermaid 最佳实践](https://rendazhang.medium.com/why-mermaid-charts-disappear-in-react-and-how-to-fix-it-351545ef1ebc)
- [Mermaid GitHub Issues](https://github.com/mermaid-js/mermaid/issues)

## 更新日志 (Changelog)

### v1.0.0 (2025-10-02)

- ✅ 实现稳定的 MermaidChart 组件
- ✅ 集成到 ContentRenderer
- ✅ 添加完整的样式支持
- ✅ 支持深色模式
- ✅ 添加错误处理和加载状态
- ✅ 优化性能和清理机制

## 总结 (Summary)

该解决方案通过以下方式解决了 React 中 Mermaid 渲染的所有常见问题:

1. **API 驱动渲染**: 完全控制渲染过程
2. **唯一标识符**: 防止图表冲突
3. **适当的生命周期**: useLayoutEffect 和 AbortController
4. **错误边界**: 优雅的失败处理
5. **React 集成**: 与虚拟 DOM 完全兼容

现在你可以在 React 应用中自信地使用 Mermaid 图表,无需担心渲染不稳定的问题! 🎉
