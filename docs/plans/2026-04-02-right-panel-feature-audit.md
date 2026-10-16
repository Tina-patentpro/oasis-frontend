# 右栏功能全面审计计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 对右栏（ChatPanel 及其所有子功能）进行系统性代码审计，识别功能缺陷、UX 问题、性能隐患、可访问性缺失和安全风险，产出可执行的修复任务清单。

**Architecture:** 右栏以 `WorkspaceRightPanel` → `ChatPanel` → `ChatPanelContent` 为主干，包含 6 大功能模块：Tab 系统、消息流、输入区、指令库、读取菜单、项目关联。状态由 Zustand (`useUIStore`) 管理，布局由 `useWorkspaceLayout` 协调。

**Tech Stack:** React 19 + TypeScript, Zustand (persist), Tailwind CSS, Framer Motion, Lazy/Suspense

---

## 审计范围总览

| #   | 功能模块                  | 核心文件                                                  | 优先级 |
| --- | ------------------------- | --------------------------------------------------------- | ------ |
| 1   | Tab 切换系统              | `ChatPanel.tsx:694-711`, `useUIStore.ts`                  | P1     |
| 2   | 消息渲染与操作            | `ChatPanel.tsx:78-183`, `ContentRenderer` (lazy)          | P1     |
| 3   | 输入区（textarea + 附件） | `ChatPanel.tsx:833-943`                                   | P1     |
| 4   | 对话内搜索                | `ChatPanel.tsx:756-805`                                   | P2     |
| 5   | 导出对话                  | `ChatPanel.tsx:464-489`                                   | P2     |
| 6   | 附件系统                  | `ChatPanel.tsx:346-403`, `AttachmentBar.tsx`              | P1     |
| 7   | 读取菜单                  | `ReadMenu.tsx`, `useReadMenu.ts`                          | P2     |
| 8   | 指令库                    | `InstructionLibraryPanel.tsx`, `useInstructionLibrary.ts` | P1     |
| 9   | 项目关联                  | `AssociateProjectDialog.tsx`                              | P2     |
| 10  | 清空/新对话               | `ChatPanel.tsx:438-453, 1005-1054`                        | P2     |
| 11  | 空状态引导                | `EmptyChatState.tsx`                                      | P3     |
| 12  | 打字指示器                | `TypingIndicator.tsx`                                     | P3     |
| 13  | 面板布局与拖拽缩放        | `WorkspaceRightPanel.tsx`, `useWorkspaceLayout.ts`        | P1     |
| 14  | 错误处理与重试            | `ChatPanel.tsx:109-120`, `ComponentErrorBoundary`         | P1     |
| 15  | 可访问性（a11y）          | 所有文件                                                  | P1     |
| 16  | 性能与内存                | 所有文件                                                  | P2     |

---

## Task 1: Tab 切换系统审计

**Files:**

- Audit: `src/components/ChatPanel.tsx:694-711`
- Audit: `src/modules/workspace/stores/useUIStore.ts:98-137`
- Audit: `src/modules/workspace/constants.ts` (CHAT_TABS)

**Step 1: 验证 Tab 状态持久化一致性**

检查项：

- [ ] `chatMode` 和 `chatOpen` 在 `partialize` 中正确持久化 ✅（已确认 `useUIStore.ts:231-232`）
- [ ] Tab 切换时 `fadeKey` 正确递增，不会累积多余的状态更新
- [ ] `chatTab` 值是否在合法范围内（`'focus' | 'image' | 'general'`），有无未处理的外部值

**Step 2: 验证布局模式切换时的 Tab 行为**

检查项：

- [ ] `contrast` 模式下 `toggleChat()` 正确返回 `{ chatMode: 'off', chatOpen: false }`
- [ ] 从 `contrast` 退出后恢复之前的 chatMode（`_previousChatMode` 机制）
- [ ] `full` 模式下左侧边栏正确隐藏（`showSidebar: false`）
- [ ] 从 `full` 回到 `quarter` 时左侧边栏正确恢复

**Step 3: 检查 Tab 与功能模块的联动**

检查项：

