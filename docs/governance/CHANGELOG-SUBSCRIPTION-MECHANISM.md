# Stage D 更新日志订阅机制

> 目标：确保接口与体验变更在 24 小时内通知到相关方，支撑接口变更记录覆盖率 100% 与跨团队透明协作。

## 订阅渠道

| 渠道                            | 覆盖角色               | 触发条件                                              | 说明                                                  |
| ------------------------------- | ---------------------- | ----------------------------------------------------- | ----------------------------------------------------- |
| GitHub Discussions `#changelog` | 全体工程团队           | `docs/CHANGELOG.md` 或 `docs/api/CHANGELOG.md` 有提交 | 通过自动化脚本创建/更新「本周变更」话题，供回顾与追溯 |
| Slack `#release-updates`        | 前端、后端、运维、产品 | 同上                                                  | CI 使用 Webhook 推送摘要与关键指标图表                |
| 邮件列表 `release@oiw.team`     | 管理层、客服、商务     | 每周一 09:00 汇总过去 7 天变更                        | 由 GitHub Action 生成 Markdown 邮件，附关键链接       |
| 飞书知识库《接口与体验变更》    | 产品/客服              | 每月自动同步                                          | 通过 CLI 工具将 Discussions 内容归档为知识库页面      |

## 作者操作流程

1. **更新日志**：在 PR 合并前更新 `docs/CHANGELOG.md` 与 `docs/api/CHANGELOG.md`，并标注对应版本/日期。
2. **标记责任人**：在提交说明中添加标签 `#StageD`，CI 用于识别是否触发通知。
3. **触发订阅**：
   - 推送到 `main` 后，GitHub Action (`.github/workflows/api-validate.yml`) 检测上述文件的 diff。
   - Action 调用 `npm run changelog:notify`（脚本位置 `scripts/changelog/notify.ts`），收集标题、摘要、相关 PR 链接。
   - 本地可执行 `npm run changelog:notify -- --dry-run` 预览，将结果日志化后提交。
   - 脚本按配置依次推送 Slack / Discussions / 邮件队列，并在本地写入 `docs/governance/subscription-log/YYYY-MM-DD.md`。
4. **验收**：作者在 24 小时内确认通知是否送达（Slack 线程确认、邮件客户端回执或 Discussions 回复）。

## 订阅者操作流程

- **GitHub**：关注 Discussions `#changelog` 标签或加入团队默认订阅组。
- **Slack**：保持频道通知为「所有消息」，若需静音请写明代理人。
- **邮件**：自动加入 `release@oiw.team` 列表，个人可在邮件底部链接修改订阅频率（每日/每周）。
- **飞书**：飞书群收到更新时 @相关责任人 并附上知识库链接。

## 自动化实施要求

1. 在 `scripts/changelog/` 下新增自动化脚本，支持本地 CLI (`npm run changelog:notify -- --dry-run`) 预览输出。
2. 在 `.github/workflows/api-validate.yml` 中追加步骤：
   ```yaml
   - name: Notify changelog subscribers
     if: github.event_name == 'push' && github.ref == 'refs/heads/main'
     run: npm run changelog:notify
   ```
3. Slack Webhook 与邮件服务密钥存放于 GitHub Actions secrets：`SLACK_WEBHOOK_URL`、`SMTP_HOST`、`SMTP_PORT`、`SMTP_USER`、`SMTP_PASSWORD`、`SMTP_FROM`、`SMTP_TO`。
4. GitHub Discussions 需要额外配置 `GITHUB_REPOSITORY_ID`、`GITHUB_DISCUSSIONS_CATEGORY_ID`（可通过一次性 GraphQL 查询获得）。
5. `npm run changelog:notify` 在本地执行时会产生日志文件，需纳入 PR；GitHub Actions 环境通过 `CI=true` 自动跳过写入。

## 验收标准

- 所有接口与体验变更在 1 个工作日内推送至上述渠道。
- 订阅渠道活跃度指标：
  - Discussions 互动率 ≥ 60%（指更新帖有「已读」或评论）。
  - Slack 消息阅读确认率 ≥ 90%（使用 Reaction 统计）。
  - 邮件退订率 < 5%。
- 若任何渠道故障超过 4 小时，需要在风险看板新增条目并安排修复。

## 附录：演练计划

- **D36**：通过模拟 PR 合并演练完整通知链路。
- **D38**：引入异常场景演练（模拟 Slack 失败，校验备份邮件通知）。
- **D40**：提交订阅机制总结报告，评估是否需要扩展到外部合作方。
