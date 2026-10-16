# API 规范目录

本目录用于沉淀前后端协作所需的 API 定义与配套资料，确保《网站设计目标说明.md》及前端功能映射的需求都可以映射到可执行的接口清单。

## 结构说明

- README.md：目录说明（当前文件）
- CHANGELOG.md：接口文档版本记录
- templates/：OpenAPI 模板、错误码、权限矩阵等基础规范
- workflows.yaml：工作流模块接口草案（已更新）
- chatflows.yaml：对话流模块接口草案（已完成）
- projects.yaml：项目管理模块接口（已完成）
- conversations.yaml：会话历史及流式接口（已完成）
- users-auth.yaml：用户认证与通知接口（已完成）
- billing.yaml：充值、消费、退款接口（已完成）
- utilities.yaml：工作台辅助功能接口（已完成）
- support-feedback.yaml：建议征集与客服工单接口（已完成）
- usage-insights.yaml：使用统计与指标接口（已完成）
- VERSIONING.md：版本管理策略说明
- DEPENDENCY-MAP.md：模块依赖关系与数据流
- ERROR-HANDLING.md：客户端错误处理建议
- SECURITY-GUIDE.md：安全要求与限流策略
- PERFORMANCE-METRICS.md：关键接口性能目标
- BUSINESS-RULES.md：核心字段业务约束
- API-REVIEW-CHECKLIST.md：API 设计评审清单
- GATEWAY-AND-RATE-LIMITING.md：网关与限流策略
- Automation.md：文档自动化方案
- DELIVERY-CHECKLIST.md：交付自检表
- INTEGRATION-FAQ.md：集成常见问题（Stage C）
- site/：`npm run api:docs` 生成的静态站点输出

> 若有新增模块，请同步更新此列表并通知相关干系人。

## 维护原则

1. 所有对外 API 定义必须集中维护，禁止散落在多个文档。
2. 每次接口变更需更新 CHANGELOG.md，标明日期、版本号、摘要与责任人。
3. 接口文件需在开头标注对应的设计目标编号、FRONTEND-FUNCTIONALITY-MAPPING 章节与 FRONTEND-DESIGN-VALIDATION-REPORT 表格，以便追踪。
4. 提交前需通过 openapi linter（如 Spectral）及示例 schema 校验；CI 已使用 `npm run api:validate:ci` 执行只读校验。
5. 接口草案需提前 24 小时发送给后端/产品评审，会议纪要与行动项同步更新到 CHANGELOG.md。

## 快速开始

- 新增接口文档时，基于 templates/openapi-template.yaml 复制并修改。
- 提交前执行 `npm run api:validate && npm run api:docs`，确保规范通过校验且静态站点刷新。
- 若只想确认静态站点是否已同步，可执行 `npm run api:docs:check`。
- 需要联调后端时，可运行 `npm run api:mock` 启动本地 Mock 服务。
- 若需求或实现调整，先修改《网站设计目标说明.md》并在需求矩阵中同步，再更新对应接口文件。

如有疑问，请联系前端小组维护人。