- [ ] `general` Tab 下读取按钮正确禁用（`isReadDisabled = chatTab === 'general'`）
- [ ] `general` Tab 下不显示"关联项目"按钮（`chatTab !== 'general'` 条件）
- [ ] 指令库在 `general`/`focus` 下启用，`image` 下标签不同
- [ ] 空状态建议文案随 Tab 正确切换（`SUGGESTIONS` / `SUBTITLES`）
- [ ] 输入框 placeholder 随 Tab 正确切换（`PLACEHOLDER_BY_TAB`）

**Step 4: 记录发现的问题**

输出格式：

```
[BUG/LATENT-BUG/UX/PERF] 描述 | 文件:行号 | 严重程度
```

---

## Task 2: 消息渲染与操作审计

**Files:**

- Audit: `src/components/ChatPanel.tsx:47-183` (MessageItem)
- Audit: `src/components/ChatPanel.tsx:550-582` (messageItems memo)
- Audit: `src/components/ContentRenderer.tsx` (lazy loaded)

**Step 1: 审计 MessageItem 组件**

检查项：

- [ ] `memo` 的 `areEqual` 函数是否遗漏了关键比较字段
- [ ] `isUser` 消息使用 `whitespace-pre-wrap` 但没有 XSS 防护 — 用户消息是否经过 sanitize？
- [ ] 助手消息通过 `ContentRenderer` 渲染 — 该组件是否有 Markdown XSS 防护？
- [ ] 时间显示 `formatMessageTime` 的边界条件：ID < `1000000000` 时不显示，是否合理？
- [ ] `messageTime` 在用户消息和助手消息下方都渲染，但仅对助手消息有操作按钮 — 布局是否一致？

**Step 2: 审计消息列表渲染性能**

检查项：

- [ ] `session.messages.map()` 在 `useMemo` 中 — 但依赖项是否完整？`chatError` 变化会重建所有消息项
- [ ] `handleCopyMessage` 和 `handleRegenerate` 是否稳定（`useCallback` 依赖正确）？
- [ ] 每条消息都创建内联 SVG 图标 — 是否应提取为独立组件避免重复渲染？
- [ ] `searchQuery` 变化时所有消息项都重新计算 `highlight` — 对长对话性能影响？

**Step 3: 审计错误状态处理**

检查项：

- [ ] `chatError` 仅标记最后一条助手消息 — 如果中间有失败消息呢？
- [ ] 重试按钮 (`onRegenerate`) 仅在 `isLastAssistant` 时显示 — 历史中的失败消息无法重试
- [ ] 错误消息的红色边框和阴影是否在暗色主题下可见？

**Step 4: 审计 Markdown 渲染安全性**

检查项：

- [ ] `ContentRenderer` 是否使用 `rehype-sanitize` 或类似库防止 XSS？
- [ ] 图片标签是否允许加载外部资源？
- [ ] 链接点击是否有 `rel="noopener noreferrer"` 保护？

---

## Task 3: 输入区审计

**Files:**

- Audit: `src/components/ChatPanel.tsx:833-943`

**Step 1: 审计 Textarea 行为**

检查项：

- [ ] `useLayoutEffect` 自动调整高度 — 初始 `72px` → `scrollHeight` 上限 `200px`，是否在字体加载后正确计算？
- [ ] `localInput` 与 `session.input` 的同步机制 — `useEffect` 中 `queueMicrotask` 更新 `localInput`，是否有竞态？
- [ ] 防抖 250ms 是否合理？用户快速输入时 `session.input` 是否会丢失？
- [ ] 字符计数仅显示 `> 500` 字符时 — 是否有最大长度限制？
- [ ] `Enter` 发送、`Shift+Enter` 换行 — 是否在 IME 输入法组合状态下误触发？

**Step 2: 审计附件菜单交互**

检查项：

- [ ] `menuOpen` 状态下的 `useClickOutside` 是否正确注册和清理
- [ ] 文件上传后 `e.target.value = ''` 是否正确重置 input 以允许重复上传同一文件
- [ ] 拖拽上传的 `DataTransfer` 重建 — `stableFiles` 变量是否真的解决了 `FileList` 不可靠问题？
- [ ] 粘贴图片时 `hasText` 检查 — 如果同时有文本和图片会怎样？当前行为是忽略图片、保留文本

