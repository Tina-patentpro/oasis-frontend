# Bundle 性能报告（Stage A 更新）

## 更新时间: 2025-10-24 10:40

## 📊 关键指标快照

| 指标                    | 2025-10-21 基线 | 2025-10-24                           | 变化    | 状态                |
| ----------------------- | --------------- | ------------------------------------ | ------- | ------------------- |
| 主入口 `index` chunk    | 2,262.22 kB     | 108.58 kB                            | ↓ 95.2% | ✅ 明显下降         |
| `ui-vendor` chunk       | -               | 115.48 kB                            | 新增    | ✅ 控制在 200 kB 内 |
| `markdown-vendor` chunk | -               | 570.45 kB                            | 新增    | ⚠️ 靠近 600 kB 阈值 |
| `react-vendor` chunk    | -               | 931.39 kB                            | 新增    | 🔶 需进一步拆分     |
| `diagram-vendor` chunk  | -               | 2,322.01 kB                          | 新增    | 🔴 超出 600 kB 红线 |
| gzip 主入口             | 717.32 kB       | 34.23 kB                             | ↓ 95.2% | ✅                  |
| >600 kB 警告 chunk 数量 | 3               | 2 (`react-vendor`, `diagram-vendor`) | -33%    | ⚠️ 仍需治理         |
| 构建时间                | 8.75 s          | 8.89 s                               | +0.14 s | ✅ 稳定             |

> 说明：引入按需分包后，首屏入口体积显著下降，但 `mermaid` 仍然独占一个 2.3 MB 的图表包，需要在后续阶段进一步治理。

## ✅ Stage A 快速行动回顾

- **路由级代码分割**：`WorkspaceApp` 现通过 `React.lazy` 延迟加载，首屏仅保留导航壳。
- **弹窗去重**：`AssociateProjectDialog` 仅在 `Suspense` 下懒加载，消除构建时的 “静态 + 动态” 双重导入告警。
- **交互优化**：`ChatPanel` 新增 250 ms 防抖与即时刷写，确保发送前自动 flush；列表滚动保持平滑。
- **虚拟滚动引入**：`ProjectManagementCenter` 的客户列表、时间轴采用 `VirtualList`，渲染压力与 DOM 数量显著降低。
- **Toast 动画调整**：统一改为 `transform`+`opacity` 动画，避免布局抖动并启用 GPU 加速。
- **构建预警**：`vite.config.ts` 设置 `chunkSizeWarningLimit = 600` 并自定义 `manualChunks`，为后续治理建立红线。

## 📦 当前 Bundle 结构（2025-10-24）

### Chunk 体积 Top 8

| 名称                          | 体积            | gzip      | 说明                                  | 处理情况                        |
| ----------------------------- | --------------- | --------- | ------------------------------------- | ------------------------------- |
| `diagram-vendor-BjQmoohv.js`  | **2,322.01 kB** | 662.03 kB | `mermaid` 全量 ESM                    | ❗ 待拆分/外载（Stage B）       |
| `react-vendor-BzBGpp40.js`    | 931.39 kB       | 323.16 kB | React + React Router                  | ⚠️ 计划拆分出 Router 子 chunk   |
| `markdown-vendor-B6wM5UG-.js` | 570.45 kB       | 169.78 kB | `react-markdown` + `remark` + `katex` | ⚠️ 接近红线，考虑进一步延迟加载 |
| `ui-vendor-QpADI1Sg.js`       | 115.48 kB       | 38.12 kB  | `framer-motion`、`lucide-react`       | ✅ 控制在安全区                 |
| `index-BVgNpjkl.js`           | 108.58 kB       | 34.23 kB  | 业务主入口                            | ✅                              |
| `SettingsPanel-BqMBo50A.js`   | 32.65 kB        | 8.40 kB   | 设置弹窗                              | ✅ 懒加载                       |
| `ProjectPage-CB2wdUIC.js`     | 32.42 kB        | 9.16 kB   | 项目详情弹窗                          | ✅ 懒加载                       |
| `index-jk0qnDGb.js`           | 36.62 kB        | 11.49 kB  | 共用逻辑                              | ✅                              |

### 依赖分类占比

| 分类                  | 现状     | 说明                                                                        |
| --------------------- | -------- | --------------------------------------------------------------------------- |
| **主入口 / UI 壳**    | ~145 kB  | 路由 + 基础组件，已达标                                                     |
| **UI 动效**           | ~115 kB  | `framer-motion`、图标等，只在需要时加载                                     |
| **Markdown/公式渲染** | ~570 kB  | 涵盖 `react-markdown`、`remark-*`、`rehype-*`、`katex`，后续考虑按需 import |
| **图表渲染**          | 2,322 kB | `mermaid` 仍为最大瓶颈                                                      |
| **React 核心**        | 931 kB   | React 19 + Router + Scheduler，需要进一步分析可否拆出 Router/DOM            |

## ⚠️ 风险与下一步

1. **Mermaid 图表包仍超 600 kB**
   - 计划：改为动态 `import('mermaid/dist/mermaid.esm.min.mjs')` 并按图表类型懒加载；评估迁移到 CDN 按需注入。
2. **React vendor 仍偏大**
   - 计划：将 `react-router-dom`、`zustand` 等拆分为独立 chunk，评估 `preact/compat` 替换的可行性。
