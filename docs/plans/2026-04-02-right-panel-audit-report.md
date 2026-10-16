# 右栏功能全面审计报告

> 审计日期: 2026-04-02
> 审计范围: WorkspaceRightPanel 及其所有子功能模块
> 审计方法: 16 个独立审计任务，通过子代理并行执行

---

## 一、严重程度分布

| 严重程度     | 数量 | 说明                                 |
| ------------ | ---- | ------------------------------------ |
| **Critical** | 5    | 必须立即修复，存在安全漏洞或功能失效 |
| **High**     | 18   | 严重影响用户体验或数据完整性         |
| **Medium**   | 25   | 影响可用性、一致性或代码质量         |
| **Low**      | 14   | 小问题，建议优化                     |

---

## 二、Critical 级发现（5 项）

### C1. IME 输入法兼容性缺失 — 中文用户发送消息被中断

- **文件**: `src/components/ChatPanel.tsx:847-851`
- **问题**: Enter 键发送消息时未检查 `isComposing` 状态，中文输入法组合过程中按 Enter 会误发送消息
- **影响**: 中文用户（核心用户群）输入体验严重受损
- **修复**: 在 `onKeyDown` 中添加 `e.nativeEvent.isComposing` 检查

### C2. XSS 漏洞 — 助手消息 Markdown 未经 sanitize

- **文件**: `src/components/ContentRenderer/index.tsx` (lazy loaded)
- **问题**: react-markdown 渲染未配置 rehype-sanitize，恶意 Markdown 内容可能执行脚本
- **影响**: 如果 AI 返回包含恶意 HTML/JS 的内容，可能导致 XSS 攻击
- **修复**: 添加 `rehype-sanitize` 插件到 ContentRenderer

### C3. 面板最小宽度与指令库面板冲突

- **文件**: `src/modules/workspace/hooks/useWorkspaceLayout.ts:273`
- **问题**: chatWidth 最小值 320px，但指令库面板宽度 19rem(304px)，两者同时打开时布局冲突
- **影响**: UI 布局错乱
- **修复**: 将最小宽度提升至 360px 或使指令库面板自适应

### C4. 无最小视口宽度保护

- **文件**: `src/modules/workspace/hooks/useWorkspaceLayout.ts:266`
- **问题**: 当视口总宽度 < 352px 时布局完全崩溃，无降级处理
- **影响**: 小屏设备/分屏模式下应用不可用
- **修复**: 添加最小视口宽度检测和降级布局

### C5. Tab 列表缺少 ARIA 面板关联

- **文件**: `src/components/ChatPanel.tsx:696`
- **问题**: Tab 按钮有 `role="tab"` + `aria-selected`，但缺少 `aria-controls` 和对应 `tabpanel`
- **影响**: 屏幕阅读器用户无法理解 Tab 与内容的关系
- **修复**: 添加 `aria-controls` 属性和 `role="tabpanel"` 容器

---

## 三、High 级发现（18 项）

### 安全类

| #   | 问题                        | 文件                    |
| --- | --------------------------- | ----------------------- |
| H1  | 拖拽上传无文件类型/大小限制 | `ChatPanel.tsx:364-379` |
| H2  | 文件上传无数量限制          | `ChatPanel.tsx:912-928` |

### 功能缺陷

| #   | 问题                                                                                  | 文件                               |
| --- | ------------------------------------------------------------------------------------- | ---------------------------------- |
| H3  | 导出对话 regex 中反引号未转义，导出内容可能格式错误                                   | `ChatPanel.tsx:471`                |
| H4  | `URL.revokeObjectURL` 在下载开始前调用，可能导致下载失败                              | `ChatPanel.tsx:487`                |
| H5  | 错误状态仅标记最后一条助手消息，历史失败消息不可见/不可重试                           | `ChatPanel.tsx:570`                |
| H6  | 懒加载组件 (ContentRenderer, AssociateProjectDialog) 的 Suspense 无 ErrorBoundary     | `ChatPanel.tsx:41-45`              |
| H7  | 指令库 API 加载用 `_setInstructionLibrary` 绕过 localStorage 写入，自定义指令可能丢失 | `useInstructionLibrary.ts:301-302` |
| H8  | 指令库 300ms 防抖写入 localStorage，组件卸载时数据可能丢失                            | `useInstructionLibrary.ts:217-220` |
| H9  | 指令库删除仅本地操作，API 创建的指令下次同步会重新出现                                | `useInstructionLibrary.ts:346-350` |
| H10 | 新对话不保存旧对话内容，未发送的输入直接丢失                                          | `ChatPanel.tsx:449-453`            |
| H11 | 新对话重置项目关联，可能导致用户丢失上下文                                            | `useWorkspaceChatPanel.ts:426`     |

