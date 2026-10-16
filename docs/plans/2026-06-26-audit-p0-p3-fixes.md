# 审计发现 P0–P3 修复执行记录

> 日期：2026-06-29  
> 分支：`fix/audit-p0-p3`  
> 范围：API 契约漂移治理、关键响应校验补强、Mermaid 错误展示安全收口。

## 已完成

### P0：API 契约与现网接口对齐

已提交：

- `caf2fe8 fix(api): expand drift check to cover all services and specs (A-4)`
- `b873860 docs(api): add legacy auth contract, mark unimplemented refresh/2FA goals (A-1,A-2,A-10)`
- `dd5ee27 docs(api): add legacy notification contract, mark goal-state notifications unimplemented (A-3)`
- `2ca14d3 docs(api): add legacy billing contract for recharge/running-water (A-1)`
- `8d54730 docs(api): add legacy user contract for detail/update/suggestion/invite/data (A-1)`
- `46da2f7 docs(api): add legacy project management and statistics contracts (A-1)`
- `ea8eb17 docs(api): add legacy apicategories contract for ai/cms/instruction (A-1)`

当前 `npm run api:drift` 结果：

- 代码已调用但契约未覆盖：无
- 契约已声明但代码未调用：仍有目标态/规划态接口，当前为报告模式，不阻断。

### P1：关键响应校验补强

本轮补充：

- `billing.service.ts`：充值套餐列表只保留具备关键 `id` 和 `name` 字段的有效项。
- `user.service.ts`：用户详情响应必须具备关键 `username` 和 `balance` 字段，否则抛出“无效的用户详情响应”。
- 对应测试已补充。

### P3：Mermaid 错误展示安全收口

本轮补充：

- Mermaid 图表渲染失败时，不再在页面展示原始图表源码。
- 错误提示改为通用文案，避免把用户输入中的敏感上下文暴露到页面。
- 对应测试已补充。

## 已验证

已执行并通过：

```bash
npx jest src/api/services/__tests__/billing.service.test.ts src/api/services/user.service.test.ts src/components/ContentRenderer/MermaidChart.test.tsx --runInBand
npm run type-check
npm run lint
npm run api:drift
```

## 后续建议

以下事项未纳入本轮提交，建议单独排期：

1. 将目标态/规划态接口与现网接口做标记分层，减少 `api:drift` 的“契约已声明但代码未调用”噪音。
2. 为 `file.service.ts`、`instruction.service.ts`、`referral.service.ts`、`statistics.service.ts` 补齐测试。
3. 评估导出下载链路是否需要统一走 API client。
4. 评估左侧栏列表虚拟化与打包体积优化，避免和安全/API 修复混在同一提交。
