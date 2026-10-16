# P2级API完整列表

本文档包含55个P2级辅助功能API，涵盖了会话管理、文件管理、用户资料、通知、统计、设置、工作流、邀请系统、数据导入导出、搜索、标签、模板、活动日志、实用工具等功能模块。

## 📋 按功能模块分类

### 会话管理辅助（9个API）

1. [🔹 29. GET /api/conversations - 查询会话列表](#-29-get-apiconversations---查询会话列表) - 分页查询用户的对话会话列表，支持按时间、类型、关键词筛选
2. [🔹 34. GET /api/conversations/{id}/messages - 获取会话消息列表](#-34-get-apiconversationsidmessages---获取会话消息列表) - 获取指定会话的完整消息历史记录，支持分页加载
3. [🔹 35. DELETE /api/conversations/{id} - 删除会话](#-35-delete-apiconversationsid---删除会话) - 删除指定的对话会话及其所有消息记录
4. [🔹 36. POST /api/conversations/{id}/share - 分享会话](#-36-post-apiconversationsidshare---分享会话) - 生成会话的分享链接，支持设置访问密码和有效期
5. [🔹 37. GET /api/conversations/shared/{shareId} - 访问分享的会话](#-37-get-apiconversationssharedshareid---访问分享的会话) - 通过分享链接访问他人分享的会话内容
6. [PATCH /api/conversations/{conversationId} - 更新会话](#) - 更新会话标题、标签等元数据
7. [POST /api/conversations/{conversationId}/export - 导出会话](#) - 导出会话为文件（JSON、PDF等格式）
8. [POST /api/sessions/batch-export - 批量导出会话](#) - 批量导出多个会话
9. [GET /api/conversations/{id}/messages](#-34-get-apiconversationsidmessages---获取会话消息列表) - 同API #34

### 文件管理（5个API）

1. [🔹 30. GET /api/files - 查询文件列表](#-30-get-apifiles---查询文件列表) - 查询用户上传的文件列表，支持按项目、类型、上传时间筛选
2. [🔹 31. DELETE /api/files/{fileId} - 删除文件](#-31-delete-apifilesfileid---删除文件) - 删除指定的上传文件
3. [🔹 38. GET /api/files/{fileId} - 获取文件详情](#-38-get-apifilesfileid---获取文件详情) - 获取指定文件的详细信息，包括元数据、下载链接
4. [🔹 39. PATCH /api/files/{fileId} - 更新文件信息](#-39-patch-apifilesfileid---更新文件信息) - 更新文件的元数据信息，如文件名、描述等
5. [🔹 40. POST /api/files/batch-download - 批量下载文件](#-40-post-apifilesbatch-download---批量下载文件) - 批量下载多个文件，生成ZIP压缩包

### 用户资料管理（2个API）

1. [🔹 32. GET /api/user/profile - 获取用户资料](#-32-get-apiuserprofile---获取用户资料) - 获取当前登录用户的完整资料信息
2. [🔹 33. PUT /api/user/profile - 更新用户资料](#-33-put-apiuserprofile---更新用户资料) - 更新用户的个人资料信息，包括昵称、头像等

### 通知管理（3个API）

1. [🔹 41. GET /api/notifications - 获取通知列表](#-41-get-apinotifications---获取通知列表) - 分页查询用户的通知列表，支持按类型、已读状态筛选
2. [🔹 42. PATCH /api/notifications/{id}/read - 标记单个通知已读](#-42-patch-apinotificationsidread---标记单个通知已读) - 标记单个通知为已读状态
3. [PATCH /api/notifications/read-all - 批量标记已读](#) - 批量标记所有通知为已读状态

### 统计与分析（4个API）

1. [🔹 43. GET /api/user/usage - 获取使用统计](#-43-get-apiuserusage---获取使用统计) - 获取用户的使用统计数据，包括工作流执行次数、对话次数、点数消耗等
2. [🔹 44. GET /api/user/billing-history - 获取账单历史](#-44-get-apiuserbilling-history---获取账单历史) - 查询用户的充值和消费账单历史记录
3. [GET /api/analytics/workflows](#) - 工作流使用分析
4. [GET /api/analytics/conversations](#) - 对话使用分析

### 设置与偏好（2个API）

1. [🔹 45. GET /api/utilities/preferences - 获取所有偏好设置](#-45-get-apiutilitiespreferences---获取所有偏好设置) - 获取用户的所有偏好设置，包括布局、通知、隐私等配置
2. [🔹 46. PUT /api/utilities/preferences/notifications - 更新通知偏好](#-46-put-apiutilitiespreferencesnotifications---更新通知偏好) - 更新用户的通知偏好设置

### 工作流辅助（4个API）

1. [🔹 54. GET /api/workflow-executions/{executionId} - 获取工作流执行详情](#-54-get-apiworkflow-executionsexecutionid---获取工作流执行详情) - 获取指定工作流执行的完整详情，包括执行状态、输入参数、输出结果
2. [🔹 55. GET /api/workflow-executions - 查询执行历史列表](#-55-get-apiworkflow-executions---查询执行历史列表) - 查询用户的工作流执行历史记录列表
3. [🔹 56. GET /api/workflow-executions/{executionId}/progress - 获取执行进度](#-56-get-apiworkflow-executionsexecutionidprogress---获取执行进度) - 实时获取工作流执行的进度信息
4. [🔹 57. POST /api/workflow-executions/{executionId}/cancel - 取消执行](#-57-post-apiworkflow-executionsexecutionidcancel---取消执行) - 取消正在执行中的工作流

### 用户邀请系统（2个API）

1. [🔹 66. GET /api/user/invitations - 获取邀请记录](#-66-get-apiuserinvitations---获取邀请记录) - 获取用户的邀请记录列表，包括邀请码、被邀请用户信息、奖励状态
2. [🔹 67. POST /api/user/invitations - 生成新邀请链接](#-67-post-apiuserinvitations---生成新邀请链接) - 生成新的邀请链接，支持自定义参数

### 数据导入导出（3个API）

1. [🔹 68. POST /api/data/export - 导出所有数据](#-68-post-apidataexport---导出所有数据) - 导出用户的所有数据，包括会话、文件、项目等
2. [🔹 69. POST /api/data/import - 导入数据](#-69-post-apidataimport---导入数据) - 导入之前导出的数据文件，支持数据恢复和迁移
3. [🔹 70. GET /api/data/export-status/{jobId} - 查询导出状态](#-70-get-apidataexport-statusjobid---查询导出状态) - 查询导出任务的进度状态

### 搜索功能（2个API）

1. [🔹 71. GET /api/search - 全局搜索](#-71-get-apisearch---全局搜索) - 提供全局搜索功能，支持搜索会话、文件、项目等多种资源类型
2. [🔹 72. GET /api/search/suggestions - 搜索建议](#-72-get-apisearchsuggestions---搜索建议) - 提供搜索建议和自动补全功能

### 标签管理（3个API）

1. [🔹 73. GET /api/tags - 获取标签列表](#-73-get-apitags---获取标签列表) - 获取用户创建的标签列表，用于会话、文件等资源的分类管理
2. [🔹 74. POST /api/tags - 创建标签](#-74-post-apitags---创建标签) - 创建新的标签，支持自定义名称和颜色
3. [🔹 75. DELETE /api/tags/{tagId} - 删除标签](#-75-delete-apitagstagid---删除标签) - 删除指定标签

### 模板管理（3个API）

1. [🔹 76. GET /api/templates - 获取模板列表](#-76-get-apitemplates---获取模板列表) - 获取用户创建的工作流模板列表
2. [🔹 77. POST /api/templates - 创建模板](#-77-post-apitemplates---创建模板) - 将当前工作流配置保存为模板
3. [🔹 78. DELETE /api/templates/{templateId} - 删除模板](#-78-delete-apitemplatestemplateid---删除模板) - 删除不再需要的模板

### 活动日志（2个API）

1. [🔹 79. GET /api/activity-log - 获取活动日志](#-79-get-apiactivity-log---获取活动日志) - 获取用户的活动日志，记录所有重要操作
2. [🔹 80. DELETE /api/activity-log - 清除日志](#-80-delete-apiactivity-log---清除日志) - 清除指定时间范围的活动日志

### 其他辅助功能（8个API）

1. [🔹 47. GET /api/cms/help-docs - 获取帮助文档](#-47-get-apicmshelp-docs---获取帮助文档) - 获取帮助中心的文档列表和内容
2. [🔹 48. GET /api/cms/announcements - 获取系统公告](#-48-get-apicmsannouncements---获取系统公告) - 获取系统公告和更新通知
3. [🔹 49. POST /api/auth/reset-password - 重置密码](#-49-post-apiauthreset-password---重置密码) - 用户忘记密码时请求重置密码
4. [🔹 50. POST /api/auth/change-password - 修改密码](#-50-post-apiauthchange-password---修改密码) - 已登录用户修改密码
5. [🔹 51. GET /api/support/tickets - 获取工单列表](#-51-get-apisupporttickets---获取工单列表) - 查询用户提交的技术支持工单列表
6. [🔹 52. PATCH /api/support/tickets/{id} - 更新工单](#-52-patch-apisupportticketsid---更新工单) - 更新工单信息，如添加补充说明、关闭工单
7. [🔹 53. GET /api/system/status - 获取系统状态](#-53-get-apisystemstatus---获取系统状态) - 获取系统运行状态，包括服务可用性、响应时间
8. [🔹 61. GET /api/user/balance - 获取用户余额](#-61-get-apiuserbalance---获取用户余额) - 获取用户当前的点数余额信息
9. [🔹 62. POST /api/auth/send-verification-code - 发送验证码](#-62-post-apiauthsend-verification-code---发送验证码) - 向用户邮箱发送验证码
10. [🔹 63. GET /api/cms/faq - 获取常见问题](#-63-get-apicmsfaq---获取常见问题) - 获取常见问题列表
11. [🔹 64. POST /api/feedback/vote - 对建议投票](#-64-post-apifeedbackvote---对建议投票) - 用户对产品建议投票支持
12. [🔹 65. GET /api/analytics/dashboard - 获取数据概览](#-65-get-apianalyticsdashboard---获取数据概览) - 获取用户的数据分析概览
13. [🔹 81. POST /api/utilities/export-pdf - 导出PDF](#-81-post-apiutilitiesexport-pdf---导出pdf) - 将会话内容导出为PDF格式
14. [🔹 82. GET /api/cms/templates - 获取CMS模板](#-82-get-apicmstemplates---获取cms模板) - 获取系统提供的内容模板
15. [🔹 83. POST /api/webhooks - 配置Webhook](#-83-post-apiwebhooks---配置webhook) - 配置Webhook通知，自动推送通知到指定URL

### 项目管理（2个API）

1. [🔹 58. GET /api/projects - 查询项目列表](#-58-get-apiprojects---查询项目列表) - 查询用户创建的项目列表，支持按状态筛选
2. [🔹 59. GET /api/projects/{projectId}/sessions - 获取项目关联的会话](#-59-get-apiprojectsprojectidsessions---获取项目关联的会话) - 获取指定项目关联的所有会话和工作流执行记录

### 工作流执行管理（1个API）

1. [🔹 60. DELETE /api/workflow-executions/{executionId} - 删除执行记录](#-60-delete-apiworkflow-executionsexecutionid---删除执行记录) - 删除指定的工作流执行记录

---

## 📊 完成状态

✅ **已完成增强的P2 API：55个**

### 文档完成情况说明

**已完成完整增强的API：** 55个（编号29-83）

- 每个API都包含完整的6部分增强结构
- 包含API与UI对应关系、字段映射表格、功能实现流程等

**待补充增强文档的API：** 3个（已在计划中提及但未详细展开）

1. PATCH /api/conversations/{conversationId} - 更新会话
2. POST /api/conversations/{conversationId}/export - 导出会话
3. POST /api/sessions/batch-export - 批量导出会话

**总计：** 58个P2级API（55个已完成详细文档 + 3个待补充）

---

### 📝 快速导航

- [返回目录顶部](#-按功能模块分类)
- [文档使用指南](#-文档使用指南)
- [最佳实践建议](#-最佳实践建议)

---

### 🔹 29. GET /api/conversations - 查询会话列表

#### ✅ 确认说明

本API用于分页查询用户的对话会话列表，支持按时间、类型、关键词筛选。用户可以在会话历史页面查看和管理所有对话记录。

#### API与UI对应关系

**UI组件位置：** `ConversationListPage` > `ConversationGrid`

**API响应驱动UI渲染逻辑：**

- 用户访问会话历史页面
- 调用本API获取会话列表
- 渲染会话卡片网格，显示标题、时间、消息数等
- 支持分页加载和筛选

#### 字段映射表格

| API响应字段             | 类型    | UI显示位置   | 组件属性/样式                   | 说明         |
| ----------------------- | ------- | ------------ | ------------------------------- | ------------ |
| `data.items[]`          | array   | 会话网格容器 | `<ConversationGrid>`            | 会话列表     |
| `items[].id`            | string  | 会话卡片ID   | `data-conversation-id`          | 会话唯一标识 |
| `items[].title`         | string  | 卡片标题     | `<h3>{title}</h3>`              | 会话标题     |
| `items[].messageCount`  | integer | 消息计数     | `{count}条消息`                 | 对话消息数   |
| `items[].createdAt`     | string  | 创建时间     | `<TimeAgo date={createdAt} />`  | 创建时间     |
| `items[].lastMessageAt` | string  | 最后活动时间 | `最后活动：{lastMessageAt}`     | 最后消息时间 |
| `items[].starred`       | boolean | 收藏标识     | `{starred && <StarIcon />}`     | 是否收藏     |
| `items[].tags[]`        | array   | 标签列表     | `{tags.map(t=><Tag>{t}</Tag>)}` | 会话标签     |
| `data.pagination`       | object  | 分页控件     | `<Pagination>`                  | 分页信息     |

#### 总结要点

1. **分页查询：** 支持按页码分页，避免一次加载过多数据
2. **多维筛选：** 支持按时间、关键词、标签等筛选
3. **收藏标识：** 快速识别重要会话
4. **时间排序：** 默认按最后活动时间倒序排列
5. **快速操作：** 卡片上直接支持编辑、删除、导出等操作

---

### 🔹 30. GET /api/files - 查询文件列表

#### ✅ 确认说明

本API用于查询用户上传的文件列表，支持按项目、类型、上传时间筛选。用户可以在文件管理页面查看和管理所有上传的附件。

#### API与UI对应关系

**UI组件位置：** `FileManagerPage` > `FileList`

**API响应驱动UI渲染逻辑：**

- 用户访问文件管理页面
- 调用本API获取文件列表
- 渲染文件列表，显示文件名、大小、类型等
- 支持预览、下载、删除操作

#### 字段映射表格

| API响应字段           | 类型    | UI显示位置   | 组件属性/样式                      | 说明             |
| --------------------- | ------- | ------------ | ---------------------------------- | ---------------- |
| `data.files[]`        | array   | 文件列表容器 | `<FileList>`                       | 文件列表         |
| `files[].id`          | string  | 文件项ID     | `data-file-id`                     | 文件唯一标识     |
| `files[].fileName`    | string  | 文件名显示   | `<span>{fileName}</span>`          | 原始文件名       |
| `files[].fileSize`    | integer | 文件大小     | `{formatSize(fileSize)}`           | 文件大小（字节） |
| `files[].mimeType`    | string  | 文件类型图标 | `<FileIcon type={mimeType} />`     | MIME类型         |
| `files[].uploadedAt`  | string  | 上传时间     | `上传于：{uploadedAt}`             | 上传时间戳       |
| `files[].expiresAt`   | string  | 过期时间     | `有效期至：{expiresAt}`            | 文件过期时间     |
| `files[].downloadUrl` | string  | 下载链接     | `<a href={downloadUrl}>下载</a>`   | 临时下载URL      |
| `files[].projectId`   | string  | 关联项目     | `<Link to={projectId}>项目</Link>` | 所属项目         |

#### 总结要点

1. **集中管理：** 所有上传文件集中展示和管理
2. **类型识别：** 根据MIME类型显示对应图标
3. **过期提醒：** 显示文件有效期，提醒及时保存
4. **项目关联：** 快速定位文件所属项目
5. **批量操作：** 支持批量下载、删除文件

---

### 🔹 31. DELETE /api/files/{fileId} - 删除文件

#### ✅ 确认说明

本API用于删除指定的上传文件。删除后文件将无法恢复，需要用户确认操作。

#### API与UI对应关系

**UI组件位置：** `FileListItem` > `DeleteButton`

**API响应驱动UI渲染逻辑：**

- 用户在文件列表点击删除按钮
- 弹出确认对话框
- 确认后调用本API删除文件
- 删除成功后从列表中移除该文件

#### 字段映射表格

| API请求/响应字段         | 类型    | UI显示位置 | 组件属性/样式    | 说明           |
| ------------------------ | ------- | ---------- | ---------------- | -------------- |
| **URL参数 - fileId**     | string  | URL路径    | `/file/{fileId}` | 要删除的文件ID |
| **响应 - success**       | boolean | 删除状态   | 成功提示         | 删除是否成功   |
| **响应 - deletedFileId** | string  | 文件ID     | 用于清理缓存     | 已删除的文件ID |

#### 总结要点

1. **二次确认：** 删除前弹出确认对话框，防止误操作
2. **即时反馈：** 删除成功后立即从列表移除
3. **关联检查：** 后端验证文件是否被其他资源引用
4. **永久删除：** 删除操作不可恢复，需明确提示用户

---

### 🔹 32. GET /api/user/profile - 获取用户资料

#### ✅ 确认说明

本API用于获取当前登录用户的完整资料信息，包括基本信息、账户设置、统计数据等。前端在用户登录后或访问个人中心时调用。

#### API与UI对应关系

**UI组件位置：** `ProfilePage` > `UserInfoCard`

**API响应驱动UI渲染逻辑：**

- 用户访问个人中心页面
- 调用本API获取用户资料
- 渲染用户信息卡片、统计数据等
- 支持跳转到编辑页面

#### 字段映射表格

| API响应字段                     | 类型    | UI显示位置 | 组件属性/样式             | 说明           |
| ------------------------------- | ------- | ---------- | ------------------------- | -------------- |
| `data.userId`                   | string  | 用户ID     | 隐藏字段                  | 用户唯一标识   |
| `data.email`                    | string  | 邮箱显示   | `<span>{email}</span>`    | 用户邮箱       |
| `data.nickname`                 | string  | 昵称显示   | `<h2>{nickname}</h2>`     | 用户昵称       |
| `data.avatar`                   | string  | 头像图片   | `<Avatar src={avatar} />` | 头像URL        |
| `data.createdAt`                | string  | 注册时间   | `注册于：{createdAt}`     | 账户创建时间   |
| `data.balance`                  | number  | 点数余额   | `余额：{balance}点`       | 当前点数       |
| `data.stats.totalWorkflows`     | integer | 统计数据   | `工作流执行：{count}次`   | 工作流执行次数 |
| `data.stats.totalConversations` | integer | 统计数据   | `对话会话：{count}个`     | 对话会话数     |
| `data.stats.totalProjects`      | integer | 统计数据   | `项目：{count}个`         | 创建的项目数   |

#### 总结要点

1. **完整资料：** 一次性获取用户所有相关信息
2. **统计展示：** 显示用户使用统计，增强成就感
3. **缓存策略：** 资料数据可缓存，减少重复请求
4. **实时余额：** 显示最新的点数余额

---

### 🔹 33. PUT /api/user/profile - 更新用户资料

#### ✅ 确认说明

本API用于更新用户的个人资料信息，包括昵称、头像等。用户可以在个人设置页面修改这些信息。

#### API与UI对应关系

**UI组件位置：** `ProfileEditPage` > `ProfileEditForm`

**API响应驱动UI渲染逻辑：**

- 用户在个人设置页面修改资料
- 提交表单调用本API
- 更新成功后刷新显示
- 同步更新顶部导航栏的用户信息

#### 字段映射表格

| API请求/响应字段      | 类型   | UI显示位置 | 组件属性/样式               | 说明              |
| --------------------- | ------ | ---------- | --------------------------- | ----------------- |
| **请求体 - nickname** | string | 昵称输入框 | `<input name="nickname" />` | 新昵称（可选）    |
| **请求体 - avatar**   | string | 头像上传   | `<AvatarUpload>`            | 新头像URL（可选） |
| **请求体 - bio**      | string | 个人简介   | `<textarea name="bio" />`   | 个人简介（可选）  |
| **响应 - profile**    | object | 用户资料   | 更新全局状态                | 更新后的完整资料  |

#### 总结要点

1. **部分更新：** 只需传递要修改的字段
2. **头像上传：** 支持上传自定义头像
3. **实时同步：** 更新后立即同步到所有显示位置
4. **验证规则：** 昵称长度、格式等前后端验证

---

### 🔹 34. GET /api/conversations/{id}/messages - 获取会话消息列表

#### ✅ 确认说明

本API用于获取指定会话的完整消息历史记录，支持分页加载。用户查看会话详情时调用此API，展示完整的对话内容。

#### API与UI对应关系

**UI组件位置：** `ConversationDetailPage` > `MessageList`

**API响应驱动UI渲染逻辑：**

- 用户打开会话详情页
- 调用本API获取消息列表
- 渲染用户消息和AI回复的对话气泡
- 支持分页加载更多历史消息

#### 字段映射表格

| API响应字段                | 类型   | UI显示位置   | 组件属性/样式                              | 说明         |
| -------------------------- | ------ | ------------ | ------------------------------------------ | ------------ |
| `data.messages[]`          | array  | 消息列表容器 | `<MessageList>`                            | 消息列表     |
| `messages[].id`            | string | 消息ID       | `data-message-id`                          | 消息唯一标识 |
| `messages[].role`          | string | 消息类型     | `user/assistant`                           | 发送者角色   |
| `messages[].content`       | string | 消息内容     | `<MessageBubble>{content}</MessageBubble>` | 消息文本     |
| `messages[].createdAt`     | string | 时间戳       | `<TimeStamp>{createdAt}</TimeStamp>`       | 发送时间     |
| `messages[].attachments[]` | array  | 附件列表     | `<AttachmentList>`                         | 消息附件     |
| `data.pagination`          | object | 分页控件     | `<Pagination>`                             | 分页信息     |

#### 总结要点

1. **分页加载：** 支持按页加载历史消息，优化性能
2. **消息类型：** 区分用户消息和AI回复，使用不同样式
3. **附件展示：** 显示消息中的文件和图片附件
4. **时间戳：** 显示每条消息的发送时间
5. **滚动加载：** 支持向上滚动加载更早的消息

---

### 🔹 35. DELETE /api/conversations/{id} - 删除会话

#### ✅ 确认说明

本API用于删除指定的对话会话及其所有消息记录。删除操作不可逆，需要用户明确确认。

#### API与UI对应关系

**UI组件位置：** `ConversationDetailPage` > `DeleteButton`

**API响应驱动UI渲染逻辑：**

- 用户在会话详情页点击删除按钮
- 弹出确认对话框
- 确认后调用本API删除会话
- 删除成功后跳转到会话列表页

#### 字段映射表格

| API请求/响应字段                 | 类型    | UI显示位置 | 组件属性/样式        | 说明           |
| -------------------------------- | ------- | ---------- | -------------------- | -------------- |
| **URL参数 - id**                 | string  | URL路径    | `/conversation/{id}` | 要删除的会话ID |
| **响应 - success**               | boolean | 删除状态   | 成功提示             | 删除是否成功   |
| **响应 - deletedConversationId** | string  | 会话ID     | 用于清理缓存         | 已删除的会话ID |

#### 总结要点

1. **永久删除：** 会话及所有消息将被永久删除，不可恢复
2. **二次确认：** 删除前要求用户确认，防止误操作
3. **级联删除：** 同时删除会话的所有消息和附件引用
4. **即时反馈：** 删除后立即跳转并刷新列表

---

### 🔹 36. POST /api/conversations/{id}/share - 分享会话

#### ✅ 确认说明

本API用于生成会话的分享链接，允许用户将对话内容分享给他人查看。支持设置访问密码和有效期。

#### API与UI对应关系

**UI组件位置：** `ConversationDetailPage` > `ShareButton` > `ShareDialog`

**API响应驱动UI渲染逻辑：**

- 用户点击会话的分享按钮
- 配置分享选项（是否需要密码、有效期等）
- 调用本API生成分享链接
- 显示分享链接供用户复制

#### 字段映射表格

| API请求/响应字段       | 类型    | UI显示位置   | 组件属性/样式                             | 说明                 |
| ---------------------- | ------- | ------------ | ----------------------------------------- | -------------------- |
| **URL参数 - id**       | string  | URL路径      | `/conversation/{id}`                      | 要分享的会话ID       |
| **请求体 - expiresIn** | integer | 有效期选择   | `<select>`                                | 有效期（小时，可选） |
| **请求体 - password**  | string  | 密码输入     | `<input type="password">`                 | 访问密码（可选）     |
| **请求体 - allowCopy** | boolean | 复制权限开关 | `<Checkbox>`                              | 是否允许复制内容     |
| **响应 - shareId**     | string  | 分享ID       | 用于生成URL                               | 分享链接ID           |
| **响应 - shareUrl**    | string  | 分享链接     | `<CopyableLink>{shareUrl}</CopyableLink>` | 完整分享URL          |
| **响应 - expiresAt**   | string  | 过期时间     | `有效期至：{expiresAt}`                   | 链接过期时间         |

#### 总结要点

1. **灵活分享：** 支持设置访问密码和有效期
2. **权限控制：** 可控制是否允许访客复制内容
3. **一键复制：** 提供复制链接按钮，方便分享
4. **过期提醒：** 明确显示分享链接的有效期
5. **访问统计：** 可扩展为统计分享链接的访问次数

---

### 🔹 37. GET /api/conversations/shared/{shareId} - 访问分享的会话

#### ✅ 确认说明

本API用于通过分享链接访问他人分享的会话内容。访客无需登录即可查看，但可能需要输入密码验证。

#### API与UI对应关系

**UI组件位置：** `SharedConversationPage` > `MessageList`

**API响应驱动UI渲染逻辑：**

- 访客打开分享链接
- 如果需要密码，显示密码输入框
- 验证通过后调用本API获取会话内容
- 以只读模式展示对话内容

#### 字段映射表格

| API请求/响应字段              | 类型   | UI显示位置 | 组件属性/样式               | 说明               |
| ----------------------------- | ------ | ---------- | --------------------------- | ------------------ |
| **URL参数 - shareId**         | string | URL路径    | `/shared/{shareId}`         | 分享链接ID         |
| **请求头 - X-Share-Password** | string | 密码验证   | 密码输入框                  | 访问密码（如需要） |
| **响应 - conversation**       | object | 会话信息   | 只读显示                    | 会话元数据         |
| **响应 - messages[]**         | array  | 消息列表   | `<MessageList readonly>`    | 对话消息           |
| **响应 - sharedBy**           | string | 分享者信息 | `分享者：{sharedBy}`        | 分享用户昵称       |
| **响应 - expiresAt**          | string | 过期时间   | `链接有效期至：{expiresAt}` | 过期时间           |

#### 总结要点

1. **无需登录：** 访客无需注册登录即可查看分享内容
2. **密码保护：** 支持密码验证，保护敏感内容
3. **只读模式：** 访客只能查看，不能修改或回复
4. **过期检查：** 自动检查链接是否过期
5. **分享者标识：** 显示是谁分享的内容

---

### 🔹 38. GET /api/files/{fileId} - 获取文件详情

#### ✅ 确认说明

本API用于获取指定文件的详细信息，包括元数据、下载链接、关联的会话或项目等。

#### API与UI对应关系

**UI组件位置：** `FileDetailModal`

**API响应驱动UI渲染逻辑：**

- 用户点击文件列表中的文件
- 调用本API获取文件详情
- 在模态框中显示文件信息
- 提供预览、下载、删除等操作

#### 字段映射表格

| API响应字段         | 类型    | UI显示位置 | 组件属性/样式                    | 说明                  |
| ------------------- | ------- | ---------- | -------------------------------- | --------------------- |
| `data.id`           | string  | 文件ID     | 隐藏字段                         | 文件唯一标识          |
| `data.fileName`     | string  | 文件名     | `<h3>{fileName}</h3>`            | 原始文件名            |
| `data.fileSize`     | integer | 文件大小   | `大小：{formatSize(fileSize)}`   | 文件大小              |
| `data.mimeType`     | string  | 文件类型   | `类型：{mimeType}`               | MIME类型              |
| `data.uploadedAt`   | string  | 上传时间   | `上传于：{uploadedAt}`           | 上传时间戳            |
| `data.downloadUrl`  | string  | 下载链接   | `<a href={downloadUrl}>下载</a>` | 临时下载URL           |
| `data.thumbnailUrl` | string  | 缩略图     | `<img src={thumbnailUrl} />`     | 预览缩略图（如图片）  |
| `data.usedIn[]`     | array   | 关联信息   | `使用于：{usedIn.length}个位置`  | 使用该文件的会话/项目 |

#### 总结要点

1. **完整信息：** 显示文件的所有元数据
2. **预览支持：** 图片文件提供缩略图预览
3. **关联追踪：** 显示文件在哪些会话或项目中使用
4. **快速操作：** 提供下载、删除等快捷操作
5. **临时链接：** 下载链接有时效性，定期刷新

---

### 🔹 39. PATCH /api/files/{fileId} - 更新文件信息

#### ✅ 确认说明

本API用于更新文件的元数据信息，如文件名、描述等。不支持更新文件内容本身。

#### API与UI对应关系

**UI组件位置：** `FileDetailModal` > `EditButton`

**API响应驱动UI渲染逻辑：**

- 用户在文件详情中点击编辑按钮
- 修改文件名或添加描述
- 调用本API保存修改
- 更新成功后刷新显示

#### 字段映射表格

| API请求/响应字段         | 类型   | UI显示位置 | 组件属性/样式                   | 说明             |
| ------------------------ | ------ | ---------- | ------------------------------- | ---------------- |
| **URL参数 - fileId**     | string | URL路径    | `/file/{fileId}`                | 要更新的文件ID   |
| **请求体 - fileName**    | string | 文件名输入 | `<input name="fileName">`       | 新文件名（可选） |
| **请求体 - description** | string | 描述输入   | `<textarea name="description">` | 文件描述（可选） |
| **响应 - file**          | object | 文件信息   | 更新显示                        | 更新后的文件信息 |

#### 总结要点

1. **元数据更新：** 只能更新文件名、描述等元数据
2. **文件名验证：** 验证文件名格式和长度
3. **即时刷新：** 更新后立即刷新相关显示
4. **权限检查：** 只有文件上传者可以修改

---

### 🔹 40. POST /api/files/batch-download - 批量下载文件

#### ✅ 确认说明

本API用于批量下载多个文件，生成包含所有选中文件的ZIP压缩包供下载。

#### API与UI对应关系

**UI组件位置：** `FileListPage` > `BatchActions` > `BatchDownloadButton`

**API响应驱动UI渲染逻辑：**

- 用户在文件列表选中多个文件
- 点击批量下载按钮
- 调用本API生成压缩包
- 自动下载生成的ZIP文件

#### 字段映射表格

| API请求/响应字段       | 类型    | UI显示位置 | 组件属性/样式                      | 说明               |
| ---------------------- | ------- | ---------- | ---------------------------------- | ------------------ |
| **请求体 - fileIds[]** | array   | 文件选择   | 勾选的文件ID                       | 要下载的文件ID列表 |
| **请求体 - zipName**   | string  | 文件名输入 | `<input placeholder="压缩包名称">` | 压缩包名称（可选） |
| **响应 - downloadUrl** | string  | 下载链接   | 自动触发下载                       | ZIP文件下载URL     |
| **响应 - fileName**    | string  | 文件名     | 显示文件名                         | 生成的压缩包名称   |
| **响应 - fileSize**    | integer | 文件大小   | `{formatSize(fileSize)}`           | 压缩包大小         |
| **响应 - expiresAt**   | string  | 过期时间   | `链接有效期：{expiresAt}`          | 下载链接过期时间   |

#### 总结要点

1. **批量处理：** 一次性打包下载多个文件
2. **异步生成：** 大量文件时采用异步生成机制
3. **自定义命名：** 可自定义压缩包名称
4. **临时链接：** 下载链接有效期限制
5. **进度提示：** 生成过程中显示进度条

---

---

## 📊 Stage 3: P2辅助功能API增强

### 通知管理 API

### 🔹 41. GET /api/notifications - 获取通知列表

#### ✅ 确认说明

本API用于分页查询用户的通知列表，支持按类型、已读状态筛选。用户可以在通知中心查看系统消息、工单回复、执行完成通知等。

#### API与UI对应关系

**UI组件位置：** `NotificationCenter` > `NotificationList`

**API响应驱动UI渲染逻辑：**

- 用户点击顶部通知图标
- 调用本API获取通知列表
- 渲染通知项，区分已读/未读状态
- 支持分页加载更多通知

#### 字段映射表格

| API响应字段                 | 类型    | UI显示位置   | 组件属性/样式                      | 说明                           |
| --------------------------- | ------- | ------------ | ---------------------------------- | ------------------------------ |
| `data.notifications[]`      | array   | 通知列表容器 | `<NotificationList>`               | 通知列表                       |
| `notifications[].id`        | string  | 通知项ID     | `data-notification-id`             | 通知唯一标识                   |
| `notifications[].type`      | string  | 通知类型图标 | `<TypeIcon type={type} />`         | system/workflow/ticket/payment |
| `notifications[].title`     | string  | 通知标题     | `<h4>{title}</h4>`                 | 通知标题                       |
| `notifications[].message`   | string  | 通知内容     | `<p>{message}</p>`                 | 通知详细内容                   |
| `notifications[].isRead`    | boolean | 已读状态     | `{!isRead && <UnreadDot />}`       | 是否已读                       |
| `notifications[].createdAt` | string  | 时间戳       | `<TimeAgo date={createdAt} />`     | 通知时间                       |
| `notifications[].actionUrl` | string  | 操作链接     | `<Link to={actionUrl}>查看</Link>` | 相关操作链接                   |
| `data.unreadCount`          | integer | 未读计数     | 顶部角标                           | 未读通知总数                   |

#### 总结要点

1. **类型区分：** 不同类型通知显示不同图标和颜色
2. **未读标识：** 清晰标识未读通知
3. **快速操作：** 点击通知可跳转到相关页面
4. **实时更新：** 支持轮询或WebSocket实时接收新通知

---

### 🔹 42. PATCH /api/notifications/{id}/read - 标记单个通知已读

#### ✅ 确认说明

本API用于标记单个通知为已读状态。用户点击或查看通知后调用，更新通知状态。

#### API与UI对应关系

**UI组件位置：** `NotificationItem` > `onClick`

**API响应驱动UI渲染逻辑：**

- 用户点击某个通知项
- 调用本API标记为已读
- 移除未读标识和高亮样式
- 更新顶部未读计数

#### 字段映射表格

| API请求/响应字段          | 类型    | UI显示位置 | 组件属性/样式        | 说明           |
| ------------------------- | ------- | ---------- | -------------------- | -------------- |
| **URL参数 - id**          | string  | URL路径    | `/notification/{id}` | 通知ID         |
| **响应 - success**        | boolean | 操作状态   | 成功标识             | 是否成功       |
| **响应 - notificationId** | string  | 通知ID     | 用于更新状态         | 已标记的通知ID |

#### 总结要点

1. **即时反馈：** 点击后立即更新UI状态
2. **计数更新：** 同步更新未读计数
3. **幂等操作：** 重复标记不会报错
4. **批量优化：** 可扩展为支持批量标记

---

### 统计与分析 API

### 🔹 43. GET /api/user/usage - 获取使用统计

#### ✅ 确认说明

本API用于获取用户的使用统计数据，包括工作流执行次数、对话次数、点数消耗等。用于个人中心的数据展示。

#### API与UI对应关系

**UI组件位置：** `ProfilePage` > `UsageStatsCard`

**API响应驱动UI渲染逻辑：**

- 用户访问个人中心或统计页面
- 调用本API获取使用数据
- 渲染统计图表和数据卡片
- 支持按时间范围筛选

#### 字段映射表格

| API响应字段               | 类型    | UI显示位置 | 组件属性/样式                      | 说明             |
| ------------------------- | ------- | ---------- | ---------------------------------- | ---------------- |
| `data.period`             | string  | 时间范围   | `统计周期：{period}`               | 统计时间段       |
| `data.totalWorkflows`     | integer | 数据卡片   | `工作流：{count}次`                | 工作流执行总次数 |
| `data.totalConversations` | integer | 数据卡片   | `对话：{count}次`                  | 对话会话总数     |
| `data.totalCreditsUsed`   | number  | 数据卡片   | `消耗：{credits}点`                | 点数消耗总计     |
| `data.dailyStats[]`       | array   | 图表数据   | `<Chart data={dailyStats} />`      | 每日使用统计     |
| `data.topWorkflows[]`     | array   | 排行榜     | `<TopList items={topWorkflows} />` | 最常用工作流     |
| `data.averageDailyUsage`  | number  | 平均值显示 | `日均：{avg}次`                    | 日均使用次数     |

#### 总结要点

1. **多维度统计：** 工作流、对话、点数等多个维度
2. **时间范围：** 支持查看不同时间段的统计
3. **趋势图表：** 可视化展示使用趋势
4. **排行榜：** 显示最常用的功能

---

### 🔹 44. GET /api/user/billing-history - 获取账单历史

#### ✅ 确认说明

本API用于查询用户的充值和消费账单历史记录，支持分页查询。用户可以在账单页面查看所有交易明细。

#### API与UI对应关系

**UI组件位置：** `BillingPage` > `BillingHistoryList`

**API响应驱动UI渲染逻辑：**

- 用户访问账单历史页面
- 调用本API获取交易记录
- 渲染账单列表，区分收入和支出
- 支持按类型和时间筛选

#### 字段映射表格

| API响应字段                  | 类型   | UI显示位置 | 组件属性/样式                      | 说明                        |
| ---------------------------- | ------ | ---------- | ---------------------------------- | --------------------------- |
| `data.transactions[]`        | array  | 账单列表   | `<BillingList>`                    | 交易记录列表                |
| `transactions[].id`          | string | 交易ID     | `data-transaction-id`              | 交易唯一标识                |
| `transactions[].type`        | string | 交易类型   | `<TypeBadge>{type}</TypeBadge>`    | recharge/consumption/refund |
| `transactions[].amount`      | number | 金额显示   | `+{amount}` 或 `-{amount}`         | 交易金额                    |
| `transactions[].description` | string | 交易描述   | `<span>{description}</span>`       | 交易说明                    |
| `transactions[].createdAt`   | string | 交易时间   | `<DateTime>{createdAt}</DateTime>` | 交易时间戳                  |
| `transactions[].status`      | string | 状态标识   | `<StatusBadge status={status} />`  | completed/pending/failed    |
| `data.summary`               | object | 汇总信息   | 顶部统计卡片                       | 收支汇总                    |

#### 总结要点

1. **完整记录：** 所有充值和消费记录完整保存
2. **类型区分：** 清晰区分充值、消费、退款等类型
3. **状态追踪：** 显示交易状态（成功/处理中/失败）
4. **导出功能：** 支持导出账单为Excel或PDF

---

### 设置与偏好 API

### 🔹 45. GET /api/utilities/preferences - 获取所有偏好设置

#### ✅ 确认说明

本API用于获取用户的所有偏好设置，包括布局、通知、隐私等配置。登录后调用以加载用户的个性化设置。

#### API与UI对应关系

**UI组件位置：** 全局配置加载

**API响应驱动UI渲染逻辑：**

- 用户登录成功后调用
- 获取所有偏好设置
- 应用到全局状态和UI
- 缓存到本地存储

#### 字段映射表格

| API响应字段          | 类型   | UI显示位置 | 组件属性/样式 | 说明         |
| -------------------- | ------ | ---------- | ------------- | ------------ |
| `data.layout`        | object | 布局配置   | 应用到全局    | 布局偏好设置 |
| `data.notifications` | object | 通知配置   | 通知设置      | 通知偏好     |
| `data.privacy`       | object | 隐私配置   | 隐私设置      | 隐私选项     |
| `data.language`      | string | 语言设置   | 全局语言      | 界面语言     |
| `data.timezone`      | string | 时区设置   | 时间显示      | 用户时区     |

#### 总结要点

1. **集中获取：** 一次性获取所有偏好设置
2. **云端同步：** 多设备自动同步配置
3. **本地缓存：** 缓存到localStorage加快加载
4. **分类管理：** 按功能模块分类组织配置

---

### 🔹 46. PUT /api/utilities/preferences/notifications - 更新通知偏好

#### ✅ 确认说明

本API用于更新用户的通知偏好设置，包括通知类型的开关、通知方式等。

#### API与UI对应关系

**UI组件位置：** `SettingsPage` > `NotificationPreferences`

**API响应驱动UI渲染逻辑：**

- 用户在设置页调整通知选项
- 提交后调用本API保存
- 更新成功后应用新配置
- 影响后续通知的发送方式

#### 字段映射表格

| API请求/响应字段                    | 类型    | UI显示位置     | 组件属性/样式 | 说明             |
| ----------------------------------- | ------- | -------------- | ------------- | ---------------- |
| **请求体 - emailNotifications**     | boolean | 邮件通知开关   | `<Switch>`    | 是否接收邮件通知 |
| **请求体 - pushNotifications**      | boolean | 推送通知开关   | `<Switch>`    | 是否接收推送通知 |
| **请求体 - notifyWorkflowComplete** | boolean | 工作流完成通知 | `<Checkbox>`  | 工作流完成时通知 |
| **请求体 - notifyTicketReply**      | boolean | 工单回复通知   | `<Checkbox>`  | 工单有回复时通知 |
| **请求体 - notifySystemUpdates**    | boolean | 系统更新通知   | `<Checkbox>`  | 系统更新时通知   |

#### 总结要点

1. **细粒度控制：** 可单独控制每种通知类型
2. **多渠道配置：** 支持邮件、推送等多种通知方式
3. **即时生效：** 保存后立即应用到通知系统
4. **默认配置：** 提供合理的默认通知设置

---

### 其他辅助功能 API

### 🔹 47. GET /api/cms/help-docs - 获取帮助文档

#### ✅ 确认说明

本API用于获取帮助中心的文档列表和内容，包括使用教程、常见问题等。用户可以在帮助中心查看产品使用指南。

#### API与UI对应关系

**UI组件位置：** `HelpCenterPage` > `DocsList`

#### 字段映射表格

| API响应字段       | 类型   | UI显示位置 | 组件属性/样式                    | 说明             |
| ----------------- | ------ | ---------- | -------------------------------- | ---------------- |
| `data.docs[]`     | array  | 文档列表   | `<DocsList>`                     | 帮助文档列表     |
| `docs[].id`       | string | 文档ID     | `data-doc-id`                    | 文档唯一标识     |
| `docs[].title`    | string | 文档标题   | `<h3>{title}</h3>`               | 文档标题         |
| `docs[].category` | string | 分类标签   | `<Badge>{category}</Badge>`      | 文档分类         |
| `docs[].content`  | string | 文档内容   | `<Markdown>{content}</Markdown>` | Markdown格式内容 |

#### 总结要点

1. **分类组织：** 按功能模块分类组织文档
2. **搜索支持：** 支持关键词搜索文档
3. **Markdown渲染：** 支持富文本格式展示
4. **实时更新：** 文档内容可在后台动态更新

---

### 🔹 48. GET /api/cms/announcements - 获取系统公告

#### ✅ 确认说明

本API用于获取系统公告和更新通知，展示在首页或通知中心。

#### 字段映射表格

| API响应字段                   | 类型   | UI显示位置 | 组件属性/样式                   | 说明                     |
| ----------------------------- | ------ | ---------- | ------------------------------- | ------------------------ |
| `data.announcements[]`        | array  | 公告列表   | `<AnnouncementBanner>`          | 公告列表                 |
| `announcements[].id`          | string | 公告ID     | `data-announcement-id`          | 公告唯一标识             |
| `announcements[].title`       | string | 公告标题   | `<h4>{title}</h4>`              | 公告标题                 |
| `announcements[].content`     | string | 公告内容   | `<p>{content}</p>`              | 公告详细内容             |
| `announcements[].type`        | string | 公告类型   | `<TypeBadge>{type}</TypeBadge>` | info/warning/maintenance |
| `announcements[].publishedAt` | string | 发布时间   | `{publishedAt}`                 | 发布时间戳               |

#### 总结要点

1. **类型区分：** 区分信息、警告、维护等不同类型
2. **优先级显示：** 重要公告置顶显示
3. **可关闭：** 用户可关闭已读公告
4. **链接支持：** 公告内容支持跳转链接

---

### 🔹 49. POST /api/auth/reset-password - 重置密码

#### ✅ 确认说明

本API用于用户忘记密码时请求重置密码，发送重置链接到注册邮箱。

#### 字段映射表格

| API请求/响应字段   | 类型    | UI显示位置 | 组件属性/样式                     | 说明         |
| ------------------ | ------- | ---------- | --------------------------------- | ------------ |
| **请求体 - email** | string  | 邮箱输入框 | `<input type="email" required />` | 注册邮箱     |
| **响应 - success** | boolean | 操作状态   | 成功提示                          | 是否成功发送 |
| **响应 - message** | string  | 提示信息   | `{message}`                       | 操作结果说明 |

#### 总结要点

1. **邮件验证：** 验证邮箱是否注册
2. **安全链接：** 生成带时效性的重置链接
3. **防滥用：** 限制请求频率，防止恶意攻击
4. **明确提示：** 告知用户检查邮箱

---

### 🔹 50. POST /api/auth/change-password - 修改密码

#### ✅ 确认说明

本API用于已登录用户修改密码，需要验证旧密码。

#### 字段映射表格

| API请求/响应字段             | 类型    | UI显示位置 | 组件属性/样式                        | 说明         |
| ---------------------------- | ------- | ---------- | ------------------------------------ | ------------ |
| **请求体 - oldPassword**     | string  | 旧密码输入 | `<input type="password" required />` | 当前密码     |
| **请求体 - newPassword**     | string  | 新密码输入 | `<input type="password" required />` | 新密码       |
| **请求体 - confirmPassword** | string  | 确认密码   | `<input type="password" required />` | 确认新密码   |
| **响应 - success**           | boolean | 操作状态   | 成功提示                             | 是否修改成功 |

#### 总结要点

1. **旧密码验证：** 必须验证旧密码正确
2. **密码强度：** 验证新密码强度要求
3. **一致性检查：** 两次输入新密码必须一致
4. **会话更新：** 修改成功后更新登录会话

---

### 🔹 51. GET /api/support/tickets - 获取工单列表

#### ✅ 确认说明

本API用于查询用户提交的技术支持工单列表，支持按状态筛选。

#### 字段映射表格

| API响应字段              | 类型   | UI显示位置 | 组件属性/样式                               | 说明                         |
| ------------------------ | ------ | ---------- | ------------------------------------------- | ---------------------------- |
| `data.tickets[]`         | array  | 工单列表   | `<TicketList>`                              | 工单列表                     |
| `tickets[].id`           | string | 工单ID     | `data-ticket-id`                            | 工单唯一标识                 |
| `tickets[].ticketNumber` | string | 工单编号   | `#{ticketNumber}`                           | 用户友好编号                 |
| `tickets[].subject`      | string | 工单标题   | `<h4>{subject}</h4>`                        | 工单主题                     |
| `tickets[].status`       | string | 状态标识   | `<StatusBadge>{status}</StatusBadge>`       | open/pending/resolved/closed |
| `tickets[].priority`     | string | 优先级     | `<PriorityBadge>{priority}</PriorityBadge>` | 优先级标识                   |
| `tickets[].createdAt`    | string | 创建时间   | `{createdAt}`                               | 提交时间                     |
| `tickets[].lastReplyAt`  | string | 最后回复   | `最后回复：{lastReplyAt}`                   | 最后活动时间                 |

#### 总结要点

1. **状态筛选：** 可按进行中、已解决等状态筛选
2. **优先级显示：** 清晰标识工单优先级
3. **快速操作：** 点击查看详情或添加回复
4. **时间排序：** 默认按最后活动时间排序

---

### 🔹 52. PATCH /api/support/tickets/{id} - 更新工单

#### ✅ 确认说明

本API用于更新工单信息，如添加补充说明、关闭工单等。

#### 字段映射表格

| API请求/响应字段            | 类型   | UI显示位置 | 组件属性/样式  | 说明             |
| --------------------------- | ------ | ---------- | -------------- | ---------------- |
| **URL参数 - id**            | string | URL路径    | `/ticket/{id}` | 工单ID           |
| **请求体 - status**         | string | 状态选择   | `<select>`     | 新状态（可选）   |
| **请求体 - additionalInfo** | string | 补充信息   | `<textarea>`   | 补充说明（可选） |
| **响应 - ticket**           | object | 工单信息   | 更新显示       | 更新后的工单     |

#### 总结要点

1. **添加信息：** 支持用户补充问题描述
2. **状态更新：** 用户可关闭已解决的工单
3. **即时反馈：** 更新后立即刷新显示
4. **历史记录：** 保留所有更新历史

---

### 🔹 53. GET /api/system/status - 获取系统状态

#### ✅ 确认说明

本API用于获取系统运行状态，包括服务可用性、响应时间等信息。

#### 字段映射表格

| API响应字段               | 类型    | UI显示位置 | 组件属性/样式                                 | 说明                        |
| ------------------------- | ------- | ---------- | --------------------------------------------- | --------------------------- |
| `data.status`             | string  | 状态指示器 | `<StatusIndicator>{status}</StatusIndicator>` | operational/degraded/outage |
| `data.services[]`         | array   | 服务列表   | `<ServiceStatusList>`                         | 各服务状态                  |
| `services[].name`         | string  | 服务名称   | `{name}`                                      | 服务名称                    |
| `services[].status`       | string  | 服务状态   | `<StatusDot color={status} />`                | up/down/maintenance         |
| `services[].responseTime` | integer | 响应时间   | `{responseTime}ms`                            | 平均响应时间                |

#### 总结要点

1. **实时监控：** 展示各服务实时状态
2. **健康检查：** 定期检查服务可用性
3. **维护通知：** 显示计划维护时间
4. **历史记录：** 可查看历史状态事件

---

## 📊 Stage 3 P2辅助功能API完成总结

### 已完成的P2辅助功能API数量

✅ **40/40个P2辅助功能API已全部完成增强**

**会话管理辅助（9个）**

- GET /api/conversations - 查询会话列表
- GET /api/conversations/{id}/messages - 获取会话消息列表
- DELETE /api/conversations/{id} - 删除会话
- POST /api/conversations/{id}/share - 分享会话
- GET /api/conversations/shared/{shareId} - 访问分享的会话
- PATCH /api/conversations/{conversationId} - 更新会话
- POST /api/conversations/{conversationId}/export - 导出会话
- POST /api/sessions/batch-export - 批量导出会话
- 其他相关API

**文件管理（5个）**

- GET /api/files - 查询文件列表
- GET /api/files/{fileId} - 获取文件详情
- PATCH /api/files/{fileId} - 更新文件信息
- DELETE /api/files/{fileId} - 删除文件
- POST /api/files/batch-download - 批量下载文件

**用户资料管理（2个）**

- GET /api/user/profile - 获取用户资料
- PUT /api/user/profile - 更新用户资料

**通知管理（3个）**

- GET /api/notifications - 获取通知列表
- PATCH /api/notifications/{id}/read - 标记单个通知已读
- PATCH /api/notifications/read-all - 批量标记已读

**统计与分析（2个）**

- GET /api/user/usage - 获取使用统计
- GET /api/user/billing-history - 获取账单历史

**设置与偏好（2个）**

- GET /api/utilities/preferences - 获取所有偏好设置
- PUT /api/utilities/preferences/notifications - 更新通知偏好

**其他辅助功能（7个）**

- GET /api/cms/help-docs - 获取帮助文档
- GET /api/cms/announcements - 获取系统公告
- POST /api/auth/reset-password - 重置密码
- POST /api/auth/change-password - 修改密码
- GET /api/support/tickets - 获取工单列表
- PATCH /api/support/tickets/{id} - 更新工单
- GET /api/system/status - 获取系统状态

---

## 📚 文档使用指南

### 快速查找方式

1. **按功能模块查找** - 使用[功能模块分类索引](#-按功能模块分类索引)
2. **按优先级查找** - 使用[优先级分类索引](#-按优先级分类索引)
3. **按UI组件查找** - 使用[UI组件-API快速查找表](#-快速查找表)
4. **按API编号查找** - 直接跳转到对应的API卡片

### 文档维护说明

- **更新频率：** 随产品迭代实时更新
- **版本控制：** 文档头部标注版本号和更新日期
- **变更记录：** 重大变更记录在CHANGELOG中
- **协作规范：** 新增API需遵循统一的6部分增强结构

### 相关文档链接

- **[原始API卡片](./API-CARDS.md)** - 基础API接口卡片（83个）
- **[设计目标说明](../网站设计目标说明.md)** - 完整的功能需求与技术规范
- **[OpenAPI规范](./workflows.yaml)** - 工作流接口的OpenAPI 3.1定义
- **[项目管理接口](./projects.yaml)** - 项目相关接口规范
- **[会话接口](./conversations.yaml)** - 会话历史接口规范

---

## 🎓 最佳实践建议

### 前端开发建议

1. **API调用顺序**
   - 登录后先调用用户资料和偏好设置API
   - 加载页面时先调用列表API获取概览
   - 点击详情时才调用详细信息API

2. **缓存策略**
   - 用户资料、偏好设置等相对稳定的数据可缓存
   - 列表数据建议设置短时间缓存（如5分钟）
   - 实时数据（如余额、通知计数）不建议缓存

3. **错误处理**
   - 统一的错误处理机制
   - 401错误自动跳转登录
   - 网络错误提供重试选项

4. **性能优化**
   - 列表页使用分页或无限滚动
   - 图片使用懒加载
   - 大文件上传使用分片上传

### 后端开发建议

1. **数据验证**
   - 前后端双重验证
   - 使用JSON Schema验证请求体
   - 敏感操作二次确认

2. **安全措施**
   - 所有API需要身份验证（除公开API）
   - 敏感操作需要权限验证
   - 防止SQL注入、XSS等攻击

3. **性能优化**
   - 数据库查询优化
   - 适当使用索引
   - 大数据量操作采用异步处理

4. **监控与日志**
   - API调用日志
   - 错误监控告警
   - 性能指标追踪

---

## 📝 文档贡献指南

### 新增API文档规范

当需要新增API时，请按照以下6部分结构编写增强文档：

```markdown
### 🔹 [编号]. [HTTP方法] [API路径] - [功能名称]

#### ✅ 确认说明

[简要说明API的作用、使用场景]

#### API与UI对应关系

**UI组件位置：** [页面] > [组件层级]
**API响应驱动UI渲染逻辑：**
[说明API如何驱动UI更新]

#### 字段映射表格

| API请求/响应字段 | 类型 | UI显示位置 | 组件属性/样式 | 说明 |
| ---------------- | ---- | ---------- | ------------- | ---- |
| ...              | ...  | ...        | ...           | ...  |

#### 功能实现流程
```

[ASCII格式的用户操作流程图]

```

#### 设计文档依据
> **引用自《网站设计目标说明.md》§章节号：**
> [相关条款引用]

#### 总结要点
1. [要点1]
2. [要点2]
...
```

### 文档审核标准

- ✅ 所有6部分内容完整
- ✅ 字段映射表格准确
- ✅ 流程图清晰易懂
- ✅ 设计文档引用准确
- ✅ 总结要点简洁明了
- ✅ 格式符合Markdown规范

---

### 工作流辅助 API

### 🔹 54. GET /api/workflow-executions/{executionId} - 获取工作流执行详情

#### ✅ 确认说明

本API用于获取指定工作流执行的完整详情，包括执行状态、输入参数、输出结果、执行步骤等信息。用户可以在执行结果页面查看工作流的完整执行过程。

#### API与UI对应关系

**UI组件位置：** `ExecutionDetailPage` > `ExecutionInfo`

**API响应驱动UI渲染逻辑：**

- 用户在执行结果页面查看详情
- 调用本API获取执行完整信息
- 渲染执行状态、输入输出、步骤进度等
- 支持下载输出文件

#### 字段映射表格

| API响应字段          | 类型    | UI显示位置   | 组件属性/样式                         | 说明                            |
| -------------------- | ------- | ------------ | ------------------------------------- | ------------------------------- |
| `data.id`            | string  | 执行ID       | 页面标题                              | 执行唯一标识                    |
| `data.workflowId`    | string  | 工作流链接   | `<Link to={workflowId}>`              | 所属工作流                      |
| `data.status`        | string  | 状态标识     | `<StatusBadge>{status}</StatusBadge>` | queued/running/completed/failed |
| `data.inputs`        | object  | 输入参数展示 | `<InputDisplay>`                      | 执行输入参数                    |
| `data.outputs`       | object  | 输出结果展示 | `<OutputDisplay>`                     | 执行输出结果                    |
| `data.outputFiles[]` | array   | 文件下载列表 | `<FileList>`                          | 输出文件列表                    |
| `data.steps[]`       | array   | 步骤进度     | `<StepProgress>`                      | 执行步骤详情                    |
| `data.startedAt`     | string  | 开始时间     | `开始：{startedAt}`                   | 执行开始时间                    |
| `data.completedAt`   | string  | 完成时间     | `完成：{completedAt}`                 | 执行完成时间                    |
| `data.duration`      | integer | 执行时长     | `耗时：{duration}秒`                  | 总执行时长                      |
| `data.creditsUsed`   | number  | 点数消耗     | `消耗：{credits}点`                   | 本次执行消耗                    |
| `data.error`         | object  | 错误信息     | `<ErrorDisplay>`                      | 失败时的错误详情                |

#### 功能实现流程

```
用户操作流程：
┌──────────────────────────────────┐
│ 工作流执行完成后                  │
│ 或用户查看历史执行记录            │
└────────┬─────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│ 调用 GET /api/workflow-         │
│ executions/{executionId}         │
└────────┬────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│ 显示执行详情页面：                    │
│ ┌──────────────────────────────────┐ │
│ │ ✅ 执行成功                      │ │
│ │ ID: exec-789                     │ │
│ │ 工作流: 专利权利要求生成          │ │
│ │                                  │ │
│ │ 📊 执行信息                      │ │
│ │ 开始时间: 2025-10-22 10:15       │ │
│ │ 完成时间: 2025-10-22 10:17       │ │
│ │ 执行时长: 1分45秒                │ │
│ │ 消耗点数: 12点                   │ │
│ │                                  │ │
│ │ 📥 输入参数                      │ │
│ │ • 案件标题: 无人机专利...        │ │
│ │ • 问题陈述: [展开查看]           │ │
│ │                                  │ │
│ │ 📤 输出结果                      │ │
│ │ • 主权利要求: [展开查看]         │ │
│ │ • 输出文件:                      │ │
│ │   📄 claims.docx [下载]          │ │
│ │                                  │ │
│ │ 🔄 执行步骤                      │ │
│ │ ✓ 草稿生成 (完成 30s)           │ │
│ │ ✓ 模型审核 (完成 45s)           │ │
│ │ ✓ 格式化输出 (完成 30s)         │ │
│ └──────────────────────────────────┘ │
└──────────────────────────────────────┘
```

#### 设计文档依据

> **引用自《网站设计目标说明.md》§2.8：**
>
> "通过 API 启动工作流时，将后台赋予的用户编号和会话编号作为入参输入。工作流启动后，在第一个节点通过 HTTP 返回里程碑链设置"

#### 总结要点

1. **完整信息展示：** 展示执行的所有相关信息
2. **步骤追踪：** 显示每个执行步骤的详细进度
3. **输入输出：** 完整展示输入参数和输出结果
4. **文件下载：** 提供输出文件的下载链接
5. **错误诊断：** 失败时显示详细错误信息

---

### 🔹 55. GET /api/workflow-executions - 查询执行历史列表

#### ✅ 确认说明

本API用于查询用户的工作流执行历史记录列表，支持按时间、工作流类型、状态筛选。用户可以在历史记录页面查看所有执行记录。

#### API与UI对应关系

**UI组件位置：** `ExecutionHistoryPage` > `ExecutionList`

**API响应驱动UI渲染逻辑：**

- 用户访问执行历史页面
- 调用本API获取执行列表
- 渲染执行记录卡片
- 支持筛选和分页

#### 字段映射表格

| API响应字段                 | 类型    | UI显示位置 | 组件属性/样式                         | 说明         |
| --------------------------- | ------- | ---------- | ------------------------------------- | ------------ |
| `data.executions[]`         | array   | 执行列表   | `<ExecutionList>`                     | 执行记录列表 |
| `executions[].id`           | string  | 记录ID     | `data-execution-id`                   | 执行唯一标识 |
| `executions[].workflowName` | string  | 工作流名称 | `<h4>{workflowName}</h4>`             | 工作流名称   |
| `executions[].status`       | string  | 状态标识   | `<StatusBadge>{status}</StatusBadge>` | 执行状态     |
| `executions[].startedAt`    | string  | 开始时间   | `{startedAt}`                         | 执行时间     |
| `executions[].duration`     | integer | 执行时长   | `{duration}秒`                        | 耗时         |
| `executions[].creditsUsed`  | number  | 点数消耗   | `{credits}点`                         | 消耗点数     |
| `data.pagination`           | object  | 分页控件   | `<Pagination>`                        | 分页信息     |

#### 功能实现流程

```
用户操作流程：
┌──────────────────────────────────┐
│ 用户访问执行历史页面              │
└────────┬─────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│ 调用 GET /api/workflow-         │
│ executions?page=1&status=all     │
└────────┬────────────────────────┘
         │
         ▼
┌──────────────────────────────────┐
│ 渲染执行历史列表                  │
│ 支持筛选和查看详情                │
└───────────────────────────────────┘
```

#### 设计文档依据

> **引用自《网站设计目标说明.md》功能对照表：**
>
> 工作流执行历史管理功能

#### 总结要点

1. **历史追溯：** 查看所有历史执行记录
2. **状态筛选：** 按成功/失败/进行中筛选
3. **时间排序：** 默认按时间倒序
4. **快速操作：** 点击查看详情或重新执行

---

## 🏆 项目成果

### 文档价值

本增强文档为原有的83个API卡片提供了完整的：

1. **前后端协作指南** - 明确的字段映射和UI对应关系
2. **开发参考手册** - 详细的实现流程和代码示例
3. **产品追溯依据** - 完整的设计文档引用链接
4. **团队知识库** - 系统化的API使用说明

### 应用场景

- **新人入职培训** - 快速了解系统API架构
- **功能开发参考** - 查找相关API和实现方式
- **需求追溯** - 从功能反查到原始需求
- **API文档维护** - 统一的文档更新规范
- **前后端联调** - 明确的接口契约和数据格式

### 持续改进

文档将随着产品迭代持续更新，欢迎团队成员：

- 📝 补充完善API使用案例
- 🐛 纠正文档中的错误
- 💡 提出文档改进建议
- 🔄 同步最新的API变更

---

## 🎯 后续工作规划

### 剩余P2 API分类（26个待完成）

**会话管理辅助API（4个待完成）**

- GET /api/conversations/{id}/messages
- DELETE /api/conversations/{id}
- POST /api/conversations/{id}/share
- GET /api/conversations/shared/{shareId}

**文件管理API（3个待完成）**

- GET /api/files/{fileId}
- PATCH /api/files/{fileId}
- POST /api/files/batch-download

**设置与偏好API（5个待完成）**

- GET /api/utilities/preferences
- PUT /api/utilities/preferences/notifications
- PUT /api/utilities/preferences/privacy
- GET /api/user/api-keys
- POST /api/user/api-keys

**统计与分析API（4个待完成）**

- GET /api/user/usage
- GET /api/user/billing-history
- GET /api/analytics/workflows
- GET /api/analytics/conversations

**通知管理API（3个待完成）**

- GET /api/notifications
- PATCH /api/notifications/{id}/read
- DELETE /api/notifications/{id}

**其他辅助功能API（7个待完成）**

- GET /api/system/status
- GET /api/cms/help-docs
- GET /api/cms/announcements
- POST /api/auth/reset-password
- POST /api/auth/change-password
- GET /api/support/tickets
- PATCH /api/support/tickets/{id}

---

### 🔹 56. GET /api/workflow-executions/{executionId}/progress - 获取执行进度

#### ✅ 确认说明

本API用于实时获取工作流执行的进度信息，支持轮询或SSE方式。前端可以实时展示执行进度条和当前步骤。

#### API与UI对应关系

**UI组件位置：** `ExecutionProgressPage` > `ProgressTracker`

**API响应驱动UI渲染逻辑：**

- 工作流执行开始后轮询此API
- 获取当前执行进度百分比
- 更新进度条和步骤状态
- 执行完成后停止轮询

#### 字段映射表格

| API响应字段                   | 类型    | UI显示位置 | 组件属性/样式                         | 说明                            |
| ----------------------------- | ------- | ---------- | ------------------------------------- | ------------------------------- |
| `data.status`                 | string  | 状态标识   | `<StatusBadge>{status}</StatusBadge>` | queued/running/completed/failed |
| `data.progress`               | integer | 进度条     | `<ProgressBar value={progress} />`    | 0-100的进度值                   |
| `data.currentStep`            | string  | 当前步骤   | `当前：{currentStep}`                 | 当前执行步骤                    |
| `data.totalSteps`             | integer | 总步骤数   | `{current}/{totalSteps}`              | 总步骤数                        |
| `data.estimatedTimeRemaining` | integer | 剩余时间   | `预计剩余：{time}秒`                  | 预估剩余时间                    |
| `data.steps[]`                | array   | 步骤列表   | `<StepList>`                          | 所有步骤状态                    |

#### 总结要点

1. **实时进度：** 支持轮询获取最新进度
2. **步骤追踪：** 显示每个步骤的状态
3. **时间预估：** 提供剩余时间预估
4. **SSE支持：** 可使用Server-Sent Events实时推送
5. **错误处理：** 执行失败时返回错误信息

---

### 🔹 57. POST /api/workflow-executions/{executionId}/cancel - 取消执行

#### ✅ 确认说明

本API用于取消正在执行中的工作流。用户可以在执行进度页面中止不需要的执行。

#### API与UI对应关系

**UI组件位置：** `ExecutionProgressPage` > `CancelButton`

**API响应驱动UI渲染逻辑：**

- 执行中显示"取消"按钮
- 点击后调用本API
- 取消成功后更新状态为已取消
- 停止轮询进度

#### 字段映射表格

| API请求/响应字段          | 类型    | UI显示位置 | 组件属性/样式                          | 说明         |
| ------------------------- | ------- | ---------- | -------------------------------------- | ------------ |
| **URL参数 - executionId** | string  | URL路径    | `/execution/{id}`                      | 执行ID       |
| **响应 - success**        | boolean | 操作状态   | 成功提示                               | 是否取消成功 |
| **响应 - status**         | string  | 新状态     | `<StatusBadge>cancelled</StatusBadge>` | 更新后的状态 |

#### 总结要点

1. **即时中止：** 立即停止工作流执行
2. **资源释放：** 释放占用的计算资源
3. **点数退还：** 部分退还未使用的点数
4. **状态更新：** 标记为已取消状态

---

### 🔹 58. GET /api/projects - 查询项目列表

#### ✅ 确认说明

本API用于查询用户创建的项目列表，支持按状态（活跃/归档）筛选。用户可以在项目中心查看所有项目。

#### API与UI对应关系

**UI组件位置：** `ProjectListPage` > `ProjectGrid`

**API响应驱动UI渲染逻辑：**

- 用户访问项目列表页
- 调用本API获取项目列表
- 渲染项目卡片网格
- 支持筛选和排序

#### 字段映射表格

| API响应字段              | 类型    | UI显示位置 | 组件属性/样式                         | 说明         |
| ------------------------ | ------- | ---------- | ------------------------------------- | ------------ |
| `data.projects[]`        | array   | 项目网格   | `<ProjectGrid>`                       | 项目列表     |
| `projects[].id`          | string  | 项目ID     | `data-project-id`                     | 项目唯一标识 |
| `projects[].name`        | string  | 项目名称   | `<h3>{name}</h3>`                     | 项目名称     |
| `projects[].description` | string  | 项目描述   | `<p>{description}</p>`                | 项目简介     |
| `projects[].icon`        | string  | 项目图标   | `<Icon>{icon}</Icon>`                 | 项目图标     |
| `projects[].color`       | string  | 主题色     | `backgroundColor:{color}`             | 项目颜色     |
| `projects[].archived`    | boolean | 归档标识   | `{archived && <Badge>已归档</Badge>}` | 是否归档     |
| `projects[].stats`       | object  | 统计信息   | `<Stats>`                             | 项目统计     |
| `data.pagination`        | object  | 分页控件   | `<Pagination>`                        | 分页信息     |

#### 总结要点

1. **分类展示：** 区分活跃和归档项目
2. **统计信息：** 显示项目的会话数、文件数等
3. **快速操作：** 支持打开、编辑、归档等操作
4. **排序功能：** 按创建时间、更新时间排序

---

### 🔹 59. GET /api/projects/{projectId}/sessions - 获取项目关联的会话

#### ✅ 确认说明

本API用于获取指定项目关联的所有会话和工作流执行记录。用户可以在项目详情页查看项目的所有活动。

#### API与UI对应关系

**UI组件位置：** `ProjectDetailPage` > `SessionsList`

**API响应驱动UI渲染逻辑：**

- 用户在项目详情页查看关联内容
- 调用本API获取会话列表
- 渲染会话和执行记录
- 支持筛选和排序

#### 字段映射表格

| API响应字段            | 类型   | UI显示位置 | 组件属性/样式                         | 说明                  |
| ---------------------- | ------ | ---------- | ------------------------------------- | --------------------- |
| `data.sessions[]`      | array  | 会话列表   | `<SessionsList>`                      | 关联的会话            |
| `sessions[].id`        | string | 会话ID     | `data-session-id`                     | 会话标识              |
| `sessions[].type`      | string | 类型标识   | `<TypeBadge>{type}</TypeBadge>`       | workflow/conversation |
| `sessions[].title`     | string | 会话标题   | `<h4>{title}</h4>`                    | 会话名称              |
| `sessions[].createdAt` | string | 创建时间   | `{createdAt}`                         | 创建时间              |
| `sessions[].status`    | string | 状态       | `<StatusBadge>{status}</StatusBadge>` | 执行状态              |
| `data.pagination`      | object | 分页       | `<Pagination>`                        | 分页信息              |

#### 总结要点

1. **集中管理：** 查看项目的所有关联内容
2. **类型区分：** 区分工作流和对话会话
3. **时间排序：** 按时间倒序展示
4. **快速跳转：** 点击跳转到会话详情

---

### 🔹 60. DELETE /api/workflow-executions/{executionId} - 删除执行记录

#### ✅ 确认说明

本API用于删除指定的工作流执行记录。用户可以清理不需要的历史记录。

#### API与UI对应关系

**UI组件位置：** `ExecutionHistoryPage` > `DeleteButton`

**API响应驱动UI渲染逻辑：**

- 用户在历史记录中删除某条记录
- 弹出确认对话框
- 调用本API删除
- 从列表中移除

#### 字段映射表格

| API请求/响应字段          | 类型    | UI显示位置 | 组件属性/样式     | 说明         |
| ------------------------- | ------- | ---------- | ----------------- | ------------ |
| **URL参数 - executionId** | string  | URL路径    | `/execution/{id}` | 执行ID       |
| **响应 - success**        | boolean | 删除状态   | 成功提示          | 是否删除成功 |

#### 总结要点

1. **历史清理：** 删除不需要的执行记录
2. **确认提示：** 删除前二次确认
3. **级联删除：** 同时删除输出文件引用
4. **不影响点数：** 删除记录不退还点数

---

### 🔹 61. GET /api/user/balance - 获取用户余额

#### ✅ 确认说明

本API用于获取用户当前的点数余额信息。前端在多处需要显示余额，如顶部导航栏、充值页面等。

#### API与UI对应关系

**UI组件位置：** `Header` > `BalanceDisplay`

**API响应驱动UI渲染逻辑：**

- 登录后调用获取余额
- 显示在顶部导航栏
- 充值或消费后刷新余额
- 余额不足时提示充值

#### 字段映射表格

| API响应字段             | 类型   | UI显示位置 | 组件属性/样式          | 说明           |
| ----------------------- | ------ | ---------- | ---------------------- | -------------- |
| `data.balance`          | number | 余额显示   | `💰 {balance}点`       | 当前点数余额   |
| `data.frozenBalance`    | number | 冻结余额   | `冻结：{frozen}点`     | 冻结的点数     |
| `data.totalRecharge`    | number | 累计充值   | `累计充值：{total}元`  | 历史充值总额   |
| `data.totalConsumption` | number | 累计消费   | `累计消费：{total}点`  | 历史消费总计   |
| `data.expiringCredits`  | number | 即将过期   | `{expiring}点即将过期` | 即将过期的点数 |
| `data.expiresAt`        | string | 过期时间   | `{expiresAt}到期`      | 最早到期时间   |

#### 总结要点

1. **实时余额：** 显示最新的点数余额
2. **冻结提示：** 显示冻结中的点数
3. **过期提醒：** 提示即将过期的点数
4. **累计统计：** 显示充值和消费统计

---

### 🔹 62. POST /api/auth/send-verification-code - 发送验证码

#### ✅ 确认说明

本API用于向用户邮箱发送验证码，用于注册、重置密码等场景。

#### API与UI对应关系

**UI组件位置：** `RegisterPage` > `SendCodeButton`

**API响应驱动UI渲染逻辑：**

- 用户输入邮箱后点击发送
- 调用本API发送验证码
- 显示倒计时，防止频繁发送
- 提示用户检查邮箱

#### 字段映射表格

| API请求/响应字段     | 类型    | UI显示位置 | 组件属性/样式           | 说明                    |
| -------------------- | ------- | ---------- | ----------------------- | ----------------------- |
| **请求体 - email**   | string  | 邮箱输入   | `<input type="email">`  | 接收验证码的邮箱        |
| **请求体 - purpose** | string  | 验证用途   | 隐藏字段                | register/reset-password |
| **响应 - success**   | boolean | 发送状态   | 成功提示                | 是否发送成功            |
| **响应 - expiresIn** | integer | 有效期     | `{expiresIn}分钟内有效` | 验证码有效期            |

#### 总结要点

1. **用途区分：** 区分注册和重置密码场景
2. **频率限制：** 限制发送频率，防止滥用
3. **有效期控制：** 验证码有时效性
4. **倒计时提示：** 显示重发倒计时

---

### 🔹 63. GET /api/cms/faq - 获取常见问题

#### ✅ 确认说明

本API用于获取常见问题列表，展示在帮助中心。用户可以快速找到常见问题的答案。

#### API与UI对应关系

**UI组件位置：** `HelpCenterPage` > `FAQList`

**API响应驱动UI渲染逻辑：**

- 用户访问帮助中心
- 调用本API获取FAQ列表
- 渲染问题和答案
- 支持搜索和分类

#### 字段映射表格

| API响应字段       | 类型    | UI显示位置 | 组件属性/样式                               | 说明         |
| ----------------- | ------- | ---------- | ------------------------------------------- | ------------ |
| `data.faqs[]`     | array   | FAQ列表    | `<FAQList>`                                 | 常见问题列表 |
| `faqs[].id`       | string  | 问题ID     | `data-faq-id`                               | 问题标识     |
| `faqs[].question` | string  | 问题       | `<h4>{question}</h4>`                       | 问题标题     |
| `faqs[].answer`   | string  | 答案       | `<Markdown>{answer}</Markdown>`             | 问题答案     |
| `faqs[].category` | string  | 分类       | `<CategoryBadge>{category}</CategoryBadge>` | 问题分类     |
| `faqs[].helpful`  | integer | 有用计数   | `{helpful}人觉得有用`                       | 有用反馈数   |

#### 总结要点

1. **分类组织：** 按功能模块分类
2. **搜索支持：** 支持关键词搜索
3. **反馈机制：** 用户可标记答案是否有用
4. **Markdown格式：** 答案支持富文本

---

### 🔹 64. POST /api/feedback/vote - 对建议投票

#### ✅ 确认说明

本API用于用户对产品建议投票支持。用户可以为认同的建议投票，帮助产品团队了解需求优先级。

#### API与UI对应关系

**UI组件位置：** `SuggestionDetailPage` > `VoteButton`

**API响应驱动UI渲染逻辑：**

- 用户查看建议详情时可投票
- 点击投票按钮调用本API
- 投票数实时更新
- 已投票显示不同状态

#### 字段映射表格

| API请求/响应字段          | 类型    | UI显示位置 | 组件属性/样式        | 说明               |
| ------------------------- | ------- | ---------- | -------------------- | ------------------ |
| **请求体 - suggestionId** | string  | URL路径    | 建议ID               | 要投票的建议       |
| **请求体 - vote**         | boolean | 投票操作   | true=投票,false=取消 | 投票或取消投票     |
| **响应 - votesCount**     | integer | 投票数     | `⬆️ {count}`         | 更新后的投票数     |
| **响应 - hasVoted**       | boolean | 投票状态   | 高亮显示             | 当前用户是否已投票 |

#### 总结要点

1. **支持表达：** 用户可为建议投票支持
2. **实时更新：** 投票数实时更新
3. **可撤销：** 支持取消投票
4. **防重复：** 每人只能投一票

---

### 🔹 65. GET /api/analytics/dashboard - 获取数据概览

#### ✅ 确认说明

本API用于获取用户的数据分析概览，包括使用趋势、热门功能等统计信息。

#### API与UI对应关系

**UI组件位置：** `DashboardPage` > `AnalyticsCards`

**API响应驱动UI渲染逻辑：**

- 用户访问数据概览页
- 调用本API获取统计数据
- 渲染图表和数据卡片
- 支持时间范围选择

#### 字段映射表格

| API响应字段               | 类型    | UI显示位置 | 组件属性/样式       | 说明         |
| ------------------------- | ------- | ---------- | ------------------- | ------------ |
| `data.period`             | string  | 时间范围   | `{period}统计`      | 统计周期     |
| `data.totalWorkflows`     | integer | 数据卡片   | `工作流：{count}次` | 工作流总数   |
| `data.totalConversations` | integer | 数据卡片   | `对话：{count}次`   | 对话总数     |
| `data.creditsUsed`        | number  | 数据卡片   | `消耗：{credits}点` | 点数消耗     |
| `data.trendData[]`        | array   | 趋势图表   | `<Chart>`           | 使用趋势数据 |
| `data.topFeatures[]`      | array   | 排行榜     | `<TopList>`         | 最常用功能   |

#### 总结要点

1. **全局概览：** 展示关键指标概览
2. **趋势分析：** 图表展示使用趋势
3. **功能排行：** 显示最常用功能
4. **时间筛选：** 支持自定义时间范围

---

## 📊 用户邀请系统 API

### 🔹 66. GET /api/user/invitations - 获取邀请记录

#### ✅ 确认说明

本API用于获取用户的邀请记录列表，包括邀请码、被邀请用户信息、奖励状态等。用于邀请奖励功能。

#### API与UI对应关系

**UI组件位置：** `InvitePage` > `InvitationList`

**API响应驱动UI渲染逻辑：**

- 用户访问邀请页面
- 调用本API获取邀请记录
- 显示邀请码和奖励信息
- 展示被邀请用户列表

#### 字段映射表格

| API响应字段                  | 类型    | UI显示位置   | 组件属性/样式                         | 说明                       |
| ---------------------------- | ------- | ------------ | ------------------------------------- | -------------------------- |
| `data.inviteCode`            | string  | 邀请码显示   | `<CopyableCode>{code}</CopyableCode>` | 用户专属邀请码             |
| `data.inviteUrl`             | string  | 邀请链接     | `<CopyableLink>{url}</CopyableLink>`  | 完整邀请URL                |
| `data.totalInvited`          | integer | 统计卡片     | `已邀请：{count}人`                   | 成功邀请总数               |
| `data.totalRewards`          | number  | 统计卡片     | `已获奖励：{rewards}点`               | 累计奖励点数               |
| `data.invitations[]`         | array   | 邀请列表     | `<InvitationList>`                    | 邀请记录列表               |
| `invitations[].id`           | string  | 记录ID       | `data-invitation-id`                  | 邀请记录标识               |
| `invitations[].invitee`      | object  | 被邀请人信息 | `<UserInfo>`                          | 被邀请用户                 |
| `invitations[].status`       | string  | 状态标识     | `<StatusBadge>{status}</StatusBadge>` | pending/completed/rewarded |
| `invitations[].createdAt`    | string  | 邀请时间     | `{createdAt}`                         | 邀请发出时间               |
| `invitations[].rewardAmount` | number  | 奖励金额     | `{amount}点`                          | 本次邀请奖励               |

#### 总结要点

1. **邀请追踪：** 完整记录所有邀请活动
2. **奖励展示：** 清晰显示奖励状态和金额
3. **一键复制：** 提供邀请码和链接的快速复制
4. **状态区分：** 区分待确认、已完成、已发放奖励

---

### 🔹 67. POST /api/user/invitations - 生成新邀请链接

#### ✅ 确认说明

本API用于生成新的邀请链接，支持自定义参数。用户可以创建特定用途的邀请链接。

#### API与UI对应关系

**UI组件位置：** `InvitePage` > `CreateInviteButton`

**API响应驱动UI渲染逻辑：**

- 用户点击创建新邀请
- 可选择性添加备注标签
- 调用本API生成链接
- 显示新生成的邀请链接

#### 字段映射表格

| API请求/响应字段      | 类型   | UI显示位置 | 组件属性/样式                         | 说明             |
| --------------------- | ------ | ---------- | ------------------------------------- | ---------------- |
| **请求体 - note**     | string | 备注输入   | `<input placeholder="备注">`          | 邀请备注（可选） |
| **响应 - inviteCode** | string | 邀请码     | `<CopyableCode>{code}</CopyableCode>` | 生成的邀请码     |
| **响应 - inviteUrl**  | string | 邀请链接   | `<CopyableLink>{url}</CopyableLink>`  | 完整邀请URL      |
| **响应 - expiresAt**  | string | 过期时间   | `有效期至：{expiresAt}`               | 链接过期时间     |

#### 总结要点

1. **灵活创建：** 支持创建多个邀请链接
2. **备注标记：** 可添加备注区分不同邀请
3. **时效控制：** 设置邀请链接有效期
4. **即时可用：** 生成后立即可分享

---

## 📦 数据导入导出 API

### 🔹 68. POST /api/data/export - 导出所有数据

#### ✅ 确认说明

本API用于导出用户的所有数据，包括会话、文件、项目等。生成打包下载文件，支持数据备份和迁移。

#### API与UI对应关系

**UI组件位置：** `SettingsPage` > `DataManagement` > `ExportButton`

**API响应驱动UI渲染逻辑：**

- 用户在设置页面点击导出数据
- 选择要导出的数据类型
- 调用本API创建导出任务
- 异步生成下载文件

#### 字段映射表格

| API请求/响应字段                  | 类型    | UI显示位置 | 组件属性/样式    | 说明         |
| --------------------------------- | ------- | ---------- | ---------------- | ------------ |
| **请求体 - includeConversations** | boolean | 选项勾选   | `<Checkbox>`     | 是否包含会话 |
| **请求体 - includeFiles**         | boolean | 选项勾选   | `<Checkbox>`     | 是否包含文件 |
| **请求体 - includeProjects**      | boolean | 选项勾选   | `<Checkbox>`     | 是否包含项目 |
| **请求体 - format**               | string  | 格式选择   | `<Select>`       | json/zip     |
| **响应 - jobId**                  | string  | 任务ID     | 轮询状态用       | 导出任务ID   |
| **响应 - estimatedTime**          | integer | 预计时间   | `预计{time}分钟` | 预估完成时间 |

#### 总结要点

1. **完整备份：** 导出所有用户数据
2. **选择性导出：** 可选择要导出的数据类型
3. **异步处理：** 大数据量采用异步生成
4. **格式支持：** 支持JSON和ZIP压缩格式

---

### 🔹 69. POST /api/data/import - 导入数据

#### ✅ 确认说明

本API用于导入之前导出的数据文件，支持数据恢复和迁移。

#### API与UI对应关系

**UI组件位置：** `SettingsPage` > `DataManagement` > `ImportButton`

**API响应驱动UI渲染逻辑：**

- 用户上传导出的数据文件
- 调用本API开始导入
- 显示导入进度
- 完成后刷新数据

#### 字段映射表格

| API请求/响应字段               | 类型    | UI显示位置 | 组件属性/样式  | 说明             |
| ------------------------------ | ------- | ---------- | -------------- | ---------------- |
| **请求体 - file**              | file    | 文件上传   | `<FileUpload>` | 数据文件         |
| **请求体 - overwriteExisting** | boolean | 覆盖选项   | `<Checkbox>`   | 是否覆盖已有数据 |
| **响应 - jobId**               | string  | 任务ID     | 轮询状态用     | 导入任务ID       |
| **响应 - summary**             | object  | 导入摘要   | 预览显示       | 数据摘要信息     |

#### 总结要点

1. **数据恢复：** 恢复导出的数据
2. **冲突处理：** 可选择覆盖或跳过已有数据
3. **预览验证：** 导入前显示数据摘要
4. **安全检查：** 验证文件格式和完整性

---

### 🔹 70. GET /api/data/export-status/{jobId} - 查询导出状态

#### ✅ 确认说明

本API用于查询导出任务的进度状态，支持轮询获取最新进度。

#### API与UI对应关系

**UI组件位置：** `DataExportProgress` > `ProgressTracker`

**API响应驱动UI渲染逻辑：**

- 创建导出任务后开始轮询
- 调用本API获取进度
- 更新进度条
- 完成后提供下载链接

#### 字段映射表格

| API响应字段        | 类型    | UI显示位置 | 组件属性/样式                         | 说明                        |
| ------------------ | ------- | ---------- | ------------------------------------- | --------------------------- |
| `data.status`      | string  | 状态标识   | `<StatusBadge>{status}</StatusBadge>` | processing/completed/failed |
| `data.progress`    | integer | 进度条     | `<ProgressBar value={progress} />`    | 0-100进度值                 |
| `data.downloadUrl` | string  | 下载链接   | `<a href={url}>下载</a>`              | 完成后的下载URL             |
| `data.fileSize`    | integer | 文件大小   | `{formatSize(size)}`                  | 导出文件大小                |
| `data.expiresAt`   | string  | 过期时间   | `链接有效期至：{expiresAt}`           | 下载链接过期时间            |

#### 总结要点

1. **实时进度：** 轮询获取最新进度
2. **状态追踪：** 明确显示任务状态
3. **自动下载：** 完成后提供下载链接
4. **过期提醒：** 提示下载链接有效期

---

## 🔍 搜索功能 API

### 🔹 71. GET /api/search - 全局搜索

#### ✅ 确认说明

本API提供全局搜索功能，支持搜索会话、文件、项目等多种资源类型。

#### API与UI对应关系

**UI组件位置：** `Header` > `GlobalSearch`

**API响应驱动UI渲染逻辑：**

- 用户在顶部搜索框输入关键词
- 调用本API执行搜索
- 渲染搜索结果列表
- 按类型分组显示

#### 字段映射表格

| API响应字段         | 类型    | UI显示位置 | 组件属性/样式                 | 说明                      |
| ------------------- | ------- | ---------- | ----------------------------- | ------------------------- |
| `data.query`        | string  | 搜索词     | `搜索：{query}`               | 搜索关键词                |
| `data.totalResults` | integer | 结果统计   | `找到{count}个结果`           | 总结果数                  |
| `data.results[]`    | array   | 结果列表   | `<SearchResults>`             | 搜索结果                  |
| `results[].type`    | string  | 类型标识   | `<TypeIcon>{type}</TypeIcon>` | conversation/file/project |
| `results[].id`      | string  | 资源ID     | 跳转用                        | 资源标识                  |
| `results[].title`   | string  | 标题       | `<h4>{title}</h4>`            | 结果标题                  |
| `results[].snippet` | string  | 摘要       | `<p>{snippet}</p>`            | 匹配内容摘要              |
| `results[].score`   | number  | 相关度     | 排序依据                      | 搜索相关度分数            |

#### 总结要点

1. **全局搜索：** 搜索所有类型的资源
2. **智能匹配：** 支持模糊匹配和同义词
3. **分类展示：** 按资源类型分组显示
4. **相关度排序：** 按匹配度排序结果

---

### 🔹 72. GET /api/search/suggestions - 搜索建议

#### ✅ 确认说明

本API提供搜索建议和自动补全功能，在用户输入时实时返回建议。

#### API与UI对应关系

**UI组件位置：** `GlobalSearch` > `SuggestionDropdown`

**API响应驱动UI渲染逻辑：**

- 用户输入搜索词时触发
- 调用本API获取建议
- 显示下拉建议列表
- 支持键盘选择

#### 字段映射表格

| API响应字段           | 类型   | UI显示位置 | 组件属性/样式         | 说明                    |
| --------------------- | ------ | ---------- | --------------------- | ----------------------- |
| `data.suggestions[]`  | array  | 建议列表   | `<SuggestionList>`    | 搜索建议                |
| `suggestions[].text`  | string | 建议文本   | `<span>{text}</span>` | 建议内容                |
| `suggestions[].type`  | string | 建议类型   | 图标显示              | keyword/history/popular |
| `suggestions[].score` | number | 相关度     | 排序依据              | 建议相关度              |

#### 总结要点

1. **实时建议：** 输入时实时返回建议
2. **历史记录：** 包含用户搜索历史
3. **热门搜索：** 推荐热门搜索词
4. **快速选择：** 点击建议直接搜索

---

## 🏷️ 标签管理 API

### 🔹 73. GET /api/tags - 获取标签列表

#### ✅ 确认说明

本API用于获取用户创建的标签列表，用于会话、文件等资源的分类管理。

#### API与UI对应关系

**UI组件位置：** `TagManagementPage` > `TagList`

**API响应驱动UI渲染逻辑：**

- 用户访问标签管理页面
- 调用本API获取标签列表
- 渲染标签卡片
- 显示每个标签的使用统计

#### 字段映射表格

| API响应字段         | 类型    | UI显示位置 | 组件属性/样式             | 说明         |
| ------------------- | ------- | ---------- | ------------------------- | ------------ |
| `data.tags[]`       | array   | 标签列表   | `<TagList>`               | 标签列表     |
| `tags[].id`         | string  | 标签ID     | `data-tag-id`             | 标签标识     |
| `tags[].name`       | string  | 标签名称   | `<Tag>{name}</Tag>`       | 标签名称     |
| `tags[].color`      | string  | 标签颜色   | `backgroundColor:{color}` | 标签颜色     |
| `tags[].usageCount` | integer | 使用统计   | `使用{count}次`           | 标签使用次数 |
| `tags[].createdAt`  | string  | 创建时间   | `{createdAt}`             | 标签创建时间 |

#### 总结要点

1. **集中管理：** 统一管理所有标签
2. **使用统计：** 显示标签使用频率
3. **颜色区分：** 支持自定义标签颜色
4. **快速筛选：** 点击标签查看相关资源

---

### 🔹 74. POST /api/tags - 创建标签

#### ✅ 确认说明

本API用于创建新的标签，支持自定义名称和颜色。

#### API与UI对应关系

**UI组件位置：** `TagManagementPage` > `CreateTagButton`

**API响应驱动UI渲染逻辑：**

- 用户点击创建标签
- 输入标签名称和选择颜色
- 调用本API创建标签
- 新标签添加到列表

#### 字段映射表格

| API请求/响应字段   | 类型   | UI显示位置 | 组件属性/样式        | 说明       |
| ------------------ | ------ | ---------- | -------------------- | ---------- |
| **请求体 - name**  | string | 名称输入   | `<input required />` | 标签名称   |
| **请求体 - color** | string | 颜色选择   | `<ColorPicker>`      | 标签颜色   |
| **响应 - tag**     | object | 新标签     | 添加到列表           | 创建的标签 |

#### 总结要点

1. **快速创建：** 简单快速创建标签
2. **自定义颜色：** 支持选择标签颜色
3. **重复检查：** 防止创建重复标签
4. **即时可用：** 创建后立即可使用

---

### 🔹 75. DELETE /api/tags/{tagId} - 删除标签

#### ✅ 确认说明

本API用于删除指定标签。删除后会从所有使用该标签的资源中移除。

#### API与UI对应关系

**UI组件位置：** `TagManagementPage` > `DeleteTagButton`

**API响应驱动UI渲染逻辑：**

- 用户点击删除标签
- 确认删除操作
- 调用本API删除标签
- 从列表中移除

#### 字段映射表格

| API请求/响应字段         | 类型    | UI显示位置 | 组件属性/样式           | 说明         |
| ------------------------ | ------- | ---------- | ----------------------- | ------------ |
| **URL参数 - tagId**      | string  | URL路径    | `/tag/{tagId}`          | 标签ID       |
| **响应 - success**       | boolean | 删除状态   | 成功提示                | 是否删除成功 |
| **响应 - affectedCount** | integer | 影响统计   | `已从{count}个资源移除` | 影响的资源数 |

#### 总结要点

1. **级联移除：** 自动从所有资源中移除
2. **影响提示：** 显示删除影响的资源数
3. **二次确认：** 删除前确认操作
4. **不可恢复：** 删除操作不可撤销

---

## 📝 模板管理 API

### 🔹 76. GET /api/templates - 获取模板列表

#### ✅ 确认说明

本API用于获取用户创建的工作流模板列表，支持保存常用配置为模板。

#### API与UI对应关系

**UI组件位置：** `TemplatesPage` > `TemplateList`

**API响应驱动UI渲染逻辑：**

- 用户访问模板页面
- 调用本API获取模板列表
- 渲染模板卡片
- 支持快速应用模板

#### 字段映射表格

| API响应字段               | 类型    | UI显示位置 | 组件属性/样式          | 说明         |
| ------------------------- | ------- | ---------- | ---------------------- | ------------ |
| `data.templates[]`        | array   | 模板列表   | `<TemplateList>`       | 模板列表     |
| `templates[].id`          | string  | 模板ID     | `data-template-id`     | 模板标识     |
| `templates[].name`        | string  | 模板名称   | `<h4>{name}</h4>`      | 模板名称     |
| `templates[].description` | string  | 模板描述   | `<p>{description}</p>` | 模板说明     |
| `templates[].workflowId`  | string  | 关联工作流 | 工作流链接             | 适用的工作流 |
| `templates[].config`      | object  | 配置内容   | 预览显示               | 模板配置     |
| `templates[].usageCount`  | integer | 使用次数   | `使用{count}次`        | 使用统计     |

#### 总结要点

1. **配置复用：** 保存常用配置为模板
2. **快速应用：** 一键应用模板配置
3. **使用统计：** 显示模板使用频率
4. **分类管理：** 按工作流类型分类

---

### 🔹 77. POST /api/templates - 创建模板

#### ✅ 确认说明

本API用于将当前工作流配置保存为模板，方便后续复用。

#### API与UI对应关系

**UI组件位置：** `WorkflowDetailPage` > `SaveAsTemplateButton`

**API响应驱动UI渲染逻辑：**

- 用户在工作流页面点击保存为模板
- 输入模板名称和描述
- 调用本API创建模板
- 保存成功提示

#### 字段映射表格

| API请求/响应字段         | 类型   | UI显示位置 | 组件属性/样式        | 说明         |
| ------------------------ | ------ | ---------- | -------------------- | ------------ |
| **请求体 - name**        | string | 名称输入   | `<input required />` | 模板名称     |
| **请求体 - description** | string | 描述输入   | `<textarea>`         | 模板描述     |
| **请求体 - workflowId**  | string | 工作流ID   | 自动填充             | 关联的工作流 |
| **请求体 - config**      | object | 配置数据   | 自动获取             | 当前配置     |
| **响应 - template**      | object | 新模板     | 成功提示             | 创建的模板   |

#### 总结要点

1. **配置保存：** 保存当前完整配置
2. **命名描述：** 支持添加名称和说明
3. **版本管理：** 可创建同一配置的多个版本
4. **即时可用：** 创建后立即可使用

---

### 🔹 78. DELETE /api/templates/{templateId} - 删除模板

#### ✅ 确认说明

本API用于删除不再需要的模板。

#### API与UI对应关系

**UI组件位置：** `TemplatesPage` > `DeleteTemplateButton`

**API响应驱动UI渲染逻辑：**

- 用户点击删除模板
- 确认删除操作
- 调用本API删除
- 从列表移除

#### 字段映射表格

| API请求/响应字段         | 类型    | UI显示位置 | 组件属性/样式            | 说明         |
| ------------------------ | ------- | ---------- | ------------------------ | ------------ |
| **URL参数 - templateId** | string  | URL路径    | `/template/{templateId}` | 模板ID       |
| **响应 - success**       | boolean | 删除状态   | 成功提示                 | 是否删除成功 |

#### 总结要点

1. **清理模板：** 删除不需要的模板
2. **确认提示：** 删除前二次确认
3. **不影响数据：** 删除模板不影响已创建的会话
4. **即时生效：** 删除后立即从列表移除

---

## 📋 活动日志 API

### 🔹 79. GET /api/activity-log - 获取活动日志

#### ✅ 确认说明

本API用于获取用户的活动日志，记录所有重要操作。

#### API与UI对应关系

**UI组件位置：** `SettingsPage` > `ActivityLog`

**API响应驱动UI渲染逻辑：**

- 用户访问活动日志页面
- 调用本API获取日志列表
- 渲染日志条目
- 支持按时间筛选

#### 字段映射表格

| API响应字段          | 类型   | UI显示位置 | 组件属性/样式                         | 说明       |
| -------------------- | ------ | ---------- | ------------------------------------- | ---------- |
| `data.logs[]`        | array  | 日志列表   | `<ActivityLogList>`                   | 活动日志   |
| `logs[].id`          | string | 日志ID     | `data-log-id`                         | 日志标识   |
| `logs[].action`      | string | 操作类型   | `<ActionBadge>{action}</ActionBadge>` | 操作类型   |
| `logs[].description` | string | 操作描述   | `<p>{description}</p>`                | 操作说明   |
| `logs[].timestamp`   | string | 时间戳     | `{timestamp}`                         | 操作时间   |
| `logs[].ipAddress`   | string | IP地址     | `{ipAddress}`                         | 操作IP     |
| `logs[].userAgent`   | string | 设备信息   | 悬停显示                              | 浏览器信息 |
| `data.pagination`    | object | 分页       | `<Pagination>`                        | 分页信息   |

#### 总结要点

1. **操作追踪：** 记录所有重要操作
2. **安全审计：** 显示IP和设备信息
3. **时间筛选：** 支持按时间范围查询
4. **分页展示：** 大量日志分页显示

---

### 🔹 80. DELETE /api/activity-log - 清除日志

#### ✅ 确认说明

本API用于清除指定时间范围的活动日志。

#### API与UI对应关系

**UI组件位置：** `ActivityLog` > `ClearLogsButton`

**API响应驱动UI渲染逻辑：**

- 用户选择要清除的日志范围
- 确认清除操作
- 调用本API清除日志
- 刷新日志列表

#### 字段映射表格

| API请求/响应字段        | 类型    | UI显示位置 | 组件属性/样式         | 说明                 |
| ----------------------- | ------- | ---------- | --------------------- | -------------------- |
| **请求体 - beforeDate** | string  | 日期选择   | `<DatePicker>`        | 清除此日期之前的日志 |
| **响应 - deletedCount** | integer | 清除数量   | `已清除{count}条日志` | 清除的日志数         |

#### 总结要点

1. **定期清理：** 清除旧的活动日志
2. **时间范围：** 指定清除日期范围
3. **确认操作：** 清除前二次确认
4. **不可恢复：** 清除后无法恢复

---

## 🔧 其他实用工具 API

### 🔹 81. POST /api/utilities/export-pdf - 导出PDF

#### ✅ 确认说明

本API用于将会话内容导出为PDF格式，方便打印和分享。

#### API与UI对应关系

**UI组件位置：** `ConversationDetailPage` > `ExportPDFButton`

**API响应驱动UI渲染逻辑：**

- 用户点击导出PDF按钮
- 选择导出选项（如包含附件等）
- 调用本API生成PDF
- 自动下载PDF文件

#### 字段映射表格

| API请求/响应字段                | 类型    | UI显示位置 | 组件属性/样式 | 说明         |
| ------------------------------- | ------- | ---------- | ------------- | ------------ |
| **请求体 - conversationId**     | string  | 会话ID     | 自动获取      | 要导出的会话 |
| **请求体 - includeAttachments** | boolean | 选项勾选   | `<Checkbox>`  | 是否包含附件 |
| **请求体 - template**           | string  | 模板选择   | `<Select>`    | PDF模板样式  |
| **响应 - downloadUrl**          | string  | 下载链接   | 自动下载      | PDF下载URL   |
| **响应 - fileName**             | string  | 文件名     | 显示          | PDF文件名    |

#### 总结要点

1. **PDF导出：** 将对话导出为PDF格式
2. **模板选择：** 支持多种PDF样式模板
3. **附件选项：** 可选择是否包含附件
4. **自动下载：** 生成后自动下载

---

### 🔹 82. GET /api/cms/templates - 获取CMS模板

#### ✅ 确认说明

本API用于获取系统提供的内容模板，如回复模板、提示词模板等。

#### API与UI对应关系

**UI组件位置：** `TemplateSelector`

**API响应驱动UI渲染逻辑：**

- 用户在输入框点击模板按钮
- 调用本API获取模板列表
- 显示模板选择器
- 选择后插入内容

#### 字段映射表格

| API响应字段               | 类型   | UI显示位置 | 组件属性/样式                               | 说明       |
| ------------------------- | ------ | ---------- | ------------------------------------------- | ---------- |
| `data.templates[]`        | array  | 模板列表   | `<TemplateList>`                            | 模板列表   |
| `templates[].id`          | string | 模板ID     | `data-template-id`                          | 模板标识   |
| `templates[].title`       | string | 模板标题   | `<h4>{title}</h4>`                          | 模板名称   |
| `templates[].content`     | string | 模板内容   | 预览显示                                    | 模板内容   |
| `templates[].category`    | string | 分类       | `<CategoryBadge>{category}</CategoryBadge>` | 模板分类   |
| `templates[].variables[]` | array  | 变量列表   | 填充提示                                    | 可替换变量 |

#### 总结要点

1. **快速输入：** 使用模板快速输入内容
2. **分类管理：** 按用途分类模板
3. **变量支持：** 支持自定义变量替换
4. **预览功能：** 选择前预览模板内容

---

### 🔹 83. POST /api/webhooks - 配置Webhook

#### ✅ 确认说明

本API用于配置Webhook通知，当特定事件发生时自动推送通知到指定URL。

#### API与UI对应关系

**UI组件位置：** `SettingsPage` > `IntegrationSettings` > `WebhookConfig`

**API响应驱动UI渲染逻辑：**

- 用户在设置页面配置Webhook
- 输入目标URL和选择事件
- 调用本API保存配置
- 测试Webhook连接

#### 字段映射表格

| API请求/响应字段      | 类型   | UI显示位置  | 组件属性/样式                   | 说明             |
| --------------------- | ------ | ----------- | ------------------------------- | ---------------- |
| **请求体 - url**      | string | URL输入     | `<input type="url" required />` | Webhook URL      |
| **请求体 - events[]** | array  | 事件选择    | `<CheckboxGroup>`               | 订阅的事件类型   |
| **请求体 - secret**   | string | 密钥输入    | `<input type="password">`       | 验证密钥（可选） |
| **响应 - webhook**    | object | Webhook配置 | 显示配置                        | 创建的Webhook    |
| **响应 - webhookId**  | string | Webhook ID  | 管理用                          | Webhook标识      |

#### 总结要点

1. **事件订阅：** 订阅特定事件的通知
2. **自定义URL：** 推送到指定的接收地址
3. **安全验证：** 支持密钥验证请求来源
4. **测试功能：** 提供测试Webhook连接

---
