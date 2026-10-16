# Stage B 监控接入手册（D25-D28）

## 🎯 本轮目标

- 在前端初始化阶段引入 Sentry，采集错误和性能事务。
- 捕获 Core Web Vitals（FCP/LCP/CLS/INP/TTFB），并把指标发送到 Sentry / 控制台。
- 明确可调节的采样率、标签以及本地调试开关。
- 产出运行说明，方便 DevOps 后续配置阈值与仪表盘。

## 🧩 架构概览

```
app bootstrap ──► initMonitoring()
                   ├─ 动态加载 @sentry/browser（仅当配置了 DSN）
                   │    ├─ BrowserTracing：记录路由跳转耗时
                   │    └─ Replay（可选）：收集重放
                   └─ 动态加载 web-vitals
                         └─ onCLS/onFID/onLCP/onFCP/onINP/onTTFB → captureMessage
```

> 运行时所有监控逻辑都通过 `src/monitoring/index.ts` 管理，默认在生产环境启用，开发环境保留控制台输出。

## ⚙️ 环境变量 & 采样率

| 变量名                                    | 说明                                  | 示例值 / 默认值                    |
| ----------------------------------------- | ------------------------------------- | ---------------------------------- |
| `VITE_SENTRY_DSN`                         | Sentry 项目 DSN，缺省则完全跳过初始化 | `https://xxx.ingest.sentry.io/123` |
| `VITE_SENTRY_ENV`                         | 自定义环境标签                        | `production` / `staging`           |
| `VITE_SENTRY_TRACES_SAMPLE_RATE`          | 性能事务采样率                        | `0.1`（默认 10%）                  |
| `VITE_SENTRY_REPLAYS_SESSION_SAMPLE_RATE` | Replay 正常会话采样率                 | `0.0`（默认关闭）                  |
| `VITE_SENTRY_REPLAYS_ERROR_SAMPLE_RATE`   | Replay 错误会话采样率                 | `1.0`                              |
| `VITE_MONITORING_TAGS`                    | JSON 字符串，批量写入自定义 tag       | `{"app.segment":"workspace"}`      |
| `VITE_ENABLE_WEB_VITALS`                  | 是否采集 Web Vitals（`false` 可禁用） | `true`                             |

> 所有变量均在 `src/env.d.ts` 注册，可通过 `import.meta.env` 访问。

## 📦 代码入口

1. `src/main.tsx` —— 在 React 渲染前调用 `initMonitoring()`；
2. `src/monitoring/index.ts` —— 动态加载依赖、采集 Web Vitals、提供 `reportError`；
3. `src/components/ErrorBoundary.tsx` —— 捕获渲染错误并委托给 `reportError`；
4. `package.json` —— 新增依赖 `@sentry/browser` 与 `web-vitals`。

## 📊 Web Vitals 上报策略

- Web Vitals 模块只在 `VITE_ENABLE_WEB_VITALS !== 'false'` 时加载；
- 每个指标以 `web-vital:<NAME>` 的形式调用 `captureMessage`，附带 `value/delta/rating/id`；
- 在开发模式下若未配置 DSN，会退化为 `console.info` 便于本地调试；
- 所有指标均开启 `reportAllChanges`，适合长会话应用持续观测。

## 🚨 告警建议

| 指标       | 参考阈值   | 告警策略                             |
| ---------- | ---------- | ------------------------------------ |
| LCP        | `> 2.5s`   | 新增 Issue 或通知性能负责人          |
| CLS        | `> 0.1`    | 标记为 warning，结合页面截图回放排查 |
| INP        | `> 200ms`  | 与交互热点（Chat、项目页）联动       |
| 自定义错误 | 捕获率上升 | 对照 Release 版本快速定位回归        |

## ✅ 验收清单

- [x] 生产环境（有 DSN）启动后可在 Sentry 看到错误与事务；
- [x] 可通过环境变量调整采样率且无需二次构建；
- [x] Web Vitals 会生成结构化事件（或在 DEV 控制台打印）；
- [x] ErrorBoundary 已将 component stack 等上下文回传 Sentry；
- [x] 文档记录落地步骤与告警建议（本文件）。

如需进一步接入自建指标平台，可在 `initMonitoring` 内增加 `fetch` 或 `navigator.sendBeacon` 逻辑，复用当前的指标回调即可。
