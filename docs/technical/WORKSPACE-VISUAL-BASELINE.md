# 工作区视觉保护基线（2025-10-21）

## 1. 全局框架

- `src/app/providers/LayoutProvider.tsx:44` 根据路由切换 `contentClassName`，`/workspace` 强制 `p-0`，其余页面保留 `px-6 py-6`，确保工作区顶端贴边、其它页保持外边距。
- `src/components/layout/GlobalLayout.tsx:24` 统一使用 `min-h-screen bg-gray-50` 的根容器，主体位于 `<main>` 内的包裹层，所有内容需继续挂载在此容器内以继承背景与字体颜色。
- `src/app/App.tsx:8` 仅暴露 `/workspace/*` 路由；任何新增页面若影响布局需同步在本说明中登记。
- 主题与配色来自 `src/constants/themes.ts`（在 `useWorkspaceNavigation` 中注入），颜色变量由 `Theme` 对象控制，应保持原有键名（`primary`、`background` 等）。

## 2. 页面总体结构

- `src/modules/workspace/WorkspaceApp.tsx:92` 顶层容器 `flex h-screen flex-col`，顶部为导航栏，主体 `flex-1` 按聊天模式切换内容宽度；任何改动需保持 `overflow-hidden` 以防滚动条抖动。
- 当 `chat.mode !== 'full'` 时渲染 `WorkspaceMainLayout`；聊天面板始终跟随在主内容右侧（`WorkspaceRightPanel`）。
- 所有悬浮提示、弹窗通过 `Suspense` 按需加载，抬头在组件末尾统一挂载，保持 `z-50` 以上层级（参考各对话框组件）。
- Toast 提示位置固定为右下角 `fixed bottom-4 right-4`，颜色 `bg-gray-900`，字体 `text-sm`（`WorkspaceApp.tsx:118`）。

### 2.1 组件层级结构（实际实现）

```
App
└── WorkspaceApp
    ├── NavigationBar
    │   ├── SidebarToggle（Tooltip 包裹的 chat-action-btn）
    │   ├── BrandCluster（LOGO + 标题）
    │   └── RightControls
    │       ├── ChatModeToggle（Framer Motion 高亮滑块 + 3 个选项按钮）
    │       ├── NotificationSection
    │       │   ├── NotificationBell（按钮，显示未读徽标）
    │       │   └── NotificationCenter（面板，`isOpen` 时渲染）
    │       └── UserMenu
    │           ├── Trigger Button（Tooltip 包裹）
    │           └── Menu Panel（AnimatePresence + motion.div，包含建议征集、SETTINGS_MENU、管理中心、主题切换等条目）
    ├── Main Wrapper
    │   ├── WorkspaceMainLayout (当 chat.mode !== 'full')
    │   │   ├── LeftSidebar (showSidebar 为 true 时渲染)
    │   │   └── Section
    │   │       ├── InputSection
    │   │       └── OutputSection
    │   └── WorkspaceRightPanel (根据 chatOpen / chatMode 决定内容与宽度)
    │       ├── ResizeHandle（chatMode === 'quarter' 时显示）
    │       └── ChatPanel（chatOpen 时渲染）
    │           ├── TabHeader（三个模式标签）
    │           ├── AttachmentBar（附件上传入口）
    │           ├── InstructionLibraryPanel ×3（对应每个聊天模式）
    │           ├── ReadMenu（历史数据读取下拉）
    │           ├── MessageList（消息流与加载状态）
    │           ├── MessageInput（多行输入框）
    │           └── ChatActions（独立模式开关、读取、清空、发送）
    ├── Toast（可选，右下角固定位置）
    ├── ConfirmDialog
    └── Suspense 容器
        ├── SettingsPanel
        ├── ConversationSettingsDialog
        ├── HelpDocumentation
        ├── RewardSuggestionDialog
        ├── CustomerServiceDialog
        ├── HistoryDataDialog
        ├── ProjectPage
        ├── ProjectManagementCenter
        ├── QuickCreateProjectDialog
        ├── DownloadFilesDialog
        ├── AssociateProjectDialog
        └── 其他按需加载的业务弹窗
```

