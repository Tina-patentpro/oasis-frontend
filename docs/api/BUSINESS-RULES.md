# 业务规则说明（D5 自检）

最后更新：2025-10-22

## Workflows

- `WorkflowExecutionRequest.inputs`：必须符合 `inputSchema`，后端执行前做 JSON Schema 验证，失败返回 `WF-400-01`。
- `attachments[].fileId`：需来自安全上传服务返回的 ID；校验归属后才允许调度。
- `presetId`：若填写，必须引用 `/api/workflow-presets` 返回的 ID，且预设与当前工作流兼容。
- `workflows.yaml` 中链式调用 `mappingRules.transform` 支持 JSONPath 与默认值表达式（`{{step.output.field | default("")}}`）。
- 执行记录 `status` 进入 `failed` 时，`error.code` 必填，供前端展示与排障。

## Chatflows & Conversations

- `ChatflowInstructionRef.visibility` 必须符合账户权限；个人模板不可标记为 `system`。
- `ChatflowInputChannel.type = structured` 时 `schema` 必须引用合法 JSON Schema。
- `SendMessageRequest.role` 仅允许 `user/system`；若前端尝试伪造 `assistant`/`tool`，后端直接拒绝。
- SSE 订阅需带 `messageId`，与 `POST /messages` 返回保持一致；断连后使用 `Last-Event-ID` 续传。
- 会话关联项目：若项目已归档，则 PATCH 请求返回 `CV-409-02` 并提示切换项目。

## Projects

- `visibility=organization` 仅管理员可设置；普通用户创建项目默认 `team`。
- 删除项目 (`DELETE`) 默认软删除，只有管理员且 `force=true` 时才执行硬删除。
- `members[].role`：同一个项目必须存在且仅存在一个 `owner`；提升/降级需具备管理员权限。
- 导出任务默认排除私密备注，除非显式传入 `includePrivateNotes=true`。

## Users & Auth

- 登录时如开启 MFA，`mfaRequired=true` 且需在 5 分钟内完成 `/api/auth/2fa/verify`，否则 Refresh Token 作废。
- `/api/users/me/preferences` 更新时仅允许修改自身属性，管理员也不可替他人修改。
- 通知读取接口使用乐观锁，批量更新时服务端会忽略不存在或已读的 ID 并返回 204。
- `/api/notifications/channel-token` 返回的 token 仅限单次连接，重复使用返回 `UA-401-05`。

## Billing

- 创建充值订单金额最小 1 元，最大 50000 元；超过阈值返回 `BI-400-01`。
- 支付回调 `nonce` 在 5 分钟内不得重复，重复调用返回 400 并忽略。
- 退款金额不得超过原交易，且仅允许在成功状态下发起。
- `billing/usage` 以账务台账为准，若账单处于对账中则 `status=pending`。

## Utilities

- 数据导出任务生成的下载链接有效期 24 小时，过期需重新申请。
- Visibility 配置中至少保留一个模块可见，否则返回 `UT-400-01`。
- 主题设置仅影响当前用户；若默认 `system`，前端需监听操作系统主题变化。

## Support & Feedback

- 工单 `status=resolved` 后 72 小时自动转为 `closed`，仍可重新开启但会记录为新历史节点。
- 建议征集活动若 `reward` 非空，提交时需校验用户是否满足活动资格（后端判断返回 `SF-403-03`）。

## Usage Insights

- `/api/usage/anomalies` 返回的 `deviation` > 0.2 触发前端告警提示。
- 导出任务默认按选择的 `metrics` 字段导出，未指定时导出 `requests` 与 `latency`。
