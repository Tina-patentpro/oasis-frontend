# 忘记密码重置弹窗 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 用带客服二维码的“重置密码”弹窗替换登录页当前的原生提示框。

**Architecture:** 在 `src/components/auth/` 下新增一个独立的重置密码弹窗组件，内部复用现有 `WeChatSupportPanel` 展示二维码；在认证页 `AuthPage` 管理弹窗开关状态，并把登录表单的“忘记密码”点击事件接到这个弹窗。通过认证页集成测试验证点击后能看到标题、说明和二维码。

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Framer Motion, Jest, Testing Library

---

### Task 1: 新增重置密码弹窗组件

**Files:**

- Create: `D:/OneDrive/4、董娣相关/绿洲慧写3.0/绿洲前端/src/components/auth/ResetPasswordDialog.tsx`

**Step 1: 创建弹窗结构**

- 提供 `isOpen` 和 `onClose` 参数。
- 增加标题、说明文案和关闭按钮。

**Step 2: 复用客服二维码区域**

- 直接引入 `WeChatSupportPanel`。
- 使用认证页主题色，保持视觉统一。

### Task 2: 在认证页接入忘记密码弹窗

**Files:**

- Modify: `D:/OneDrive/4、董娣相关/绿洲慧写3.0/绿洲前端/src/pages/auth/AuthPage.tsx`

**Step 1: 管理弹窗状态**

- 新增本地状态控制弹窗打开/关闭。
- 在切换到注册页时关闭弹窗。

**Step 2: 替换原生提示**

- 把 `window.alert` 改为打开新弹窗。
- 在页面中渲染新弹窗组件。

### Task 3: 验证交互

**Files:**

- Modify: `D:/OneDrive/4、董娣相关/绿洲慧写3.0/绿洲前端/src/pages/auth/AuthPage.test.tsx`

**Step 1: 维持失败测试转绿**

- 保持“密码登录点击忘记密码后出现重置密码弹窗”的断言。

**Step 2: 运行验证命令**

Run: `npx jest src/pages/auth/AuthPage.test.tsx src/components/auth/LoginForm.test.tsx --runInBand`

Run: `npm run type-check`

Run: `npm run lint`
