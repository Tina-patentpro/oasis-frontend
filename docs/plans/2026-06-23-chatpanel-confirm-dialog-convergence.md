# ChatPanel 确认弹窗收敛 Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 修复 G-P1-3，把 ChatPanel 里的两个破坏性确认弹窗从旧的局部弹窗收敛到共享 `ConfirmDialog`，提升键盘和读屏可访问性。

**Architecture:** 复用 `src/components/ui/feedback/ConfirmDialog.tsx`，让它继续依赖 `AccessibleDialog` 提供 `aria-modal`、焦点陷阱和页面滚动锁。`ChatPanel` 只负责传入标题、说明、按钮文案和确认/取消回调，不再维护 `chat/ConfirmationDialog` 的重复实现。

**Tech Stack:** React、TypeScript、Jest、Testing Library、现有 `AccessibleDialog` / `ConfirmDialog`。

---

### Task 1: 补 ChatPanel overlay 回归测试

**Files:**
- Modify: `src/components/ChatPanel.overlays.test.tsx`

**做什么：**
在已有“清空对话”和“开始新对话”测试里补充断言：
- 弹窗必须带 `aria-modal="true"`。
- 弹窗打开时 `document.body.style.overflow` 必须变成 `hidden`。
- 取消后焦点回到原按钮。

**为什么做：**
G-P1-3 的核心不是“有没有确认”，而是确认弹窗是否满足无障碍基础能力。旧 `chat/ConfirmationDialog` 没有 `aria-modal`，也不锁页面滚动。

**完成标准：**
运行：
`npm test -- src/components/ChatPanel.overlays.test.tsx --runInBand`

预期：
先失败，失败点指向缺少 `aria-modal` 或没有锁滚动。

---

### Task 2: 切换 ChatPanel 到共享 ConfirmDialog

**Files:**
- Modify: `src/components/ChatPanel.tsx`

**做什么：**
把：
`import { ConfirmationDialog } from './chat/ConfirmationDialog'`

替换为：
`import { ConfirmDialog } from './ui/feedback/ConfirmDialog'`

并把两处弹窗改成共享组件参数：
- `title` 保留原标题。
- `message` 使用原说明。
- `cancelText` 使用原取消文案。
- `confirmText` 使用原确认文案。
- 清空对话使用 `danger`，新对话不使用 `danger`。

**为什么做：**
共享 `ConfirmDialog` 已经基于 `AccessibleDialog`，能统一焦点管理、遮罩、滚动锁和 `aria-modal`。

**完成标准：**
`ChatPanel` 两处确认弹窗功能不变：
- 清空对话仍需用户确认才清空。
- 有未发送输入时，开始新对话仍需用户确认。

---

### Task 3: 删除旧的重复确认弹窗

**Files:**
- Delete: `src/components/chat/ConfirmationDialog.tsx`
- Delete: `src/components/chat/ConfirmationDialog.test.tsx`

**做什么：**
确认仓库里没有其他地方引用旧 `ConfirmationDialog` 后，删除旧组件和它的旧测试。

**为什么做：**
审计建议是“收敛到一套”。保留旧组件会让后续代码继续误用旧实现。

**完成标准：**
运行：
`rg -n "ConfirmationDialog" src/components -g *.tsx`

预期：
没有旧组件引用；只剩必要的历史文本或没有结果。

---

### Task 4: 验证

**Files:**
- No new production files beyond Task 2/3.

**做什么：**
运行本轮相关验证：
- `npm test -- src/components/ChatPanel.overlays.test.tsx --runInBand`
- `npm run type-check`
- `npm run lint`

**为什么做：**
确认行为、类型和代码规范都没有回归。

**完成标准：**
三条命令全部通过；若有失败，先定位是新问题还是既有问题，再修复或说明风险。
