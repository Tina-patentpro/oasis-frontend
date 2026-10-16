# 前端功能模块完整映射文档

> 基于网站设计目标说明.md的校验和完善

**文档目的**：将前端所有功能对应到具体接口，便于后端工程师高效对接。  
**最后更新**：2025-10-22  
**维护团队**：前端小组

---

## 📋 一、核心功能模块（按优先级排序）

### 1️⃣ Dify Workflow（工作流）模块

**功能描述**：围绕 Dify workflow 功能，提供工作流调用和结果管理。

#### 1.1 工作流管理

| 功能             | 接口需求                                              | 说明                           |
| ---------------- | ----------------------------------------------------- | ------------------------------ |
| 获取工作流列表   | `GET /api/workflows`                                  | 分类、名称、描述、输入参数定义 |
| 获取工作流详情   | `GET /api/workflows/{id}`                             | 包含动态输入参数schema         |
| 执行工作流       | `POST /api/workflows/{id}/execute`                    | 传入参数值，返回执行ID         |
| 获取执行结果     | `GET /api/workflow-executions/{executionId}`          | 包含生成内容和文件             |
| 获取执行进度     | `GET /api/workflow-executions/{executionId}/progress` | 实时进度百分比                 |
| 查询历史执行记录 | `GET /api/workflows/{id}/executions?page=...`         | 分页列表                       |

#### 1.2 动态输入参数处理

| 功能               | 接口需求                  | 说明                             |
| ------------------ | ------------------------- | -------------------------------- |
| 获取输入参数schema | 包含在工作流详情中        | 字段类型、必填、默认值、验证规则 |
| 上传文件           | `POST /api/files/upload`  | 支持多文件，返回文件ID           |
| 上传图片           | `POST /api/images/upload` | 返回图片ID和preview URL          |
| 验证输入参数       | 客户端验证                | 基于schema规则                   |

#### 1.3 历史数据关联

| 功能         | 接口需求                                       | 说明             |
| ------------ | ---------------------------------------------- | ---------------- |
| 读取历史数据 | `GET /api/projects/{projectId}/data`           | 关联项目中的数据 |
| 读取历史文件 | `GET /api/projects/{projectId}/files`          | 关联项目中的文件 |
| 读取会话数据 | `GET /api/conversations/{conversationId}/data` | 未关联项目的会话 |

#### 1.4 工作流链式调用

| 功能                   | 接口需求                    | 说明                                           |
| ---------------------- | --------------------------- | ---------------------------------------------- |
| 自动填入下一工作流参数 | 前端逻辑                    | 根据预设规则映射上一工作流输出到下一工作流输入 |
| 预设规则管理           | `GET /api/workflow-presets` | 由管理后台配置                                 |
| 保存工作流链           | `POST /api/workflow-chains` | 保存工作流链定义                               |

#### 1.5 文件下载

| 功能               | 接口需求                                                    | 说明               |
| ------------------ | ----------------------------------------------------------- | ------------------ |
| 获取生成文件列表   | 包含在执行结果中                                            | 文件名、大小、类型 |
| 下载工作流输出文件 | `GET /api/workflow-executions/{executionId}/files/{fileId}` | 支持batch下载      |

---

### 2️⃣ Dify Chatflow（对话流）模块

**功能描述**：围绕 Dify chatflow 功能，提供对话调用和指令库管理。

#### 2.1 对话流管理

| 功能           | 接口需求                          | 说明                        |
| -------------- | --------------------------------- | --------------------------- |
| 获取对话流列表 | `GET /api/chatflows`              | 返回3种对话流               |
| 创建新对话     | `POST /api/conversations`         | chatflowId, projectId(可选) |
| 获取对话列表   | `GET /api/conversations?page=...` | 分页，包含最后更新时间      |
| 获取对话详情   | `GET /api/conversations/{id}`     | 包含所有消息历史            |
| 删除对话       | `DELETE /api/conversations/{id}`  | 逻辑删除或物理删除          |
| 重命名对话     | `PATCH /api/conversations/{id}`   | 新的title                   |

#### 2.2 消息发送（流式）

