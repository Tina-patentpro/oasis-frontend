# D5-D6 交付自检清单

最后更新：2025-10-22（含 D6 扩展）

| 序号 | 项目               | 说明                                                                                                                                                                                  | 状态 |
| ---- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| 1    | OpenAPI 完整性     | `workflows/chatflows/conversations/projects/users-auth/billing/utilities/support-feedback/usage-insights` 均可解析                                                                    | ✅   |
| 2    | Schema 校验        | `schemas/workflow-input.schema.json`、`schemas/instruction.schema.json` 通过 `yaml.safe_load/json` 校验                                                                               | ✅   |
| 3    | 合约测试           | `docs/api/contracts/workflows-contract.test.js` 可通过 Node 18+ `node --test` 执行（CI 命令 `npm run api:validate:ci`）                                                               | ✅   |
| 4    | 多语言示例         | `docs/api/examples/workflows` 下的 curl/JS/Python 脚本可直接运行                                                                                                                      | ✅   |
| 5    | Redoc 静态站点     | 运行 `npm run api:docs` 生成 `docs/api/site`；运行 `npm run api:docs:check` 可检查站点是否已同步；索引页包含规范导航与趋势表                                                          | ✅   |
| 6    | Mock 服务          | 运行 `npm run api:mock` 暂时代替后端：覆盖 workflow 执行、SSE 聊天、支付回调、批量下载等路径                                                                                          | ✅   |
| 7    | 质量趋势           | `npm run api:validate` 自动更新 `docs/api/api-quality-trend.json`，静态站点主页自动展示                                                                                               | ✅   |
| 8    | 业务规则与性能指标 | `BUSINESS-RULES.md`、`PERFORMANCE-METRICS.md` 已补充并与 OpenAPI 中的 `x-performance` 保持一致                                                                                        | ✅   |
| 9    | 改善建议对齐       | P0/P1/P2 建议在 `task-plan.md` 与 `INDEX.md` 可追溯，Visibility/Owner 列已补充                                                                                                        | ✅   |
| 10   | 文档打包           | 推荐使用 `zip -r api-docs.zip docs/api`，附带 CHANGELOG、README、site 目录                                                                                                            | ✅   |
| 11   | CI/CD 自动化       | 参考 `Automation.md` 集成 Spectral、Redoc、合约测试、趋势归档（CI 执行 `npm run api:validate:ci && npm run api:docs:check`；本地归档执行 `npm run api:validate && npm run api:docs`） | ✅   |

> 若需在 CI 中运行完整 API 校验，请使用 Node.js 18+ 并执行：`npm run api:validate:ci`
