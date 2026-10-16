# Stage D 网络优化实施方案（HTTP/2 + Brotli + CDN + 图片懒加载）

## 概览

- **阶段目标**：服务端启用 HTTP/2 与 Brotli，结合 CDN 与图片懒加载，将首屏传输体积在现有基线上再降 ≥ 15%，并确保 Web Vitals 不回退。
- **时间窗口**：D35–D40（预计 6 周）。
- **牵头团队**：前端（体验指标），运维（协议与网络层），后端（API 压缩与缓存），产品（体验验收）。

## 基线指标（2025-10-24）

| 指标                               | 当前值        | 数据来源                                | 目标值           |
| ---------------------------------- | ------------- | --------------------------------------- | ---------------- |
| 首屏传输体积（HTML + 首屏 JS/CSS） | 34.23 kB gzip | `docs/perf/bundle-report-2025-10-21.md` | 再下降 ≥ 15%     |
| LCP (P75)                          | 2.6 s         | Web Vitals（Workspace）                 | ≤ 2.3 s          |
| INP (P75)                          | 180 ms        | Web Vitals                              | ≤ 200 ms（保持） |
| CLS (P75)                          | 0.05          | Web Vitals                              | ≤ 0.05（保持）   |

> 注：首屏体积指标将在 HTTP/2 + Brotli 生效后切换为「首包 + 首屏块总大小」并统一记录在 `docs/perf/`。

## 阶段实施计划

| 周次 | 里程碑           | 主要任务                                                                 | Owner             | 输出                                |
| ---- | ---------------- | ------------------------------------------------------------------------ | ----------------- | ----------------------------------- |
| D35  | 方案冻结         | 基准测试、协议兼容性评估、CDN 供应商确认                                 | DevOps            | 《HTTP/2 启用评估报告》、兼容性矩阵 |
| D36  | HTTP/2 预发      | 在预发布环境启用 HTTP/2，验证 SSE、下载链路                              | DevOps + Backend  | 预发验证记录、回退脚本              |
| D37  | Brotli 压缩上线  | API / 静态资产启用 Brotli（含 fallback），拉通缓存策略                   | Backend           | Nginx/网关配置、压缩率对比报告      |
| D38  | CDN + 图片懒加载 | 配置 CDN（含回源策略、HTTPS 证书），前端接入 IntersectionObserver 懒加载 | Frontend + DevOps | CDN 配置文档、前端 PR、监控告警     |
| D39  | 指标验证         | WebPageTest + RUM 数据对比，确认首屏体积/LCP                             | Frontend + QA     | 验证报告、问题清单                  |
| D40  | 收尾与复盘       | 输出《Stage D 网络优化总结》，更新风险看板                               | 全员              | 总结报告、SLA 更新                  |

## 技术实施细节

### 1. HTTP/2

- 在网关（Nginx / Envoy）开启 `http2`，同时保留 `listen 443 ssl http2` 与 `listen 443 ssl` 作为回退。
- 校验：
  - SSE 响应是否存在头部合并/压缩问题。
  - 下载接口（ZIP/CSV）在分帧后是否触发浏览器兼容性问题（IE/老旧 Edge 需回退）。
- 监控：
  - 启用 `http2_streams`、`http2_reset` Prometheus 指标。
  - 将错误率阈值配置为 0.5%；超出自动回退到 HTTP/1.1。

### 2. Brotli 压缩

- 对静态资源使用 `brotli_static on;` 并保留 gzip 作为 fallback。
- API 响应：按 `Content-Type` 白名单启用（JSON、JS、CSS、SVG），对 SSE/文件下载禁用。
- 检查 `Accept-Encoding` 列表，确保移动端老旧浏览器能回退 gzip。
- 构建流程在 `vite.config.ts` 中添加 Brotli 产物生成（可启用 `build.brotliSize = true`）。

### 3. CDN

- 选型要求：支持 HTTP/2 + Brotli 回源、SSE/长连接白名单、国内多节点。
- 配置建议：
  - 静态资源缓存 7 天，HTML 缓存 1 分钟（Stale-While-Revalidate）。
  - 将 `/api/` 路由保持直连源站，避免动态请求被缓存。
  - 自定义 Header：`X-Cache-Status`、`X-Request-ID`，用于链路追踪。
- 异常回退：提供 `cdn-disable` 开关（环境变量或启动参数），紧急情况下快速切换至源站。

### 4. 图片懒加载

- 统一封装 `LazyImage` 组件，使用 `IntersectionObserver`，并在低端设备回退到渐进式加载。
- 默认启用 `loading="lazy"`（兼容浏览器）。
- 对关键首屏图片设置 `priority`，利用 `<link rel="preload">` 提前拉取。
- 建立图片体积分级策略：> 300 kB 的图片必须提供 WebP/AVIF 版本。

## 度量与验证

- 在 PR 模板勾选 Web Vitals 后，需附上对应监控面板链接或截图。
- `npm run perf:lighthouse`（待实现脚本）用于比较部署前后得分；报告归档至 `docs/perf/reports/`。
- HTTP/2/Brotli 生效后，使用 `curl -I --http2` 与 `curl --compressed` 验证响应头。
- CDN 命中率、回源带宽统计每周记录在 `docs/perf/network-metrics/`。

## 风险与应对

| 风险                                | 级别 | 应对措施                                                   |
| ----------------------------------- | ---- | ---------------------------------------------------------- |
| HTTP/2 对 SSE 兼容性存在隐患        | 高   | 预发环境强制压测，保留 HTTP/1.1 回退脚本；设置滚动发布窗口 |
| Brotli 压缩影响 CPU 占用            | 中   | 采用静态预压缩，API 端口设定压缩级别 ≤ 5；监控 CPU 阈值    |
| CDN 供应商切换导致证书/域名配置复杂 | 中   | 预先申请通配符证书并验证配置，准备工单模板                 |
| 图片懒加载引发 CLS                  | 低   | 组件默认设置占位尺寸，必要时使用渐进式占位图               |

## 交付清单

- 更新后的运维配置与脚本（存放于 `run/ops/http2-brotli/`）。
- 前端懒加载组件与埋点（对应 PR 需链接到 Stage D 风险看板）。
- 指标验证报告与对比截图。
- Stage D 网络优化总结（D40），纳入季度评审材料。
