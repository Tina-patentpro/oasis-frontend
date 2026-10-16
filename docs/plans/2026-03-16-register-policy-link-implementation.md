# 注册页政策提示 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 把注册页原有勾选式条款提示改为登录页同款文案加链接，不再要求用户手动勾选。

**Architecture:** 直接修改 `RegisterForm` 的表单展示与提交逻辑，删除勾选框状态和相关校验，再在按钮上方补充与登录页一致的政策提示。补一个最小测试，覆盖提示文案、链接和默认提交行为，最后执行类型检查、规范检查和相关测试。

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Jest, Testing Library

---

### Task 1: 更新注册表单展示与提交逻辑

**Files:**

- Modify: `D:/OneDrive/4、董娣相关/绿洲慧写3.0/绿洲前端/src/components/auth/RegisterForm.tsx`

**Step 1: 删除勾选框相关状态**

- 移除 `acceptTerms` 状态。
- 移除 `terms` 报错字段。

**Step 2: 删除勾选校验**

- 从 `validateForm` 中删除“必须勾选才能注册”的校验。
- 删除对应报错文案。

**Step 3: 增加登录页同款提示**

- 在“注册账号”按钮上方加入“请先阅读并同意隐私与服务政策”。
- 使用新标签页打开政策链接。

**Step 4: 保持后端兼容**

- 注册提交时默认携带 `acceptTerms: true`。

### Task 2: 增加最小回归测试

**Files:**

- Create: `D:/OneDrive/4、董娣相关/绿洲慧写3.0/绿洲前端/src/components/auth/RegisterForm.test.tsx`

**Step 1: 验证界面变化**

- 断言勾选框不存在。
- 断言政策提示和链接存在。

**Step 2: 验证提交行为**

- 填写最小可提交字段。
- 断言调用注册时携带 `acceptTerms: true`。

### Task 3: 执行验证

**Files:**

- Verify only

**Step 1: 运行相关测试**

Run: `npx jest src/components/auth/RegisterForm.test.tsx --runInBand`

**Step 2: 运行类型检查**

Run: `npm run type-check`

**Step 3: 运行代码规范检查**

Run: `npm run lint`

**Step 4: 记录结果**

- 明确哪些命令通过。
- 如有失败，说明是否与本次改动相关。