### 布局与交互

| #   | 问题                                                | 文件                            |
| --- | --------------------------------------------------- | ------------------------------- |
| H12 | resize 事件无 debounce，频繁触发状态更新            | `useWorkspaceLayout.ts:261,286` |
| H13 | 拖拽缩放仅支持鼠标事件，触摸设备无法使用            | `WorkspaceRightPanel.tsx:31`    |
| H14 | contrast 模式强制关闭面板无用户通知                 | `useUIStore.ts:88-90`           |
| H15 | localStorage 持久化的布局值无校验，可能恢复无效宽度 | `useUIStore.ts:230-237`         |

### 错误处理

| #   | 问题                                               | 文件                               |
| --- | -------------------------------------------------- | ---------------------------------- |
| H16 | 指令库 API 失败静默回退，用户看到过时数据无感知    | `useInstructionLibrary.ts:306-311` |
| H17 | 重试按钮仅在最后一条失败消息显示，历史失败无法重试 | `ChatPanel.tsx:109-120`            |

### 附件系统

| #   | 问题                                             | 文件                      |
| --- | ------------------------------------------------ | ------------------------- |
| H18 | 发送按钮未检查附件上传状态，上传中可发送导致竞态 | `AttachmentBar.tsx:31`    |
| H19 | 加载中仅禁用发送按钮，清空/新对话按钮仍可点击    | `AttachmentBar.tsx:79-91` |

### 清空对话框

| #   | 问题                                             | 文件                 |
| --- | ------------------------------------------------ | -------------------- |
| H20 | 点击遮罩层关闭清空确认框，误操作可能导致数据丢失 | `ChatPanel.tsx:1007` |

### 性能

| #   | 问题                                                           | 文件                    |
| --- | -------------------------------------------------------------- | ----------------------- |
| H21 | ChatPanelContent 有 25+ props，任一变化全量重渲染              | `ChatPanel.tsx:215`     |
| H22 | session 对象引用频繁变化导致不必要的重渲染                     | `ChatPanel.tsx:220`     |
| H23 | 消息列表无虚拟化，100+ 条消息时性能显著下降                    | `ChatPanel.tsx:814`     |
| H24 | useMemo messages.map 在 chatError/searchQuery 变化时重建所有项 | `ChatPanel.tsx:550-574` |

---

## 四、Medium 级发现（25 项）

### 数据流与状态管理

| #   | 问题                                                     | 文件                               |
| --- | -------------------------------------------------------- | ---------------------------------- |
| M1  | `_previousChatMode` 使用 `as any` 绕过类型检查           | `useUIStore.ts:177,189`            |
| M2  | 布局模式恢复时 `getState()` 可能读到批处理中的旧状态     | `useUIStore.ts:186-198`            |
| M3  | chatTab 值无边界验证，非预期值可能导致功能异常           | `ChatPanel.tsx:694-711`            |
| M4  | Tab 切换时 loading 状态未保护，快速切换可能导致竞态      | `ChatPanel.tsx:694-711`            |
| M5  | 指令库 API + localStorage 合并无去重逻辑，可能产生重复项 | `useInstructionLibrary.ts:298`     |
| M6  | 指令库 API 返回空列表时，自定义指令被清空                | `useInstructionLibrary.ts:304-305` |
| M7  | localStorage 数据损坏时无 fallback，可能导致崩溃         | `useInstructionLibrary.ts:286-295` |
| M8  | 新对话不保留未发送的输入内容                             | `ChatPanel.tsx:450`                |

### UX 问题