| 功能           | 接口需求                                        | 说明                 |
| -------------- | ----------------------------------------------- | -------------------- |
| 发送文本消息   | `POST /api/conversations/{id}/messages` (SSE)   | 流式响应，返回AI回复 |
| 上传并发送文件 | `POST /api/conversations/{id}/upload-file`      | 文件关联到消息       |
| 上传并发送图片 | `POST /api/conversations/{id}/upload-image`     | 图片关联到消息       |
| 获取消息列表   | `GET /api/conversations/{id}/messages?page=...` | 分页                 |

#### 2.3 指令库管理

| 功能               | 接口需求                             | 说明                   |
| ------------------ | ------------------------------------ | ---------------------- |
| 获取固定指令       | `GET /api/instructions/system`       | 由CMS管理后台配置      |
| 获取用户自定义指令 | `GET /api/instructions/user`         | 当前用户维护           |
| 创建自定义指令     | `POST /api/instructions/user`        | 名称、内容、标签       |
| 编辑自定义指令     | `PUT /api/instructions/user/{id}`    | 更新内容               |
| 删除自定义指令     | `DELETE /api/instructions/user/{id}` | 逻辑删除               |
| 使用指令快速填充   | 前端逻辑                             | 点击指令自动填充输入框 |

#### 2.4 历史数据关联（同工作流）

| 功能         | 接口需求                                       | 说明     |
| ------------ | ---------------------------------------------- | -------- |
| 读取历史数据 | `GET /api/projects/{projectId}/data`           | 同工作流 |
| 读取历史文件 | `GET /api/projects/{projectId}/files`          | 同工作流 |
| 读取会话数据 | `GET /api/conversations/{conversationId}/data` | 同工作流 |

---

### 3️⃣ 项目管理模块

**功能描述**：项目的创建、管理、数据关联和导出。

#### 3.1 项目CRUD

| 功能         | 接口需求                                | 说明                           |
| ------------ | --------------------------------------- | ------------------------------ |
| 获取项目列表 | `GET /api/projects?page=...&search=...` | 分页、搜索、排序               |
| 创建项目     | `POST /api/projects`                    | 名称、描述、类别               |
| 获取项目详情 | `GET /api/projects/{id}`                | 包含关联的工作流/对话执行记录  |
| 编辑项目     | `PUT /api/projects/{id}`                | 更新基本信息                   |
| 删除项目     | `DELETE /api/projects/{id}`             | 逻辑删除，包含关联数据处理选项 |

#### 3.2 项目数据管理

| 功能               | 接口需求                                                | 说明                      |
| ------------------ | ------------------------------------------------------- | ------------------------- |
| 关联工作流执行结果 | `POST /api/projects/{projectId}/attach-workflow-result` | 工作流执行ID              |
| 关联对话消息       | `POST /api/projects/{projectId}/attach-conversation`    | 对话ID或消息ID            |
| 获取项目中的数据   | `GET /api/projects/{projectId}/data`                    | 所有关联的工作流/对话结果 |
| 获取项目中的文件   | `GET /api/projects/{projectId}/files`                   | 所有关联的文件            |
| 移除关联           | `DELETE /api/projects/{projectId}/data/{dataId}`        | 解除关联                  |

#### 3.3 项目导出

| 功能         | 接口需求                               | 说明                         |
| ------------ | -------------------------------------- | ---------------------------- |
| 导出项目数据 | `POST /api/projects/{id}/export-data`  | 格式：JSON/CSV/Excel         |
| 导出项目文件 | `POST /api/projects/{id}/export-files` | 格式：ZIP                    |
| 获取导出状态 | `GET /api/exports/{exportId}`          | 异步操作，返回进度和下载链接 |
| 下载导出文件 | `GET /api/exports/{exportId}/download` | 文件下载                     |

---

### 4️⃣ 会话历史管理模块

**功能描述**：管理未关联项目的对话历史。

#### 4.1 会话CRUD

| 功能         | 接口需求                                         | 说明             |
| ------------ | ------------------------------------------------ | ---------------- |
| 获取会话列表 | `GET /api/conversations?projectId=null&page=...` | 未关联项目的会话 |
| 获取会话详情 | `GET /api/conversations/{id}`                    | 包含所有消息     |
| 重命名会话   | `PATCH /api/conversations/{id}`                  | 新的title        |
| 删除会话     | `DELETE /api/conversations/{id}`                 | 逻辑删除         |

