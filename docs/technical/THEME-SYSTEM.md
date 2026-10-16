# 全局主题系统说明

## 概述

已为应用建立完整的CSS变量主题系统，支持4种主题颜色：绿色、蓝色、橙色、灰色。

## 实现方式

### 1. CSS变量定义 (src/index.css)

```css
:root {
  --theme-bg: var(--color-success-light, #e6fffb);
  --theme-primary: var(--color-success, #0d9488);
  --theme-primary-hover: var(--color-success-hover, #0f766e);
  --theme-light: var(--color-success-light, #e6fffb);
  --theme-lighter: #ccfbf1;
  --theme-border: #99f6e4;
}
```

### 2. 动态主题切换 (src/App.tsx)

在Workspace组件中,通过useEffect监听主题变化并更新CSS变量:

```typescript
useEffect(() => {
  const root = document.documentElement
  root.style.setProperty('--theme-bg', currentTheme.bg)
  root.style.setProperty('--theme-primary', currentTheme.pri)
  root.style.setProperty('--theme-primary-hover', currentTheme.priH)

  // 计算衍生颜色...
  root.style.setProperty('--theme-light', lightest)
  root.style.setProperty('--theme-lighter', lighter)
  root.style.setProperty('--theme-border', border)
}, [currentTheme])
```

## 需要适配的区域

当前应用中使用硬编码颜色的地方需要替换为CSS变量:

### 高优先级适配区域

1. **Chrome Tab 活动状态** (src/index.css)
   - 当前: 硬编码 `#047857`, `#8ce9c5`
   - 应改为: `var(--theme-primary-dark)`, `var(--theme-border)`

2. **Pill Button 活动状态** (src/index.css)
   - 当前: 硬编码 `#8ce9c5`, `#ecfdf5`, `#047857`
   - 应改为: CSS变量

3. **工具选择按钮** (src/App.tsx, line ~1075)
   - 当前: `bg-emerald-50 border-emerald-300 text-emerald-700`
   - 应改为: 使用主题变量

4. **聊天消息气泡** (src/App.tsx, ChatPanel)
   - 当前: `bg-emerald-500`
   - 应改为: `var(--theme-primary)`

5. **输入框聚焦状态** (src/App.tsx, multiple locations)
   - 当前: `focus:ring-emerald-400`
   - 应改为: `focus:ring-[var(--theme-primary)]`

6. **附件徽章** (src/App.tsx, AttachBadge)
   - 当前: `border-emerald-200 bg-emerald-50 text-emerald-700`
   - 应改为: 主题变量

7. **拖动手柄悬停** (src/App.tsx, multiple locations)
   - 当前: `hover:bg-emerald-200`
   - 应改为: `hover:bg-[var(--theme-lighter)]`

8. **ActionBtn 主按钮** (src/App.tsx)
   - 当前: 硬编码 `#059669`
   - 应改为: `var(--theme-primary)`

9. **版本信息框** (src/App.tsx)
   - 当前: `bg-emerald-50/60 text-emerald-700`
   - 应改为: 主题变量

## 建议的实现方案

由于直接修改代码量很大，建议采用以下方案之一:

### 方案A: 使用Tailwind配置

在 `tailwind.config.js` 中配置主题变量，让Tailwind自动生成基于CSS变量的类名。

### 方案B: 创建主题类名

定义一组基于CSS变量的工具类，如 `.theme-bg`, `.theme-text`, `.theme-border` 等。

### 方案C: 逐步迁移

优先适配最显眼的UI元素，如按钮、标签、高亮状态等。

## 主题颜色映射

| 主题 | 主色    | 悬停色  | 背景色  | 浅色    | 更浅色  | 边框色  |
| ---- | ------- | ------- | ------- | ------- | ------- | ------- |
| 绿色 | #059669 | #10b981 | #ecfdf5 | #ecfdf5 | #d1fae5 | #a7f3d0 |
| 蓝色 | #2563eb | #3b82f6 | #eff6ff | #eff6ff | #dbeafe | #93c5fd |
| 橙色 | #ea580c | #f97316 | #fff7ed | #fff7ed | #fed7aa | #fdba74 |
| 灰色 | #374151 | #4b5563 | #f5f5f5 | #f5f5f5 | #e5e7eb | #d1d5db |

## 当前状态

✅ CSS变量系统已建立
✅ 主题切换逻辑已实现
✅ 页眉主题适配完成
⚠️ 其他UI组件需要逐步适配

## 下一步

1. 更新Tailwind配置以支持CSS变量
2. 系统性替换所有硬编码的emerald颜色
3. 测试所有主题下的视觉效果
4. 确保主题切换时所有UI元素同步更新

## 自动校验

新增脚本：`scripts/validate-theme-tokens.ts`  
用于阻止核心页面回退到硬编码主题色（`emerald-*`、`#059669`、`#10b981`）。

运行方式：

```bash
npx tsx scripts/validate-theme-tokens.ts
```

---

**注意**: 主题系统框架已完成，但完整适配需要替换大量硬编码的颜色值。建议采用自动化工具或Tailwind配置来简化这一过程。
