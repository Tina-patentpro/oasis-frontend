> **归档说明**：本文档为历史归档资料，可能不代表当前实现与当前规范；请优先以仓库当前代码、docs/CHANGELOG.md、docs/api/ 与最新审计/计划文件为准。

# 四阶段行动计划（D21-D40）

## 📌 目标概述

- 巩固 P0-P3 的 OpenAPI 规范成果，补齐性能与体验短板。
- 构建监控、对外交付与治理机制，确保接口与前端体验长期可控。
- 每个冲刺以 4-6 天为节奏，产出可量化的交付物与指标。

## 🗂 阶段安排总览

| 阶段    | 时间范围 | 核心目标                   | 主要交付                                                  | 负责人 / 协作                   |
| ------- | -------- | -------------------------- | --------------------------------------------------------- | ------------------------------- |
| Stage A | D21-D24  | 性能与交互快赢             | Bundle 报告、懒加载清单、交互优化 changelog               | 前端主导 / DevOps 支援          |
| Stage B | D25-D28  | 渲染减载与监控基线         | 组件优化清单、Web Worker 工具、监控接入手册、CI 趋势报告  | 前端 + DevOps / 产品确认指标    |
| Stage C | D29-D34  | 文档站点与 Mock 体系运营化 | Redocly/Stoplight 站点、Mock & TS SDK 更新、交付指南、FAQ | 前端维护 / 后端 & 产品审阅      |
| Stage D | D35-D40  | 治理固化与网络体验         | 治理流程、评审日历、订阅机制、网络优化方案                | 前端牵头 / 后端＆运维＆产品协作 |

---

## Stage A（D21-D24）性能与交互快赢

**目标**：首屏体验和高频交互立刻可感知地提升。

- 路由级代码分割：Workspace、Settings、Projects、Chat 等模块按需加载。
- 重型组件懒加载：Cytoscape、KaTeX、Mermaid 等需动态 import，避免重复打包。
- 交互去抖/节流：ChatPanel 输入 250 ms 防抖、搜索/筛选节流。
- 列表体验：ProjectManagementCenter / 聊天历史引入虚拟滚动。
- 动画优化：NotificationCenter、Tooltip、菜单使用 transform/opacity 动画。
- Bundle 报告更新：修正双重导入，重新生成 `docs/perf/bundle-report-*.md`，在 CI 中设置 600 KB 红线。

**成功指标**

- 主包 < 600 KB，>500 KB chunk 数量为 0。
- ChatPanel 输入响应 < 150 ms。
- 大列表滚动帧率 ≥ 55fps。

---

## Stage B（D25-D28）渲染减载与监控基线

**目标**：稳定 UI 线程，建立性能与错误的第一手数据。

- 组件优化：对消息项、项目卡片等高频渲染组件应用 React.memo/useCallback/useMemo。
- requestAnimationFrame：流式生成/进度动画改为帧同步更新。
- Web Worker：将大文件哈希、复杂计算迁移至 Worker，提供通用工具模块。
- 监控接入：接入 Web Vitals、Sentry Performance，定义报警阈值。
- CI 趋势：扩展 `api:validate` 输出质量统计，生成 `api-quality-trend.json`。

**当前进展**

- ✅ `ChatPanel` 消息渲染与 `useStreamGenerate` 已完成帧同步与 memo 优化（详见 `docs/perf/STAGE-B-COMPONENT-OPTIMIZATION.md`）。
- ✅ 文件指纹计算迁移至 Web Worker，前端上传体验无阻塞。
- ✅ Sentry / Web Vitals 已部署，入门指南见 `docs/observability/STAGE-B-MONITORING-GUIDE.md`。
- ✅ `api-quality-trend.json` 由 `scripts/api/update-trend.mjs` 自动生成，并纳入 `api:validate`。

**成功指标**

- UI 交互路径 CPU 占用 < 40%。
- Web Vitals（FCP/LCP/CLS）首次上报并入库。
- Sentry 性能和错误告警阈值配置完成。

---

## Stage C（D29-D34）文档站点与 Mock 体系运营化

**目标**：对外交付标准化，确保契约在真实/模拟环境一致。

- 再发布：生成 Redocly/Stoplight 静态站点并纳入自动部署。
- Mock 覆盖：补充 SSE/WebSocket、批量下载、支付回调等复杂场景。
- TS SDK：增强错误处理、分页、重试与类型提示；补充示例。
- Delivery 指南：更新 `docs/api/DELIVERY-CHECKLIST.md`、FAQ、示例仓库。
- 指标公开：在站点展示 `api-quality-trend.json` 与最新 `api:validate` 状态。

**当前进展**

- ✅ `npm run api:docs` 生成的静态站点已落地（参见 `docs/api/site`），索引页聚合质量趋势。
- ✅ Mock Server (`npm run api:mock`) 覆盖 workflow 执行、聊天 SSE、支付回调、批量下载。
- ✅ TS SDK 新增 `src/api/sdk/workflows.ts`，提供分页、重试、流式监听等能力。
- ✅ 交付文档与 FAQ 已更新（`DELIVERY-CHECKLIST.md`、`INTEGRATION-FAQ.md`）。

**成功指标**

- 文档站点每日自动同步成功率 100%。
- Mock 覆盖关键场景 ≥ 90%，SDK 单测覆盖 ≥ 70%。
- 对外交付包生成耗时 < 10 分钟。

---

## Stage D（D35-D40）治理固化与网络体验

**目标**：建立可持续的 API 变更与体验治理机制。

- PR / 发布流程：PR 模板增加 `api:validate`、Web Vitals 勾选，完善审批流。
- 季度评审：制定评审日历与风险看板（SSE、支付、权限、安全）。
- 变更通知：上线 CHANGELOG 订阅机制，确保接口变更 100% 可追溯。
- 网络优化：推动 HTTP/2 + Brotli、CDN/图片懒加载、缓存策略。
- 安全与权限：季度复核 `SECURITY-GUIDE.md` 权限矩阵，记录调整。

**成功指标**

- 接口变更记录率 100%，季度回归通过率 ≥ 95%。
- Brotli/HTTP2 生效后首屏传输量再降 ≥ 15%。
- 风险看板更新频率 ≥ 每月一次。

---

## 风险跟踪与缓解

| 风险               | 描述                           | 缓解阶段    | 对策                                                |
| ------------------ | ------------------------------ | ----------- | --------------------------------------------------- |
| SSE/流式实现复杂   | 聊天消息流式传输易产生兼容问题 | Stage C & D | Mock 覆盖流式场景；FAQ 记录重连策略；风险看板跟踪。 |
| 工作流链式映射     | 参数映射规则需后端确认         | Stage C     | 文档站点提供映射示例并纳入契约测试；评审会更新。    |
| 支付回调依赖第三方 | 充值/退款需确认网关方案        | Stage B & D | 监控支付回调异常；完善签名流程并在 CHANGELOG 记录。 |
| 大文件处理压力     | 批量下载/压缩耗时              | Stage A & B | 异步批量下载接口设计；Web Worker 处理压缩/哈希。    |
| 权限策略同步       | 角色矩阵变化未同步             | Stage D     | 季度审查权限矩阵，更新 `SECURITY-GUIDE.md`。        |

---

## 立即行动项

1. 在 DevOps 看板登记 Stage A 任务，预约 bundle 阈值配置评审。
2. 分配 Stage A 技术责任人，准备懒加载与虚拟滚动的代码改动清单。
3. 与产品/后端确认 Stage B 监控指标和告警阈值。

> 本计划应于每个冲刺结束时更新一次，记录实际完成项、指标数据与滚动风险。