| #   | 问题                                                | 文件                              |
| --- | --------------------------------------------------- | --------------------------------- |
| M9  | 对话搜索无上/下导航，仅高亮匹配项                   | `ChatPanel.tsx:756-805`           |
| M10 | 语义生图 Tab 下读取按钮可用，使用场景存疑           | `useReadMenu.ts:20`               |
| M11 | 读取菜单依赖项目关联但未检查关联状态                | `ReadMenu.tsx:80-88`              |
| M12 | 项目关联对话框无搜索功能，项目多时难以查找          | `AssociateProjectDialog.tsx:87`   |
| M13 | 指令库面板绝对定位在窄屏可能溢出视口                | `InstructionLibraryPanel.tsx:150` |
| M14 | 指令库删除确认 3 秒超时可能不够                     | `InstructionLibraryPanel.tsx:126` |
| M15 | resize 手柄仅 10px 宽，不易点击                     | `WorkspaceRightPanel.tsx:30`      |
| M16 | 粘贴图片+文本时图片被忽略，用户可能困惑             | `ChatPanel.tsx:381-403`           |
| M17 | 导出限制 messages > 1，但单条助手消息也可能值得导出 | `ChatPanel.tsx:466`               |
| M18 | 搜索高亮 `ring-yellow-300` 在某些主题下对比度不足   | `ChatPanel.tsx:85`                |
| M19 | API 错误仅显示在消息气泡中，无全局错误通知          | `useChatManagement.ts:291,371`    |
| M20 | 网络断开无离线指示或重连机制                        | —                                 |
| M21 | 附件列表 max-height 72px 可能不够用                 | `AttachmentBar.tsx:39`            |

### 可访问性

| #   | 问题                                                                           | 文件                                |
| --- | ------------------------------------------------------------------------------ | ----------------------------------- |
| M22 | AssociateProjectDialog 缺少 `role="dialog"` / `aria-modal` / `aria-labelledby` | `AssociateProjectDialog.tsx:43-137` |
| M23 | 多处内联 SVG 图标缺少 `aria-hidden="true"`，屏幕阅读器会播报无用信息           | 多个文件                            |
| M24 | 字符计数无 live region，屏幕阅读器无法感知                                     | `ChatPanel.tsx:856-859`             |
| M25 | 动画未尊重 `prefers-reduced-motion`（fadeIn、typing dots）                     | 多个文件                            |

### 代码质量

| #   | 问题                                                                  | 文件                                  |
| --- | --------------------------------------------------------------------- | ------------------------------------- |
| M26 | MessageItem memo areEqual 仅比较 primary+background，遗漏其他主题字段 | `ChatPanel.tsx:175-177`               |
| M27 | EmptyChatState 条件仅处理首条消息为 assistant 的情况                  | `EmptyChatState.tsx:806`              |
| M28 | 指令库 `handleItemMouseEnter/Leave` 直接操作 DOM style                | `InstructionLibraryPanel.tsx:109-119` |
| M29 | 清空确认框 Tab trap 手动实现，应使用 focus trap 库                    | `ChatPanel.tsx:1013-1027`             |
| M30 | 读取菜单下拉无键盘导航（上下箭头）                                    | `ReadMenu.tsx:64-89`                  |

---

## 五、Low 级发现（14 项）

| #   | 问题                                          | 文件                               |
| --- | --------------------------------------------- | ---------------------------------- |
| L1  | Tab 切换 `onClick` 创建内联函数，微小性能开销 | `ChatPanel.tsx:702`                |
| L2  | 指令库 `is_new: 0` 硬编码                     | `useInstructionLibrary.ts:377`     |
| L3  | 指令库验证仅检查空值，无长度/字符限制         | `useInstructionLibrary.ts:360-363` |
| L4  | 指令库拖拽调整高度不持久化                    | `useInstructionLibrary.ts:401-418` |
| L5  | 导出文件名使用 UTC 时间                       | `ChatPanel.tsx:483`                |
| L6  | Tab 切换重置搜索状态可能不必要                | `ChatPanel.tsx:280`                |
| L7  | 搜索性能随消息量增长而下降                    | `ChatPanel.tsx:575-582`            |
| L8  | 重复的内联 SVG 图标未提取为共享组件           | `ChatPanel.tsx:128-162`            |
| L9  | 时间戳格式化边界条件处理不完善                | `ChatPanel.tsx:47-60`              |
| L10 | 错误样式使用固定颜色，暗色主题可能不可见      | `ChatPanel.tsx:91-93`              |
| L11 | 清空操作视觉状态重置不即时                    | `ChatPanel.tsx:442-447`            |
| L12 | 空状态建议卡片使用命令式 style 操作           | `EmptyChatState.tsx:71-76`         |
| L13 | resize 手柄双击行为未定义                     | `WorkspaceRightPanel.tsx:31`       |
| L14 | z-50 层级在多 overlay 同时显示时可能冲突      | `AssociateProjectDialog.tsx:45`    |