#### 4.2 会话项目关联

| 功能         | 接口需求                        | 说明               |
| ------------ | ------------------------------- | ------------------ |
| 关联到项目   | `PATCH /api/conversations/{id}` | 设置projectId      |
| 解除项目关联 | `PATCH /api/conversations/{id}` | 设置projectId=null |

#### 4.3 会话导出

| 功能         | 接口需求                                    | 说明                    |
| ------------ | ------------------------------------------- | ----------------------- |
| 导出会话数据 | `POST /api/conversations/{id}/export`       | 格式：JSON/Markdown/PDF |
| 导出会话文件 | `POST /api/conversations/{id}/export-files` | 格式：ZIP               |
| 获取导出进度 | `GET /api/exports/{exportId}`               | 同项目导出              |

---

### 5️⃣ 用户管理模块

**功能描述**：用户注册、认证、信息管理、充值、统计等。

#### 5.1 用户认证和基本信息

| 功能             | 接口需求                             | 说明                            |
| ---------------- | ------------------------------------ | ------------------------------- |
| 用户注册         | `POST /api/auth/register`            | 邮箱/用户名、密码、验证码       |
| 用户登录         | `POST /api/auth/login`               | 返回access_token, refresh_token |
| 用户登出         | `POST /api/auth/logout`              | 清除token                       |
| 获取当前用户信息 | `GET /api/users/me`                  | 用户基本信息                    |
| 编辑用户信息     | `PUT /api/users/me`                  | 昵称、头像、邮箱等              |
| 修改密码         | `POST /api/users/me/change-password` | 旧密码、新密码                  |
| 忘记密码         | `POST /api/auth/forgot-password`     | 邮箱、验证码、新密码            |

#### 5.2 用户充值和余额

| 功能             | 接口需求                                         | 说明                      |
| ---------------- | ------------------------------------------------ | ------------------------- |
| 获取充值套餐列表 | `GET /api/recharge-packages`                     | 包含价格、额度、优惠      |
| 创建充值订单     | `POST /api/recharge-orders`                      | packageId, paymentMethod  |
| 获取订单列表     | `GET /api/recharge-orders?page=...`              | 订单状态、金额、时间      |
| 获取用户余额     | `GET /api/users/me/balance`                      | 当前余额、消费额度        |
| 获取消费记录     | `GET /api/users/me/consumption-records?page=...` | 分页，包含操作明细        |
| 消费额度扣费     | 后端自动                                         | 工作流/对话调用时自动计费 |

#### 5.3 推荐和赠送

| 功能           | 接口需求                                    | 说明                   |
| -------------- | ------------------------------------------- | ---------------------- |
| 获取用户推荐码 | `GET /api/users/me/referral-code`           | 唯一推荐码             |
| 推荐新用户     | `POST /api/referrals`                       | 推荐码、被推荐用户ID   |
| 获取推荐记录   | `GET /api/users/me/referrals?page=...`      | 推荐成功数、赠送额度   |
| 赠送余额       | `POST /api/users/{id}/send-balance`         | 接收用户ID、金额、原因 |
| 获取收到的赠送 | `GET /api/users/me/received-gifts?page=...` | 赠送记录               |

#### 5.4 用户统计和分析

| 功能             | 接口需求                               | 说明                               |
| ---------------- | -------------------------------------- | ---------------------------------- |
| 获取使用统计     | `GET /api/users/me/statistics`         | 工作流调用次数、对话数、消费总额等 |
| 获取时间序列数据 | `GET /api/users/me/analytics/timeline` | 日期范围、数据类型                 |
| 获取使用排行     | `GET /api/users/me/analytics/rankings` | 最常用工作流、对话等               |

#### 5.5 建议和反馈

