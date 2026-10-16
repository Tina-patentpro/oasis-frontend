# 性能指标基线

最后更新：2025-10-22  
数据来源：预估目标值，实际运行后需由监控系统回填。

| 模块/接口                                     | 指标                   | 目标值   | 说明                                       |
| --------------------------------------------- | ---------------------- | -------- | ------------------------------------------ |
| `POST /api/workflows/{workflowId}/execute`    | P95 响应时间           | ≤ 2.0 s  | 主要受模型响应影响，启用并发限制（3 并发） |
|                                               | 成功率                 | ≥ 99.5 % | 以周为统计周期                             |
| `GET /api/workflow-executions/{id}/progress`  | 轮询延迟               | ≤ 300 ms | 限制每个客户端 1 秒最多 1 次               |
| `POST /api/conversations/{id}/messages`       | 首字增量时间（TTFT）   | ≤ 1.2 s  | SSE 首个 `chunk` 时间                      |
| `GET /api/conversations/{id}/messages/stream` | 断线重连恢复           | ≤ 5 s    | 通过 `Last-Event-ID` 支持断点续传          |
| `GET /api/projects`                           | P95 响应时间           | ≤ 300 ms | 缓存最近 5 分钟                            |
| `POST /api/billing/top-ups`                   | 与支付网关交互超时时间 | 8 s      | 超时后自动重试 1 次                        |
| `POST /api/billing/webhook`                   | 处理延迟               | ≤ 500 ms | 保证支付渠道重试前完成处理                 |
| `GET /api/notifications`                      | P95 响应时间           | ≤ 200 ms | 默认返回 20 条                             |
| `POST /api/utilities/export/data`             | 任务排队等待（P90）    | ≤ 30 s   | 依赖后端异步任务系统                       |
| `GET /api/usage/summary`                      | P95 响应时间           | ≤ 400 ms | 支持缓存；数据每日批量写入                 |

## 指标维护流程

1. 发布新版本时验证是否新增关键接口，如有则补充表格。
2. 将指标同步到监控系统：Grafana Dashboard + Prometheus 告警。
3. 当实际数据超过目标值 10% 时，标记为 **⚠️** 并创建改善任务。
4. D5 自检需确认本表已更新，且与 `INDEX.md` 中的覆盖项一致。
