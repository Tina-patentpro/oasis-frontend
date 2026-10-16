# Session Expiry Banner Design

**Date:** 2026-02-15
**Scope:** Frontend only

## Goal

在现有 `localStorage + 严格风控` 会话方案下，增加“会话即将过期”顶部横幅提示，提升用户对即将失效会话的可感知性，降低突然掉线的体验损耗。

## Decisions

1. 提前阈值固定为 `5 分钟`。
2. 提示形态为 `顶部横幅`，非阻塞。
3. 不新增后端接口，前端使用本地会话过期元信息计算剩余时长。
4. 每个 token 生命周期内，用户点击“稍后提醒”后不重复提示。

## Architecture

1. `token-storage` 暴露只读会话元信息接口（过期时间、剩余毫秒）。
2. 新增 `SessionExpiryBanner` 组件，挂载在 `AuthProvider` 内，与 `SessionExpiredDialog` 并存。
3. `SessionExpiryBanner` 基于 `setInterval(30s)` + `visibilitychange` 做剩余时长刷新。
4. 路由在 `/auth/*` 时不展示横幅。

## Data Flow

1. 登录后 token 被持久化，记录 `expiresAt`。
2. 横幅组件读取 `expiresAt`，计算 `remainingMs`。
3. 当 `0 < remainingMs <= 5min` 时显示提示。
4. 过期后横幅隐藏，最终由现有未授权/强制登出链路兜底。

## UX Rules

1. 横幅固定在页面顶部，不阻断操作。
2. 显示“剩余 X 分钟后将过期”文案。
3. 操作按钮：
   - `重新登录`：跳转 `/auth` 并保留 `from`。
   - `稍后提醒`：对当前 token 静默，不重复弹出。

## Testing

1. `token-storage`：验证过期元信息读取、过期清理后返回空。
2. `SessionExpiryBanner`：验证显示/隐藏、路由抑制、按钮行为、静默行为。