| 功能             | 接口需求                                     | 说明                 |
| ---------------- | -------------------------------------------- | -------------------- |
| 获取建议征集活动 | `GET /api/suggestion-campaigns`              | 活动列表、奖励设置   |
| 提交建议         | `POST /api/suggestions`                      | 建议内容、分类、附件 |
| 获取我的建议     | `GET /api/users/me/suggestions?page=...`     | 提交的建议列表       |
| 获取奖励规则     | `GET /api/suggestion-campaigns/{id}/rewards` | 奖励规则和获奖记录   |

#### 5.6 客服支持

| 功能             | 接口需求                                     | 说明                 |
| ---------------- | -------------------------------------------- | -------------------- |
| 获取客服联系信息 | `GET /api/customer-service/contacts`         | 微信、邮箱、电话等   |
| 创建工单         | `POST /api/support-tickets`                  | 问题分类、描述、附件 |
| 获取工单列表     | `GET /api/users/me/support-tickets?page=...` | 工单状态、创建时间   |
| 获取工单详情     | `GET /api/support-tickets/{id}`              | 工单详细信息和回复   |
| 添加工单回复     | `POST /api/support-tickets/{id}/replies`     | 回复内容、附件       |

---

### 6️⃣ 通知中心模块

**功能描述**：面向用户的消息通知管理。

#### 6.1 通知管理

| 功能         | 接口需求                                     | 说明                    |
| ------------ | -------------------------------------------- | ----------------------- |
| 获取通知列表 | `GET /api/notifications?page=...&unread=...` | 分页，可按已读/未读筛选 |
| 标记通知已读 | `PATCH /api/notifications/{id}/read`         | 单条标记                |
| 全部标记已读 | `PATCH /api/notifications/mark-all-read`     | 批量标记                |
| 删除通知     | `DELETE /api/notifications/{id}`             | 逻辑删除                |
| 清空所有通知 | `DELETE /api/notifications`                  | 清空列表                |
| 获取未读数量 | `GET /api/notifications/unread-count`        | WebSocket推送或轮询     |

#### 6.2 通知订阅和偏好

| 功能             | 接口需求                                     | 说明                   |
| ---------------- | -------------------------------------------- | ---------------------- |
| 获取通知偏好设置 | `GET /api/users/me/notification-preferences` | 各类通知的开关         |
| 更新通知偏好     | `PUT /api/users/me/notification-preferences` | 更新各类通知设置       |
| 订阅WebSocket    | `WS /api/notifications/subscribe`            | 实时推送新通知（可选） |

---

### 7️⃣ 设置和辅助功能模块

**功能描述**：用户偏好、UI设置、数据管理等辅助功能。

#### 7.1 用户偏好设置

| 功能         | 接口需求                        | 说明                     |
| ------------ | ------------------------------- | ------------------------ |
| 获取用户偏好 | `GET /api/users/me/preferences` | 主题、语言、布局等       |
| 更新用户偏好 | `PUT /api/users/me/preferences` | 保存到后端或localStorage |
| 获取主题列表 | `GET /api/themes`               | 可用的主题列表           |

#### 7.2 显示区域管理

| 功能         | 接口需求                               | 说明                           |
| ------------ | -------------------------------------- | ------------------------------ |
| 获取布局设置 | `GET /api/users/me/layout-preferences` | 左右栏开关、中栏布局、右栏宽度 |
| 更新布局设置 | `PUT /api/users/me/layout-preferences` | 保存UI状态                     |

#### 7.3 数据管理

| 功能             | 接口需求                         | 说明                 |
| ---------------- | -------------------------------- | -------------------- |
| 导出所有个人数据 | `POST /api/users/me/export-data` | 格式：JSON/CSV       |
| 获取导出进度     | `GET /api/exports/{exportId}`    | 异步操作             |
| 删除所有个人数据 | `DELETE /api/users/me/data`      | 需要确认，可恢复期限 |
| 清理浏览器缓存   | 前端本地操作                     | 无需后端接口         |

#### 7.4 帮助文档

| 功能             | 接口需求                          | 说明             |
| ---------------- | --------------------------------- | ---------------- |
| 获取帮助文档列表 | `GET /api/help-docs`              | 分类、搜索       |
| 获取帮助文档详情 | `GET /api/help-docs/{id}`         | 支持Markdown渲染 |
| 搜索帮助文档     | `GET /api/help-docs/search?q=...` | 全文搜索         |