### 2.2 关键子组件概览

- **NavigationBar**：负责工作区顶栏，包含侧边栏开关、品牌标识、聊天模式切换、通知中心及用户菜单。通知中心与用户菜单均采用 `AnimatePresence` 管理开合动画，并共享 `chat-action-btn` 风格按钮。
- **LeftSidebar**：在 `WorkspaceMainLayout` 内渲染，组合工具分组、模型选择、会话/项目管理区及快捷入口。宽度固定，所有菜单项使用 Tooltip 提示。
- **InputSection / OutputSection**：互为兄弟节点，通过 `WorkspaceMainLayout` 控制布局（横向、纵向、对比）。两者均包含 `sticky` 头部、可滚动正文与操作区域。
- **WorkspaceRightPanel**：根据 `chatMode` 决定展示形态；当为 `quarter` 时提供拖拽手柄，内部渲染 `ChatPanel`。
- **ChatPanel**：由聊天标签、消息列表、AttachmentBar、指令库面板等组成。读取菜单与指令面板均通过独立弹层组件（`ReadMenu`, `InstructionLibraryPanel`）实现，并利用 `useClickOutside` 处理关闭逻辑。
- **Suspense 弹窗合集**：`WorkspaceApp` 通过 `lazy()` 加载多个业务弹窗，所有弹窗遵循相同的遮罩与圆角规范（详见第 16 章）。

## 3. 顶部导航（NavigationBar）

- `src/components/workspace/NavigationBar.tsx:262` 采用 `h-11 grid grid-cols-3`；左列：侧边栏切换按钮（圆角 8px，`chat-action-btn`）；中列品牌区 `flex gap-2`，使用 `/workspace-logo.png` 24px 图标；右列为聊天模式切换、通知铃、用户菜单。
- 聊天模式切换器 `NavigationBar.tsx:300` 使用绝对定位的 `motion.div` 作为高亮条，容器 `rounded-full border overflow-hidden text-xs`；保持 3 段均分宽度，动画 `spring`。
- 通知中心按钮旁为 `NotificationSection`（`NavigationBar.tsx:320`），面板 `absolute right-0 top-11 z-50`，请勿调整定位避免遮挡。
- 用户菜单按钮 `NavigationBar.tsx:367` 的 Tooltip 设为 `position="bottom" align="end"`，菜单 `absolute right-0 top-full mt-2 w-72`，内部分区用 `border-t` 分隔；保持 16px 内边距和圆角 12px。
- Tooltip 全局样式由 `src/components/ui/Tooltip.tsx` 控制，导航栏特意对左右按钮指定对齐方向，变更需同步调整。

## 4. 主工作区布局

### 4.1 WorkspaceMainLayout

- `src/modules/workspace/components/WorkspaceMainLayout.tsx:24` 主容器 `flex-1 flex min-h-0 overflow-hidden`；内部 `<main>` 包含左侧栏和主视图。
- 当 `showSidebar` 为真，左侧栏位于 `LeftSidebar` 组件前；主内容 `<section>` 应保留 `p-6 bg-white` 与 `overflow` 控制，确保纵向滚动只发生在 `appliedLayout !== 'vertical'` 时的 `middleRef` 区域。
- 流程步骤区域 `WorkspaceMainLayout.tsx:34` 使用 `Step` 组件线性排列，中间间隔元素 `w-6`；保持 `mb-8` 间距。
- 输入区与输出区包装在 `flex flex-1 min-h-0` 容器内，根据 `appliedLayout` 切换 `flex-row gap-6` 或 `flex-col`，最小宽度 320px。

### 4.2 左侧栏（LeftSidebar）

