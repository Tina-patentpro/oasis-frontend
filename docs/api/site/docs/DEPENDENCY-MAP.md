# 接口依赖图

最后更新：2025-10-22

| 模块                    | 直接依赖                                | 上游输入                                       | 下游输出/消费者                             | 备注                                       |
| ----------------------- | --------------------------------------- | ---------------------------------------------- | ------------------------------------------- | ------------------------------------------ |
| `workflows.yaml`        | `schemas/workflow-input.schema.json`    | 工作流配置服务、文件存储签名服务               | `projects.yaml`（执行记录）、前端工作流页面 | 依赖合约测试验证，执行结果通过通知中心推播 |
| `chatflows.yaml`        | `schemas/instruction.schema.json`       | 指令库服务、模型推理服务                       | `conversations.yaml`、通知中心              | 预览接口会调用模型服务与语料索引           |
| `conversations.yaml`    | `chatflows.yaml`、通知 WebSocket 网关   | SSE 网关、附件服务                             | `projects.yaml`（会话关联）、日志审计服务   | SSE 与轮询共存，需遵守限流策略             |
| `projects.yaml`         | `workflows.yaml`、`conversations.yaml`  | 项目服务、权限中心                             | 导出服务、仪表盘                            | 汇总数据依赖 Usage 服务与 Billing 成本中心 |
| `users-auth.yaml`       | 身份中心（IdP）、通知服务、偏好设置存储 | 邮件网关、短信网关                             | 所有业务模块（认证）、通知中心              | 登录与刷新接口是所有模块的安全前置         |
| `billing.yaml`          | 聚合支付网关、账务台账服务              | 支付渠道（支付宝/微信）、签名服务              | Usage 成本拆分、通知中心、项目预算          | 回调接口与签名验证暴露于外网               |
| `support-feedback.yaml` | 工单系统、知识库服务、奖励发放服务      | 邮件与消息推送                                 | Dashboard、小程序客服                       | 建议征集结果同步至路线图服务               |
| `usage-insights.yaml`   | 指标采集管道、数据仓库                  | Billing 成本、Workflows/Conversations 访问日志 | 仪表盘、预算告警                            | 与 Performance Metrics 文档共享指标来源    |
| `utilities.yaml`        | 偏好设置存储、版本发布服务、帮助中心    | 文档系统、数据导出服务                         | 前端工作区                                  | Visibility 配置提供给 INDEX.md D5 检查     |

## 数据流动说明

1. **认证链路**：所有模块（除 `billing/webhook`）都通过 `BearerAuth` 保护，依赖 `users-auth.yaml` 中的登录与渠道令牌。
2. **通知链路**：`workflows`、`billing`、`support-feedback` 的关键事件推送到通知中心，由 `users-auth.yaml` 的 `/api/notifications` 提供拉取/订阅。
3. **导出链路**：`projects.yaml`、`conversations.yaml`、`utilities.yaml` 均依赖统一的导出任务服务（`ExportTicket` Schema 一致）。
4. **成本链路**：`usage-insights.yaml` 的成本维度来自 `billing.yaml` 的交易数据，并结合 `workflows` 扣费记录。
