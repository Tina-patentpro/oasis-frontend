# OperationId & Description 命名规范 FAQ

最后更新：2025-10-23

---

## 1. 为什么需要命名规范？

- 统一的 `operationId` 便于前端/SDK 自动生成调用方法，避免冲突。
- 清晰的 `description` 帮助 QA、产品与外部集成方理解接口意图。
- 与 Spectral Phase 2 规则对齐，减少反复修改成本。

---

## 2. operationId 建议格式是什么？

- **结构**：`<资源><动作>` 的 PascalCase。
- **动作词汇表**（推荐）：`Get / List / Create / Update / Delete / Export / Associate / Dissociate / Publish / Preview / Sync / Verify / Handle`。
- **示例**：
  - `getWorkflowDetail`：获取单个工作流详情。
  - `listProjectAttachments`：列出项目附件列表。
  - `createSupportTicket`：创建客服工单。

### 常见问题

| 情况                   | 建议写法                                                   |
| ---------------------- | ---------------------------------------------------------- |
| 批量列表型接口         | 使用 `list` 开头，例如 `listConversationMessages`          |
| 操作同一资源不同子路径 | 在动作后追加补充信息，如 `updateChatflowInstructions`      |
| 仅触发动作无返回       | 保持动词准确，如 `publishChatflow`、`markNotificationRead` |

---

## 3. description 应该写什么？

- 描述接口的 **业务目的** 与 **关键行为**，不必逐项重复参数说明。
- 字数建议 1~2 句，避免过长；若需更多细节，可在 `summary` 或 `requestBody`/`responses` 中描述。
- 示例：
  - ✅ “分页返回指定会话的历史消息，支持按消息 ID 续传。”
  - ✅ “发起退款申请，创建退款单并返回处理状态。”
  - ❌ “调用接口获取数据” —— 信息过于模糊。

---

## 4. 如何处理已有接口的命名冲突？

1. 在 `docs/api` 中搜索重复的 `operationId`。
2. 如果冲突仅源于命名模糊，优先重命名新接口。
3. 若旧接口已在使用，需同步通知前端/SDK 团队，通过 PR 或变更日志协调上线时间。

---

## 5. 在什么阶段补齐这些元字段？

- **最佳实践**：在设计 OpenAPI 文档时即补全。
- 若在开发后期才补充，应同步在 PR 模板中附上 `npm run api:validate` 结果，确保质量门槛满足 Phase 2 要求。

---

## 6. 有更多问题怎么办？

- 查看《PHASE2-ACCEPTANCE-GUIDE.md》获取完整验收流程。
- 在团队知识库或 issue 中记录新的命名案例，定期补充此 FAQ。
- 与 API 文档负责人/Reviewer 协作，确保新接口遵循统一标准。

---

保持命名一致性不仅有助于通过自动化校验，也大幅降低后续维护成本。如需进一步讨论或新增场景，请提交建议。谢谢！
