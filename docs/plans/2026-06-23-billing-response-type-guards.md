# Billing 响应类型收敛 Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 修复 G-P1-7，去掉 `billing.service.ts` 中 8 处 `as unknown as` 类型逃逸，避免计费/充值接口缺关键字段时被静默当成成功。

**Architecture:** 不改 `apiClient`，不改后端接口。本轮只在 billing 服务内部增加轻量 type guard（运行时类型判断）和统一的“直接数据或 `{ data: ... }` 数据”读取函数，让 service 层只有在关键字段满足预期时才返回成功结果。

**Tech Stack:** TypeScript、Jest、现有 `isRecord` 工具、现有 `billing.service.test.ts`。

---

### Task 1: 补失败测试

**Files:**
- Modify: `src/api/services/__tests__/billing.service.test.ts`

**做什么：**
新增 3 个测试：
- `createOrder` 收到 `code_url` 但缺 `out_trade_no` 时必须抛错。
- `getRechargeConfig` 收到 `min_amount` 但缺其他关键字段时必须抛错。
- `getRunningWaterList` 收到 `items` 但缺 `total` 时必须抛错。

**为什么做：**
当前代码只检查一个标志字段，然后强行转成完整类型。后端少字段时 TypeScript 不会发现，用户侧可能到运行时才崩。

**完成标准：**
运行：
`npm test -- src/api/services/__tests__/billing.service.test.ts --runInBand`

预期：
新增测试先失败，失败点指向“没有抛错”。

---

### Task 2: 增加 billing 本地 type guard

**Files:**
- Modify: `src/api/services/billing.service.ts`

**做什么：**
在文件内新增：
- `readDirectOrNestedPayload`
- `isCreateOrderResponse`
- `isRechargeConfig`
- `isRunningWaterListResponse`
- `isRechargeListResponse`

**为什么做：**
用明确的字段判断替代强转，让返回类型和真实数据结构对齐。

**完成标准：**
`billing.service.ts` 中不再出现 `as unknown as`。

---

### Task 3: 替换 8 处强转

**Files:**
- Modify: `src/api/services/billing.service.ts`

**做什么：**
把 create order、recharge config、running water list、recharge list 的直接返回和嵌套返回逻辑，统一改成：
1. 从响应中取出直接数据或 `data` 数据。
2. 用对应 guard 判断结构。
3. 符合才返回，不符合按原有行为抛错或返回空结果。

**为什么做：**
减少重复判断，也避免只检查一个字段就假定整个对象正确。

**完成标准：**
原有通过场景继续通过；新增缺字段场景能被拒绝。

---

### Task 4: 验证

**Files:**
- No additional production files expected.

**做什么：**
运行：
- `npm test -- src/api/services/__tests__/billing.service.test.ts --runInBand`
- `npm run type-check`
- `npm run lint`

**为什么做：**
计费链路属于较敏感路径，必须确认行为、类型、规范都没有回归。

**完成标准：**
三条命令全部通过；若失败，先定位是否为本轮新增问题，再修复或说明风险。