- 固定宽度：`LEFT_SIDEBAR_WIDTH = 320`（`useWorkspaceLayout.ts:90`），通过内联样式施加在根 `aside` 上，需保持 `flexShrink: 0` 防止被压缩。
- 工具分组：顶部“当前工具”区域使用 `chrome-tab` 样式（`LeftSidebar.tsx:155`），标签顺序与 `TABS` 常量一致，激活状态使用 `chrome-tab--active` 白底高亮。
- 工具列表：`LeftSidebar.tsx:181` 以内边距 `px-3 py-2` 的按钮呈现，选中态应用主题色背景（`bg-theme-light`）与边框（`border-theme-border`）。保持 `gap-1.5` 间距避免拥挤。
- 模型选择区：包含 `select` 下拉与“模型说明”按钮（`LeftSidebar.tsx:202`），说明面板 `rounded-xl border shadow-lg p-3`；展开时需保留浅绿背景块与升级指南箱。
- 管理区切换：两个 `pill-btn` 风格按钮（`LeftSidebar.tsx:221`）在 `history` 与 `project` 之间切换。保持 1:1 宽度与主题色高亮逻辑。
- 独立会话列表：卡片 `border rounded-lg bg-gray-50/50`，`group` 悬浮时显示操作图标。动作菜单为 `absolute right-2 top-full` 下拉框，包含重命名、关联项目、导出、删除四项（`LeftSidebar.tsx:246` 起）。
- 项目列表：`managementTab === 'project'` 时渲染 `p-3` 卡片，仅展示项目名称、描述与关联会话数（`LeftSidebar.tsx:320`）。点击卡片触发 `onProjectClick` 打开项目详情，对齐左侧边距并保持行内图标。

### 4.3 输入区（InputSection）

- 容器关联类名见 `InputSection.tsx:100`，在横向/对比布局下保持 `min-w-[320px]`，纵向布局占满宽度。根容器需维持 `flex flex-col min-h-0` 以配合同级输出区。
- 顶部控制条（`InputSection.tsx:114`）为 `sticky top-0`，背景白、阴影 `shadow-sm`。包含：项目关联下拉（`minWidth: 160px`）、“快速创建项目”圆角按钮、布局模式下拉（自动/对比/上下）。
- 内容页签：`contentPages` 通过 `chrome-tab` 样式渲染（`InputSection.tsx:186`），激活项需使用 `chrome-tab--active` 白底和主题边框。
- 文本编辑区：`textarea` 内圆角 `rounded-3xl`，非对比模式最小高度 `min-h-[220px]`；对比模式填满父容器（`h-full resize-none`）。左上角浮动的“＋”按钮触发附件菜单。
- 附件菜单：定位于输入框左下角 `absolute bottom-12 left-3`，宽度 `w-48`，上下两个分区分别列出“添加文件到/添加图片到”。需保持边框、圆角 16px 与 `shadow-lg`。
- 操作按钮行：左侧依次为“读取”“复制文本”“清空”，右侧为“一键添加示例”；均使用 `pill-btn chat-action-btn`，对齐方式 `justify-between`（`InputSection.tsx:232`）。
- 快捷提示：在非对比布局下显示文本行，列出 `Ctrl/Command + Enter` 生成、`Ctrl/Command + Shift + C` 复制、`Ctrl/Command + Z` 撤销。
- 附件菜单按钮使用 `chat-action-btn` 风格（32px 正圆），请保持内阴影和 hover 行为与全局一致。

### 4.4 输出区（OutputSection）

- 根容器 `flex flex-col min-h-0`，在对比/横向布局下维持 `min-w-[320px]` 与输入区对应（`OutputSection.tsx:69`）。
- 顶部粘性头部包含标题、渲染模式下拉和四个主要操作按钮（生成、复制文本、下载、下一步）。按钮采用 `outputSectionHeader.css` 定义的栅格布局，宽度由容器查询自动切换 4 列或 2 列。
- 渲染模式切换按钮固定宽 90px，菜单 `absolute top-full left-0 mt-1 w-32 rounded-2xl border`，默认显示 Tooltip 在右侧；请保持 `min-w-[90px]` 以防文本换行。
- 主内容区 `flex-1 overflow-y-auto`，通过 `ContentRenderer` 呈现富文本或源码，外层保持 `gap-3 pt-3` 的垂直留白。
- 版本与差异模块位于内容区底部，容器 `rounded-2xl border border-gray-200 bg-white p-4`；`显示差异` 复选框控制 `Diff` 组件渲染，需保留现有排版与提示语。

