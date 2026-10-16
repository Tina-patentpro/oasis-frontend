# 认证页政策提示共用组件 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 把登录页和注册页的政策提示抽成一个共用小组件，并统一为“动作即表示你已阅读并同意隐私与服务政策”。

**Architecture:** 在 `src/components/auth/` 下新增一个轻量级展示组件，由它统一处理文案骨架、链接地址和样式。登录表单和注册表单只传入动作词，原有重复的提示结构删除；测试同步改为校验新的文案与链接。

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Jest, Testing Library

---

### Task 1: 新增共用政策提示组件

**Files:**

- Create: `D:/OneDrive/4、董娣相关/绿洲慧写3.0/绿洲前端/src/components/auth/AuthPolicyNotice.tsx`

**Step 1: 抽取共用展示逻辑**

- 创建一个只负责展示的组件。
- 接收“登录/注册”动作词。

**Step 2: 统一链接配置**

- 在组件内部维护政策链接地址。
- 保持新标签页和安全属性。

### Task 2: 替换登录页和注册页中的重复结构

**Files:**

- Modify: `D:/OneDrive/4、董娣相关/绿洲慧写3.0/绿洲前端/src/components/auth/LoginForm.tsx`
- Modify: `D:/OneDrive/4、董娣相关/绿洲慧写3.0/绿洲前端/src/components/auth/RegisterForm.tsx`

**Step 1: 登录页接入共用组件**

- 删除本地链接常量和提示 HTML。
- 改为传入“登录”。

**Step 2: 注册页接入共用组件**

- 删除本地链接常量和提示 HTML。
- 改为传入“注册”。

### Task 3: 更新测试并验证

**Files:**

- Modify: `D:/OneDrive/4、董娣相关/绿洲慧写3.0/绿洲前端/src/components/auth/LoginForm.test.tsx`
- Modify: `D:/OneDrive/4、董娣相关/绿洲慧写3.0/绿洲前端/src/components/auth/RegisterForm.test.tsx`

**Step 1: 更新断言文案**

- 登录页断言“登录即表示你已阅读并同意”。
- 注册页断言“注册即表示你已阅读并同意”。

**Step 2: 保留链接和注册提交断言**

- 继续验证政策链接地址。
- 继续验证注册请求里默认携带 `acceptTerms: true`。

**Step 3: 运行验证命令**

Run: `npx jest src/components/auth/LoginForm.test.tsx src/components/auth/RegisterForm.test.tsx --runInBand`

Run: `npm run type-check`

Run: `npm run lint`
