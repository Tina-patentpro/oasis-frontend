# 安全性补充指南

最后更新：2025-10-22

## 认证与授权

- 统一使用 **Bearer JWT**（参见 `users-auth.yaml`）。
- 访问令牌有效期：60 分钟；刷新令牌有效期：30 天。
- 每次登录/刷新都会返回 `mfaRequired` 标识。若为 `true`，必须完成 `/api/auth/2fa/verify`。
- 后端在响应头返回 `X-Request-Id`，前端需在日志中带上以便排查。

## 传输安全

- 所有接口必须使用 HTTPS。
- SSE 与 WebSocket 连接通过 `/api/notifications/channel-token` 下发一次性签名，过期时间 <= 5 分钟。
- 下载链接采用 **预签名 URL**（参见 `workflows.yaml`、`billing.yaml`），有效期 120 秒。

## 请求签名

- 支付相关接口（`billing.yaml`）需要 `signature`、`nonce`、`timestamp`。
- 签名算法：`HMAC-SHA256`，签名内容为 `timestamp + nonce + payload`。
- 客户端需缓存最近 20 个 `nonce`，避免重放。

## 限流与配额

- 全局限流策略：
  - 标准用户：`120 requests / minute`
  - 系统集成：`600 requests / minute`
- SSE 流连接：单用户最多 3 个并发连接。
- 当达到 80% 限制时，返回 `429` 并在响应头携带 `Retry-After`。

## 数据保护

- 敏感字段（手机号、身份证等）在响应中脱敏展示。
- 日志中禁止记录完整 Token、签名、银行卡号。
- 对象存储上传采用 **STS** 短期凭证；客户端下载使用临时 URL。

## 审计与告警

- 关键操作（充值、权限变更、导出数据）写入审计日志，保留 180 天。
- 安全异常（多次登录失败、刷新令牌重复使用）触发通知：调用 `/api/notifications` 并发送邮件。
- 建议在前端集成 CSP 与 Subresource Integrity，减少脚本注入风险。

## 文档要求

- 新增接口需在 OpenAPI 中标记 `security` 字段。
- 如接口需要额外权限（如管理员），使用 `x-required-role` 扩展字段标注。
- 安全限制更新后需同步 `CHANGELOG.md` 与 `README.md`。