## 5. 聊天面板与右侧区域

- `src/modules/workspace/components/WorkspaceRightPanel.tsx:18` 当聊天关闭直接返回 `null`；开启时容器 `flex items-stretch`，`chatMode === 'full'` 占满剩余宽度，否则视为固定宽度面板。
- 拖拽手柄 `WorkspaceRightPanel.tsx:23` 为 `w-[10px]` 的透明按钮，悬停显色 `hover:bg-emerald-200`；保持按钮存在以支持拖拽。
- 面板宽度与模式由 `useUIStore` 管理（`useWorkspaceLayout.ts:87`）；`chatMode === 'quarter'` 时宽度在 320px 与 `available/2` 之间自适应。调整逻辑依赖窗口宽度，变更需同步更新基线。
- `ChatPanel` 外层宽度由 props 控制，内部布局：消息区 `flex-1 overflow-y-auto`，输入区 `border-t` 固定到底部，附件栏 `AttachmentBar` 靠上对齐；Tabs 使用 `chrome-tab` 风格（`ChatPanel.tsx:358`）。
- 阅读菜单、指令库等弹层分别以 `absolute top-full` 和 `fixed right-*` 方式渲染，所有浮层 `z-30` 以上；参考 `ChatPanel.tsx:214` 及相关 Hook。

## 6. Tooltip 与弹层基线

- `src/components/ui/Tooltip.tsx:205` 默认 `position="auto"`，根据视口自动选择 `bottom/top/right/left`，显示层级 `z-index:9999`，通过 `createPortal` 挂载到 `document.body`。
- 箭头位置由 `getArrowStyles`（`Tooltip.tsx:19`）控制，背景为渐变透明度，请勿硬编码背景色。
- 所有导航与侧边栏按钮若需覆盖显示方向，请继续使用 `position="bottom"` 与 `align` 组合，保持本基线记录。
- 下拉菜单、浮动列表普遍采用 `absolute top-full mt-1/2`，白底 `bg-white`、圆角 `rounded-lg/2xl`、阴影 `shadow-lg`，边框 `border border-gray-200`；新增项需沿用该模式。

## 7. 共用样式资源

- `src/index.css:29` 定义 `chrome-tab`，含 12px 圆角、灰色背景、激活态白底绿色边；任何标签式组件应继承此样式以维持统一视觉。
- `src/index.css:64` `chat-action-btn` 统一按钮阴影与 hover 反馈；主题组件通过内联 CSS 变量覆盖颜色，修改时需验证所有按钮表现。
- 全局基础样式见 `src/styles/globals.css:1`，重置 margin/padding 并设置 `background-color: var(--color-bg-primary)`；新增页面需确保定义了对应 CSS Variables。
- `src/styles/outputSectionHeader.css` 管理输出区域按钮栅格与容器查询，自定义媒体查询基于 CSS Container Query；请勿改为普通媒体查询以免破坏响应式。

## 8. 弹窗与子页面

- `WorkspaceApp.tsx:138` 通过 `Suspense` 懒加载十余个对话框组件（设置面板、帮助文档、客服、历史数据、项目页、管理中心等），所有组件共享 `themeColor={layout.currentTheme.primary}` 以保持配色统一。
- 对话框组件多使用 `fixed inset-0` 遮罩与居中布局（详见各组件文件，例如 `src/components/SettingsPanel.tsx`），在修改前需确认遮罩透明度、圆角、阴影等保持不变。
- `QuickCreateProjectDialog`, `AssociateProjectDialog`, `ConversationSettingsDialog` 均依赖统一的 padding (`px-6 py-5`) 与圆角 (`rounded-2xl`)，若需调整尺寸须同步更新文档。
- 下载弹窗、奖励建议等保留在右下角或居中位置，保证按钮主色与当前主题颜色一致。

