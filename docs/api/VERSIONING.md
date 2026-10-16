# API 版本管理策略

最后更新：2025-10-22

## 版本号规范

- **语义化版本号** `MAJOR.MINOR.PATCH`
  - **MAJOR**：向后不兼容的接口变更（字段删除、语义变更等）。
  - **MINOR**：向后兼容的新功能（新增路径/字段、可选参数）。
  - **PATCH**：向后兼容的缺陷修复或文档更新。
- OpenAPI 文档中的 `info.version` 必须与对外发布版本保持一致。
- 同一主版本内保证向后兼容（业内 SLA：12 个月）。

## 发布节奏

- 常规发布：每月第一周（可包含 MINOR + PATCH）。
- 快速修复：按需发布 PATCH，不晚于问题确认后 48 小时。
- 重大升级（MAJOR）：每半年评审一次，提前 60 天发布迁移指南。

## 兼容性与弃用策略

- 新增字段默认标记为 **可选**；标记为必填需同时提供迁移周期。
- 弃用字段使用 `x-deprecated` 并在 `CHANGELOG` 中给出替代方案。
- 弃用周期：宣布后 90 天内继续接受请求，但响应包含 `Warning` header。
- 对于关键 Breaking Change，提供 Shadow API 或版本前缀（如 `/v2`）共存至少 2 个发布周期。

## 文档与自动化要求

- 发布前更新：
  - `CHANGELOG.md`
  - 相关 OpenAPI 文件的 `info.version`
  - `INDEX.md` 对应条目
- 发布后 24 小时内：
  - 更新 `PERFORMANCE-METRICS.md` 中的最新监控数据
  - 发送版本通知（参见 `SECURITY-GUIDE.md` 中的通知要求）
- 所有主版本变更需通过自动化合约测试（如 `contracts/workflows-contract.test.js`）验证。

## 版本回滚

- 支持通过 `rolloutPercentage` 控制灰度发布，回滚时快速恢复旧版本。
- 回滚后补充 `CHANGELOG` 附录，说明影响范围与修复计划。