3. **Markdown vendor 接近红线**
   - 计划：将 `katex`、`remark-math` 迁移为懒加载（只在首次渲染数学公式时加载），同时监控真实使用率。
4. **CI 报告**
   - 当前仍有 2 条 chunk 警告，已在 Stage B 上报为必须解决项。

## 🎯 优化建议与实施方案

### Phase 1: 立即可行的优化 (本周内)

#### 1. 修复双重导入问题

```typescript
// 当前问题: AssociateProjectDialog 被静态和动态导入
// 建议: 统一为懒加载，移除ChatPanel的静态导入
```

#### 2. 图表库按需加载

```typescript
// 为大型图表组件添加条件加载
const HeavyChart = lazy(() => import('./charts/HeavyImplementation'))
```

#### 3. 字体资源优化

```typescript
// KaTeX字体仅在数学公式渲染时加载
const MathRenderer = lazy(() => import('./MathRenderer'))
```

### Phase 2: 深度分包策略 (下周期)

#### 手动分包配置建议

```typescript
// vite.config.ts 新增配置
rollupOptions: {
  output: {
    manualChunks: {
      'vendor-diagram': [
        'mermaid',
        'cytoscape',
        'cytoscape-cola',
        'cytoscape-cose-bilkent',
        'dagre'
      ],
      'vendor-fonts': ['katex/dist/katex.min.css'],
      'vendor-heavy-components': [
        // 大型组件路径
      ]
    }
  }
}
```

### Phase 3: 运行时优化 (中期目标)

#### 预加载策略

```typescript
// 空闲时预加载常用组件
useIdlePreload(() => {
  import('./common/Charts') // 预热chart相关
  import('./common/Math') // 预热数学渲染
})
```

## 🎯 下一阶段优化路线（与 STAGE 计划同步）

### Stage B（D25-D28）— 大型依赖拆分

- **Mermaid**：改为 `await import('mermaid/dist/mermaid.esm.min.mjs')`，并提供 CDN fallback，渲染前 Lazy 初始化。
  ```typescript
  const loadMermaid = async () => {
    const mod = await import('mermaid/dist/mermaid.esm.min.mjs')
    return mod.default ?? mod
  }
  ```
- **React Vendor 拆分**：将 `react-router-dom`、`scheduler`、`history` 等拆到 `routing-vendor`，为 React 核心预留 600 kB 内限制。
- **Markdown 按需加载**：首次检测到公式/Markdown 时动态加载 `remark-math`、`rehype-katex`，并支持缓存。

### Stage C（D29-D34）— 运行时体验

- 为图表类组件提供骨架屏；在空闲时间预加载常用弹窗。
- `MermaidChart` + `MarkdownViewer` 添加加载态与错误兜底，保证首屏体验。
- 接入 bundle 报告自动化：打包后输出 `bundle-report.json`，供 CI 上传/可视化。

### Stage D（D35-D40）— 监控与守门

- 将 `npm run analyze` 纳入 CI，超过 600 kB 自动失败。
- 引入 Web Vitals + Sentry Performance，记录首包下载时间、JS 执行时间。
- 建立季度 bundle 审查例会，与 API 改动同步。

## 📈 新的性能目标

| 时间    | 指标                  | 目标                             |
| ------- | --------------------- | -------------------------------- |
| 10 月底 | `diagram-vendor`      | < 900 kB 或外载                  |
| 10 月底 | `react-vendor`        | < 600 kB                         |
| 11 月中 | Markdown 懒加载覆盖率 | 100%（无公式页面不加载 `katex`） |
| 11 月底 | 首屏 FCP              | < 1.8 s（Web Vitals 基线）       |
| 12 月   | 入口 JS 总量          | < 450 kB                         |

## 🔍 监控建议

1. **Bundle 趋势**：保留 `dist/stats.json` 并上传到性能面板。
2. **Chunk 使用率**：在运行时记录 `import()` 的命中情况，识别长期未用的 chunk。
3. **缓存命中率**：结合 Service Worker 统计，确保懒加载资源二次访问命中率 >80%。

推荐工具：`vite-bundle-analyzer`（分析一次）、`webpack-bundle-analyzer`（兼容导出）；运行监控建议使用 `@vercel/analytics` + `Sentry Performance`。

## 📋 执行状态看板

| 任务                  | Stage   | 状态      | 备注                   |
| --------------------- | ------- | --------- | ---------------------- |
| 路由懒加载 / 对话防抖 | Stage A | ✅ 完成   | 首屏体积下降 95%       |
| 手动分包策略          | Stage A | ✅ 完成   | 引入 chunk 红线        |
| Mermaid 动态加载      | Stage B | ⏳ 计划中 | 拆出大于 600 kB chunk  |
| Markdown 懒加载       | Stage B | ⏳ 计划中 | 减轻 `markdown-vendor` |
| Bundle 守门人 CI      | Stage D | ⏳ 待落地 | 超限自动阻断           |

## 🎯 结论

- Stage A 已显著压缩首屏入口，并完成懒加载、虚拟滚动等快速收益项。
- 现阶段最大风险来自 `mermaid` 与 `react-vendor` 的超标，需要在 Stage B 针对性拆分。
- 在保持 600 kB 红线的同时，通过持续监控和自动化守门，确保性能回退可见、可控。
- 下一步：按照 Stage B 的计划推进 Mermaid 外载 / 按需加载，同时完善 bundle 趋势报告。