## 9. 验证清单

- 检查 `/workspace` 首屏：顶部无额外留白，导航高度 44px，侧边栏宽度 320px，输入/输出区保持 24px 内边距。
- 切换聊天模式 Off/On/Full：主内容与右侧面板宽度切换平滑，无额外滚动条出现。
- 打开任一下拉或 Tooltip：浮层对齐遵循本文件记录方向，阴影与圆角一致。
- 依次打开所有懒加载弹窗，确认主题色、遮罩、尺寸与当前描述相符。
- 切换不同主题与深色主题（`useWorkspaceNavigation` 主题选择器）后，以上布局与颜色依旧成立。

> 若需要扩展或调整任何区域，请先在此文档增补新的视觉基线，然后再实施代码改动，确保历史状态可追溯对比。

## 10. 响应式设计与媒体查询

- 全局字体缩放：`src/styles/globals.css:44` 在视口宽度 ≤768px 时将 `html` 字号降至 14px，≤640px 时降至 13px，确保移动端字重与布局按比例收缩。
- 默认 Tailwind 断点（未自定义）：`sm` 640px、`md` 768px、`lg` 1024px、`xl` 1280px、`2xl` 1536px；组件使用 Tailwind Utility 时需遵循此刻度。
- 输入/输出区最小宽度：`InputSection.tsx:100` 与 `OutputSection.tsx:69` 在横向/对比布局下使用 `min-w-[320px]`，在窄屏自动切换为纵向堆叠。
- 输出操作按钮容器：`src/styles/outputSectionHeader.css:20` 采用容器查询 `@container (max-width: 520px)`，宽度 ≤520px 时从 `grid-template-columns: repeat(4, 100px)` 降级为两列；宽度 >520px 恢复四列。
- NavigationBar、侧边栏与聊天面板在窄屏保持 `flex-wrap` 行为（例如步骤区 `WorkspaceMainLayout.tsx:34` 使用 `flex-wrap`），保证元素不会溢出。
- 聊天面板宽度自适应逻辑：`useWorkspaceLayout.ts:105` 根据窗口宽度与侧边栏占位重新计算 `chatWidth`，`quarter` 模式默认取可用宽度的 25%（限制 320px 至 `available - 80`）。

## 11. 字体与排版规范

- 全局字体族：`src/styles/globals.css:16` 使用系统字体栈 `-apple-system, BlinkMacSystemFont, 'Segoe UI', ...`；默认行高 `1.6`，正文颜色 `var(--color-text-primary)`。
- 常用文字级别（Tailwind 默认 REM 标尺）：
  - `text-xs`（0.75rem ≈ 12px）：标签、副标题及注释，例如 Notification 面板统计（`NotificationCenter.tsx:202`）。
  - `text-sm`（0.875rem ≈ 14px）：大部分正文、按钮文字（例如输入区标题 `InputSection.tsx:116`、操作按钮 `ActionButton.tsx:62`）。
  - `text-base`（1rem ≈ 16px）：段落正文（如项目描述、帮助文本）。
  - `text-lg`（1.125rem ≈ 18px）：区域标题，如通知中心主标题（`NotificationCenter.tsx:201`）。
  - `text-xl` 及以上仅用于强调数字或图标辅助文字（例如通知列表图标 `text-xl`）。
- 字重规则：`font-semibold` 用于标题与主要 CTA（导航品牌、输出区标题），`font-medium` 用于按钮与标签高亮。正文默认 `font-normal`。
- 数字/时间戳使用 `text-xs text-gray-400` 风格（例如 `NotificationCenter.tsx:286`），保持弱化。

## 12. 颜色与主题系统

