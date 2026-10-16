# API 集成常见问题（Stage C）

最后更新：2025-10-24

## 🔌 SSE 与流式接口

**Q: 如何在前端监听工作流执行进度？**  
A: 使用 `src/api/sdk/workflows.ts` 提供的 `subscribeWorkflowProgress`，内部基于 `fetch + ReadableStream` 并自动处理重连。若仅需本地调试，可运行 `npm run api:mock`，访问 `GET /api/chat/stream` 获取示例 SSE 事件。

**Q: SSE 断开后如何恢复？**  
A: SDK 默认启用指数退避重试（250ms 起始，最多 5 次）。在生产环境建议结合浏览器 `navigator.onLine` 状态与 UI 提示，避免无限重试。

## 💳 支付回调 / 第三方依赖

**Q: 如何联调支付回调？**  
A: Mock 服务器提供 `POST /api/payments/callback`，接收 JSON 请求并返回 `status: received`。回调体会被写入控制台日志，可用于快速验证签名、重试策略。

**Q: 多个渠道回调如何区分？**  
A: 推荐在回调参数中附带 `channel` 字段（如 `alipay`、`wechat`），并在 OpenAPI `billing.yaml` 中使用 `oneOf` 明确不同结构。

## 📦 文件打包与下载

**Q: 批量下载接口如何演示？**  
A: 运行 Mock 服务后请求 `GET /api/files/bundle`，返回包含 `jobId/status/files` 的模拟响应。可在前端轮询或使用 `subscribeWorkflowProgress` 的同构模式获取异步状态。

**Q: 大文件上传/下载需要注意什么？**  
A: SDK 的 `uploadFile` 会自动传递 `Authorization`，并在失败时抛出结构化的 `ApiError('UPLOAD_ERROR', ...)`。请确保 UI 层处理 `error.code`，例如提示“文件过大请压缩”。

## 🚀 交付与文档

**Q: 如何生成最新的静态文档站点？**  
A: 执行 `npm run api:docs`。输出位于 `docs/api/site/`，索引页包含所有规范链接与质量趋势表，适合直接发布或通过 GitHub Pages 托管。

**Q: Mock 服务支持哪些路径？**  
A: 目前覆盖：

- `POST /api/workflows/:workflowId/execute`（异步队列与 SSE 事件）
- `GET /api/chat/stream`（模拟聊天回复）
- `POST /api/payments/callback`（记录回调体）
- `GET /api/files/bundle`（批量下载任务）
- `GET /api/workflow-executions/:executionId/progress`（同步进度），可按需扩展。

欢迎在 `open-questions.md` 中追加新的高风险问题，会在月度评审时统一跟进。
