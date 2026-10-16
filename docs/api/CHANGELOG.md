# API 文档变更记录

> Stage D 要求：任何接口改动必须在合并前更新本文件，并通过订阅机制通知相关团队。缺失记录的 PR 不得合并。

## v0.1 (规划阶段)

- 初始化目录结构与维护原则。
- 新增 OpenAPI 模板（templates/openapi-template.yaml）。
- 新增通用错误码、权限矩阵模板。
- 建立接口任务计划（task-plan.md）。
- 完成工作流模块接口草案（workflows.yaml）及示例输入 schema（schemas/workflow-input.schema.json）。
- 新增接口索引（INDEX.md）和开放问题列表（open-questions.md）。
- 待补充：评审纪要、其它模块接口草案。

## v0.2 (D3 草案扩展)

- 新增对话流模块接口草案（chatflows.yaml），覆盖提示词配置、指令关联与发布流程。
- 新增会话中心接口草案（conversations.yaml），明确 SSE 流式响应与导出能力。
- 增补指令模板 JSON Schema（schemas/instruction.schema.json），并修正 workflow 输入 schema 元信息。
- 引入工作流合约测试（contracts/workflows-contract.test.js），校验核心路径与 schema 结构。
- 调整 workflows.yaml `$ref` 写法，确保 OpenAPI 结构可被解析。

## v0.3 (D4 支撑文档)

- 新增项目、认证、账务、通用工具、客服与统计等接口草案（projects/users-auth/billing/utilities/support-feedback/usage-insights）。
- 补充工作流多语言示例（docs/api/examples/workflows 下 curl/JS/Python 脚本）。
- 输出版本策略、接口依赖图、错误处理、安全指南与性能指标文档。
- 在核心接口中标注 `x-performance` 扩展字段，明确目标 SLA。

## v0.4 (D5 自检)

- 更新 INDEX.md，补充 Visibility/Owner 列并填充所有设计目标映射。
- 新增 BUSINESS-RULES.md 与 DELIVERY-CHECKLIST.md，记录业务约束与打包步骤。
- 将性能指标写入 PERFORMANCE-METRICS.md，并在关键接口增加 扩展。
- README.md 列出全部已完成文档，便于评审汇总。

## v0.5 (D6 扩展)

- 新增 API 设计评审清单（API-REVIEW-CHECKLIST.md），规范评审流程。
- 输出网关与限流策略草案（GATEWAY-AND-RATE-LIMITING.md），指导运维部署。
- 编写文档自动化方案（Automation.md），明确 CI/CD 集成步骤。
- 更新 README、task-plan、delivery 清单等文档以纳入 D6 成果。