- 主题变量定义：`src/index.css:8` 中的 `--theme-*` 变量控制工作区主色：
  - `--theme-bg` (#ecfdf5)、`--theme-primary` (#059669)、`--theme-primary-hover` (#10b981)、`--theme-light` (#ecfdf5)、`--theme-lighter` (#d1fae5)、`--theme-border` (#a7f3d0)。
- Tailwind 配置 `tailwind.config.js:6` 将 `theme.*` 和 `marketing.*` 颜色映射到上述变量；自定义颜色需保持同名变量为入口点。
- 可选主题列表：`src/constants/themes.ts:5` 中定义的 8 组主题（浅绿/蓝/橙/灰 & 深绿/蓝/红/灰）。每个主题提供 `background`、`primary`、`primaryHover` 与 `name`，用于导航栏徽标、按钮高亮及 Tooltip 渐变。
- 深色主题背景直接使用 `primary` 作为背景（例如 `darkGreen.background = '#059669'`），需确保前景文字 `textColor` 判断逻辑（`NavigationBar.tsx:214`）。
- 营销页面专用配色：`src/styles/marketing-theme.css` 定义 `--marketing-*` 变量；与工作区主题无直接共享，但若将营销组件嵌入工作区，应新增桥接说明。
- 通知类型配色：`NotificationCenter.tsx:178` 使用固定色系（蓝/绿/黄/红）与主题主色结合的未读指示点。

## 13. 间距与对齐规范

- 采用 Tailwind 默认 4px 基线；常用间距如下：
  - 外层板块 `p-6`（24px，工作区 section 内边距，`WorkspaceMainLayout.tsx:28`）。
  - 主内边距 `px-5`/`py-4`（20px/16px），用于卡片头部、Notification 面板（`NotificationCenter.tsx:199`）。
  - 行间距 `gap-6`（24px）用于输入/输出区横向分隔，`gap-3`（12px）用于按钮列。
  - 按钮内边距 `px-3 py-1.5`（12px × 6px）保持统一高度约 32px（`ActionButton.tsx:62`）。
  - Tooltip、下拉菜单外边距统一 `mt-1`/`mt-2`（4px/8px），保证浮层贴近触发元素（例如用户菜单 `NavigationBar.tsx:392`）。
- 侧边栏列表使用 `space-y-2`/`gap-1.5`（8px/6px）保持紧凑节奏。项目与会话卡片 `px-3 py-2`（12px × 8px）并配合 `min-w-0` 以避免文本溢出。
- 聊天模式切换高亮条宽度按百分比计算（`NavigationBar.tsx:319`），确保三个段落等宽；请勿在按钮内添加额外左右内边距，避免错位。
- 所有浮层对齐方式：
  - 下拉菜单多使用 `absolute top-full` 与 `mt-1`，左右对齐由 `left-0` 或 `right-0` 控制。
  - Tooltip 对齐通过 `position`+`align` 参数调节，无需另加 `margin`，避免偏移。

## 14. 动画与过渡规范

- 聊天模式高亮条：`NavigationBar.tsx:319` 使用 `framer-motion` `spring`，`stiffness: 260`、`damping: 30`，移动时需保持同一参数。
- 通知红点缩放：`NotificationCenter.tsx:150` `spring`（`stiffness: 500`、`damping: 25`）用于数值变化动画。
- 全局对话框：`src/utils/animations.ts:12` 中 `dialogVariants` 定义进入 0.2s easeOut、退出 0.15s easeIn；遮罩 `overlayVariants` 时长 0.2/0.15s。
- 按钮微交互：`chat-action-btn` 的 CSS 过渡（`background-color/color/box-shadow 0.2s` + `transform 0.15s`，`src/index.css:70`）；Framer Motion 按钮采用 `buttonVariants`（`hover` 0.2s easeInOut, `tap` 0.1s）。
- 页面通用动画常量：`src/utils/animations.ts:210` `ANIMATION_DURATION`（fast 0.15 / normal 0.3 / slow 0.5）与 `EASING`（贝塞尔曲线），引入新增动画时保持一致。
- 聊天面板拖拽不使用动画，仅依赖 CSS `cursor-col-resize` 与 `hover:bg-emerald-200`（`WorkspaceRightPanel.tsx:24`）；保持无过渡以提升即时反馈。
- Notification list 切换与 Toast `AnimatePresence` 使用 `listContainerVariants`/`notificationVariants` 统一 `spring`（见 `src/utils/animations.ts:66` 与 `NotificationCenter.tsx:253`）。

## 15. 加载与骨架状态

- `LazyLoader`：`src/components/LazyLoader.tsx:8` 以 Suspense 包裹，默认 fallback 为居中容器 `flex items-center justify-center p-8`，加载指示为 `h-8 w-8 animate-spin` 边框圆环（底色 `border-theme-primary`）。需要自定义骨架时可通过 `fallback` prop 覆写，但尺寸与对齐需符合默认规范。
- `ActionButton` 加载态：`ActionButton.tsx:66` 在按钮内部 prepend `LoadingSpinner`，尺寸 `sm`（16px）并继承按钮文字颜色以保持一致。
- `LoadingSpinner`: `src/components/ui/feedback/LoadingSpinner.tsx:8` 使用 `border` + `border-t-transparent` 实现；确保父元素设置 `color` 以控制 spinner 色彩。
- 数据加载中的卡片/列表统一使用空态块或 `animate-pulse` 方案（若新增需记录新样式），当前 Notification 空态为图标 + 文本（`NotificationCenter.tsx:237`），无骨架栈。
- Lazy 悬浮面板（如设置面板）依赖 Suspense fallback；在全屏加载场景可复用 `LazyLoader` 以保持风格一致。

## 16. 复杂弹层组件规范

- 通知中心：`NotificationCenter.tsx:191` 宽度固定 420px，最大高度 600px，`right-0 top-11` 紧贴导航栏按钮；背景白、圆角 24px (`rounded-2xl`)、`shadow-2xl`。内部使用三段结构（头部、筛选、列表、底部），滚动区域 `flex-1 overflow-y-auto`，未读项浅蓝底 (`bg-blue-50/30`) 并辅以主题色圆点。与导航按钮的水平对齐由 `NavigationBar.tsx:322` 保证。
- 通知 Toast：`NotificationToastContainer.tsx:364` 位置 `fixed top-4 right-4 z-50`，单条通知最小宽度 320px，圆角 24px，类型化背景色参见 `NotificationToast` 配置。
- 指令库面板：`InstructionLibraryPanel.tsx:95` 以触发按钮为基准，面板 `absolute bottom-12 left-1/2` 居中，宽度约 304px (`w-[19rem]`)，圆角 48px (`rounded-3xl`)，边框/阴影由主题色衍生；内部列表可滚动，高度由 `instructionListHeight` 控制，顶部提供新增按钮与可拖拽调节（`cursor-ns-resize` handle）。
- 读取菜单、附件栏等其他浮层遵循同类模式：`ReadMenu.tsx` 中下拉 `absolute top-full right-0`，宽度 200~240px，保持 `z-30` 以上，阴影 `shadow-xl`。
- 拖拽反馈：
  - 聊天面板宽度调整：`WorkspaceRightPanel.tsx:21` 手柄 `hover:bg-emerald-200` 提供视觉提示；拖拽时通过 `cursor-col-resize` 标识。
  - 指令库高度调整按钮（`InstructionLibraryPanel.tsx:271`）使用十字形 `span`，无动画但 `cursor-ns-resize` 明确方向。
- 禁用与错误状态：`chat-action-btn:disabled`（`src/index.css:80`）将背景改为 #e5e7eb、文字 #9ca3af、移除阴影；Notification 错误态使用红色背景 `bg-red-50` 与主题色分隔线，保持图标 `❌` 与 `text-red-800`。
- 与其他浮层的层级关系：导航菜单 `z-50`、通知中心 `z-50`、Instruction Library `z-30`、Tooltip `z-9999`（`Tooltip.tsx:339`）。新增浮层需避免覆盖或低于现有层级，特别是 Tooltip 与 Toast。
