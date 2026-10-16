# DownloadFilesDialog 拆分 Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 修复 G-P1-8 的第一刀：拆分 `DownloadFilesDialog.tsx`，移除文件头部 `/* eslint-disable max-lines, complexity */`，让该文件重新接受 lint 门禁。

**Architecture:** 保持下载和导出行为不变。主文件保留状态、导出流程和副作用；新增类型文件承载 props 与 `FileItem`；新增 helpers 文件承载纯函数；新增 sections 文件承载弹窗头部、导出选项、文件/指令列表、进度区和底部按钮等展示组件。

**Tech Stack:** React、TypeScript、Jest、Testing Library、现有 `AccessibleDialog`。

---

### Task 1: 跑拆分前基线测试

**Files:**
- Test: `src/components/__tests__/DownloadFilesDialog.test.tsx`

**做什么：**
先运行现有 DownloadFilesDialog 测试，确认拆分前基线是绿的。

**为什么做：**
这是纯重构，必须先证明现有行为有测试保护。

**完成标准：**
`npm test -- src/components/__tests__/DownloadFilesDialog.test.tsx --runInBand` 通过。

---

### Task 2: 抽出类型和纯工具函数

**Files:**
- Create: `src/components/download-files-dialog/DownloadFilesDialog.types.ts`
- Create: `src/components/download-files-dialog/DownloadFilesDialog.helpers.ts`
- Modify: `src/components/DownloadFilesDialog.tsx`

**做什么：**
移动：
- `DownloadFilesDialogProps`
- `FileItem`
- `resolveExportErrorMessage`
- `resolveDownloadUrlFromRecord`
- `resolveDownloadNameFromRecord`
- `buildWorkflowDetailFailureHint`
- 文件列表构建函数

**为什么做：**
这些代码与 React 渲染无关，先从主组件里移走，降低主文件长度和理解成本。

**完成标准：**
相关测试仍通过。

---

### Task 3: 抽出展示分区组件

**Files:**
- Create: `src/components/download-files-dialog/DownloadFilesDialog.sections.tsx`
- Modify: `src/components/DownloadFilesDialog.tsx`

**做什么：**
抽出：
- `DownloadDialogHeader`
- `DownloadExportOptions`
- `DownloadSelectionActions`
- `DownloadItemsList`
- `DownloadProgressPanel`
- `DownloadDialogFooter`

**为什么做：**
原文件 JSX 很长，且夹杂指令列表、文件列表、进度、底部按钮多个职责。拆出展示组件后，主文件只保留流程控制。

**完成标准：**
`DownloadFilesDialog.tsx` 可以移除 `eslint-disable max-lines, complexity`。

---

### Task 4: 验证并核对行数

**Files:**
- No additional production behavior changes expected.

**做什么：**
运行：
- `npm test -- src/components/__tests__/DownloadFilesDialog.test.tsx --runInBand`
- `npm run type-check`
- `npm run lint`

并统计：
- `src/components/DownloadFilesDialog.tsx`
- 新增拆分文件

**为什么做：**
确认行为、类型、lint 门禁都正常，并证明本轮确实降低单文件负担。

**完成标准：**
测试、类型检查、lint 全部通过；`DownloadFilesDialog.tsx` 不再有文件头部 eslint 关闭。
