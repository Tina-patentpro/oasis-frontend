# Frontend Stability Runbook

## Scope

适用于前端稳定性优先改造后的运行维护，覆盖：

- 请求超时/重试/中止
- 流式恢复
- UI 错误恢复动作
- 批量操作恢复队列
- 业务指标采集

## Fast Checks

1. 运行测试：

```bash
npx jest src/api/core/request-policy.test.ts src/api/core/request-timeout.test.ts src/api/core/stream-recovery.test.ts src/modules/workspace/errors/recovery-model.test.ts src/modules/workspace/hooks/content-sections/generation-state.test.ts src/modules/workspace/hooks/content-sections/workflow-steps.test.ts src/components/workspace/input-section/priority.test.ts src/modules/workspace/hooks/sidebar/recovery-queue.test.ts src/monitoring/business-metrics.test.ts --runInBand --verbose
```

2. 校验主题 token：

```bash
npx tsx scripts/validate-theme-tokens.ts
```

3. 基础质量门禁：

```bash
npm run type-check
npm run lint
npm run build
```

## Incident Playbook

### 1) 请求大量超时

- 检查：`REQUEST_TIMEOUT` 是否突增。
- 操作：
  - 降低并发触发路径。
  - 将高频读请求切换到 `background` profile。
  - 观察重试成功率是否恢复。

### 2) 流式输出中断

- 检查：SSE 错误日志与重连次数。
- 操作：
  - 确认最近有效内容是否保留。
  - 触发重试并观察是否进入 `success/partial_success`。

### 3) 侧栏批量操作失败

- 检查：`待重试操作` 是否积压。
- 操作：
  - 在管理面板点击“重试下一项”。
  - 若连续失败，记录接口错误并暂停批量操作。

### 4) 登录态恢复失败

- 检查：`AUTH_UNAUTHORIZED` 错误占比。
- 操作：
  - 触发统一 `relogin` 流程。
  - 验证回到目标页面的可恢复性。

## Rollback Triggers

- `crash-free session < 99.9%`
- 关键链路成功率连续 15 分钟低于基线 10%
- 发布后无法在 UI 层恢复核心操作

满足任一触发条件，执行模块级回滚并冻结增量发布。