#### 7.5 数据比较和版本管理

| 功能                 | 接口需求                                           | 说明               |
| -------------------- | -------------------------------------------------- | ------------------ |
| 获取生成结果版本历史 | `GET /api/workflow-executions/{id}/versions`       | 多次执行同一工作流 |
| 比较两个版本         | `GET /api/workflow-executions/{id1}/compare/{id2}` | Diff视图           |

#### 7.6 文本操作

| 功能            | 接口需求 | 说明              |
| --------------- | -------- | ----------------- |
| 复制文本        | 前端操作 | 使用clipboard API |
| 清空输入框      | 前端操作 | 重置表单          |
| 切换富文本/源码 | 前端操作 | UI状态            |
| 导出为文件      | 前端操作 | 生成文本/PDF文件  |

---

## 🔄 二、关键业务流程映射

### 2.1 工作流完整流程

```
1. 获取工作流列表 → GET /api/workflows
2. 用户选择工作流 → 获取详情 GET /api/workflows/{id}
3. 解析输入参数schema → 渲染动态表单
4. 可选：读取历史数据 → GET /api/projects/{projectId}/data
5. 用户填写参数 → 验证数据
6. 执行工作流 → POST /api/workflows/{id}/execute
7. 轮询/WebSocket监听进度 → GET /api/workflow-executions/{executionId}/progress
8. 获取结果 → GET /api/workflow-executions/{executionId}
9. 可选：下载输出文件 → GET /api/workflow-executions/{executionId}/files/{fileId}
10. 可选：关联到项目 → POST /api/projects/{projectId}/attach-workflow-result
11. 可选：自动填入下一工作流参数 → 根据预设规则映射
```

### 2.2 对话完整流程

```
1. 获取对话流列表 → GET /api/chatflows
2. 创建新对话 → POST /api/conversations
3. 可选：关联项目 → POST /api/conversations {projectId}
4. 用户输入消息（可含文件/图片）
5. 发送消息 → POST /api/conversations/{id}/messages (SSE流)
6. 显示AI回复（实时流式）
7. 可选：使用指令库快速填充
8. 可选：读取历史数据作为上下文
9. 多轮对话循环
10. 可选：导出对话 → POST /api/conversations/{id}/export
```

### 2.3 项目数据流

```
1. 创建项目 → POST /api/projects
2. 执行工作流/对话
3. 关联结果到项目 → POST /api/projects/{projectId}/attach-workflow-result
4. 查看项目所有数据 → GET /api/projects/{projectId}/data
5. 导出数据 → POST /api/projects/{projectId}/export-data
6. 下载导出文件 → GET /api/exports/{exportId}/download
```

### 2.4 充值消费流程

```
1. 查看充值套餐 → GET /api/recharge-packages
2. 选择套餐创建订单 → POST /api/recharge-orders
3. 完成支付 → 第三方支付（支付宝/微信）
4. 订单回调 → 后端更新余额
5. 执行工作流/对话 → 自动扣费
6. 查看消费记录 → GET /api/users/me/consumption-records
```

---

## 📊 三、数据模型规范

### 3.1 通用数据结构

```typescript
// API 响应格式
interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: unknown
  }
}

// 分页对象
interface PaginationParams {
  page: number // 从1开始
  pageSize: number // 每页数量，默认20
  sort?: string // 排序字段, e.g. "-createdAt" 表示倒序
  search?: string // 搜索关键词
}

interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

// 时间戳
interface TimeStamps {
  createdAt: string // ISO 8601
  updatedAt: string // ISO 8601
}
```

---

## 🔐 六、安全性和认证

- **认证方式**: JWT (Bearer Token)
- **Token 位置**: HTTP Header `Authorization: Bearer {token}`
- **Token 生命周期**:
  - Access Token: 1小时
  - Refresh Token: 7天
- **HTTPS**: 所有API调用必须使用HTTPS
- **CORS**: 配置允许前端域名
- **Rate Limiting**: 实施API请求限流，防止滥用

---

## 📞 联系方式

有任何问题或需要澄清，请联系前端小组负责人。

**文档版本**: v1.0  
**最后更新**: 2025-10-22