**Step 3: 审计粘贴处理安全性**

检查项：

- [ ] `e.preventDefault()` 仅在 `imageFiles.length > 0 && !hasText` 时调用 — 其他情况是否需要处理？
- [ ] 粘贴的文件是否有大小或类型限制？
- [ ] 拖拽上传是否有文件大小限制？

---

## Task 4: 对话内搜索审计

**Files:**

- Audit: `src/components/ChatPanel.tsx:261-262, 278-305, 756-805`

**Step 1: 审计搜索功能**

检查项：

- [ ] `Ctrl+Shift+F` 快捷键 — 仅在 `role="log"` 的面板获焦时触发，用户体验是否直觉？
- [ ] 搜索结果计数 `searchMatchCount` — 是否需要"上一个/下一个"导航功能？
- [ ] 搜索高亮使用 `ring-2 ring-yellow-300` — 是否在所有主题色下可见？
- [ ] Tab 切换时搜索状态正确关闭 — 但 `fadeKey` 递增会导致 DOM 重建，搜索状态是否真的需要重置？
- [ ] `Escape` 关闭搜索 — 但 `useEffect` 的清理函数是否正确移除事件监听器？`[searchOpen]` 依赖是否正确？

**Step 2: 审计搜索性能**

检查项：

- [ ] `session.messages.map()` 在每次 `searchQuery` 变化时重新执行 — 大量消息时的性能
- [ ] `msg.content.toLowerCase().includes(lowerQuery)` — 是否应支持正则搜索或高亮匹配文本片段？

---

## Task 5: 导出对话审计

**Files:**

- Audit: `src/components/ChatPanel.tsx:464-489`

**Step 1: 审计导出逻辑**

检查项：

