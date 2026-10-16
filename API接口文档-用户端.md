# 用户端 API 接口文档

> **静态核对日期：** 2026-09-01
> **文档定位：** 面向业务、联调与前端维护的完整接口索引；字段级机器契约以 `docs/api/*.yaml` 为准。
> **证据边界：** 本次仅核对仓库 OpenAPI 与前端静态调用，未进行测试环境抓包、真实账号联调或生产可用性验证。

## 目录

- [文档定位与证据边界](#文档定位与证据边界)
- [接口状态](#接口状态)
- [完整接口总览](#完整接口总览)
  - [A. 认证与账号](#a-认证与账号)
  - [B. 用户资料](#b-用户资料)
  - [C. 通知中心](#c-通知中心)
  - [D. 邀请与推荐](#d-邀请与推荐)
  - [E. 计费与额度](#e-计费与额度)
  - [F. 会话](#f-会话)
  - [G. 项目](#g-项目)
  - [H. 工作流](#h-工作流)
  - [I. 对话流](#i-对话流)
  - [J. 指令库](#j-指令库)
  - [K. AI 分类与执行](#k-ai-分类与执行)
  - [L. 文件](#l-文件)
  - [M. 支持与反馈](#m-支持与反馈)
  - [N. 性能](#n-性能)
  - [O. 用量洞察](#o-用量洞察)
  - [P. 数据治理与导出](#p-数据治理与导出)
  - [Q. 工作台工具](#q-工作台工具)
  - [R. 运营状态](#r-运营状态)
- [现网兼容详细说明](#现网兼容详细说明)
  - [术语说明](#术语说明)
  - [基础信息](#基础信息)
  - [通用响应格式](#通用响应格式)
  - [1. 用户认证模块 (`/auth`)](#1-用户认证模块-auth)
    - [1.1 发送短信验证码](#11-发送短信验证码)
    - [1.2 用户注册](#12-用户注册)
    - [1.3 验证码登录](#13-验证码登录)
    - [1.4 密码登录](#14-密码登录)
    - [1.5 用户登出](#15-用户登出)
  - [2. 用户信息模块 (`/user`)](#2-用户信息模块-user)
    - [2.1 获取用户详情](#21-获取用户详情)
    - [2.2 上传文件](#22-上传文件)
    - [2.3 更新用户信息](#23-更新用户信息)
    - [2.4 修改密码](#24-修改密码)
  - [3. 用户消息模块](#3-用户消息模块)
    - [3.1 获取用户消息列表](#31-获取用户消息列表)
    - [3.2 标记消息已读](#32-标记消息已读)
    - [3.3 全部标记已读](#33-全部标记已读)
    - [3.4 删除消息](#34-删除消息)
    - [3.5 删除全部消息](#35-删除全部消息)
  - [4. 用户邀请模块](#4-用户邀请模块)
    - [4.1 获取邀请记录列表](#41-获取邀请记录列表)
    - [4.2 获取邀请配置](#42-获取邀请配置)
    - [4.3 生成推荐码](#43-生成推荐码)
  - [5. 充值模块 (`/recharge`)](#5-充值模块-recharge)
    - [5.1 获取充值套餐列表](#51-获取充值套餐列表)
    - [5.2 获取充值配置](#52-获取充值配置)
    - [5.3 创建充值订单](#53-创建充值订单)
    - [5.4 查询订单状态](#54-查询订单状态)
    - [5.5 获取充值记录列表](#55-获取充值记录列表)
    - [5.6 获取账户流水列表](#56-获取账户流水列表)
  - [6. 会话管理模块](#6-会话管理模块)
    - [6.1 获取会话详情](#61-获取会话详情)
    - [6.2 获取会话列表](#62-获取会话列表)
    - [6.3 更新会话名称](#63-更新会话名称)
    - [6.4 删除会话](#64-删除会话)
    - [6.5 移动会话到其他项目](#65-移动会话到其他项目)
  - [7. 项目/工作流管理模块](#7-项目工作流管理模块)
    - [7.1 创建项目](#71-创建项目)
    - [7.2 获取项目列表](#72-获取项目列表)
    - [7.3 归档项目](#73-归档项目)
    - [7.4 更新项目名称](#74-更新项目名称)
    - [7.5 获取项目详情](#75-获取项目详情)
    - [7.6 删除项目](#76-删除项目)
  - [8. AI功能模块 (`/apicategories`)](#8-ai功能模块-apicategories)
    - [8.1 获取分类详情](#81-获取分类详情)
    - [8.2 获取对话提示词](#82-获取对话提示词)
    - [8.3 保存用户喜欢的分类](#83-保存用户喜欢的分类)
    - [8.4 获取 API 详情](#84-获取-api-详情)
    - [8.5 执行工作流](#85-执行工作流)
    - [8.6 执行对话流](#86-执行对话流)
    - [8.7 查询异步任务进度](#87-查询异步任务进度)
    - [8.8 获取指令库列表](#88-获取指令库列表)
    - [8.9 创建指令](#89-创建指令)
    - [8.10 获取模型喜好设定配置](#810-获取模型喜好设定配置)
    - [8.11 删除指令](#811-删除指令)
  - [9. 用户建议模块 (`/usersuggestion`)](#9-用户建议模块-usersuggestion)
    - [9.1 提交建议](#91-提交建议)
  - [10. 用户数据管理模块 (`/user`)](#10-用户数据管理模块-user)
    - [10.1 获取数据统计](#101-获取数据统计)
    - [10.2 导出用户数据](#102-导出用户数据)
    - [10.3 清空用户数据](#103-清空用户数据)

## 文档定位与证据边界

本文件同时承担两项职责：

1. **完整接口导航**：汇总 24 份 OpenAPI 规范以及前端实际调用但规范尚未覆盖的兼容接口。
2. **现网兼容说明**：保留原有 1–10 章中的请求参数、响应示例、历史拼写和联调约束。

接口状态仅说明仓库内的静态证据：

- `current` 与 `legacy` 表示当前前端代码存在相应调用，不等同于已完成真实环境联调。
- `deferred` 不得作为当前可用接口使用，需等待业务确认、后端实现或高风险联调。
- `target-state overlay` 是目标结构，不得覆盖同路径的现网 legacy 请求/响应约定。
- `legacy / OpenAPI gap` 表示调用证据存在，但当前漂移工具和 YAML 尚未覆盖；修改或移除前必须先补真实后端证据。

## 接口状态

| 状态                   | 数量 | 含义                                               | 使用规则                                |
| ---------------------- | ---: | -------------------------------------------------- | --------------------------------------- |
| `current`              |  107 | 资源式契约且前端代码已调用                         | 仍需通过环境联调才能确认部署可用性      |
| `legacy`               |   48 | 现网兼容契约且前端仍调用                           | 保留历史方法、路径和字段拼写            |
| `legacy / OpenAPI gap` |    4 | 前端通过路由常量或直接 `fetch` 调用，YAML 尚未登记 | 不得因 `api:drift` 通过而误删           |
| `deferred`             |   17 | 暂缓契约，当前代码不调用                           | 禁止按已上线接口使用                    |
| `target-state overlay` |    3 | 与 legacy 方法和路径重叠的认证目标态定义           | 只作迁移参考，不单独计入 176 个唯一接口 |

## 完整接口总览

本节按 `HTTP 方法 + 代理后路径` 去重，覆盖 **176** 个唯一接口：107 个 `current`、48 个 OpenAPI `legacy`、4 个 `legacy / OpenAPI gap`、17 个 `deferred`。另有 3 个认证接口同时存在 legacy 与 target-state 定义，合并在同一行说明，不重复计数。

> 字段级请求/响应模型以“来源”列中的 OpenAPI 文件为准；本节负责全量导航、状态识别与前端调用边界，不复制 24 份规范中的全部 schema。

### A. 认证与账号

登录、注册、登出、注册验证、邀请校验及认证目标态。（11 个唯一接口）

| 状态                                  | 方法   | 代理后路径                     | 功能             | 认证                    | operationId / 代码标识          | 来源                                                      |
| ------------------------------------- | ------ | ------------------------------ | ---------------- | ----------------------- | ------------------------------- | --------------------------------------------------------- |
| `current`                             | `GET`  | `/api/auth/invitations/{code}` | 验证邀请码       | Bearer                  | `validateInvitationCode`        | `docs/api/users-auth.yaml`                                |
| `current`                             | `POST` | `/api/auth/register/resend`    | 重发验证码       | Bearer                  | `resendVerificationCode`        | `docs/api/users-auth.yaml`                                |
| `current`                             | `POST` | `/api/auth/register/verify`    | 验证注册邮箱     | Bearer                  | `verifyRegistration`            | `docs/api/users-auth.yaml`                                |
| `legacy（另有 target-state overlay）` | `POST` | `/api/auth/login`              | 手机验证码登录   | 无需认证 / Bearer       | `legacySmsLogin / loginUser`    | `docs/api/auth-legacy.yaml`<br>`docs/api/users-auth.yaml` |
| `legacy（另有 target-state overlay）` | `POST` | `/api/auth/logout`             | 用户登出         | 规范未显式声明 / Bearer | `legacyLogout / logoutUser`     | `docs/api/auth-legacy.yaml`<br>`docs/api/users-auth.yaml` |
| `legacy（另有 target-state overlay）` | `POST` | `/api/auth/register`           | 用户注册         | 无需认证 / Bearer       | `legacyRegister / registerUser` | `docs/api/auth-legacy.yaml`<br>`docs/api/users-auth.yaml` |
| `legacy`                              | `POST` | `/api/auth/pwdlogin`           | 密码登录         | 无需认证                | `legacyPwdLogin`                | `docs/api/auth-legacy.yaml`                               |
| `legacy`                              | `POST` | `/api/auth/send`               | 发送短信验证码   | 无需认证                | `legacySendSmsCode`             | `docs/api/auth-legacy.yaml`                               |
| `deferred`                            | `POST` | `/api/auth/2fa/challenge`      | 下发二次验证挑战 | Bearer                  | `issueTwoFactorChallenge`       | `docs/api/users-auth.yaml`                                |
| `deferred`                            | `POST` | `/api/auth/2fa/verify`         | 验证二次验证码   | Bearer                  | `verifyTwoFactorCode`           | `docs/api/users-auth.yaml`                                |
| `deferred`                            | `POST` | `/api/auth/refresh`            | 刷新令牌         | Bearer                  | `refreshAccessToken`            | `docs/api/users-auth.yaml`                                |

### B. 用户资料

现网用户资料与资源式用户偏好。（7 个唯一接口）

| 状态      | 方法    | 代理后路径                  | 功能             | 认证           | operationId / 代码标识  | 来源                        |
| --------- | ------- | --------------------------- | ---------------- | -------------- | ----------------------- | --------------------------- |
| `current` | `GET`   | `/api/users/me`             | 获取当前用户信息 | Bearer         | `getCurrentUser`        | `docs/api/users-auth.yaml`  |
| `current` | `PATCH` | `/api/users/me`             | 更新当前用户资料 | Bearer         | `updateCurrentUser`     | `docs/api/users-auth.yaml`  |
| `current` | `GET`   | `/api/users/me/preferences` | 获取偏好设置     | Bearer         | `getUserPreferences`    | `docs/api/users-auth.yaml`  |
| `current` | `PUT`   | `/api/users/me/preferences` | 更新偏好设置     | Bearer         | `updateUserPreferences` | `docs/api/users-auth.yaml`  |
| `legacy`  | `GET`   | `/api/user/detail`          | 获取当前用户详情 | 规范未显式声明 | `legacyGetUserDetail`   | `docs/api/user-legacy.yaml` |
| `legacy`  | `POST`  | `/api/user/update`          | 更新用户信息     | 规范未显式声明 | `legacyUpdateUser`      | `docs/api/user-legacy.yaml` |
| `legacy`  | `POST`  | `/api/user/updatepwd`       | 修改密码         | 规范未显式声明 | `legacyUpdatePassword`  | `docs/api/auth-legacy.yaml` |

### C. 通知中心

现网 legacy 消息接口及尚未启用的资源式通知接口。（9 个唯一接口）

| 状态       | 方法   | 代理后路径                                 | 功能               | 认证           | operationId / 代码标识        | 来源                                |
| ---------- | ------ | ------------------------------------------ | ------------------ | -------------- | ----------------------------- | ----------------------------------- |
| `legacy`   | `GET`  | `/api/user/userhasdel/{messageId}`         | 删除单条消息       | 规范未显式声明 | `legacyDeleteMessage`         | `docs/api/notification-legacy.yaml` |
| `legacy`   | `GET`  | `/api/user/userhasdelall`                  | 清空所有消息       | 规范未显式声明 | `legacyDeleteAllMessages`     | `docs/api/notification-legacy.yaml` |
| `legacy`   | `GET`  | `/api/user/userhasread/{messageId}`        | 标记单条消息为已读 | 规范未显式声明 | `legacyMarkMessageRead`       | `docs/api/notification-legacy.yaml` |
| `legacy`   | `GET`  | `/api/user/userhasreadall`                 | 标记所有消息为已读 | 规范未显式声明 | `legacyMarkAllRead`           | `docs/api/notification-legacy.yaml` |
| `legacy`   | `GET`  | `/api/user/usermessagelist`                | 获取用户消息列表   | 规范未显式声明 | `legacyGetUserMessageList`    | `docs/api/notification-legacy.yaml` |
| `deferred` | `GET`  | `/api/notifications`                       | 获取通知列表       | Bearer         | `listNotifications`           | `docs/api/users-auth.yaml`          |
| `deferred` | `POST` | `/api/notifications/{notificationId}/read` | 标记通知为已读     | Bearer         | `markNotificationRead`        | `docs/api/users-auth.yaml`          |
| `deferred` | `POST` | `/api/notifications/channel-token`         | 获取通知流连接令牌 | Bearer         | `getNotificationChannelToken` | `docs/api/users-auth.yaml`          |
| `deferred` | `POST` | `/api/notifications/read-batch`            | 批量标记已读       | Bearer         | `markNotificationsReadBatch`  | `docs/api/users-auth.yaml`          |

### D. 邀请与推荐

邀请记录、邀请配置与推荐码生成。（3 个唯一接口）

| 状态      | 方法   | 代理后路径                    | 功能                 | 认证           | operationId / 代码标识     | 来源                        |
| --------- | ------ | ----------------------------- | -------------------- | -------------- | -------------------------- | --------------------------- |
| `current` | `POST` | `/api/referral/generate`      | 为当前用户生成推荐码 | Bearer         | `generateReferralCode`     | `docs/api/referrals.yaml`   |
| `legacy`  | `GET`  | `/api/user/user/inviteconfig` | 获取邀请配置         | 规范未显式声明 | `legacyGetInviteConfig`    | `docs/api/user-legacy.yaml` |
| `legacy`  | `GET`  | `/api/user/userinviteslist`   | 获取邀请记录列表     | 规范未显式声明 | `legacyGetUserInvitesList` | `docs/api/user-legacy.yaml` |

### E. 计费与额度

现网充值/流水、赠送额度及资源式账务能力。（17 个唯一接口）

| 状态       | 方法   | 代理后路径                       | 功能             | 认证           | operationId / 代码标识      | 来源                           |
| ---------- | ------ | -------------------------------- | ---------------- | -------------- | --------------------------- | ------------------------------ |
| `current`  | `GET`  | `/api/billing/grants`            | 获取赠送记录列表 | Bearer         | `listGrants`                | `docs/api/billing-grants.yaml` |
| `current`  | `POST` | `/api/billing/grants`            | 创建赠送记录     | Bearer         | `createGrant`               | `docs/api/billing-grants.yaml` |
| `current`  | `GET`  | `/api/billing/pricing`           | 查询套餐与价格   | Bearer         | `listPricingPlans`          | `docs/api/billing.yaml`        |
| `current`  | `GET`  | `/api/billing/summary`           | 获取账务概览     | Bearer         | `getBillingSummary`         | `docs/api/billing.yaml`        |
| `current`  | `GET`  | `/api/billing/top-ups/{orderId}` | 查询充值订单状态 | Bearer         | `getTopUpOrder`             | `docs/api/billing.yaml`        |
| `current`  | `GET`  | `/api/billing/transactions`      | 获取交易记录     | Bearer         | `listBillingTransactions`   | `docs/api/billing.yaml`        |
| `current`  | `GET`  | `/api/billing/usage`             | 查询余额使用详情 | Bearer         | `getBillingUsage`           | `docs/api/billing.yaml`        |
| `legacy`   | `POST` | `/api/recharge/createorder`      | 创建充值订单     | 规范未显式声明 | `legacyCreateOrder`         | `docs/api/billing-legacy.yaml` |
| `legacy`   | `GET`  | `/api/recharge/list`             | 获取充值套餐列表 | 规范未显式声明 | `legacyGetRechargePackages` | `docs/api/billing-legacy.yaml` |
| `legacy`   | `GET`  | `/api/recharge/orderquery`       | 查询订单支付状态 | 规范未显式声明 | `legacyQueryOrderStatus`    | `docs/api/billing-legacy.yaml` |
| `legacy`   | `GET`  | `/api/recharge/rechargeconfig`   | 获取充值配置     | 规范未显式声明 | `legacyGetRechargeConfig`   | `docs/api/billing-legacy.yaml` |
| `legacy`   | `GET`  | `/api/user/rechargelist`         | 获取充值记录列表 | 规范未显式声明 | `legacyGetRechargeList`     | `docs/api/billing-legacy.yaml` |
| `legacy`   | `GET`  | `/api/user/runningwater/list`    | 获取账户流水列表 | 规范未显式声明 | `legacyGetRunningWaterList` | `docs/api/billing-legacy.yaml` |
| `deferred` | `POST` | `/api/billing/refunds`           | 发起退款         | Bearer         | `createRefundRequest`       | `docs/api/billing.yaml`        |
| `deferred` | `POST` | `/api/billing/signature/verify`  | 校验签名示例     | Bearer         | `verifyBillingSignature`    | `docs/api/billing.yaml`        |
| `deferred` | `POST` | `/api/billing/top-ups`           | 创建充值订单     | Bearer         | `createTopUpOrder`          | `docs/api/billing.yaml`        |
| `deferred` | `POST` | `/api/billing/webhook`           | 支付回调         | Bearer         | `handleBillingWebhook`      | `docs/api/billing.yaml`        |

### F. 会话

资源式会话与现网 SESSION_ROUTES 兼容接口。（15 个唯一接口）

| 状态                   | 方法     | 代理后路径                                            | 功能                            | 认证           | operationId / 代码标识       | 来源                                                                                                                                                                          |
| ---------------------- | -------- | ----------------------------------------------------- | ------------------------------- | -------------- | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `current`              | `GET`    | `/api/conversations`                                  | 获取会话列表                    | Bearer         | `getConversations`           | `docs/api/conversations.yaml`                                                                                                                                                 |
| `current`              | `POST`   | `/api/conversations`                                  | 创建新会话                      | Bearer         | `createConversation`         | `docs/api/conversations.yaml`                                                                                                                                                 |
| `current`              | `DELETE` | `/api/conversations/{conversationId}`                 | 删除会话                        | Bearer         | `deleteConversation`         | `docs/api/conversations.yaml`                                                                                                                                                 |
| `current`              | `GET`    | `/api/conversations/{conversationId}`                 | 获取会话详情                    | Bearer         | `getConversation`            | `docs/api/conversations.yaml`                                                                                                                                                 |
| `current`              | `PATCH`  | `/api/conversations/{conversationId}`                 | 更新会话信息                    | Bearer         | `updateConversation`         | `docs/api/conversations.yaml`                                                                                                                                                 |
| `current`              | `GET`    | `/api/conversations/{conversationId}/attachments`     | 获取会话附件列表                | Bearer         | `getConversationAttachments` | `docs/api/conversations.yaml`                                                                                                                                                 |
| `current`              | `POST`   | `/api/conversations/{conversationId}/export`          | 导出会话                        | Bearer         | `exportConversation`         | `docs/api/conversations.yaml`                                                                                                                                                 |
| `current`              | `GET`    | `/api/conversations/{conversationId}/messages`        | 获取会话消息列表                | Bearer         | `getConversationMessages`    | `docs/api/conversations.yaml`                                                                                                                                                 |
| `current`              | `POST`   | `/api/conversations/{conversationId}/messages`        | 发送消息并触发模型响应          | Bearer         | `sendConversationMessage`    | `docs/api/conversations.yaml`                                                                                                                                                 |
| `current`              | `GET`    | `/api/conversations/{conversationId}/messages/stream` | 订阅消息生成流（SSE）           | Bearer         | `streamConversationMessage`  | `docs/api/conversations.yaml`                                                                                                                                                 |
| `legacy`               | `GET`    | `/api/user/user/projectdetail/{sessionId}`            | 获取会话详情（历史路径命名）    | 规范未显式声明 | `legacyGetSessionDetail`     | `docs/api/project-statistics-legacy.yaml`                                                                                                                                     |
| `legacy / OpenAPI gap` | `GET`    | `/api/user/user/projectlist`                          | 获取会话列表（SESSION_ROUTES）  | Bearer         | `codeOnlySessionList`        | `src/api/core/session-routes.ts`<br>`src/api/services/session.service.ts`                                                                                                     |
| `legacy`               | `GET`    | `/api/user/user/workflowdelete/{sessionId}`           | 删除会话（历史 GET 写操作）     | Bearer         | `legacyDeleteSession`        | `docs/api/project-statistics-legacy.yaml`<br>`src/api/services/session-service-requests.ts`<br>`src/api/services/session.service.ts`<br>`src/api/services/history.service.ts` |
| `legacy / OpenAPI gap` | `GET`    | `/api/user/user/workflowupd/{id}`                     | 更新会话名称（历史 GET 写操作） | Bearer         | `codeOnlyRenameSession`      | `src/api/core/session-routes.ts`<br>`src/api/services/session.service.ts`<br>`src/api/services/history.service.ts`                                                            |
| `legacy / OpenAPI gap` | `GET`    | `/api/user/user/workflowuploadfloder/{id}/{floderid}` | 移动会话（保留后端历史拼写）    | Bearer         | `codeOnlyMoveSession`        | `src/api/core/session-routes.ts`<br>`src/api/services/session.service.ts`<br>`src/api/services/history.service.ts`                                                            |

### G. 项目

资源式项目与现网 Folder 接口。（20 个唯一接口）

| 状态      | 方法     | 代理后路径                                           | 功能                           | 认证           | operationId / 代码标识          | 来源                                       |
| --------- | -------- | ---------------------------------------------------- | ------------------------------ | -------------- | ------------------------------- | ------------------------------------------ |
| `current` | `GET`    | `/api/projects`                                      | 获取项目列表                   | Bearer         | `getProjects`                   | `docs/api/projects.yaml`                   |
| `current` | `POST`   | `/api/projects`                                      | 创建项目                       | Bearer         | `createProject`                 | `docs/api/projects.yaml`                   |
| `current` | `DELETE` | `/api/projects/{projectId}`                          | 删除或归档项目                 | Bearer         | `deleteProject`                 | `docs/api/projects.yaml`                   |
| `current` | `GET`    | `/api/projects/{projectId}`                          | 获取项目详情                   | Bearer         | `getProjectDetail`              | `docs/api/projects.yaml`                   |
| `current` | `PATCH`  | `/api/projects/{projectId}`                          | 更新项目信息                   | Bearer         | `updateProject`                 | `docs/api/projects.yaml`                   |
| `current` | `GET`    | `/api/projects/{projectId}/attachments`              | 获取项目附件                   | Bearer         | `listProjectAttachments`        | `docs/api/projects.yaml`                   |
| `current` | `GET`    | `/api/projects/{projectId}/conversations`            | 获取项目关联的对话列表         | Bearer         | `listProjectConversations`      | `docs/api/projects.yaml`                   |
| `current` | `POST`   | `/api/projects/{projectId}/export`                   | 导出项目                       | Bearer         | `exportProject`                 | `docs/api/projects.yaml`                   |
| `current` | `GET`    | `/api/projects/{projectId}/summary`                  | 获取项目运行摘要               | Bearer         | `getProjectSummary`             | `docs/api/projects.yaml`                   |
| `current` | `GET`    | `/api/projects/{projectId}/workflows`                | 获取项目关联的工作流执行记录   | Bearer         | `listProjectWorkflows`          | `docs/api/projects.yaml`                   |
| `legacy`  | `POST`   | `/api/user/createfolder`                             | 创建项目（历史回退路径）       | Bearer         | `createLegacyFolderFallback`    | `docs/api/projects-legacy-fallbacks.yaml`  |
| `legacy`  | `GET`    | `/api/user/folderdel/{id}`                           | 软删除项目（历史回退路径）     | Bearer         | `deleteLegacyFolderFallback`    | `docs/api/projects-legacy-fallbacks.yaml`  |
| `legacy`  | `GET`    | `/api/user/folderdetail/{id}`                        | 获取项目详情（历史回退路径）   | Bearer         | `getLegacyFolderDetailFallback` | `docs/api/projects-legacy-fallbacks.yaml`  |
| `legacy`  | `GET`    | `/api/user/folderlist`                               | 获取项目列表（历史回退路径）   | Bearer         | `getLegacyFolderListFallback`   | `docs/api/projects-legacy-fallbacks.yaml`  |
| `legacy`  | `POST`   | `/api/user/user/createfolder`                        | 创建项目                       | Bearer         | `createLegacyFolder`            | `docs/api/projects-legacy-fallbacks.yaml`  |
| `legacy`  | `GET`    | `/api/user/user/folderarchive/{projectId}/{archive}` | 归档或恢复项目                 | 规范未显式声明 | `legacyArchiveFolder`           | `docs/api/project-statistics-legacy.yaml`  |
| `legacy`  | `GET`    | `/api/user/user/folderdel/{id}`                      | 软删除项目                     | Bearer         | `deleteLegacyFolder`            | `docs/api/projects-legacy-fallbacks.yaml`  |
| `legacy`  | `GET`    | `/api/user/user/folderdetail/{id}`                   | 获取项目详情                   | Bearer         | `getLegacyFolderDetail`         | `docs/api/projects-legacy-fallbacks.yaml`  |
| `legacy`  | `GET`    | `/api/user/user/folderlist`                          | 获取项目列表（分页/搜索/筛选） | Bearer         | `getLegacyFolderList`           | `docs/api/projects-legacy-folderlist.yaml` |
| `legacy`  | `GET`    | `/api/user/user/folderupd/{projectId}`               | 更新项目信息                   | 规范未显式声明 | `legacyUpdateFolder`            | `docs/api/project-statistics-legacy.yaml`  |

### H. 工作流

工作流列表、执行、执行记录、预设和工作流链。（8 个唯一接口）

| 状态      | 方法   | 代理后路径                                        | 功能                   | 认证   | operationId / 代码标识         | 来源                      |
| --------- | ------ | ------------------------------------------------- | ---------------------- | ------ | ------------------------------ | ------------------------- |
| `current` | `POST` | `/api/workflow-chains`                            | 保存工作流链定义       | Bearer | `createWorkflowChain`          | `docs/api/workflows.yaml` |
| `current` | `GET`  | `/api/workflow-executions/{executionId}`          | 查询工作流执行结果     | Bearer | `getWorkflowExecutionResult`   | `docs/api/workflows.yaml` |
| `current` | `GET`  | `/api/workflow-executions/{executionId}/progress` | 获取工作流执行进度     | Bearer | `getWorkflowExecutionProgress` | `docs/api/workflows.yaml` |
| `current` | `GET`  | `/api/workflow-presets`                           | 获取工作流链式调用预设 | Bearer | `getWorkflowPresets`           | `docs/api/workflows.yaml` |
| `current` | `GET`  | `/api/workflows`                                  | 分页查询工作流目录     | Bearer | `getWorkflows`                 | `docs/api/workflows.yaml` |
| `current` | `GET`  | `/api/workflows/{workflowId}`                     | 查看单个工作流详情     | Bearer | `getWorkflowDetail`            | `docs/api/workflows.yaml` |
| `current` | `POST` | `/api/workflows/{workflowId}/execute`             | 触发工作流执行         | Bearer | `executeWorkflow`              | `docs/api/workflows.yaml` |
| `current` | `GET`  | `/api/workflows/{workflowId}/executions`          | 获取工作流历史执行记录 | Bearer | `getWorkflowExecutions`        | `docs/api/workflows.yaml` |

### I. 对话流

Chatflow 管理、发布、预览、变量、版本和指令。（11 个唯一接口）

| 状态      | 方法     | 代理后路径                                 | 功能                     | 认证   | operationId / 代码标识       | 来源                      |
| --------- | -------- | ------------------------------------------ | ------------------------ | ------ | ---------------------------- | ------------------------- |
| `current` | `GET`    | `/api/chatflows`                           | 分页检索对话流模板       | Bearer | `listChatflows`              | `docs/api/chatflows.yaml` |
| `current` | `POST`   | `/api/chatflows`                           | 新建对话流模板           | Bearer | `createChatflow`             | `docs/api/chatflows.yaml` |
| `current` | `DELETE` | `/api/chatflows/{chatflowId}`              | 归档对话流               | Bearer | `archiveChatflow`            | `docs/api/chatflows.yaml` |
| `current` | `GET`    | `/api/chatflows/{chatflowId}`              | 获取对话流详情           | Bearer | `getChatflow`                | `docs/api/chatflows.yaml` |
| `current` | `PATCH`  | `/api/chatflows/{chatflowId}`              | 更新对话流草稿           | Bearer | `updateChatflow`             | `docs/api/chatflows.yaml` |
| `current` | `GET`    | `/api/chatflows/{chatflowId}/instructions` | 获取对话流关联的指令模板 | Bearer | `listChatflowInstructions`   | `docs/api/chatflows.yaml` |
| `current` | `PUT`    | `/api/chatflows/{chatflowId}/instructions` | 更新对话流的指令模板列表 | Bearer | `updateChatflowInstructions` | `docs/api/chatflows.yaml` |
| `current` | `POST`   | `/api/chatflows/{chatflowId}/preview`      | 预览对话流响应           | Bearer | `previewChatflow`            | `docs/api/chatflows.yaml` |
| `current` | `POST`   | `/api/chatflows/{chatflowId}/publish`      | 发布对话流版本           | Bearer | `publishChatflow`            | `docs/api/chatflows.yaml` |
| `current` | `GET`    | `/api/chatflows/{chatflowId}/variables`    | 聚合对话流所需变量       | Bearer | `getChatflowVariables`       | `docs/api/chatflows.yaml` |
| `current` | `GET`    | `/api/chatflows/{chatflowId}/versions`     | 查看对话流的历史版本     | Bearer | `listChatflowVersions`       | `docs/api/chatflows.yaml` |

### J. 指令库

资源式指令管理与 apicategories legacy 指令接口。（6 个唯一接口）

| 状态      | 方法    | 代理后路径                             | 功能           | 认证           | operationId / 代码标识     | 来源                                 |
| --------- | ------- | -------------------------------------- | -------------- | -------------- | -------------------------- | ------------------------------------ |
| `current` | `GET`   | `/api/instructions`                    | 获取指令列表   | Bearer         | `listInstructions`         | `docs/api/instructions.yaml`         |
| `current` | `POST`  | `/api/instructions`                    | 创建指令       | Bearer         | `createInstruction`        | `docs/api/instructions.yaml`         |
| `current` | `PATCH` | `/api/instructions/{instructionId}`    | 更新指令       | Bearer         | `updateInstruction`        | `docs/api/instructions.yaml`         |
| `legacy`  | `POST`  | `/api/apicategories/instructioncreate` | 创建指令       | 规范未显式声明 | `legacyCreateInstruction`  | `docs/api/apicategories-legacy.yaml` |
| `legacy`  | `POST`  | `/api/apicategories/instructiondelete` | 删除指令       | 规范未显式声明 | `legacyDeleteInstruction`  | `docs/api/apicategories-legacy.yaml` |
| `legacy`  | `GET`   | `/api/apicategories/instructionlist`   | 获取指令库列表 | 规范未显式声明 | `legacyGetInstructionList` | `docs/api/apicategories-legacy.yaml` |

### K. AI 分类与执行

分类、API 配置、Workflow/Chatflow 执行及异步查询。（8 个唯一接口）

| 状态     | 方法   | 代理后路径                                  | 功能                         | 认证           | operationId / 代码标识       | 来源                                 |
| -------- | ------ | ------------------------------------------- | ---------------------------- | -------------- | ---------------------------- | ------------------------------------ |
| `legacy` | `POST` | `/api/apicategories/apidetail`              | 获取 API 分类详情            | 规范未显式声明 | `legacyGetApiDetail`         | `docs/api/apicategories-legacy.yaml` |
| `legacy` | `POST` | `/api/apicategories/charteflowcreate`       | 创建并执行 Chatflow 对话     | 规范未显式声明 | `legacyCreateChatflow`       | `docs/api/apicategories-legacy.yaml` |
| `legacy` | `GET`  | `/api/apicategories/chatflowprompt`         | 获取 Chatflow 提示词配置     | 规范未显式声明 | `legacyGetChatflowPrompts`   | `docs/api/apicategories-legacy.yaml` |
| `legacy` | `GET`  | `/api/apicategories/configdetail`           | 获取模型偏好配置             | 规范未显式声明 | `legacyGetModelConfigDetail` | `docs/api/apicategories-legacy.yaml` |
| `legacy` | `POST` | `/api/apicategories/create`                 | 创建并执行同步工作流         | 规范未显式声明 | `legacyCreateWorkflow`       | `docs/api/apicategories-legacy.yaml` |
| `legacy` | `GET`  | `/api/apicategories/detail`                 | 获取模型分类列表（三级结构） | 规范未显式声明 | `legacyGetCategories`        | `docs/api/apicategories-legacy.yaml` |
| `legacy` | `GET`  | `/api/apicategories/queryprocess/{taskKey}` | 查询异步任务执行进度         | 规范未显式声明 | `legacyQueryProcess`         | `docs/api/apicategories-legacy.yaml` |
| `legacy` | `POST` | `/api/apicategories/userlikecategory`       | 点赞/收藏分类                | 规范未显式声明 | `legacyLikeCategory`         | `docs/api/apicategories-legacy.yaml` |

### L. 文件

资源式文件管理及现网上传接口。（12 个唯一接口）

| 状态       | 方法     | 代理后路径                            | 功能             | 认证           | operationId / 代码标识 | 来源                        |
| ---------- | -------- | ------------------------------------- | ---------------- | -------------- | ---------------------- | --------------------------- |
| `current`  | `GET`    | `/api/files`                          | 获取文件列表     | Bearer         | `listFiles`            | `docs/api/files.yaml`       |
| `current`  | `POST`   | `/api/files`                          | 上传文件         | Bearer         | `uploadFile`           | `docs/api/files.yaml`       |
| `current`  | `GET`    | `/api/files/{fileId}`                 | 下载文件         | Bearer         | `getFile`              | `docs/api/files.yaml`       |
| `current`  | `GET`    | `/api/files/{fileId}/metadata`        | 获取文件元数据   | Bearer         | `getFileMetadata`      | `docs/api/files.yaml`       |
| `current`  | `PATCH`  | `/api/files/{fileId}/metadata`        | 更新文件元数据   | Bearer         | `updateFileMetadata`   | `docs/api/files.yaml`       |
| `current`  | `GET`    | `/api/files/{fileId}/preview`         | 获取文件预览     | Bearer         | `getFilePreview`       | `docs/api/files.yaml`       |
| `current`  | `GET`    | `/api/files/{fileId}/share`           | 获取分享链接列表 | Bearer         | `listShareLinks`       | `docs/api/files.yaml`       |
| `current`  | `POST`   | `/api/files/{fileId}/share`           | 创建分享链接     | Bearer         | `createShareLink`      | `docs/api/files.yaml`       |
| `current`  | `DELETE` | `/api/files/{fileId}/share/{shareId}` | 撤销分享链接     | Bearer         | `revokeShareLink`      | `docs/api/files.yaml`       |
| `current`  | `POST`   | `/api/files/batch`                    | 批量上传文件     | Bearer         | `uploadFilesBatch`     | `docs/api/files.yaml`       |
| `legacy`   | `POST`   | `/api/user/upload`                    | 旧版用户文件上传 | 规范未显式声明 | `legacyUploadUserFile` | `docs/api/user-legacy.yaml` |
| `deferred` | `DELETE` | `/api/files/{fileId}`                 | 删除文件         | Bearer         | `deleteFile`           | `docs/api/files.yaml`       |

### M. 支持与反馈

支持工单、建议活动、投票及现网建议接口。（12 个唯一接口）

| 状态      | 方法    | 代理后路径                                      | 功能             | 认证           | operationId / 代码标识        | 来源                             |
| --------- | ------- | ----------------------------------------------- | ---------------- | -------------- | ----------------------------- | -------------------------------- |
| `current` | `GET`   | `/api/feedback/campaigns`                       | 获取建议征集活动 | Bearer         | `listFeedbackCampaigns`       | `docs/api/support-feedback.yaml` |
| `current` | `GET`   | `/api/feedback/suggestions`                     | 获取建议列表     | Bearer         | `listFeedbackSuggestions`     | `docs/api/support-feedback.yaml` |
| `current` | `POST`  | `/api/feedback/suggestions`                     | 提交建议         | Bearer         | `createFeedbackSuggestion`    | `docs/api/support-feedback.yaml` |
| `current` | `POST`  | `/api/feedback/suggestions/{suggestionId}/vote` | 为建议投票       | Bearer         | `voteFeedbackSuggestion`      | `docs/api/support-feedback.yaml` |
| `current` | `GET`   | `/api/support/knowledge-base`                   | 获取知识库分类   | Bearer         | `listKnowledgeBaseCategories` | `docs/api/support-feedback.yaml` |
| `current` | `GET`   | `/api/support/tickets`                          | 获取工单列表     | Bearer         | `listSupportTickets`          | `docs/api/support-feedback.yaml` |
| `current` | `POST`  | `/api/support/tickets`                          | 创建工单         | Bearer         | `createSupportTicket`         | `docs/api/support-feedback.yaml` |
| `current` | `GET`   | `/api/support/tickets/{ticketId}`               | 获取工单详情     | Bearer         | `getSupportTicket`            | `docs/api/support-feedback.yaml` |
| `current` | `PATCH` | `/api/support/tickets/{ticketId}`               | 更新工单状态     | Bearer         | `updateSupportTicket`         | `docs/api/support-feedback.yaml` |
| `current` | `GET`   | `/api/support/tickets/{ticketId}/messages`      | 获取工单会话     | Bearer         | `listTicketMessages`          | `docs/api/support-feedback.yaml` |
| `current` | `POST`  | `/api/support/tickets/{ticketId}/messages`      | 追加工单回复     | Bearer         | `replySupportTicket`          | `docs/api/support-feedback.yaml` |
| `legacy`  | `POST`  | `/api/usersuggestion/create`                    | 创建用户反馈建议 | 规范未显式声明 | `legacyCreateUserSuggestion`  | `docs/api/user-legacy.yaml`      |

### N. 性能

性能指标上报、查询、统计与数据清理。（6 个唯一接口）

| 状态       | 方法     | 代理后路径                       | 功能             | 认证   | operationId / 代码标识     | 来源                        |
| ---------- | -------- | -------------------------------- | ---------------- | ------ | -------------------------- | --------------------------- |
| `current`  | `DELETE` | `/api/performance/cleanup`       | 清理过期数据     | Bearer | `cleanupExpiredData`       | `docs/api/performance.yaml` |
| `current`  | `POST`   | `/api/performance/metrics`       | 提交性能指标     | Bearer | `submitPerformanceMetrics` | `docs/api/performance.yaml` |
| `current`  | `GET`    | `/api/performance/records`       | 查询性能记录     | Bearer | `getPerformanceRecords`    | `docs/api/performance.yaml` |
| `current`  | `GET`    | `/api/performance/slowest-pages` | 获取最慢的页面   | Bearer | `getSlowestPages`          | `docs/api/performance.yaml` |
| `current`  | `GET`    | `/api/performance/statistics`    | 获取性能统计信息 | Bearer | `getPerformanceStatistics` | `docs/api/performance.yaml` |
| `deferred` | `DELETE` | `/api/performance/clear-all`     | 清除所有数据     | Bearer | `clearAllPerformanceData`  | `docs/api/performance.yaml` |

### O. 用量洞察

用量汇总、分解、异常、Top 用户及导出。（5 个唯一接口）

| 状态      | 方法   | 代理后路径             | 功能             | 认证   | operationId / 代码标识 | 来源                           |
| --------- | ------ | ---------------------- | ---------------- | ------ | ---------------------- | ------------------------------ |
| `current` | `GET`  | `/api/usage/anomalies` | 异常检测         | Bearer | `getUsageAnomalies`    | `docs/api/usage-insights.yaml` |
| `current` | `GET`  | `/api/usage/breakdown` | 获取模块使用分解 | Bearer | `getUsageBreakdown`    | `docs/api/usage-insights.yaml` |
| `current` | `POST` | `/api/usage/export`    | 导出使用统计     | Bearer | `exportUsageData`      | `docs/api/usage-insights.yaml` |
| `current` | `GET`  | `/api/usage/summary`   | 获取总体使用概览 | Bearer | `getUsageSummary`      | `docs/api/usage-insights.yaml` |
| `current` | `GET`  | `/api/usage/users/top` | 获取高使用量用户 | Bearer | `getTopUsageUsers`     | `docs/api/usage-insights.yaml` |

### P. 数据治理与导出

删除治理、数据统计、数据导出与现网清空接口。（14 个唯一接口）

| 状态                   | 方法   | 代理后路径                                        | 功能                               | 认证           | operationId / 代码标识     | 来源                                      |
| ---------------------- | ------ | ------------------------------------------------- | ---------------------------------- | -------------- | -------------------------- | ----------------------------------------- |
| `current`              | `GET`  | `/api/data-deletion/audit`                        | 获取删除操作审计日志               | Bearer         | `getDeletionAuditLogs`     | `docs/api/data-deletion.yaml`             |
| `current`              | `GET`  | `/api/data-deletion/policies`                     | 获取删除策略列表                   | Bearer         | `listDeletionPolicies`     | `docs/api/data-deletion.yaml`             |
| `current`              | `GET`  | `/api/data-deletion/requests`                     | 获取删除请求列表                   | Bearer         | `listDeletionRequests`     | `docs/api/data-deletion.yaml`             |
| `current`              | `GET`  | `/api/data-deletion/requests/{requestId}`         | 获取删除请求详情                   | Bearer         | `getDeletionRequestDetail` | `docs/api/data-deletion.yaml`             |
| `current`              | `GET`  | `/api/data-deletion/requests/{requestId}/proof`   | 获取删除证明                       | Bearer         | `getDeletionProof`         | `docs/api/data-deletion.yaml`             |
| `current`              | `POST` | `/api/utilities/export/data`                      | 导出个人数据                       | Bearer         | `exportUserData`           | `docs/api/utilities.yaml`                 |
| `current`              | `GET`  | `/api/utilities/export/data/{taskId}`             | 查询数据导出任务                   | Bearer         | `getDataExportStatus`      | `docs/api/utilities.yaml`                 |
| `legacy`               | `POST` | `/api/user/user/data/clear`                       | 清空用户数据                       | 规范未显式声明 | `legacyClearUserData`      | `docs/api/user-legacy.yaml`               |
| `legacy`               | `GET`  | `/api/user/user/data/stats`                       | 获取用户数据统计                   | 规范未显式声明 | `legacyGetUserDataStats`   | `docs/api/user-legacy.yaml`               |
| `legacy / OpenAPI gap` | `GET`  | `/api/user/user/data/export`                      | 导出当前用户数据 ZIP（直接 fetch） | Bearer         | `codeOnlyExportUserData`   | `src/api/services/user-export.service.ts` |
| `deferred`             | `POST` | `/api/data-deletion/requests`                     | 创建删除请求                       | Bearer         | `createDeletionRequest`    | `docs/api/data-deletion.yaml`             |
| `deferred`             | `POST` | `/api/data-deletion/requests/{requestId}/approve` | 审批删除请求                       | Bearer         | `approveDeletionRequest`   | `docs/api/data-deletion.yaml`             |
| `deferred`             | `POST` | `/api/data-deletion/requests/{requestId}/execute` | 执行删除请求                       | Bearer         | `executeDeletionRequest`   | `docs/api/data-deletion.yaml`             |
| `deferred`             | `POST` | `/api/data-deletion/requests/{requestId}/restore` | 恢复已删除数据                     | Bearer         | `restoreDeletedData`       | `docs/api/data-deletion.yaml`             |

### Q. 工作台工具

帮助、版本说明、偏好、主题、提示和缓存。（10 个唯一接口）

| 状态      | 方法    | 代理后路径                              | 功能               | 认证   | operationId / 代码标识       | 来源                      |
| --------- | ------- | --------------------------------------- | ------------------ | ------ | ---------------------------- | ------------------------- |
| `current` | `POST`  | `/api/utilities/cache/clear`            | 清理缓存           | Bearer | `clearUserCache`             | `docs/api/utilities.yaml` |
| `current` | `GET`   | `/api/utilities/help-articles`          | 获取帮助文档列表   | Bearer | `listHelpArticles`           | `docs/api/utilities.yaml` |
| `current` | `GET`   | `/api/utilities/preferences/layout`     | 获取工作区布局设置 | Bearer | `getLayoutPreference`        | `docs/api/utilities.yaml` |
| `current` | `PUT`   | `/api/utilities/preferences/layout`     | 更新工作区布局设置 | Bearer | `updateLayoutPreference`     | `docs/api/utilities.yaml` |
| `current` | `GET`   | `/api/utilities/preferences/visibility` | 获取可见性配置     | Bearer | `getVisibilityPreference`    | `docs/api/utilities.yaml` |
| `current` | `PATCH` | `/api/utilities/preferences/visibility` | 更新可见性配置     | Bearer | `updateVisibilityPreference` | `docs/api/utilities.yaml` |
| `current` | `GET`   | `/api/utilities/release-notes`          | 获取版本差异信息   | Bearer | `getReleaseNotes`            | `docs/api/utilities.yaml` |
| `current` | `PUT`   | `/api/utilities/theme`                  | 切换主题           | Bearer | `updateTheme`                | `docs/api/utilities.yaml` |
| `current` | `GET`   | `/api/utilities/tooltips`               | 获取气泡提示配置   | Bearer | `getTooltipSettings`         | `docs/api/utilities.yaml` |
| `current` | `PATCH` | `/api/utilities/tooltips`               | 更新气泡提示配置   | Bearer | `updateTooltipSettings`      | `docs/api/utilities.yaml` |

### R. 运营状态

健康检查与运营状态上报。（2 个唯一接口）

| 状态      | 方法   | 代理后路径        | 功能             | 认证   | operationId / 代码标识 | 来源                       |
| --------- | ------ | ----------------- | ---------------- | ------ | ---------------------- | -------------------------- |
| `current` | `GET`  | `/api/ops/health` | 获取系统健康状态 | Bearer | `getHealthStatus`      | `docs/api/ops-status.yaml` |
| `current` | `POST` | `/api/ops/status` | 上报系统运营状态 | Bearer | `reportStatus`         | `docs/api/ops-status.yaml` |

## 现网兼容详细说明

以下保留原有 1–10 章的联调细节和锚点。除明确标为 `current` 的推荐码接口外，主要描述 legacy 或兼容路径；资源式 current/deferred 接口的完整字段模型请查阅上方总览所列 OpenAPI 来源。

## 术语说明

- **会话 (Session)**: Workflow 或 Chatflow 运行一次的全过程整体，包含输入信息和输出信息。
- **项目 (Project)**: 由多个相关会话组成的集合。

---

## 基础信息

| 项目                   | 值                                        | 说明                                                 |
| ---------------------- | ----------------------------------------- | ---------------------------------------------------- |
| 现网 legacy 后端源地址 | `https://lzhxpy.oasisintwrite.com`        | 来源于现有 legacy 规范；2026-09-01 已完成分层连通性与只读验证 |
| 浏览器/网关统一前缀    | `/api`                                    | 完整接口总览统一展示代理后的路径                     |
| `apiClient` 相对路径   | 例如 `/auth/login`                        | 与基础前缀组合后，浏览器请求通常为 `/api/auth/login` |
| 资源式规范示例域名     | `api.example.com`、`api.demo-platform.cn` | OpenAPI 中的设计示例，不作为已部署生产地址声明       |
| 认证方式               | Bearer Token（JWT）                       | 需要认证时使用 `Authorization: Bearer <token>`       |

路径判读规则：

1. “完整接口总览”统一使用浏览器/网关观察到的 `/api/...` 路径。
2. 原有详细章节保留传给 `apiClient` 的相对路径，例如 `/user/detail`；调用层负责补齐基础前缀。
3. 同一方法和代理路径若同时存在 legacy 与 target-state schema，以 legacy 约定作为当前兼容依据，目标态仅供迁移设计参考。
4. 生产可用性、认证策略和真实响应仍需测试环境或生产抓包验证，静态文档不替代运行时证据。

### 2026-09-01 真实后端验证快照

以下内容是当日运行时观察，不替代接口契约，也不承诺后续环境状态持续不变：

1. 现网后端域名及本地 production preview 的固定 `/api` 代理均可达；匿名 `GET /api/user/detail`、`GET /api/user/user/projectlist` 返回 `401`，CORS 预检返回 `200`。
2. 在用户本人完成登录且不读取、不保存令牌的前提下，只读验证 `GET /api/user/user/projectlist`、`GET /api/user/user/folderdetail/{id}`、`GET /api/user/user/projectdetail/{id}` 均返回 `200`。
3. `POST /api/auth/send` 的受控单次诊断成功到达后端但返回 `HTTP 500`，页面显示“短信发送失败”；阿里云 OpenAPI 同参数测试返回 HTTP `200` 和业务码 `isv.BUSINESS_LIMIT_CONTROL`，消息为“触发天级流控 Permits:10”。现网 `500` 是后端错误映射，不是网络故障或阿里云投递失败。测试号码加入频率白名单后，用户完成短信验证码登录，`POST /api/auth/login` 返回 `200`。
4. 阿里云只读查询确认签名“绿洲智业”和模板 `SMS_324425418` 均已通过；2026-09-01 聚合统计为发送 `13`、回执成功 `13`、失败 `0`、无回执 `0`。
5. 会话删除真实验证已完成：删除前完整独立会话基线为 `151` 条；仅新增一个可识别测试会话后为 `152` 条，创建接口与删除前详情接口均返回 `200`；用户在聊天中精确确认目标并在浏览器中人工确认后，`GET /api/user/user/workflowdelete/{sessionId}` 返回 `200`。
6. 删除后完整独立会话集合恢复为 `151` 条，测试会话详情返回 `404`，集合逐项比较证明仅该测试会话被移除，其他基线会话全部保留；受控恢复运行未创建第二个会话，也没有发生意外写请求或页面异常。

证据文件：

- `output/browser-evidence/2026-09-01-api-doc-real-backend-readonly/anonymous-backend-summary.json`
- `output/browser-evidence/2026-09-01-api-doc-real-backend-readonly/authenticated-browser-summary-run07.json`
- `output/browser-evidence/2026-09-01-api-doc-real-backend-delete/aliyun-sms-rate-limit-root-cause.json`
- `output/browser-evidence/2026-09-01-api-doc-real-backend-delete/disposable-session-delete-run07.json`
- `output/browser-evidence/2026-09-01-api-doc-real-backend-delete/disposable-session-delete-run10-recovery.json`

---

## 通用响应格式

legacy JSON 接口常见响应包络为：

```json
{
  "code": 200,
  "msg": "成功",
  "data": {}
}
```

响应形式必须以对应 OpenAPI 或本章的接口级说明为准，不存在适用于全部 176 个接口的单一包络：

1. legacy JSON 可返回上述 `code/msg/data`，也可能使用 `message` 或直接返回对象/数组。
2. `204 No Content` 成功响应没有响应体。
3. SSE 接口返回 `text/event-stream` 流，不按 JSON 包络解析。
4. 导出、下载接口可返回 ZIP 等二进制文件流。

### 写操作响应标准（导入要求）

适用操作：OpenAPI 明确声明返回 JSON 业务对象的 Create / Update / Patch / Archive；`204`、SSE 与二进制文件响应除外。
统一约束：

1. 写操作成功后，`data` 必须返回“操作后的完整资源对象”或“明确的批量结果对象”。
2. 不允许仅返回 `{}` 或 `null` 作为写操作成功响应。
3. 前端应以响应 `data` 作为状态更新依据。

### API Key 服务端托管与零透传（导入要求）

统一约束：

1. 用户端接口禁止返回、禁止接收、禁止透传任何第三方密钥类字段。
2. 前端仅传业务参数，后端按业务标识在服务端完成密钥读取与第三方调用。
3. 请求日志、错误日志、审计日志中不应出现明文密钥。
4. 第三方密钥仅允许存放在后端安全配置中心，不得下发至客户端或前端环境变量。

来源：`API接口需求落地映射-独立文件.md`

---

### 导入验收清单（映射文件第 3 章）

#### 3.1 写操作响应标准验收

1. 对纳入范围且声明 JSON 业务包络的写接口联调，确认成功响应 `data` 非空且为“操作后对象/结果对象”。
2. 前端状态更新以响应 `data` 为准，不依赖乐观更新假设。
3. 文档示例、后端实际响应、前端类型定义三者字段保持一致。

#### 3.2 零透传验收

1. `POST /apicategories/apidetail` 的响应抓包中不出现任何第三方密钥类字段。
2. `POST /apicategories/create` 请求若带第三方密钥类字段，后端行为需符合约定（忽略并告警或 `400`）。
3. 用户端全链路回归（加载 API 详情 -> 动态表单 -> 提交执行）功能保持可用。

---

## 1. 用户认证模块 (`/auth`)

> **章节状态：`legacy`。** 资源式认证目标态见完整接口总览；refresh/2FA 仍为 deferred。

### 1.1 发送短信验证码

**接口**: `POST /auth/send`

**需要认证**: 无需认证

**请求参数**:

```json
{
  "phone": "YOUR_PHONE_HERE"
}
```

**说明**:

- 阿里云默认对同一签名、同一号码的验证码限制为每个北京时间自然分钟 `1` 条、每个自然小时 `5` 条、天级窗口 `10` 条；同一号码接收所有短信发送方的验证码还受 `40` 条/天限制
- 天级限制按发送时间起连续 `24` 小时统计；测试时不得通过连续点击规避前端倒计时
- 验证码有效期5分钟
- 阿里云官方规则：[短信发送流控限制](https://help.aliyun.com/zh/document_detail/2881383.html)、[设置短信发送频率](https://help.aliyun.com/zh/sms/user-guide/configure-delivery-frequency-and-whitelist/)

**响应示例**:

```json
{
  "code": 200,
  "msg": "发送成功",
  "data": {}
}
```

**2026-09-01 现网偏差**:

- 本地 production preview 通过固定 `/api` 代理发出的单次 `POST /api/auth/send` 返回 `HTTP 500`，页面显示“短信发送失败”；没有网络层请求失败。
- 阿里云 OpenAPI 测试返回 HTTP `200`，但业务码为 `isv.BUSINESS_LIMIT_CONTROL`，消息为“触发天级流控 Permits:10”。签名、模板与当日已提交短信均正常，根因是同一签名和号码达到验证码日级频控。
- 当前后端把供应商业务流控错误统一转换成 `500`。目标行为应转换成 `429 Too Many Requests` 和稳定的应用错误码/用户提示，不向前端暴露供应商内部细节，也不得把该情况提示为断网或系统故障。
- 后端应在调用供应商前实施自己的分钟、小时和天级限流；前端收到稳定限流错误后停止即时重试，并提示“发送次数已达上限，请稍后或次日再试”。
- 2026-09-01 为专用测试号码配置频率白名单后，用户已完成短信验证码登录，登录接口返回 `200`，并据此完成一次性测试会话的创建、详情读取、人工确认删除及删除后全集合复核。频率白名单仅用于受控测试，不能替代后端对供应商流控错误的 `429` 映射与可操作用户提示。

---

### 1.2 用户注册

**接口**: `POST /auth/register`

**需要认证**: 无需认证（legacy）；target-state 支持注册校验流程

**请求参数**:

```json
{
  "phone": "YOUR_PHONE_HERE",
  "code": "123456",
  "password": "YOUR_PASSWORD_HERE",
  "invite_code": "ABC123"
}
```

**说明**:

- `phone`: 手机号（必填）
- `code`: 短信验证码（必填）
- `password`: 密码（必填）
- `invite_code`: 邀请码（可选）

**响应示例**:

```json
{
  "code": 200,
  "msg": "创建成功",
  "data": {
    "id": 1,
    "username": "user_abc123",
    "phone": "YOUR_PHONE_HERE",
    "balance": 0.0,
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

### 1.3 验证码登录

**接口**: `POST /auth/login`

**需要认证**: 无需认证

**请求参数**:

```json
{
  "phone": "YOUR_PHONE_HERE",
  "code": "123456"
}
```

**响应示例**:

```json
{
  "code": 200,
  "msg": "登录成功",
  "data": {
    "id": 1,
    "username": "user_abc123",
    "phone": "YOUR_PHONE_HERE",
    "balance": 100.0,
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

### 1.4 密码登录

**接口**: `POST /auth/pwdlogin`

**需要认证**: 无需认证

**请求参数**:

```json
{
  "phone": "YOUR_PHONE_HERE",
  "password": "YOUR_PASSWORD_HERE"
}
```

**响应示例**:

```json
{
  "code": 200,
  "msg": "登录成功",
  "data": {
    "id": 1,
    "username": "user_abc123",
    "phone": "YOUR_PHONE_HERE",
    "balance": 100.0,
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

### 1.5 用户登出

**接口**: `POST /auth/logout`

**需要认证**: legacy OpenAPI 未显式声明；target-state 要求 Bearer Token

**响应示例**:

```json
{
  "code": 200,
  "msg": "登出成功",
  "data": {}
}
```

---

## 2. 用户信息模块 (`/user`)

> **章节状态：`legacy`。** 资源式用户资料与偏好接口见“用户资料”总览。

### 2.1 获取用户详情

**接口**: `GET /user/detail`

**需要认证**: OpenAPI 未显式声明；`apiClient` 有令牌时会附带 Bearer Token

**响应示例**:

```json
{
  "code": 200,
  "msg": "成功",
  "data": {
    "username": "user_abc123",
    "avatar": "https://example.com/avatar.jpg",
    "phone": "YOUR_PHONE_HERE",
    "email": "user@example.com",
    "balance": 100.5,
    "invite_code": "ABC12345"
  }
}
```

---

### 2.2 上传文件

**接口**: `POST /user/upload`

**需要认证**: OpenAPI 未显式声明；`apiClient` 有令牌时会附带 Bearer Token

**请求类型**: `multipart/form-data`

**请求参数**:

- `file`: 文件对象（必填）

**响应示例**:

```json
{
  "code": 200,
  "msg": "上传成功",
  "data": {
    "url": "https://example.com/uploads/file.jpg",
    "filename": "file.jpg"
  }
}
```

---

### 2.3 更新用户信息

**接口**: `POST /user/update`

**需要认证**: OpenAPI 未显式声明；`apiClient` 有令牌时会附带 Bearer Token

**请求参数**:

```json
{
  "avatar": "https://example.com/avatar.jpg",
  "username": "新用户名",
  "phone": "YOUR_PHONE_HERE",
  "email": "new@example.com"
}
```

**说明**:

- `username`, `phone`, `email` 为必填项
- 若不修改某项，请传入原值

**响应示例**:

```json
{
  "code": 200,
  "msg": "更新成功",
  "data": {
    "id": 1,
    "username": "新用户名",
    "avatar": "https://example.com/avatar.jpg",
    "phone": "YOUR_PHONE_HERE",
    "email": "new@example.com",
    "balance": 100.5,
    "invite_code": "ABC12345",
    "updated_at": "2026-02-14T10:30:00"
  }
}
```

---

### 2.4 修改密码

**接口**: `POST /user/updatepwd`

**需要认证**: OpenAPI 未显式声明；`apiClient` 有令牌时会附带 Bearer Token

**请求参数**:

```json
{
  "password": "YOUR_PASSWORD_HERE",
  "newpasssword": "新密码",
  "truepassword": "确认新密码"
}
```

**响应示例**:

```json
{
  "code": 200,
  "msg": "更新成功",
  "data": {
    "id": 1,
    "password_updated_at": "2026-02-14T10:35:00"
  }
}
```

---

## 3. 用户消息模块

> **章节状态：`legacy`。** 写操作使用 GET 是现网历史行为；资源式通知接口仍为 deferred。

### 3.1 获取用户消息列表

**接口**: `GET /user/usermessagelist`

**需要认证**: OpenAPI 未显式声明；`apiClient` 有令牌时会附带 Bearer Token

**查询参数**:

- `page`: 页码（默认1）
- `limit`: 每页数量（默认15，最大100）

**响应结构**: 前端兼容顶层 `{total, items}` 与 `{code, msg/message, data: {total, items}}` 两种结构；以下展示包络形式。

- `type`: 消息类型（0=全部，1=未读）

**响应示例**:

```json
{
  "code": 200,
  "msg": "成功",
  "data": {
    "total": 50,
    "items": [
      {
        "id": 1,
        "title": "系统通知",
        "content": "欢迎使用系统",
        "is_read": 0,
        "created_at": "2024-01-01T12:00:00"
      }
    ]
  }
}
```

---

### 3.2 标记消息已读

**接口**: `GET /user/userhasread/{id}`

**需要认证**: OpenAPI 未显式声明；`apiClient` 有令牌时会附带 Bearer Token

**路径参数**:

- `id`: 消息ID

**响应示例**:

```json
{
  "code": 200,
  "msg": "成功",
  "data": {
    "id": 1,
    "title": "系统通知",
    "content": "欢迎使用系统",
    "is_read": 1,
    "updated_at": "2026-02-14T10:40:00"
  }
}
```

---

### 3.3 全部标记已读

**接口**: `GET /user/userhasreadall`

**需要认证**: OpenAPI 未显式声明；`apiClient` 有令牌时会附带 Bearer Token

**响应示例**:

```json
{
  "code": 200,
  "msg": "成功",
  "data": {
    "updated_count": 15,
    "is_all_read": true,
    "updated_at": "2026-02-14T10:41:00"
  }
}
```

---

### 3.4 删除消息

**接口**: `GET /user/userhasdel/{id}`

**需要认证**: OpenAPI 未显式声明；`apiClient` 有令牌时会附带 Bearer Token

**路径参数**:

- `id`: 消息ID

**响应示例**:

```json
{
  "code": 200,
  "msg": "成功",
  "data": {
    "id": 1,
    "title": "系统通知",
    "content": "欢迎使用系统",
    "is_deleted": 1,
    "updated_at": "2026-02-14T10:42:00"
  }
}
```

---

### 3.5 删除全部消息

**接口**: `GET /user/userhasdelall`

**需要认证**: OpenAPI 未显式声明；`apiClient` 有令牌时会附带 Bearer Token

**响应示例**:

```json
{
  "code": 200,
  "msg": "成功",
  "data": {
    "deleted_count": 25,
    "updated_at": "2026-02-14T10:43:00"
  }
}
```

---

## 4. 用户邀请模块

> **章节状态：混合。** 4.1–4.2 为 legacy，4.3 推荐码接口为 current。

### 4.1 获取邀请记录列表

**接口**: `GET /user/userinviteslist`

**需要认证**: OpenAPI 未显式声明；`apiClient` 有令牌时会附带 Bearer Token

**查询参数**:

- `page`: 页码（默认1）
- `limit`: 每页数量（默认15，最大100）

**响应示例**:

```json
{
  "code": 200,
  "msg": "成功",
  "data": {
    "total": 10,
    "items": [
      {
        "id": 1,
        "invitee_username": "user123",
        "reward_amount": 10.0,
        "status": "paid",
        "invited_at": "2024-01-01T12:00:00"
      }
    ]
  }
}
```

---

### 4.2 获取邀请配置

**接口**: `GET /user/user/inviteconfig`

**需要认证**: OpenAPI 未显式声明；`apiClient` 有令牌时会附带 Bearer Token

**响应示例**:

```json
{
  "code": 200,
  "msg": "成功",
  "data": {
    "is_active": 1,
    "referrer_reward": 10.0,
    "invitee_reward": 5.0,
    "usage_limit": 100,
    "valid_days": 30,
    "reward_trigger": "on_register",
    "code_pattern": 1
  }
}
```

---

### 4.3 生成推荐码

> **接口状态：`current`。** OpenAPI 来源：`docs/api/referrals.yaml`。

**接口**: `POST /api/referral/generate`

**需要认证**: ✅

**请求参数**: 无（发送空 JSON 对象 `{}`）

**说明**:

- 当当前账户尚无推荐码时，由后端生成并分配专属推荐码。
- 前端不得在本地随机生成或伪造推荐码。

**响应示例**:

```json
{
  "success": true,
  "referralCode": {
    "code": "REF123ABC",
    "maxUses": 10,
    "rewardAmount": 50,
    "createdAt": "2024-10-04"
  }
}
```

---

## 5. 充值模块 (`/recharge`)

> **章节状态：`legacy`。** 资源式 billing 接口包含 current 与 deferred，详见“计费与额度”总览。

### 5.1 获取充值套餐列表

**接口**: `GET /recharge/list`

**需要认证**: OpenAPI 未显式声明；`apiClient` 有令牌时会附带 Bearer Token

**响应示例**:

```json
{
  "code": 200,
  "msg": "成功",
  "data": {
    "total": 3,
    "items": [
      {
        "id": 1,
        "amount": 10.0,
        "bonus_amount": 1.0,
        "description": "基础套餐"
      },
      {
        "id": 2,
        "amount": 50.0,
        "bonus_amount": 10.0,
        "description": "推荐套餐"
      },
      {
        "id": 3,
        "amount": 100.0,
        "bonus_amount": 30.0,
        "description": "豪华套餐"
      }
    ]
  }
}
```

---

### 5.2 获取充值配置

**接口**: `GET /recharge/rechargeconfig`

**需要认证**: OpenAPI 未显式声明；`apiClient` 有令牌时会附带 Bearer Token

**响应示例**:

```json
{
  "code": 200,
  "msg": "成功",
  "data": {
    "id": 1,
    "min_amount": 1.0,
    "max_amount": 10000.0,
    "allow_decimal": 1,
    "min_bonus_eligible_amount": 100.0,
    "rate": 10,
    "enable_bonus": 1,
    "is_enabled": 1,
    "updated_at": "2026-02-14T10:00:00"
  }
}
```

**字段说明**:

- `allow_decimal`: `0` 仅允许整数，`1` 允许小数。
- `min_bonus_eligible_amount`: 享受赠送的最低充值金额；`0` 表示无门槛。
- `rate`: 赠送比例（百分比）。
- `enable_bonus`: `0` 不享受赠送，`1` 享受赠送。
- `is_enabled`: `0` 关闭自定义充值，`1` 开启自定义充值。

---

### 5.3 创建充值订单

**接口**: `POST /recharge/createorder`

**需要认证**: OpenAPI 未显式声明；`apiClient` 有令牌时会附带 Bearer Token

**请求参数**:

```json
{
  "amount": 100.0,
  "bonus_amount": 10.0,
  "type": "1"
}
```

**说明**:

- `amount`: 充值金额
- `bonus_amount`: 赠送金额
- `type`: 支付类型（1=微信）(2=支付宝)

**响应示例**:

```json
{
  "code": 200,
  "msg": "成功",
  "data": {
    "out_trade_no": "ORDER20240101123456",
    "code_url": "weixin://wxpay/bizpayurl?pr=xxxxx",
    "message": "请扫描二维码支付"
  }
}
```

---

### 5.4 查询订单状态

**接口**: `GET /recharge/orderquery`

**需要认证**: OpenAPI 未显式声明；`apiClient` 有令牌时会附带 Bearer Token

**查询参数**:

- `order_no`: 订单号

**响应示例**:

```json
{
  "code": 200,
  "msg": "成功",
  "data": 0
}
```

**说明**:

- `data`: 订单状态 (0=未支付, 1=已支付, etc.)

**订单状态说明**:

- `0`: 待支付
- `1`: 已支付
- `2`: 支付失败

---

### 5.5 获取充值记录列表

**接口**: `GET /user/rechargelist`

**需要认证**: OpenAPI 未显式声明；`apiClient` 有令牌时会附带 Bearer Token

**查询参数**:

- `page`: 页码（默认1）
- `limit`: 每页数量（默认15，最大100）

**响应兼容**: 前端同时兼容直接返回分页对象，以及 `{ "code": 0|200, "data": { ... } }` 包装形式。

**响应示例**:

```json
{
  "code": 200,
  "msg": "成功",
  "data": {
    "total": 20,
    "items": [
      {
        "id": 1,
        "order_no": "ORD20240101123456",
        "amount": 100.0,
        "bonus_amount": 10.0,
        "status": 1,
        "pay_time": "2024-01-01T12:00:00"
      }
    ]
  }
}
```

---

### 5.6 获取账户流水列表

**接口**: `GET /user/runningwater/list`

**需要认证**: OpenAPI 未显式声明；`apiClient` 有令牌时会附带 Bearer Token

**查询参数**:

- `page`: 页码（默认1）。
- `limit`: 每页数量（默认20）。
- `type`: 流水类型，可选值为 `consumption`（消费）、`topup`（充值）、`give`（赠送）、`refund`（退费）；不传表示全部。

**响应结构**: 前端兼容顶层 `{total, items}` 与 `{code, msg/message, data: {total, items}}` 两种结构。

**响应示例**:

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "total": 8,
    "items": [
      {
        "id": 93,
        "uid": 2,
        "username": "user_d5itld",
        "title": "",
        "link_id": 99,
        "type": "消费",
        "money": 1,
        "balance": 0,
        "pm": 0,
        "create_time": "2026-01-24T09:25:30"
      },
      {
        "id": 92,
        "uid": 2,
        "username": "user_d5itld",
        "title": "",
        "link_id": 98,
        "type": "消费",
        "money": 1,
        "balance": 1,
        "pm": 0,
        "create_time": "2026-01-24T09:23:51"
      },
      {
        "id": 91,
        "uid": 2,
        "username": "user_d5itld",
        "title": "",
        "link_id": 97,
        "type": "消费",
        "money": 1,
        "balance": 2,
        "pm": 0,
        "create_time": "2026-01-24T09:21:30"
      },
      {
        "id": 34,
        "uid": 2,
        "username": "user_d5itld",
        "title": "",
        "link_id": 39,
        "type": "消费",
        "money": 3,
        "balance": 3,
        "pm": 0,
        "create_time": "2026-01-10T13:48:00"
      },
      {
        "id": 33,
        "uid": 2,
        "username": "user_d5itld",
        "title": "",
        "link_id": 38,
        "type": "消费",
        "money": 1,
        "balance": 6,
        "pm": 0,
        "create_time": "2026-01-10T13:45:23"
      },
      {
        "id": 32,
        "uid": 2,
        "username": "user_d5itld",
        "title": "",
        "link_id": 37,
        "type": "消费",
        "money": 1,
        "balance": 7,
        "pm": 0,
        "create_time": "2026-01-10T06:58:48"
      },
      {
        "id": 31,
        "uid": 2,
        "username": "user_d5itld",
        "title": "",
        "link_id": 36,
        "type": "消费",
        "money": 1,
        "balance": 8,
        "pm": 0,
        "create_time": "2026-01-10T06:57:49"
      },
      {
        "id": 20,
        "uid": 2,
        "username": "user_d5itld",
        "title": "",
        "link_id": 25,
        "type": "消费",
        "money": 1,
        "balance": 9,
        "pm": 0,
        "create_time": "2026-01-09T08:25:34"
      }
    ]
  }
}
```

## 6. 会话管理模块

> **章节状态：`legacy` / `legacy / OpenAPI gap`。** 资源式 Conversations API 见“会话”总览。

### 6.1 获取会话详情

> **接口状态：`legacy`。** OpenAPI 来源：`docs/api/project-statistics-legacy.yaml`。历史路径虽命名为 `projectdetail`，资源语义实际为会话；项目详情使用 `folderdetail`。

获取指定会话的完整信息，包括输入参数、工作流响应、提取的答案和文件等。

**接口**: `GET /user/user/projectdetail/{id}`

**需要认证**: OpenAPI 未显式声明；`apiClient` 有令牌时会附带 Bearer Token

**路径参数**:

| 参数名 | 类型    | 必填 | 描述          |
| ------ | ------- | ---- | ------------- |
| id     | Integer | 是   | 会话的唯一 ID |

**响应兼容**: 可能直接返回会话对象，也可能返回 `{ "code": 0|200, "data": { ... } }` 包装形式；前端兼容两种结构。

**响应示例**:

```json
{
  "code": 200,
  "msg": "成功",
  "data": {
    "id": 456,
    "name": "AI 分析项目",
    "inputs": {
      "query": "专利分析",
      "param1": "value1"
    },
    "response": {
      "result": "分析结果...",
      "status": "success"
    },
    "answer_text": "这是提取出来的回答文本",
    "file_url": "https://example.com/files/result.pdf",
    "type": 1,
    "folder_id": 123
  }
}
```

**字段说明**:

| 字段        | 类型    | 描述                             |
| ----------- | ------- | -------------------------------- |
| id          | Integer | 会话 ID                          |
| name        | String  | 会话名称                         |
| inputs      | Object  | 用户输入的参数集合               |
| response    | Object  | 工作流返回的结果集合             |
| answer_text | String  | 提取出来的回答文本               |
| file_url    | String  | 提取出来的文件 URL               |
| type        | Integer | 会话类型：1=workflow，2=chatflow |
| folder_id   | Integer | 所属项目 ID                      |

**错误场景**:

- `404 Not Found`: 会话 ID 不存在或不属于该用户

---

### 6.2 获取会话列表

> **接口状态：`legacy / OpenAPI gap`。** 路径由 `SESSION_ROUTES.list` 调用，当前 OpenAPI 未登记。

获取会话列表，支持分页、按项目筛选和关键词搜索。

**接口**: `GET /user/user/projectlist`

**需要认证**: ✅

**查询参数**:

| 参数名    | 类型    | 必填 | 描述               |
| --------- | ------- | ---- | ------------------ |
| page      | Integer | 否   | 页码，默认 1       |
| limit     | Integer | 否   | 每页数量，默认 15  |
| folder_id | Integer | 否   | 按项目 ID 筛选会话 |
| keyword   | String  | 否   | 按会话名称搜索     |

**响应示例**:

```json
{
  "code": 200,
  "msg": "成功",
  "data": {
    "total": 50,
    "items": [
      {
        "id": 456,
        "name": "AI 分析项目",
        "folder_id": 123,
        "type": 1,
        "created_at": "2024-02-01T09:00:00",
        "answer_text": "分析结果...",
        "file_url": "https://example.com/files/result.pdf"
      },
      {
        "id": 457,
        "name": "文档生成项目",
        "folder_id": 123,
        "type": 2,
        "created_at": "2024-02-02T10:30:00",
        "answer_text": null,
        "file_url": null
      }
    ]
  }
}
```

**字段说明**:

| 字段                | 类型     | 描述                             |
| ------------------- | -------- | -------------------------------- |
| total               | Integer  | 总记录数                         |
| items               | Array    | 会话列表                         |
| items[].id          | Integer  | 会话 ID                          |
| items[].name        | String   | 会话名称                         |
| items[].folder_id   | Integer  | 所属项目 ID                      |
| items[].type        | Integer  | 会话类型：1=workflow，2=chatflow |
| items[].created_at  | DateTime | 创建时间                         |
| items[].answer_text | String   | 回答文本                         |
| items[].file_url    | String   | 文件 URL                         |

---

### 6.3 更新会话名称

> **接口状态：`legacy / OpenAPI gap`。** 路径由 `SESSION_ROUTES.rename` 调用，当前 OpenAPI 未登记。

重命名指定会话。

**接口**: `GET /user/user/workflowupd/{id}`

**需要认证**: ✅

**路径参数**:

| 参数名 | 类型    | 必填 | 描述    |
| ------ | ------- | ---- | ------- |
| id     | Integer | 是   | 会话 ID |

**查询参数**:

| 参数名 | 类型   | 必填 | 描述         |
| ------ | ------ | ---- | ------------ |
| name   | String | 是   | 新的会话名称 |

**响应示例**:

```json
{
  "code": 200,
  "msg": "成功",
  "data": {
    "id": 456,
    "name": "新的会话名称",
    "folder_id": 123,
    "type": 1,
    "updated_at": "2026-02-14T10:45:00"
  }
}
```

---

### 6.4 删除会话

> **接口状态：`legacy`。** OpenAPI 来源：`docs/api/project-statistics-legacy.yaml`。这是当前会话删除路径，属于历史 GET 写操作；`DELETE /api/projects/{projectId}` 仅用于删除或归档项目，禁止用于删除会话。

删除指定会话。该历史接口使用 GET 触发写操作，调用方不得预取或缓存此请求；当前前端统一请求入口固定使用 `cache: no-store`。

**接口**: `GET /user/user/workflowdelete/{sessionId}`

**需要认证**: ✅

**路径参数**:

| 参数名    | 类型    | 必填 | 描述    |
| --------- | ------- | ---- | ------- |
| sessionId | Integer | 是   | 会话 ID |

**响应示例**:

```json
{
  "code": 200,
  "msg": "删除成功",
  "data": {
    "id": 456,
    "name": "AI 分析项目",
    "folder_id": 123,
    "type": 1,
    "is_deleted": 1,
    "updated_at": "2026-02-14T10:46:00"
  }
}
```

**数据保留边界**: 仓库静态证据无法确认后端采用软删除还是物理删除；必须以运行时联调和后端实现为准。

---

### 6.5 移动会话到其他项目

> **接口状态：`legacy / OpenAPI gap`。** 路径由 `SESSION_ROUTES.move` 调用，保留后端历史拼写 `floder`。

将会话移动到指定的项目。

**接口**: `GET /user/user/workflowuploadfloder/{id}/{floderid}`

**需要认证**: ✅

**路径参数**:

| 参数名   | 类型    | 必填 | 描述        |
| -------- | ------- | ---- | ----------- |
| id       | Integer | 是   | 会话 ID     |
| floderid | Integer | 是   | 目标项目 ID |

**响应示例**:

```json
{
  "code": 200,
  "msg": "成功",
  "data": {
    "id": 456,
    "name": "AI 分析项目",
    "folder_id": 321,
    "type": 1,
    "updated_at": "2026-02-14T10:47:00"
  }
}
```

---

## 7. 项目/工作流管理模块

> **章节状态：`legacy`。** 资源式 Projects 与 Workflows API 分别见对应总览。

### 7.1 创建项目

**接口**: `POST /user/user/createfolder`

**需要认证**: ✅

**请求参数**:

```json
{
  "id": 0,
  "name": "我的项目",
  "coustomer_name": "",
  "parent_id": 0
}
```

**响应示例**:

```json
{
  "code": 200,
  "msg": "成功",
  "data": {
    "id": 123,
    "name": "我的项目",
    "coustomer_name": "",
    "parent_id": 0,
    "archive": 0,
    "child_count": 0,
    "project_count": 0,
    "has_children": false,
    "owner_id": 1,
    "created_at": "2026-02-14T10:50:00",
    "updated_at": "2026-02-14T10:50:00"
  }
}
```

---

### 7.2 获取项目列表

**接口**: `GET /user/user/folderlist`

**需要认证**: ✅

**查询参数**:

| 参数名    | 类型    | 必填 | 默认值 | 说明                                                            |
| --------- | ------- | ---- | ------ | --------------------------------------------------------------- |
| parent_id | Integer | 否   | `0`    | 父项目 ID，`0` 表示根项目。用于按需懒加载子项目。               |
| page      | Integer | 否   | `1`    | 页码，从 1 开始。                                               |
| limit     | Integer | 否   | `15`   | 每页数量，范围 `1-100`。                                        |
| keyword   | String  | 否   | 空     | 关键字搜索，匹配 `name` 与 `coustomer_name`，自动 trim 后生效。 |
| archive   | Integer | 否   | 全部   | 归档状态筛选，`0=进行中`、`1=已归档`。                          |

**响应示例**:

```json
{
  "code": 200,
  "msg": "成功",
  "data": {
    "total": 45,
    "items": [
      {
        "id": 1,
        "name": "专利项目",
        "coustomer_name": "客户A",
        "parent_id": 0,
        "archive": 0,
        "child_count": 2,
        "project_count": 8,
        "has_children": true
      }
    ]
  }
}
```

**字段说明（items）**:

| 字段           | 类型    | 描述                                         |
| -------------- | ------- | -------------------------------------------- |
| id             | Integer | 项目 ID                                      |
| name           | String  | 项目名称                                     |
| coustomer_name | String  | 客户名称                                     |
| parent_id      | Integer | 父项目 ID，`0` 表示根项目                    |
| archive        | Integer | 归档状态，`0=激活`，`1=归档`                 |
| child_count    | Integer | 子项目数量                                   |
| project_count  | Integer | 项目下会话数量                               |
| has_children   | Boolean | 是否有子项目（前端用于控制“展开子项目”按钮） |

**规则说明**:

1. 默认排序：`id DESC`。
2. `keyword` 为空字符串时不参与过滤。
3. 分页在过滤后执行，`data.total` 返回过滤后的总数。

**请求示例**:

```bash
# 获取根项目列表（默认分页）
GET /user/user/folderlist

# 搜索项目名称（自动 trim）
GET /user/user/folderlist?keyword=项目

# 仅查看未归档项目
GET /user/user/folderlist?archive=0

# 懒加载指定父项目的子项目
GET /user/user/folderlist?parent_id=123&page=1&limit=20

# 组合筛选：关键字 + 归档状态 + 分页
GET /user/user/folderlist?keyword=客户&archive=0&page=1&limit=15
```

**兼容性说明**:

- 旧版返回：`data` 为数组。
- 新版返回：`data` 为对象，包含 `total` 与 `items`。
- 前端升级时需从 `response.data.items` 读取列表数据，`response.data.total` 读取总数。

---

### 7.3 归档项目

**接口**: `GET /user/user/folderarchive/{id}/{archive}`

**需要认证**: OpenAPI 未显式声明；`apiClient` 有令牌时会附带 Bearer Token

**路径参数**:

- `id`: 项目ID
- `archive`: 归档状态（0=未归档，1=已归档）

**响应示例**:

```json
{
  "code": 200,
  "msg": "成功",
  "data": {
    "id": 123,
    "name": "专利项目",
    "coustomer_name": "客户A",
    "parent_id": 0,
    "archive": 1,
    "child_count": 2,
    "project_count": 8,
    "has_children": true,
    "owner_id": 1,
    "updated_at": "2026-02-14T10:51:00"
  }
}
```

---

### 7.4 更新项目名称

**接口**: `GET /user/user/folderupd/{id}`

**需要认证**: OpenAPI 未显式声明；`apiClient` 有令牌时会附带 Bearer Token

**查询参数**:

- `name`: 新名称（可选）
- `coustomer_name`: 客户名称（可选）

**响应示例**:

```json
{
  "code": 200,
  "msg": "成功",
  "data": {
    "id": 123,
    "name": "新项目名称",
    "coustomer_name": "客户B",
    "parent_id": 0,
    "archive": 0,
    "child_count": 2,
    "project_count": 8,
    "has_children": true,
    "owner_id": 1,
    "updated_at": "2026-02-14T10:52:00"
  }
}
```

---

### 7.5 获取项目详情

获取指定项目的详细信息，包括子项目数量与该项目下的会话数量。

**接口**: `GET /user/user/folderdetail/{id}`

**需要认证**: ✅

**路径参数**:

| 参数名 | 类型    | 必填 | 描述          |
| ------ | ------- | ---- | ------------- |
| id     | Integer | 是   | 项目的唯一 ID |

**响应示例**:

```json
{
  "code": 200,
  "msg": "成功",
  "data": {
    "id": 123,
    "name": "专利项目",
    "coustomer_name": "客户A",
    "parent_id": 0,
    "archive": 0,
    "child_count": 2,
    "project_count": 5,
    "has_children": true,
    "owner_id": 1,
    "created_at": "2026-02-14T10:50:00",
    "updated_at": "2026-02-14T10:52:00"
  }
}
```

**字段说明**:

| 字段           | 类型     | 描述                                   |
| -------------- | -------- | -------------------------------------- |
| id             | Integer  | 项目 ID                                |
| name           | String   | 项目名称                               |
| coustomer_name | String   | 客户名称                               |
| parent_id      | Integer  | 父项目 ID，`0` 表示根项目              |
| archive        | Integer  | 归档状态，`0=激活`，`1=归档`           |
| child_count    | Integer  | 子项目数量                             |
| project_count  | Integer  | 该项目下会话数量                       |
| has_children   | Boolean  | 是否有子项目                           |
| owner_id       | Integer  | 所属用户 ID                            |
| created_at     | DateTime | 创建时间                               |
| updated_at     | DateTime | 更新时间（用于前端一致性状态更新基准） |

**错误场景**:

- `404 Not Found`: 项目 ID 不存在或不属于该用户

---

### 7.6 删除项目

删除指定项目（软删除）。

**接口**: `GET /user/user/folderdel/{id}`

**完整请求路径示例**: `GET /api/user/user/folderdel/{id}`

**兼容路径（历史回退）**: `GET /api/user/folderdel/{id}`

**需要认证**: ✅

**请求方法**: `GET`

**路径参数**:

| 参数名 | 类型    | 必填 | 描述    |
| ------ | ------- | ---- | ------- |
| id     | Integer | 是   | 项目 ID |

**响应示例**:

```json
{
  "code": 200,
  "msg": "删除成功",
  "data": {
    "id": 123,
    "is_del": 1,
    "deleted_at": "2026-02-16T09:30:00"
  }
}
```

**字段说明**:

| 字段       | 类型     | 描述                       |
| ---------- | -------- | -------------------------- |
| id         | Integer  | 被删除的项目 ID            |
| is_del     | Integer  | 软删除标记，`1` 表示已删除 |
| deleted_at | DateTime | 删除时间                   |

**行为说明**:

1. 删除为软删除：后端更新项目删除标记，不执行物理删除。
2. 删除成功后，项目不应再出现在 `GET /user/user/folderlist` 结果中。
3. 删除成功后，`GET /user/user/folderdetail/{id}` 通常返回 `404`（以服务端最终实现为准）。
4. 写操作响应 `data` 不允许为空对象，应至少返回删除结果最小对象（`id/is_del/deleted_at`）。

**错误场景**:

- `404 Not Found`: 项目不存在或不属于当前用户。
- `403 Forbidden`: 当前用户无权删除该项目。

---

## 8. AI功能模块 (`/apicategories`)

> **章节状态：`legacy`。** 资源式 Workflows、Chatflows 与 Instructions API 见对应总览。

### 8.1 获取分类详情

**接口**: `GET /apicategories/detail`

**需要认证**: OpenAPI 未显式声明；`apiClient` 有令牌时会附带 Bearer Token

**响应示例**:

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "技术研发": [
      {
        "id": 4,
        "name": "技术交底书完善",
        "group": "技术研发",
        "description": "从三句话技术方案，生成完整的技术交底书",
        "file_url": "测试",
        "workflow": "权利要求书生成-3.3-Fast-X",
        "sort": 1,
        "is_active": true,
        "apis": [
          {
            "id": 116,
            "sub_category_id": 4,
            "ai_model_id": 2,
            "aimodel": "Basic",
            "api_endpoint": "技术交底书完善-2.2-Basic-X",
            "api_description": "",
            "api_process": "信息池构建,技术方案完善,交底书内容完善"
          }
        ]
      }
    ],
    "专利撰写": [
      {
        "id": 6,
        "name": "权利要求书生成",
        "group": "专利撰写",
        "description": "基于技术交底书快速生成权利要求书",
        "file_url": "",
        "workflow": "说明书生成-3.2-Fast-X",
        "sort": 3,
        "is_active": true,
        "apis": [
          {
            "id": 132,
            "sub_category_id": 6,
            "ai_model_id": 1,
            "aimodel": "fast",
            "api_endpoint": "权利要求书生成-3.3-Fast-X",
            "api_description": "基于技术交底书快速生成权利要求书草稿",
            "api_process": "输入内容整理,核心独立权利要求撰写,权利要求架构搭建,从属权利要求撰写,审查权利要求书初稿,权利要求"
          }
        ]
      },
      {
        "id": 13,
        "name": "说明书生成",
        "group": "专利撰写",
        "description": "基于权利要求书和技术交底书，快速生成说明书",
        "file_url": "",
        "workflow": "审查意见答复-1-Basic-X",
        "sort": 2,
        "is_active": true,
        "apis": [
          {
            "id": 131,
            "sub_category_id": 13,
            "ai_model_id": 1,
            "aimodel": "fast",
            "api_endpoint": "说明书生成-3.2-Fast-X",
            "api_description": "基于权利要求书和技术交底书，快速生成说明书",
            "api_process": "输入内容整理,说明书生成"
          }
        ]
      },
      {
        "id": 12,
        "name": "申请文件检查",
        "group": "专利撰写",
        "description": "检查申请文件，包含权利要求书和说明书，并提出改进建议",
        "file_url": "",
        "workflow": "技术交底书完善-2.2-Basic-X",
        "sort": 1,
        "is_active": true,
        "apis": [
          {
            "id": 120,
            "sub_category_id": 12,
            "ai_model_id": 2,
            "aimodel": "Basic",
            "api_endpoint": "申请文件检查-1.1-Basic-X",
            "api_description": "检查申请文件，包含权利要求书和说明书，并提出改进建议",
            "api_process": "申请文件检查,三步法检查"
          }
        ]
      }
    ],
    "辅助工具": [
      {
        "id": 17,
        "name": "文件输入输出测试",
        "group": "辅助工具",
        "description": "测试版",
        "file_url": "",
        "workflow": "审查意见答复-1-Basic-X",
        "sort": 2,
        "is_active": true,
        "apis": [
          {
            "id": 130,
            "sub_category_id": 17,
            "ai_model_id": 1,
            "aimodel": "fast",
            "api_endpoint": "文件输入输出测试",
            "api_description": "测试版",
            "api_process": ""
          }
        ]
      },
      {
        "id": 7,
        "name": "审查意见答复",
        "group": "辅助工具",
        "description": "针对知产局的OA，提出答复意见草稿",
        "file_url": "",
        "workflow": "文件上下传输测试",
        "sort": 1,
        "is_active": true,
        "apis": [
          {
            "id": 125,
            "sub_category_id": 7,
            "ai_model_id": 2,
            "aimodel": "Basic",
            "api_endpoint": "审查意见答复-1-Basic-X",
            "api_description": "",
            "api_process": "输入信息整理,审查意见答复起草"
          }
        ]
      }
    ]
  }
}
```

---

### 8.2 获取对话提示词

**接口**: `GET /apicategories/chatflowprompt`

**需要认证**: OpenAPI 未显式声明；`apiClient` 有令牌时会附带 Bearer Token

**说明**: 获取对话流的预设提示词

**响应示例**:

```json
{
  "code": 200,
  "msg": "成功",
  "data": [
    {
      "id": 1,
      "name": "通用对话",
      "description": "你是一个专业的专利撰写助手..."
    }
  ]
}
```

---

---

### 8.3 保存用户喜欢的分类

**接口**: `POST /apicategories/userlikecategory`

**需要认证**: OpenAPI 未显式声明；`apiClient` 有令牌时会附带 Bearer Token

**请求参数**:

```json
{
  "category_id": 1
}
```

**响应示例**:

```json
{
  "code": 200,
  "msg": "成功",
  "data": {
    "id": 999,
    "user_id": 1,
    "category_id": 1,
    "created_at": "2026-02-14T10:54:00"
  }
}
```

### 8.4 获取 API 详情

**接口**: `POST /apicategories/apidetail`

**需要认证**: OpenAPI 未显式声明；`apiClient` 有令牌时会附带 Bearer Token

**请求参数**:

```json
{
  "name": "patent_generate"
}
```

**安全约束**:

- 返回 `data` 不包含任何第三方密钥类字段。
- 第三方调用凭据由服务端安全配置中心托管，客户端不可见。

**响应示例**:

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": 31,
    "name": "权利要求书生成-3.3-Fast-X",
    "api_type": "Workflow",
    "price": 3,
    "model_name": "",
    "is_async": 0,
    "input_schema": [
      {
        "type": "paragraph",
        "cn_name": "用户指令",
        "content": "用户对本次说明书生成任务的补充要求、格式偏好与重点关注内容说明。",
        "en_name": "User_input"
      },
      {
        "type": "paragraph",
        "cn_name": "技术领域",
        "content": "用于生成“技术领域”段落的所属技术方向、应用场景与分类线索（可含关键词/IPC意向）。",
        "en_name": "technical_field"
      },
      {
        "type": "paragraph",
        "cn_name": "背景技术",
        "content": "用于生成“背景技术”段落的现有技术情况、痛点问题与改进需求描述输入。",
        "en_name": "background_art_TD"
      },
      {
        "type": "paragraph",
        "cn_name": "技术方案",
        "content": "用于生成“技术方案”主体的核心构思、关键结构/步骤、技术要素及其协同关系输入。",
        "en_name": "technical_solutions"
      },
      {
        "type": "paragraph",
        "cn_name": "有益效果",
        "content": "用于生成“有益效果”段落的性能提升、成本/效率优势与可验证效果点输入。",
        "en_name": "beneficial_effects_TD"
      },
      {
        "type": "paragraph",
        "cn_name": "具体实施方式",
        "content": "用于生成“具体实施方式/实施例”段落的实现细节、参数范围、流程与可选替换方案输入。",
        "en_name": "embodiments_TD"
      },
      {
        "type": "string",
        "cn_name": "附图说明",
        "content": "用于生成“附图说明”段落的各图编号、图名及图中要素对应关系的说明输入。",
        "en_name": "drawings_explain_TD"
      }
    ],
    "output_schema": [
      {
        "type": "paragraph",
        "cn_name": "权利要求书",
        "content": "",
        "en_name": "output"
      },
      {
        "type": "file",
        "cn_name": "权利要求书文件",
        "content": "",
        "en_name": "file_output"
      }
    ],
    "created_at": "2026-01-29T14:18:14.420000",
    "updated_at": "2026-01-29T14:19:41"
  }
}
```

---

### 8.5 执行工作流

**接口**: `POST /apicategories/create`

**对接边界说明（重要）**：

- 前端不直接对接 Dify 服务器。
- 前端仅调用本后端接口（如 `/apicategories/create`、`/user/upload`）。
- 由后端负责对接 Dify 并完成协议转换，前端按本接口文档约定传参即可。

**需要认证**: OpenAPI 未显式声明；`apiClient` 有令牌时会附带 Bearer Token

**请求参数**:

```json
{
  "id": 1,
  "key": "task_key",
  "inputs": {
    "param1": "value1"
  },
  "api_process": "步骤1,步骤2,步骤3",
  "folder_id": 1
}
```

**文件上传请求参数示例（`inputs`）**:

```json
{
  "id": 30,
  "key": "task_20260226_001",
  "inputs": {
    "file": {
      "type": "document",
      "transfer_method": "remote_url",
      "url": "https://lzhxpy.oasisintwrite.com/uploads/workflow/single-file.docx"
    },
    "files": [
      {
        "type": "document",
        "transfer_method": "remote_url",
        "url": "https://lzhxpy.oasisintwrite.com/uploads/workflow/multi-file-1.docx"
      },
      {
        "type": "document",
        "transfer_method": "remote_url",
        "url": "https://lzhxpy.oasisintwrite.com/uploads/workflow/multi-file-2.docx"
      },
      {
        "type": "document",
        "transfer_method": "remote_url",
        "url": "https://lzhxpy.oasisintwrite.com/uploads/workflow/multi-file-3.docx"
      }
    ]
  },
  "api_process": "上传完成,开始解析,生成结果",
  "folder_id": 1
}
```

- `file`：单文件参数，值为文件对象 `{type, transfer_method, url}`。
- `files`：多文件参数，值为文件对象数组 `[{type, transfer_method, url}, ...]`。
- `file` 与 `files` 属于不同输入参数，可同时提交（按工作流实际字段名传值）。
- 仅上传单文件时，不传 `files` 字段；仅上传多文件时，不传 `file` 字段。
- 未上传的文件字段必须省略，禁止传 `null`（否则可能触发 Dify 参数校验错误）。

**说明**:

- `id`: API ID
- `key`: 任务唯一标识
- `inputs`: 输入参数
- `api_process`: 进度步骤描述
- `folder_id`: 保存到的项目ID

**安全约束**:

- 请求体若包含第三方密钥类字段，服务端必须拒绝透传，可返回 `400 Bad Request`，或忽略该字段并记录安全告警。
- 响应体不得回显第三方密钥类字段。

**响应示例**:

```json
{
  "code": 200,
  "msg": "成功",
  "data": {
    "id": 456,
    "key": "task_key",
    "folder_id": 1,
    "type": 1,
    "answer_text": "生成的内容",
    "file_url": "https://example.com/file.pdf",
    "created_at": "2026-02-14T10:55:00"
  }
}
```

**不同返回场景示例 (`data` 内部字段差异)**:

1、仅返回文件

```json
{
  "answer_text": "",
  "file_url": [
    "https://lzhxpy.oasisintwrite.com/uploads/workflow/2fea74d062de43d4a5ea73f34b4043ad.docx"
  ]
}
```

2、仅返回文字

```json
{
  "answer_text": "权利要求书: ## 权利要求书\n\n## 权利要求依赖树\n生成时间: 2026-02-24 11:06",
  "file_url": []
}
```

---

### 8.6 执行对话流

**接口**: `POST /apicategories/charteflowcreate`

**需要认证**: OpenAPI 未显式声明；`apiClient` 有令牌时会附带 Bearer Token

**请求参数**:

```json
{
  "query": "用户问题",
  "conversation_id": "conv_123",
  "type": 1,
  "files": [],
  "folder_id": 1
}
```

**类型说明**:

- `type`: 1=工作聚焦，2=语义生图，3=通用对话

**响应示例**:

```json
{
  "answer": "AI回答内容",
  "conversation_id": "conv_new_123"
}
```

### 8.7 查询异步任务进度

**接口**: `GET /apicategories/queryprocess/{key}`

**需要认证**: OpenAPI 未显式声明；`apiClient` 有令牌时会附带 Bearer Token

**路径参数**:

- `key`: 任务唯一标识

**响应示例**:

```json
{
  "key": "task_key",
  "current_step": 2,
  "current_step_name": "生成中",
  "total_steps": 5,
  "steps": ["步骤1", "步骤2", "步骤3", "步骤4", "步骤5"],
  "progress_percent": 40,
  "is_completed": false
}
```

---

### 8.8 获取指令库列表

**接口**: `GET /apicategories/instructionlist`

**需要认证**: OpenAPI 未显式声明；`apiClient` 有令牌时会附带 Bearer Token

**查询参数**:

- `page`: 页码（默认1）
- `limit`: 每页数量（默认10，最大100）
- `type`: 类型（可选）

**响应示例**:

```json
{
  "code": 200,
  "msg": "成功",
  "data": {
    "total": 10,
    "items": [
      {
        "id": 1,
        "title": "常用指令",
        "content": "指令内容",
        "type": "custom"
      }
    ]
  }
}
```

**类型说明**: `1`=工作聚焦，`2`=通用对话，`3`=语义生图。

---

### 8.9 创建指令

**接口**: `POST /apicategories/instructioncreate`

**需要认证**: OpenAPI 未显式声明；`apiClient` 有令牌时会附带 Bearer Token

**请求参数**:

```json
{
  "title": "指令标题",
  "content": "指令内容",
  "type": "custom"
}
```

**响应示例**:

```json
{
  "code": 200,
  "msg": "成功",
  "data": {
    "id": 1001,
    "title": "指令标题",
    "content": "指令内容",
    "type": "custom",
    "created_at": "2026-02-14T10:56:00"
  }
}
```

---

### 8.10 获取模型喜好设定配置

**接口**: `GET /apicategories/configdetail`

**完整请求路径示例**: `GET /api/apicategories/configdetail`

**需要认证**: OpenAPI 未显式声明；`apiClient` 有令牌时会附带 Bearer Token

**说明**: 该接口用于“模型喜好设定”功能，返回用户可见的工具组、工具和模型版本配置数据。

**响应说明**: 返回结构与 `GET /apicategories/detail` 一致，可复用 `8.1 获取分类详情` 的响应字段与示例。

---

### 8.11 删除指令

> **接口状态：`legacy`。** OpenAPI 来源：`docs/api/apicategories-legacy.yaml`。

按指令 ID 删除一个现网 legacy 指令。

**接口**: `POST /apicategories/instructiondelete`

**需要认证**: OpenAPI 未显式声明；`apiClient` 有令牌时会附带 Bearer Token

**请求参数**:

| 参数名 | 类型   | 必填 | 描述            |
| ------ | ------ | ---- | --------------- |
| id     | Number | 是   | 待删除的指令 ID |

**请求示例**:

```json
{
  "id": 123
}
```

**响应示例**:

```json
{
  "code": 200,
  "msg": "删除成功"
}
```

---

## 9. 用户建议模块 (`/usersuggestion`)

> **章节状态：`legacy`。** 资源式 Feedback API 见“支持与反馈”总览。

### 9.1 提交建议

**接口**: `POST /usersuggestion/create`

**需要认证**: OpenAPI 未显式声明；`apiClient` 有令牌时会附带 Bearer Token

**请求参数**:

```json
{
  "title": "建议标题",
  "content": "建议内容",
  "contact_information": "功能建议",
  "url": "https://example.com/suggestion.png"
}
```

**响应示例**:

```json
{
  "code": 200,
  "msg": "成功",
  "data": {
    "id": 501,
    "title": "建议标题",
    "content": "建议内容",
    "contact_information": "功能建议",
    "url": "https://example.com/suggestion.png",
    "created_at": "2026-02-14T10:57:00"
  }
}
```

---

## 10. 用户数据管理模块 (`/user`)

> **章节状态：`legacy`，其中 10.2 为 `legacy / OpenAPI gap`。** 资源式数据治理接口见“数据治理与导出”总览。

### 10.1 获取数据统计

获取当前用户的数据统计信息。

**接口**: `GET /user/user/data/stats`

**需要认证**: OpenAPI 未显式声明；`apiClient` 有令牌时会附带 Bearer Token

**响应示例**:

```json
{
  "code": 200,
  "msg": "成功",
  "data": {
    "workflow_count": 15,
    "chatflow_count": 8,
    "folder_count": 3,
    "total_count": 26
  }
}
```

**字段说明**:

| 字段           | 类型    | 描述                                     |
| -------------- | ------- | ---------------------------------------- |
| workflow_count | Integer | 工作流数量（`type=1`）                   |
| chatflow_count | Integer | 对话流数量（`type=2`）                   |
| folder_count   | Integer | 文件夹数量                               |
| total_count    | Integer | 总数量（`workflow + chatflow + folder`） |

---

### 10.2 导出用户数据

> **接口状态：`legacy / OpenAPI gap`。** `user-export.service.ts` 使用直接 `fetch`，当前漂移工具与 OpenAPI 均未覆盖。

导出当前用户所有数据为 ZIP 文件流。

**接口**: `GET /user/user/data/export`

**需要认证**: ✅

**响应说明**:

- `Content-Type`: `application/zip`
- 文件名格式：`user_data_{user_id}_{timestamp}.zip`

**使用说明**:

1. 该接口返回二进制文件流，不返回常规 JSON `data` 对象。
2. 导出内容仅包含当前登录用户的数据，禁止越权导出。
3. 空数据场景下应可导出空 ZIP（至少包含导出说明文件）。

---

### 10.3 清空用户数据

清空当前用户所有数据（软删除）。

**接口**: `POST /user/user/data/clear`

**需要认证**: OpenAPI 未显式声明；`apiClient` 有令牌时会附带 Bearer Token

**响应示例**:

```json
{
  "code": 200,
  "msg": "成功",
  "data": {
    "workflow_count": 23,
    "folder_count": 3,
    "total_count": 26
  }
}
```

**字段说明**:

| 字段           | 类型    | 描述                                            |
| -------------- | ------- | ----------------------------------------------- |
| workflow_count | Integer | 删除的会话记录数量（包含 `type=1` 与 `type=2`） |
| folder_count   | Integer | 删除的文件夹数量                                |
| total_count    | Integer | 删除总数量（`workflow_count + folder_count`）   |

**行为说明**:

1. 清空为软删除：相关记录写入删除标记，不做物理删除。
2. 操作为高风险动作，前端应提供二次确认。
3. 清空操作应具备事务一致性：全部成功或全部失败回滚。

---
