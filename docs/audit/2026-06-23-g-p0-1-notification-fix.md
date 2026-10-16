# G-P0-1 通知系统重渲染问题修复记录

## 背景

第三方全面审计报告将 `G-P0-1 通知系统重渲染风暴` 标为唯一 P0，指出 `src/hooks/useNotifications.ts` 中通知轮询可能因为重渲染而反复重启。

## 当前代码复核

复核后确认：原报告中“把整个 `_options` 对象放进依赖数组”的表述与当前代码不完全一致；当前依赖使用的是 `_options.enableRealTime` 和 `_options.pollingInterval` 两个基本值。

但代码中仍存在两个可复现的真实问题：

1. `useNotifications()` 每次渲染都会返回一个新的对象引用，导致 `NotificationProvider` 的 context value 即使内容没变也可能变。
2. 已登录且启用轮询时，首次挂载会被“初始化拉取”和“启动轮询立即拉取”各触发一次，导致通知列表初始请求重复。

## 修复内容

- 将通知轮询配置拆成稳定的基本值：
  - `enableRealTime`
  - `pollingInterval`
- 实时轮询开启时，只由 `startRealTime()` 执行首次拉取，避免初始化 effect 再重复拉取。
- `useNotifications()` 返回值使用 `useMemo` 稳定，避免无关重渲染下 context 对象引用变化。
- 修正轮询注释，将“每小时获取一次”改为“按配置间隔获取一次”。

## 新增测试

新增：

`src/hooks/useNotifications.test.tsx`

覆盖：

1. 无关重渲染时，`useNotifications()` 返回同一个对象引用。
2. 已登录首次挂载时，在 30 秒轮询间隔到达前只拉取一次通知；到达 30 秒后再执行下一次轮询。

## 验证

| 命令 | 结果 |
| --- | --- |
| `npm test -- src/hooks/useNotifications.test.tsx src/app/providers/NotificationProvider.test.tsx --runInBand` | 2 suites / 9 tests 通过 |
| `npm run type-check` | 通过 |
| `npm run lint` | 通过 |

## 剩余人工验证

建议在浏览器登录后打开 Network 面板观察通知接口：

1. 首次进入工作区时通知列表只初始化一次。
2. 未手动刷新、未切换筛选时，通知接口按 30 秒节奏轮询。
3. 输入文本、打开弹窗等普通 UI 操作不应额外触发通知接口。