- [ ] `escapeMd` 正则 `/([\\#*_`>()|\[\]~()])/g` — 正则语法是否正确？反引号在字符类中是否需要转义？
- [ ] 导出文件名使用 `toISOString().slice(0, 10)` — 时区问题？
- [ ] `document.body.appendChild(a)` + `a.click()` + `document.body.removeChild(a)` — 是否有更优雅的方案？
- [ ] `URL.revokeObjectURL(url)` 是否在下载完成后调用？异步下载可能还没开始就被 revoke 了
- [ ] 仅当 `messages.length > 1` 时允许导出 — 但第一条消息可能是助手欢迎语，导出是否有意义？

**Step 2: 审计导出内容安全性**

检查项：

- [ ] 导出的 Markdown 是否包含敏感信息？
- [ ] 文件是否通过 Blob URL 正确清理，不会内存泄漏？

---

## Task 6: 附件系统审计

**Files:**

- Audit: `src/components/ChatPanel.tsx:346-403`
- Audit: `src/components/chat/AttachmentBar.tsx`

**Step 1: 审计附件上传流程**

检查项：

- [ ] `onAddAttachment` 回调接收 `FileList | null` — null 检查是否充分？
- [ ] 拖拽时自动判断类型：单张图片为 `image`，其他为 `file` — 多文件混合上传时逻辑是否正确？
- [ ] 附件 ID 的生成方式 — 是否唯一？是否有碰撞风险？
- [ ] 附件数量上限 — 是否有？

**Step 2: 审计 AttachmentBar 组件**

检查项：

- [ ] `sendDisabled` 逻辑：`loading || (!chatInput.trim() && attachments.length === 0)` — 发送时是否验证附件已被处理？
- [ ] `max-h-[72px] overflow-y-auto` — 附件多时滚动区域是否易用？
- [ ] `secondaryItems` 使用 `Children.toArray` — 但 `secondaryAction` 中的 `associateProjectButton` 是 `useMemo` 结果，变化时是否正确更新？
- [ ] 所有按钮都有 Tooltip — Tooltip 内容是否准确描述功能？

---

## Task 7: 读取菜单审计

**Files:**

- Audit: `src/components/chat/ReadMenu.tsx`
- Audit: `src/components/chat/hooks/useReadMenu.ts`

**Step 1: 审计读取菜单逻辑**

检查项：

- [ ] `isReadDisabled = chatTab === 'general'` — `image` Tab 下可以读取？语义生图模式下读取内容的场景是否合理？
- [ ] 菜单使用 `position: absolute; bottom: full` — 在面板底部空间不足时是否会被裁切？
- [ ] `useClickOutside` 的 ref 数组 `[readMenuBtnRef, readMenuRef]` — ref 是否稳定？
- [ ] 读取功能依赖项目关联 — 如果未关联项目，"读取项目历史数据"是否应禁用？

**Step 2: 审计 ReadMenu 可访问性**

检查项：

- [ ] 菜单打开时是否有 focus trap？
- [ ] 键盘导航是否支持上下箭头选择菜单项？
- [ ] `disabled` 状态的按钮是否有 `aria-disabled` 属性？

---

## Task 8: 指令库审计

**Files:**

- Audit: `src/components/chat/InstructionLibraryPanel.tsx`
- Audit: `src/components/chat/hooks/useInstructionLibrary.ts`

**Step 1: 审计指令库数据流**

检查项：

- [ ] API 加载 + localStorage 合并策略 — 两个来源的 `key` 格式不同（`api-{id}` vs 自定义字符串），是否会导致重复项？
- [ ] `_setInstructionLibrary` 直接调用绕过 localStorage 写入 — `loadInstructionsFromApi` 中调用 `_setInstructionLibrary` 而非 `setInstructionLibrary`，是否有遗漏？
- [ ] `storageWriteRef` 的 300ms 防抖写入 — 组件卸载时如果写入还未完成，数据是否会丢失？
- [ ] 删除操作仅从本地移除 — API 创建的指令是否需要调用 API 删除？

**Step 2: 审计指令库创建流程**

检查项：

- [ ] 创建指令调用 API 后重新加载列表 — 网络错误时 `window.alert` 是否应替换为更友好的通知？
- [ ] `is_new: 0` 硬编码 — 是否应支持设置 `is_new`？
- [ ] 验证仅检查空值 — 是否应检查长度限制或特殊字符？

**Step 3: 审计指令库面板 UI**

检查项：

- [ ] 面板使用 `position: absolute; bottom: 12` — 在窄屏幕上可能溢出视口
- [ ] 删除确认使用 3 秒超时 — 是否足够？是否有更好的 UX（如 undo toast）？
- [ ] 拖拽调整高度 `240-520px` — 值是否合理？是否应持久化？
- [ ] 鼠标事件 `handleItemMouseEnter/Leave` 直接操作 DOM style — 是否与 React 的声明式模式冲突？

---

## Task 9: 项目关联审计

**Files:**

- Audit: `src/components/AssociateProjectDialog.tsx`

**Step 1: 审计关联对话框**

检查项：

- [ ] `mode` 支持 `'associate'` 和 `'transfer'` — 两种模式的 UI 差异是否清晰？
- [ ] `excludeProjectId` 过滤项目列表 — 转移模式下是否正确排除当前项目？
- [ ] 项目列表 `max-h-60 overflow-y-auto` — 项目多时是否需要搜索或分页？
- [ ] `AnimatePresence` 包裹整个组件 — `isOpen` 切换时动画是否流畅？

**Step 2: 审计对话框可访问性**

检查项：

- [ ] 对话框是否有 focus trap？
- [ ] Escape 键是否关闭对话框？
- [ ] 打开时 focus 是否移到对话框内？
- [ ] `z-50` 层级是否与其他 overlay（清空确认、设置面板等）冲突？

---

## Task 10: 清空/新对话审计

**Files:**

- Audit: `src/components/ChatPanel.tsx:438-453, 1005-1054`

**Step 1: 审计清空确认对话框**

检查项：

- [ ] 对话框使用 `absolute inset-0` — 如果 ChatPanel 本身有 `overflow: hidden`，是否影响显示？
- [ ] Tab 键 trap 逻辑手动实现 — 是否应使用 `@react-aria/dialog` 或类似库？
- [ ] 确认按钮有 `ref={(el) => el?.focus()}` — 但 React 19 中 ref callback 清理函数机制变化，是否有兼容性问题？
- [ ] 点击遮罩层关闭 — 是否应阻止？用户可能误点

**Step 2: 审计新对话流程**

检查项：

- [ ] `handleStartNewConversation` 清理 `localInput` 和 `emitInputChange('')` — 是否正确清理所有相关状态？
- [ ] 新对话是否会重置项目关联？如果不重置，新对话是否关联到旧项目？

---

## Task 11: 空状态引导审计

**Files:**

- Audit: `src/components/chat/EmptyChatState.tsx`

**Step 1: 审计空状态组件**

检查项：

- [ ] 条件：`!loading && session.messages.length <= 1 && session.messages[0]?.role === 'assistant'` — 如果第一条消息是用户消息呢？不会显示空状态但也没有内容
- [ ] 建议卡片使用 `onMouseEnter/Leave` 直接操作 style — 与 React 声明式模式不一致
- [ ] `grid-cols-2` 布局 — 4 条建议正好两行，如果建议数量变化会怎样？

---

## Task 12: 打字指示器审计

**Files:**

- Audit: `src/components/chat/TypingIndicator.tsx`

**Step 1: 审计 TypingIndicator**

检查项：

- [ ] `role="status"` 和 `aria-live="polite"` — 屏幕阅读器是否正确播报？
- [ ] `typing-dot` CSS 动画是否尊重 `prefers-reduced-motion`？
- [ ] `memo` 比较函数比较 `theme.primary` 和 `theme.background` — 是否遗漏了其他影响样式的字段？

---

## Task 13: 面板布局与拖拽缩放审计

**Files:**

- Audit: `src/modules/workspace/components/WorkspaceRightPanel.tsx`
- Audit: `src/modules/workspace/hooks/useWorkspaceLayout.ts`
- Audit: `src/modules/workspace/stores/useUIStore.ts`

**Step 1: 审计面板尺寸计算**

检查项：

- [ ] `useWorkspaceLayout.ts:261-287` — `computeWidth` 在 resize 事件中频繁调用，是否有 debounce/throttle？
- [ ] `chatWidth` 最小值 320px — 是否足够容纳所有内容（指令库面板 19rem = 304px）？
- [ ] `chatMode === 'full'` 时 `layoutGutter = 32` — 是否考虑了滚动条宽度？
- [ ] 持久化的 `chatWidth` 在窗口缩放后可能超出范围 — 是否在初始化时校验？

**Step 2: 审计拖拽缩放手柄**

检查项：

- [ ] `WorkspaceRightPanel.tsx:28-33` — 缩放按钮宽度仅 `10px`，是否容易点击？
- [ ] `onMouseDown` 触发后 `startChatDrag` 是否正确处理 `mousemove/mouseup`？
- [ ] 触摸设备是否支持？是否有 touch 事件处理？

**Step 3: 审计布局模式切换**

检查项：

- [ ] `contrast` 模式强制关闭左右面板 — 切换时是否通知用户？
- [ ] `_previousChatMode` 使用 `as any` 强制写入 — 是否应在 store 类型中声明？
- [ ] `partialize` 持久化的字段是否会在布局模式切换后导致恢复异常？

---

## Task 14: 错误处理与重试审计

**Files:**

- Audit: `src/components/ChatPanel.tsx:1062-1068` (ErrorBoundary)
- Audit: `src/components/error-boundaries/` (ComponentErrorBoundary)

**Step 1: 审计 ErrorBoundary**

检查项：

- [ ] `ComponentErrorBoundary` 包裹 ChatPanel — 边界内的子组件错误是否正确捕获？
- [ ] 错误降级 UI 是否友好？是否有重试按钮？
- [ ] 懒加载组件 (`LazyContentRenderer`, `AssociateProjectDialog`) 的加载失败是否被 Suspense fallback 正确处理？

**Step 2: 审计 API 错误传播**

检查项：

- [ ] 指令库 API 失败时静默回退到本地数据 — 是否应提示用户？
- [ ] `chatError` 的生命周期 — 错误何时被清除？新消息发送时是否清除之前的错误？
- [ ] 网络断开时的用户体验 — 是否有重连机制或离线提示？

---

## Task 15: 可访问性（a11y）全局审计

**Files:**

- Audit: 所有右栏相关文件

**Step 1: 审计 ARIA 属性**

检查项：

- [ ] Tab 列表使用 `role="tablist"` + `role="tab"` + `aria-selected` ✅ — 但缺少 `aria-controls` 关联面板
- [ ] 消息区域 `role="log"` + `aria-live="polite"` ✅ — 但新消息到达时是否会导致过多播报？
- [ ] 对话框（清空确认、关联项目）是否有完整的 `role="dialog"` + `aria-modal` + `aria-labelledby`？
- [ ] 所有按钮是否有 `aria-label`？✅ 大部分有
- [ ] 输入框 `aria-label="对话输入框"` — 是否应使用 `<label>` 元素？

**Step 2: 审计键盘导航**

检查项：

- [ ] Tab 键是否能到达所有可交互元素？
- [ ] 焦点顺序是否符合逻辑（Tab → 搜索 → 消息列表 → 输入 → 操作按钮）？
- [ ] `Escape` 键行为一致性：关闭搜索 ✅、关闭读取菜单 ✅、关闭附件菜单 ✅ — 是否也应关闭指令库面板？（当前指令库有独立的 Escape handler）
- [ ] 清空确认对话框的 Tab trap 实现是否可靠？

**Step 3: 审计视觉可访问性**

检查项：

- [ ] 主题色 `theme.primary` 是否满足 WCAG 2.1 AA 对比度要求（与白色背景的文字）？
- [ ] 焦点指示器 `focus-visible:ring-2` 在所有主题下是否可见？
- [ ] 搜索高亮 `ring-yellow-300` 在浅色背景上对比度是否足够？

---

## Task 16: 性能与内存审计

**Files:**

- Audit: 所有右栏相关文件

**Step 1: 审计重新渲染**

检查项：

- [ ] `ChatPanelContent` 的 `memo` — 25 个 props，任一变化都重新渲染。哪些 props 变化最频繁？
- [ ] `session` 对象引用是否稳定？每次发送消息都会创建新 session 吗？
- [ ] `currentTheme` 对象引用是否稳定？每次渲染创建新对象？
- [ ] `projects` 数组引用是否稳定？

**Step 2: 审计内存泄漏风险**

检查项：

- [ ] `debounceRef.current` setTimeout — 组件卸载时清理 ✅
- [ ] `deleteTimerRef.current` setTimeout — 组件卸载时清理？❓ `useEffect` 仅在 `pendingDeleteKey` 变化时设置，卸载时可能未清理
- [ ] `storageWriteRef.current` setTimeout — `useInstructionLibrary` 卸载时清理 ✅
- [ ] `useEffect` 中的 `document.addEventListener` — 是否都有正确的 cleanup？✅
- [ ] 懒加载组件是否在卸载后正确释放？

**Step 3: 审计大消息量场景**

检查项：

- [ ] 消息列表无虚拟化 — 100+ 条消息时性能如何？
- [ ] `useMemo` 中的 `session.messages.map()` 是否应使用虚拟列表？
- [ ] Markdown 渲染每条消息独立 `Suspense` — 是否应缓存已渲染的结果？

---

## 执行顺序建议

1. **P1 — 核心功能** (Task 2, 3, 6, 8, 13, 14, 15): 消息渲染、输入区、附件、指令库、布局、错误处理、可访问性
2. **P2 — 重要功能** (Task 1, 4, 5, 7, 9, 10): Tab 系统、搜索、导出、读取菜单、项目关联、对话管理
3. **P3 — 次要功能** (Task 11, 12, 16): 空状态、打字指示器、性能优化

每个 Task 的产出应包含：

- **发现列表**: `[BUG/LATENT-BUG/UX/PERF/A11Y/SEC] 描述 | 文件:行号 | 严重程度`
- **修复建议**: 具体代码修改方案
- **测试建议**: 验证修复的测试方法

---

## 审计交付物

1. **审计报告**: `docs/plans/2026-04-02-right-panel-audit-report.md` — 汇总所有发现
2. **修复计划**: 按优先级排列的可执行任务清单（每个任务有精确文件路径和代码片段）
3. **回归测试检查表**: 确保修复不引入新问题的关键场景列表
