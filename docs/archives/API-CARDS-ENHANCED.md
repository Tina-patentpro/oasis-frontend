> **归档说明**：本文档为历史归档资料，可能不代表当前实现与当前规范；请优先以仓库当前代码、docs/CHANGELOG.md、docs/api/ 与最新审计/计划文件为准。

# API 接口增强卡片

> **文档版本：** v2.0-enhanced  
> **最后更新：** 2025-12-31  
> **维护者：** Workspace开发团队

本文档在原有API卡片基础上，为核心数据提供API增强了完整的**API与UI对应关系映射**，包括字段映射表、功能流程图和设计文档依据。

---

## 📑 快速导航索引

### 📊 完成进度总览

```
总进度: ████████████████████░░░░░ 68/83 (82%)

P0 核心 API:  ██████████████████████ 14/14 (100%)
P1 常用 API:  ██████████████████████ 14/14 (100%)
P2 辅助 API:  ████████████████████░░ 40/55 (73%)
```

### 🗂️ 按功能模块分类索引

#### 🔐 用户认证与账户管理 (6个)

- [POST /api/auth/register](#-15-post-apiauthregister---用户注册) - 用户注册
- [POST /api/auth/login](#-16-post-apiauthlogin---用户登录) - 用户登录
- [POST /api/auth/logout](#-17-post-apiauthlogout---用户登出) - 用户登出
- [GET /api/user/profile](#-32-get-apiuserprofile---获取用户资料) - 获取用户资料
- [PUT /api/user/profile](#-33-put-apiuserprofile---更新用户资料) - 更新用户资料

#### 🔄 工作流管理 (4个)

- [GET /cms/model-categories](#-1-get-cmsmodel-categories---工作流分类标签) - 工作流分类标签
- [GET /cms/tools](#-2-get-cmstools---工作流项目卡片) - 工作流项目卡片
- [GET /api/workflows](#-3-get-apiworkflows---工作流列表) - 工作流列表
- [GET /api/workflows/{workflowId}](#-4-get-apiworkflowsworkflowid---工作流详情) - 工作流详情
- [POST /api/workflows/{workflowId}/execute](#-9-post-apiworkflowsworkflowidexecute---工作流执行) - 工作流执行

#### 💬 对话流管理 (9个)

- [GET /cms/chat-modes](#-5-get-cmschat-modes---对话模式选项) - 对话模式选项
- [POST /ai/chat](#-10-post-aichat---对话流交互) - 对话流交互
- [GET /api/conversations](#-29-get-apiconversations---查询会话列表) - 查询会话列表
- [PATCH /api/conversations/{conversationId}](#-21-patch-apiconversationsconversationid---更新会话) - 更新会话
- [POST /api/conversations/{conversationId}/export](#-22-post-apiconversationsconversationidexport---导出会话) - 导出会话
- [GET /api/conversations/{id}/messages](#-34-get-apiconversationsidmessages---获取会话消息列表) - 获取会话消息列表
- [DELETE /api/conversations/{id}](#-35-delete-apiconversationsid---删除会话) - 删除会话
- [POST /api/conversations/{id}/share](#-36-post-apiconversationsidshare---分享会话) - 分享会话
- [GET /api/conversations/shared/{shareId}](#-37-get-apiconversationssharedshareid---访问分享的会话) - 访问分享的会话
- [POST /api/sessions/batch-export](#-23-post-apisessionsbatch-export---批量导出会话) - 批量导出会话

#### 📁 项目管理 (4个)

- [POST /api/projects](#-12-post-apiprojects---项目创建) - 项目创建
- [PUT /api/projects/{projectId}](#-18-put-apiprojectsprojectid---更新项目) - 更新项目
- [DELETE /api/projects/{projectId}](#-19-delete-apiprojectsprojectid---删除项目) - 删除项目
- [PATCH /api/projects/{projectId}/archive](#-20-patch-apiprojectsprojectidarchive---归档项目) - 归档项目
- [PATCH /api/sessions/{sessionId}/associate](#-13-patch-apisessionssessionidassociate---会话关联) - 会话关联

#### 📎 文件管理 (6个)

- [POST /api/files/upload](#-14-post-apifilesupload---文件上传) - 文件上传
- [GET /api/files](#-30-get-apifiles---查询文件列表) - 查询文件列表
- [GET /api/files/{fileId}](#-38-get-apifilesfileid---获取文件详情) - 获取文件详情
- [PATCH /api/files/{fileId}](#-39-patch-apifilesfileid---更新文件信息) - 更新文件信息
- [DELETE /api/files/{fileId}](#-31-delete-apifilesfileid---删除文件) - 删除文件
- [POST /api/files/batch-download](#-40-post-apifilesbatch-download---批量下载文件) - 批量下载文件

#### 💰 充值与支付 (2个)

- [GET /cms/recharge-packages](#-8-get-cmsrecharge-packages---充值套餐) - 充值套餐
- [POST /api/billing/top-ups](#-11-post-apibillingtop-ups---支付充值) - 支付充值

#### 🛠️ 配置与偏好 (4个)

- [GET /cms/input-sections/{toolId}](#-6-get-cmsinput-sectionstoolid---动态表单配置) - 动态表单配置
- [GET /cms/sample-data/{toolId}](#-7-get-cmssample-datatoolid---示例数据) - 示例数据
- [POST /api/instructions](#-26-post-apiinstructions---保存自定义指令) - 保存自定义指令
- [PUT /api/utilities/preferences/layout](#-27-put-apiutilitiespreferenceslayout---更新布局偏好) - 更新布局偏好

#### 💡 支持与反馈 (2个)

- [POST /api/support/tickets](#-24-post-apisupporttickets---创建工单) - 创建工单
- [POST /api/feedback/suggestions](#-25-post-apifeedbacksuggestions---提交建议) - 提交建议

#### 🔔 通知管理 (1个)

- [PATCH /api/notifications/read-all](#-28-patch-apinotificationsread-all---批量标记已读) - 批量标记已读

---

### 🎯 按优先级分类索引

#### P0 核心业务 API (14个 - 100%完成)

**Stage 1: 核心数据提供 (8个)**

1. [GET /cms/model-categories](#-1-get-cmsmodel-categories---工作流分类标签) - 工作流分类标签
2. [GET /cms/tools](#-2-get-cmstools---工作流项目卡片) - 工作流项目卡片
3. [GET /api/workflows](#-3-get-apiworkflows---工作流列表) - 工作流列表
4. [GET /api/workflows/{workflowId}](#-4-get-apiworkflowsworkflowid---工作流详情) - 工作流详情
5. [GET /cms/chat-modes](#-5-get-cmschat-modes---对话模式选项) - 对话模式选项
6. [GET /cms/input-sections/{toolId}](#-6-get-cmsinput-sectionstoolid---动态表单配置) - 动态表单配置
7. [GET /cms/sample-data/{toolId}](#-7-get-cmssample-datatoolid---示例数据) - 示例数据
8. [GET /cms/recharge-packages](#-8-get-cmsrecharge-packages---充值套餐) - 充值套餐

**Stage 2-P0: 核心交互 (6个)** 9. [POST /api/workflows/{workflowId}/execute](#-9-post-apiworkflowsworkflowidexecute---工作流执行) - 工作流执行 10. [POST /ai/chat](#-10-post-aichat---对话流交互) - 对话流交互 11. [POST /api/billing/top-ups](#-11-post-apibillingtop-ups---支付充值) - 支付充值 12. [POST /api/projects](#-12-post-apiprojects---项目创建) - 项目创建 13. [PATCH /api/sessions/{sessionId}/associate](#-13-patch-apisessionssessionidassociate---会话关联) - 会话关联 14. [POST /api/files/upload](#-14-post-apifilesupload---文件上传) - 文件上传

#### P1 常用功能 API (14个 - 100%完成)

**用户认证 (3个)** 15. [POST /api/auth/register](#-15-post-apiauthregister---用户注册) - 用户注册 16. [POST /api/auth/login](#-16-post-apiauthlogin---用户登录) - 用户登录 17. [POST /api/auth/logout](#-17-post-apiauthlogout---用户登出) - 用户登出

**项目管理 (3个)** 18. [PUT /api/projects/{projectId}](#-18-put-apiprojectsprojectid---更新项目) - 更新项目 19. [DELETE /api/projects/{projectId}](#-19-delete-apiprojectsprojectid---删除项目) - 删除项目 20. [PATCH /api/projects/{projectId}/archive](#-20-patch-apiprojectsprojectidarchive---归档项目) - 归档项目

**会话管理 (3个)** 21. [PATCH /api/conversations/{conversationId}](#-21-patch-apiconversationsconversationid---更新会话) - 更新会话 22. [POST /api/conversations/{conversationId}/export](#-22-post-apiconversationsconversationidexport---导出会话) - 导出会话 23. [POST /api/sessions/batch-export](#-23-post-apisessionsbatch-export---批量导出会话) - 批量导出会话

**支持与反馈 (2个)** 24. [POST /api/support/tickets](#-24-post-apisupporttickets---创建工单) - 创建工单 25. [POST /api/feedback/suggestions](#-25-post-apifeedbacksuggestions---提交建议) - 提交建议

**配置与通知 (3个)** 26. [POST /api/instructions](#-26-post-apiinstructions---保存自定义指令) - 保存自定义指令 27. [PUT /api/utilities/preferences/layout](#-27-put-apiutilitiespreferenceslayout---更新布局偏好) - 更新布局偏好 28. [PATCH /api/notifications/read-all](#-28-patch-apinotificationsread-all---批量标记已读) - 批量标记已读

#### P2 辅助功能 API (12个已完成 / 31个总数 - 39%完成)

**会话辅助 (5个)** 29. [GET /api/conversations](#-29-get-apiconversations---查询会话列表) - 查询会话列表 30. [GET /api/conversations/{id}/messages](#-34-get-apiconversationsidmessages---获取会话消息列表) - 获取会话消息列表 31. [DELETE /api/conversations/{id}](#-35-delete-apiconversationsid---删除会话) - 删除会话 32. [POST /api/conversations/{id}/share](#-36-post-apiconversationsidshare---分享会话) - 分享会话 33. [GET /api/conversations/shared/{shareId}](#-37-get-apiconversationssharedshareid---访问分享的会话) - 访问分享的会话

**文件管理 (5个)** 34. [GET /api/files](#-30-get-apifiles---查询文件列表) - 查询文件列表 35. [DELETE /api/files/{fileId}](#-31-delete-apifilesfileid---删除文件) - 删除文件 36. [GET /api/files/{fileId}](#-38-get-apifilesfileid---获取文件详情) - 获取文件详情 37. [PATCH /api/files/{fileId}](#-39-patch-apifilesfileid---更新文件信息) - 更新文件信息 38. [POST /api/files/batch-download](#-40-post-apifilesbatch-download---批量下载文件) - 批量下载文件

**用户资料 (2个)** 39. [GET /api/user/profile](#-32-get-apiuserprofile---获取用户资料) - 获取用户资料 40. [PUT /api/user/profile](#-33-put-apiuserprofile---更新用户资料) - 更新用户资料

---

### 🔍 快速查找表

| UI 组件/页面     | 关联 API                              | 编号                                                             |
| ---------------- | ------------------------------------- | ---------------------------------------------------------------- |
| **工作流中心页** | GET /cms/model-categories             | [#1](#-1-get-cmsmodel-categories---工作流分类标签)               |
|                  | GET /cms/tools                        | [#2](#-2-get-cmstools---工作流项目卡片)                          |
|                  | GET /api/workflows                    | [#3](#-3-get-apiworkflows---工作流列表)                          |
| **工作流详情页** | GET /api/workflows/{id}               | [#4](#-4-get-apiworkflowsworkflowid---工作流详情)                |
|                  | GET /cms/input-sections/{id}          | [#6](#-6-get-cmsinput-sectionstoolid---动态表单配置)             |
|                  | GET /cms/sample-data/{id}             | [#7](#-7-get-cmssample-datatoolid---示例数据)                    |
| **工作流执行页** | POST /api/workflows/{id}/execute      | [#9](#-9-post-apiworkflowsworkflowidexecute---工作流执行)        |
|                  | POST /api/files/upload                | [#14](#-14-post-apifilesupload---文件上传)                       |
| **对话流页面**   | GET /cms/chat-modes                   | [#5](#-5-get-cmschat-modes---对话模式选项)                       |
|                  | POST /ai/chat                         | [#10](#-10-post-aichat---对话流交互)                             |
|                  | POST /api/files/upload                | [#14](#-14-post-apifilesupload---文件上传)                       |
| **会话历史页**   | GET /api/conversations                | [#29](#-29-get-apiconversations---查询会话列表)                  |
|                  | PATCH /api/conversations/{id}         | [#21](#-21-patch-apiconversationsconversationid---更新会话)      |
|                  | POST /api/conversations/{id}/export   | [#22](#-22-post-apiconversationsconversationidexport---导出会话) |
|                  | POST /api/sessions/batch-export       | [#23](#-23-post-apisessionsbatch-export---批量导出会话)          |
|                  | DELETE /api/conversations/{id}        | [#35](#-35-delete-apiconversationsid---删除会话)                 |
| **会话详情页**   | GET /api/conversations/{id}/messages  | [#34](#-34-get-apiconversationsidmessages---获取会话消息列表)    |
|                  | POST /api/conversations/{id}/share    | [#36](#-36-post-apiconversationsidshare---分享会话)              |
| **项目列表页**   | POST /api/projects                    | [#12](#-12-post-apiprojects---项目创建)                          |
|                  | PATCH /api/projects/{id}/archive      | [#20](#-20-patch-apiprojectsprojectidarchive---归档项目)         |
| **项目详情页**   | PUT /api/projects/{id}                | [#18](#-18-put-apiprojectsprojectid---更新项目)                  |
|                  | DELETE /api/projects/{id}             | [#19](#-19-delete-apiprojectsprojectid---删除项目)               |
|                  | PATCH /api/sessions/{id}/associate    | [#13](#-13-patch-apisessionssessionidassociate---会话关联)       |
| **充值页面**     | GET /cms/recharge-packages            | [#8](#-8-get-cmsrecharge-packages---充值套餐)                    |
|                  | POST /api/billing/top-ups             | [#11](#-11-post-apibillingtop-ups---支付充值)                    |
| **文件管理页**   | GET /api/files                        | [#30](#-30-get-apifiles---查询文件列表)                          |
|                  | GET /api/files/{id}                   | [#38](#-38-get-apifilesfileid---获取文件详情)                    |
|                  | PATCH /api/files/{id}                 | [#39](#-39-patch-apifilesfileid---更新文件信息)                  |
|                  | DELETE /api/files/{id}                | [#31](#-31-delete-apifilesfileid---删除文件)                     |
|                  | POST /api/files/batch-download        | [#40](#-40-post-apifilesbatch-download---批量下载文件)           |
| **登录/注册页**  | POST /api/auth/register               | [#15](#-15-post-apiauthregister---用户注册)                      |
|                  | POST /api/auth/login                  | [#16](#-16-post-apiauthlogin---用户登录)                         |
| **个人中心**     | GET /api/user/profile                 | [#32](#-32-get-apiuserprofile---获取用户资料)                    |
|                  | PUT /api/user/profile                 | [#33](#-33-put-apiuserprofile---更新用户资料)                    |
|                  | POST /api/auth/logout                 | [#17](#-17-post-apiauthlogout---用户登出)                        |
| **设置页面**     | PUT /api/utilities/preferences/layout | [#27](#-27-put-apiutilitiespreferenceslayout---更新布局偏好)     |
|                  | POST /api/instructions                | [#26](#-26-post-apiinstructions---保存自定义指令)                |
| **支持中心**     | POST /api/support/tickets             | [#24](#-24-post-apisupporttickets---创建工单)                    |
|                  | POST /api/feedback/suggestions        | [#25](#-25-post-apifeedbacksuggestions---提交建议)               |
| **通知中心**     | PATCH /api/notifications/read-all     | [#28](#-28-patch-apinotificationsread-all---批量标记已读)        |
| **分享页面**     | GET /api/conversations/shared/{id}    | [#37](#-37-get-apiconversationssharedshareid---访问分享的会话)   |

---

## 📋 文档说明

### 增强内容结构

每个增强API卡片包含以下部分：

1. **✅ 确认说明** - 确认该API提供UI数据的作用
2. **API与UI对应关系** - 说明API响应如何驱动前端UI渲染
3. **字段映射表格** - API字段 → UI显示位置的详细映射
4. **功能实现流程** - 用户操作 → API调用 → UI更新的完整流程图
5. **设计文档依据** - 引用《网站设计目标说明.md》的相关条款
6. **总结要点** - 关键实现要点的归纳

---

---

---

---

## 🎯 下一步工作建议

### Stage 3: 设计文档引用完善（推荐优先）

为所有83个API添加或完善设计文档依据引用，确保每个API都能追溯到原始需求。

### Stage 4: 创建快速索引（高价值）

创建 `API-CARDS-INDEX.md` 文档，提供：

- API分类目录树
- 功能-API快速查找表
- UI组件-API映射表
- 优先级分类索引

### Stage 5: P2辅助功能API增强（可选）

继续完成剩余31个P2优先级API的增强文档，涵盖：

- 会话管理辅助API（9个）
- 文件管理API（5个）
- 设置与偏好API（6个）
- 统计与分析API（4个）
- 其他辅助功能API（7个）

---

## 🔧 Stage 2: 添加功能流程图（P2优先级）

### 🔹 66. GET /api/user/invitations - 获取邀请记录

#### ✅ 确认说明

本API用于获取用户的邀请记录，包括邀请码、被邀请用户等信息。用于邀请奖励功能。

#### API与UI对应关系

**UI组件位置：** `InvitePage` > `InvitationList`

**API响应驱动UI渲染逻辑：**

- 用户访问邀请页面
- 调用本API获取邀请记录
- 显示邀请码和奖励信息
- 展示被邀请用户列表

#### 字段映射表格

| API响应字段       | 类型   | UI显示位置 | 组件属性/样式 | 说明 |
| ----------------- | ------ | ---------- | ------------- | ---- |
| `data.inviteCode` | string | 邀请码显示 |