---

## 六、按修复优先级排列的行动计划

### 第一批：安全与核心功能（建议 1 周内）

| 优先级 | 任务                                    | 涉及文件                    |
| ------ | --------------------------------------- | --------------------------- |
| P0     | 添加 IME composition 事件处理           | `ChatPanel.tsx:847`         |
| P0     | 为 ContentRenderer 添加 rehype-sanitize | `ContentRenderer/index.tsx` |
| P0     | 修复导出 regex 反引号转义               | `ChatPanel.tsx:471`         |
| P0     | 修复 URL.revokeObjectURL 时序           | `ChatPanel.tsx:484-488`     |
| P1     | 添加文件上传类型/大小/数量限制          | `ChatPanel.tsx:364-428`     |
| P1     | 添加 Suspense ErrorBoundary             | `ChatPanel.tsx:41-45`       |

### 第二批：数据完整性（建议 2 周内）

| 优先级 | 任务                                      | 涉及文件                           |
| ------ | ----------------------------------------- | ---------------------------------- |
| P1     | 指令库删除同步到 API                      | `useInstructionLibrary.ts:346-350` |
| P1     | 修复指令库 API 加载时的 localStorage 写入 | `useInstructionLibrary.ts:301`     |
| P1     | 新对话前保存/确认旧内容                   | `ChatPanel.tsx:449-453`            |
| P1     | 错误状态标记所有失败消息                  | `ChatPanel.tsx:570`                |
| P1     | 加载中禁用所有操作按钮                    | `AttachmentBar.tsx`                |

### 第三批：布局与性能（建议 3 周内）

| 优先级 | 任务                               | 涉及文件                     |
| ------ | ---------------------------------- | ---------------------------- |
| P2     | 修复最小宽度与指令库面板冲突       | `useWorkspaceLayout.ts:273`  |
| P2     | 添加 resize 事件 debounce          | `useWorkspaceLayout.ts:261`  |
| P2     | 添加触摸事件支持                   | `WorkspaceRightPanel.tsx:31` |
| P2     | localStorage 持久化值校验          | `useUIStore.ts:230-237`      |
| P2     | 消息列表虚拟化（>50 条消息时启用） | `ChatPanel.tsx:550-814`      |

### 第四批：可访问性与 UX 优化（建议 4 周内）

| 优先级 | 任务                             | 涉及文件                                           |
| ------ | -------------------------------- | -------------------------------------------------- |
| P3     | Tab ARIA 关联补全                | `ChatPanel.tsx:696`                                |
| P3     | 对话框 focus trap 标准化         | `ChatPanel.tsx:1013`, `AssociateProjectDialog.tsx` |
| P3     | SVG 图标 aria-hidden 补全        | 多个文件                                           |
| P3     | prefers-reduced-motion 适配      | 多个文件                                           |
| P3     | 搜索添加上/下导航                | `ChatPanel.tsx:756-805`                            |
| P3     | `_previousChatMode` 类型安全修复 | `useUIStore.ts:177`                                |

---

## 七、回归测试检查表

修复完成后，需验证以下关键场景：

- [ ] 中文输入法输入 + Enter 发送不冲突
- [ ] Markdown 内容含 HTML 标签时不执行脚本
- [ ] 指令库创建/删除后刷新页面数据一致
- [ ] 窄屏（< 800px）布局不崩溃
- [ ] 触摸设备可拖拽调整面板宽度
- [ ] 清空对话确认框仅通过按钮操作关闭
- [ ] 新对话不丢失项目关联
- [ ] 100+ 条消息时滚动流畅
- [ ] 屏幕阅读器可正确导航所有 Tab 和对话框
- [ ] 导出的 Markdown 文件格式正确（含反引号内容）
- [ ] 文件上传有大小/类型限制提示
- [ ] 网络断开时用户得到明确提示

---

_报告生成时间: 2026-04-02_
_审计工具: Claude Code Subagent-Driven Development_
_共审计 16 个功能模块，发现 62 个问题_
