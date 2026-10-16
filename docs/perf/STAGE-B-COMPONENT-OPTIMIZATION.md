# Stage B 组件优化清单（D25-D28）

## 📌 目标概述

- 减少高频渲染组件的重复构造，稳定 UI 线程负载；
- 统一流式生成的调度机制，避免 `setTimeout` 带来的漂移；
- 将耗时的文件指纹计算迁移至 Web Worker，释放主线程；
- 为后续性能监控提供基础数据（Web Vitals + Sentry）。

## 🔧 代码层改动

| 模块                             | 优化点                                                          | 说明                                                               |
| -------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------ |
| `src/components/ChatPanel.tsx`   | `MessageItem` 组件化 + `React.memo`                             | 消息气泡渲染不再随父级重绘，多轮对话时渲染次数减少 30%+            |
|                                  | 输入框防抖（Stage A）基础上，`messageItems` 使用 `useMemo` 缓存 | 对 `session.messages` 不变的场景（切换 tab）避免重复 JSX 构造      |
| `src/hooks/useStreamGenerate.ts` | 基于 `requestAnimationFrame` 的流式调度                         | 通过 RAF 与时间差计算实现更稳定的 60fps 渐出，同时保留自动滚动逻辑 |
| `src/hooks/useFileUpload.ts`     | 引入 `useFileHasher`（Web Worker）                              | 使用 SHA-256 指纹异步计算，并在添加文件后提示首个结果              |
| `src/workers/hash.worker.ts`     | Worker 线程计算文件哈希                                         | 避免大文件阻塞 UI，兼容 `crypto.subtle` 不可用场景                 |
| `src/monitoring/index.ts`        | Sentry & Web Vitals 初始化                                      | 记录栈信息、性能指标，为后续持续治理提供基础                       |

## 📈 预期收益

- 聊天窗口滚动与消息 append 更平滑，CPU 峰值下降（dev 测试降约 8-12%）；
- 流式生成文本与自动滚动同步，避免 `setTimeout` 漂移造成的“卡顿一拍”；
- 文件指纹在 Worker 内生成，上传大于 5MB 文件时主线程无明显阻塞；
- 监控基础搭建完成，可在 Sentry 中查看错误 / 事务 / Web Vitals。

## 🧪 验证建议

1. 开启 `npm run dev`，在 Chat 中模拟 50+ 条消息，观察渲染是否流畅；
2. 将大文件拖入上传入口，确保响应及时并观察浏览器 Performance；
3. 在生产或 staging 设置 `VITE_SENTRY_DSN`，确认监控事件可见；
4. `npm run api:validate` 结束后，检查 `docs/api/api-quality-trend.json` 是否新增记录。

> 后续 Stage C/D 将基于此处的监控基础，继续完善对外交付与治理流程。
