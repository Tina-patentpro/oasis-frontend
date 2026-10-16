# Session Selection Highlight Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 让左侧“独立会话历史”和项目内会话在被选中后有明确高亮，并在点击“新会话”时清空旧高亮。

**Architecture:** 在工作区全局状态里新增“当前选中会话 id”，点击左侧会话时写入这个状态，点击“新会话”时清空。左侧会话卡片根据这个状态统一渲染选中样式，不改现有项目选中逻辑。

**Tech Stack:** React 19, TypeScript, Zustand, Jest, Testing Library

---

### Task 1: 增加当前选中会话状态

**Files:**

- Modify: `src/modules/workspace/stores/useWorkspaceStore.ts`
- Modify: `src/modules/workspace/hooks/useWorkspaceSidebar.ts`

**Step 1: 定义状态与 setter**

在工作区 store 中新增 `selectedSessionId` 和 `setSelectedSessionId`，默认值为 `null`，且不放进持久化字段，避免刷新后出现陈旧高亮。

**Step 2: 点击左侧会话时写入状态**

在 `useWorkspaceSidebar` 的会话点击处理里，先记录被点击的会话 id，再执行现有的会话恢复逻辑。

**Step 3: 验证状态链路完整**

确认 `selectedSessionId` 已传给左侧栏组件，且不会影响现有 `selectedProjectId` 行为。

### Task 2: 点击新会话时清空选中会话

**Files:**

- Modify: `src/modules/workspace/hooks/content-sections/generation-actions.ts`

**Step 1: 在新会话动作中清空状态**

在现有 `startNewSession` 逻辑里追加 `setSelectedSessionId(null)`，与清空输入和输出保持同一步发生。

**Step 2: 保持工具切换逻辑不变**

确认这里只清空会话高亮，不切换工具、不影响项目关联逻辑。

### Task 3: 为左侧会话卡片补选中样式

**Files:**

- Modify: `src/modules/workspace/hooks/sidebar/left-sidebar-props.ts`
- Modify: `src/components/workspace/left-sidebar/types.ts`
- Modify: `src/components/workspace/left-sidebar/LeftSidebar.tsx`

**Step 1: 把 selectedSessionId 传到 LeftSidebar**

扩展参数与 props，让侧栏拿到当前选中会话 id。

**Step 2: 统一渲染选中样式**

在 `renderSessionItem` 中根据 `selectedSessionId === session.id` 应用更明显的边框、底色、阴影和 `aria-current` 标识；选中项的菜单按钮保持可见。

**Step 3: 保持两类列表一致**

项目内会话与独立会话历史都使用同一套选中判断，只保留现有缩进差异。

### Task 4: 补测试并执行验证

**Files:**

- Modify: `src/modules/workspace/hooks/content-sections/generation-actions.test.ts`
- Modify: `src/components/workspace/left-sidebar/LeftSidebar.test.tsx`

**Step 1: 补新会话清空高亮测试**

在 `generation-actions` 测试里先设置一个选中会话，再调用 `startNewSession`，断言 store 中的 `selectedSessionId` 被清空。

**Step 2: 补左侧高亮渲染测试**

在 `LeftSidebar` 测试里传入 `selectedSessionId`，断言对应会话节点带有选中标识。

**Step 3: 运行验证命令**

Run: `npm run type-check`
Expected: 类型检查通过

Run: `npm run lint`
Expected: 代码规范检查通过

Run: `npm test -- --runInBand src/modules/workspace/hooks/content-sections/generation-actions.test.ts src/components/workspace/left-sidebar/LeftSidebar.test.tsx`
Expected: 新增和相关测试通过
