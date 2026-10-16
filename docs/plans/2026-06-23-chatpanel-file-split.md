# ChatPanel File Split Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将 `src/components/ChatPanel.tsx` 从超大文件拆成可维护的小文件，并移除文件头部 `max-lines` 豁免。

**Architecture:** 本次只做结构拆分，不改变聊天、上传、指令库、搜索、清空确认、新建会话确认、关联项目等行为。主文件保留核心状态组合和入口，展示片段、常量和辅助函数迁移到 `src/components/chat-panel/`。

**Tech Stack:** React、TypeScript、Jest、ESLint。

---

### Task 1: 基线与范围冻结

**Files:**
- Read: `src/components/ChatPanel.tsx`
- Test: `src/components/ChatPanel.test.tsx`
- Test: `src/components/ChatPanel.overlays.test.tsx`

**Step 1:** 运行 ChatPanel 定向测试作为拆分前基线。

Run: `npm test -- src/components/ChatPanel.test.tsx src/components/ChatPanel.overlays.test.tsx --runInBand`

Expected: 全部通过。

### Task 2: 拆出常量与辅助函数

**Files:**
- Create: `src/components/chat-panel/ChatPanel.constants.ts`
- Create: `src/components/chat-panel/ChatPanel.helpers.ts`
- Modify: `src/components/ChatPanel.tsx`

**Step 1:** 移动 placeholder、指令库标签、输入框高度配置。

**Step 2:** 移动输入裁剪、高度计算、按钮样式辅助函数。

**Step 3:** 主文件改为从新文件导入。

Expected: 不改变任何文案、颜色、尺寸和限制。

### Task 3: 拆出展示组件

**Files:**
- Create: `src/components/chat-panel/ChatPanel.composer.tsx`
- Create: `src/components/chat-panel/ChatPanel.footer.tsx`
- Create: `src/components/chat-panel/ChatPanel.overlays.tsx`
- Modify: `src/components/ChatPanel.tsx`

**Step 1:** 移动输入区、附件按钮区、高度切换。

**Step 2:** 移动底部操作区、二级操作按钮和读取菜单入口。

**Step 3:** 移动清空确认、新建会话确认、关联项目弹窗区域。

Expected: 只改变文件位置，不改变 DOM 文案和回调。

### Task 4: 移除豁免并核对行数

**Files:**
- Modify: `src/components/ChatPanel.tsx`

**Step 1:** 删除 `/* eslint-disable max-lines */`。

**Step 2:** 核对主文件和新文件行数。

Expected: 主文件明显缩短；新文件不产生新的超长文件。

### Task 5: 验证

Run:
- `npm test -- src/components/ChatPanel.test.tsx src/components/ChatPanel.overlays.test.tsx --runInBand`
- `npm run type-check`
- `npm run lint`

Expected: 全部通过，且 lint 无 max-lines 警告。
