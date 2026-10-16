# 登录页政策提示 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在登录页按钮附近增加政策提示文案和可点击链接，不改变现有登录流程。

**Architecture:** 直接在 `LoginForm` 中补充一段静态提示文案和外部链接，避免把简单展示逻辑扩散到页面层。补一个最小组件测试，验证文案和链接地址，最后执行类型检查、规范检查和相关测试。

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Jest, Testing Library

---

### Task 1: 更新登录表单展示

**Files:**

- Modify: `D:/OneDrive/4、董娣相关/绿洲慧写3.0/绿洲前端/src/components/auth/LoginForm.tsx`

**Step 1: 添加政策提示文案**

- 在登录按钮上方增加一行小号提示文字。
- 文案包含“请先阅读并同意”和可点击的“隐私与服务政策”。

**Step 2: 配置链接行为**

- 链接指向 `https://www.oasisintwrite.com/privacy`。
- 使用新标签页打开，并补充安全属性。

**Step 3: 自查样式影响**

- 确认提示在两种登录方式下都可见。
- 确认不会挤压按钮和底部“立即注册”区域。

### Task 2: 增加最小回归测试

**Files:**

- Create: `D:/OneDrive/4、董娣相关/绿洲慧写3.0/绿洲前端/src/components/auth/LoginForm.test.tsx`

**Step 1: 编写渲染测试**

- 渲染登录表单。
- 断言页面包含政策提示文字。
- 断言链接地址和新标签页属性正确。

**Step 2: 保持依赖最小**

- 仅 mock 表单依赖的登录 store 和服务，避免引入路由或整页状态。

### Task 3: 执行验证

**Files:**

- Verify only

**Step 1: 运行类型检查**

Run: `npm run type-check`

**Step 2: 运行代码规范检查**

Run: `npm run lint`

**Step 3: 运行相关测试**

Run: `npx jest src/components/auth/LoginForm.test.tsx --runInBand`

**Step 4: 记录结果**

- 记录通过项。
- 如果有失败，说明是否与本次改动直接相关。
