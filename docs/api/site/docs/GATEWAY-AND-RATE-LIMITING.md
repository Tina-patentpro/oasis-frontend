# 网关与限流策略（D6）

最后更新：2025-10-22  
目标：为工作区 API 制定统一的网关接入、速率限制与流控方案，防止滥用并保障关键接口 SLA。

## 1. 体系架构

```
Client -> API Gateway (WAF + Rate Limit) -> Service Mesh / Backend Services
                      |--> Metrics & Alerting (Prometheus + Grafana)
                      |--> Audit Log (ELK)
```

- **API Gateway**：推荐采用 Nginx APISIX / Kong，支持插件化限流、认证、熔断。
- **WAF**：启用基础 OWASP 规则，拦截常见攻击（SQLi、XSS）。
- **熔断/降级**：网关检测后端状态异常时，可返回静态响应或引导用户稍后重试。

## 2. 限流策略

| 类别     | 使用场景                         | 配额          | 策略说明                                                              |
| -------- | -------------------------------- | ------------- | --------------------------------------------------------------------- |
| 全局用户 | 常规 API（工作流、项目、会话等） | 120 req/min   | 令牌桶（Token Bucket），超出返回 `429` 并附 `Retry-After`。           |
| 系统集成 | 经审批的后台服务账号             | 600 req/min   | 独立限流键，需在 `users-auth.yaml` 中标记 `role=system-integration`。 |
| SSE 连接 | 会话流式接口                     | 同时最多 3 个 | 网关维护连接计数，超出时拒绝并返回错误码 `CV-429-02`。                |
| 文件下载 | 工作流/导出附件                  | 30 req/min    | 结合预签名 URL 验证，拦截短时间大量下载行为。                         |
| 支付回调 | 第三方支付网关                   | 60 req/min/IP | 防止恶意重放或 DoS，异常时记录审计并通知财务。                        |

- 限流键构成：`{environment}:{clientType}:{userId or tokenId}:{pathGroup}`
- 对于高价值接口（如 `POST /api/workflows/{id}/execute`），建议叠加 **并发限制**（每用户最多 3 并发执行）。

## 3. 策略配置示例（APISIX）

```yaml
routes:
  - uri: /api/*
    plugins:
      authz-keycloak:
        discovery: https://idp.demo-platform.cn/auth/realms/oiw/.well-known/openid-configuration
      limit-count:
        count: 120
        time_window: 60
        key_type: custom
        key: '$consumer_id-$remote_addr'
        rejected_code: 429
      limit-conn:
        concurrency: 3
        rejected_code: 429
        key_type: custom
        key: '$consumer_id'
```

> 需根据实际网关产品调整配置；上述示例仅表达关键参数。

## 4. 监控与告警

- 指标：`requests_total`、`429_total`、`latency_p95`、`active_connections`。
- 告警阈值：
  - `429` 占比连续 5 分钟 > 5%：告警给后端值班。
  - SSE 连接接近上限（>90%）：提醒扩容或调优客户端策略。
  - 支付回调失败率 > 1%：通知财务与运维。
- 日志：记录限流触发事件，并包含 `userId`、`path`、`correlationId`。

## 5. 与文档联动

- `SECURITY-GUIDE.md`：同步限流策略摘要与通知流程。
- `PERFORMANCE-METRICS.md`：若限流影响目标 SLA，需调整目标或增加说明。
- `BUSINESS-RULES.md`：描述限流错误码、提示文案策略。
- OpenAPI：在相应路径的响应中补充 `429` 描述，并注明限流策略。

## 6. 推进计划

1. **D6**：完成策略文档、与运维确认可行性，依据本文档评审。
2. **D7**：在测试环境部署网关策略，模拟压测验证。
3. **D8**：生产环境灰度发布（10% -> 50% -> 100%），观察暴露风险。
4. **持续**：每季度回顾配额，结合业务增长调优。

如需调整，请在 `CHANGELOG.md` 记录版本号，并在例会上同步。
