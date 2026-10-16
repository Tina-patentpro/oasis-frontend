> **归档说明**：本文档为历史归档资料，可能不代表当前实现与当前规范；请优先以仓库当前代码、docs/CHANGELOG.md、docs/api/ 与最新审计/计划文件为准。

# 前后端对接技术规范文档

**文档版本：** 1.0.0  
**更新日期：** 2025-10-04  
**适用对象：** 后端工程师、前端工程师、架构师

---

## 📋 目录

1. [系统架构概述](#系统架构概述)
2. [界面布局与数据流向](#界面布局与数据流向)
3. [核心业务流程](#核心业务流程)
4. [API接口规范](#api接口规范)
5. [数据模型设计](#数据模型设计)
6. [系统集成方案](#系统集成方案)
7. [开发规范](#开发规范)
8. [部署与运维](#部署与运维)

---

## 🏗️ 系统架构概述

### 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                        前端应用层                              │
│  (React + TypeScript + Zustand)                             │
└──────────────┬──────────────────────────────────────────────┘
               │
               │ HTTPS / WebSocket
               │
┌──────────────▼──────────────────────────────────────────────┐
│                      后端服务层                                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │   CMS    │  │   Dify   │  │    FS    │  │    DB    │   │
│  │ 配置管理  │  │ AI工作流  │  │ 文件存储  │  │  数据库   │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 四大系统职责

#### 1. CMS（内容管理系统）

**职责**：

- 界面配置管理（模型列表、工作流步骤、充值套餐等）
- 静态内容管理（帮助文档、客服信息等）
- 业务规则配置（定价策略、推荐码规则等）

**技术要求**：

- 提供RESTful API供前端调用
- 支持配置热更新（无需重启）
- 提供配置版本管理

#### 2. Dify（AI工作流系统）

**职责**：

- AI内容生成（技术交底书、权利要求、说明书等）
- 对话式交互（通用对话、工作聚焦、语义生图）
- 流式输出支持（Server-Sent Events）

**技术要求**：

- 集成Dify API
- 支持流式响应
- 实现请求队列和限流
- 错误重试机制

#### 3. FS（文件系统）

**职责**：

- 文件上传下载
- 文件存储管理（建议使用阿里云OSS或AWS S3）
- 生成文件的临时访问链接

**技术要求**：

- 支持大文件上传（分片上传）
- 文件类型验证
- 自动图片压缩
- CDN加速

#### 4. DB（数据库系统）

**职责**：

- 用户数据存储
- 会话和项目数据
- 交易和消费记录
- 历史数据查询

**技术要求**：

- MySQL 8.0+ 或 PostgreSQL 13+
- 数据备份策略
- 查询性能优化
- 数据安全加密

---

## 🖥️ 界面布局与数据流向

### 1. 顶部导航栏

#### 1.1 侧边栏开关

**前端需求**：切换左侧边栏显示/隐藏状态  
**后端需求**：无需后端支持（纯前端状态）

#### 1.2 通知中心

**前端需求**：

- 显示未读通知数量
- 获取通知列表
- 标记已读/删除通知

**后端API**：

```typescript
GET  /api/notifications/unread-count        // 获取未读数量
GET  /api/notifications?read=false          // 获取通知列表
PUT  /api/notifications/:id/read            // 标记单个已读
PUT  /api/notifications/read-all            // 全部标记已读
DELETE /api/notifications/:id               // 删除单个
DELETE /api/notifications                   // 清空所有
```

**数据库表**：`notifications`

```sql
- id: 通知ID
- user_id: 用户ID
- type: 类型（info/success/warning/error）
- title: 标题
- message: 消息内容
- read: 是否已读
- created_at: 创建时间
```

#### 1.3 用户菜单

##### 个人信息

**前端需求**：

- 获取用户信息
- 更新用户信息（头像、用户名、邮箱、手机号）

**后端API**：

```typescript
GET / api / users / me // 获取当前用户信息
PUT / api / users / me // 更新用户信息
POST / api / users / me / avatar // 上传头像
```

**数据字段**：

```typescript
interface User {
  id: number
  email: string
  username: string
  phone?: string
  avatarUrl?: string
  balance: number
  createdAt: string
}
```

##### 推荐奖励

**前端需求**：

- 生成/获取我的推荐码
- 使用好友推荐码
- 查看推荐统计和记录

**后端API**：

```typescript
GET / api / referral / my - code // 获取我的推荐码
POST / api / referral / use - code // 使用推荐码
GET / api / referral / statistics // 获取推荐统计
GET / api / referral / records // 获取推荐记录
```

**CMS配置**：

```typescript
interface ReferralConfig {
  rewardAmount: number // 奖励金额（默认50元）
  maxUsageCount: number // 推荐码最大使用次数（默认10次）
  codeFormat: string // 推荐码格式（字母+数字组合）
}
```

**数据库表**：`referral_codes`, `referral_records`

##### 充值/余额

**前端需求**：

- 查看当前余额
- 获取充值套餐列表（CMS配置）
- 发起充值请求

**后端API**：

```typescript
GET  /api/users/me/balance                 // 获取余额
GET  /api/cms/recharge-packages            // 获取充值套餐（CMS）
POST /api/payments/recharge                // 发起充值
GET  /api/payments/:id/status              // 查询支付状态
```

**CMS配置**：充值套餐

```typescript
interface RechargePackage {
  id: string
  name: string
  amount: number // 充值金额
  bonusAmount: number // 赠送金额
  description: string
  recommended: boolean
  sortOrder: number
}
```

**充值流程**：

```
1. 前端获取充值套餐列表（CMS API）
2. 用户选择套餐或输入自定义金额
3. 前端调用充值API，获取支付链接
4. 用户完成支付
5. 支付回调通知后端
6. 后端更新余额：
   - 充值金额入账（DB）
   - 赠送金额入账（DB）
   - 记录交易明细（DB）
7. 前端轮询支付状态或WebSocket通知
```

##### 使用记录

**前端需求**：

- 查看交易明细（消费、充值、赠送、返还）
- 支持筛选和分页
- 导出记录

**后端API**：

```typescript
GET /api/transactions?type=all&startDate=xxx&endDate=xxx&page=1&pageSize=20
GET /api/transactions/export?format=csv
```

**数据库表**：`transactions`

```sql
- id: 交易ID
- user_id: 用户ID
- type: 类型（recharge/consume/bonus/refund）
- amount: 金额
- description: 描述
- balance_after: 交易后余额
- session_id: 关联会话ID（消费时）
- created_at: 时间
```

##### 数据管理

**前端需求**：

- 导出所有数据
- 删除所有数据
- 清理浏览器缓存

**后端API**：

```typescript
GET    /api/users/me/export           // 导出数据（异步任务）
DELETE /api/users/me/data             // 删除所有数据
GET    /api/users/me/export/:taskId   // 获取导出任务状态
```

##### 帮助文档/联系客服

**前端需求**：获取帮助文档内容和客服信息

**后端API**：

```typescript
GET / api / cms / help - docs // 获取帮助文档（CMS）
GET / api / cms / customer - service // 获取客服信息（CMS）
```

##### 项目管理中心

**前端需求**：

- 使用统计数据（按时间、客户分类）
- 工作量趋势图表
- To Do清单

**后端API**：

```typescript
GET /api/statistics/overview?startDate=xxx&endDate=xxx
GET /api/statistics/workload-trend
GET /api/statistics/by-customer
GET /api/statistics/by-task-type
GET /api/todo-list
```

##### 主题切换

**前端需求**：无需后端支持（纯前端）

##### 登出

**后端API**：

```typescript
POST / api / auth / logout
```

#### 1.4 对话开关

**前端需求**：无需后端支持（纯前端状态）

---

### 2. 左侧边栏

#### 2.1 模型分类标签

**前端需求**：获取模型分类列表

**后端API**：

```typescript
GET / api / cms / model - categories
```

**CMS配置**：

```typescript
interface ModelCategory {
  id: string
  name: string // "技术研发" | "专利撰写" | "辅助工具"
  description: string
  icon: string
  tools: string[] // 该分类下的工具列表
  sortOrder: number
}
```

#### 2.2 模型选择

**前端需求**：

- 获取工具列表（CMS配置）
- 获取版本列表（CMS配置）
- 获取模型说明

**后端API**：

```typescript
GET /api/cms/tools                          // 获取所有工具
GET /api/cms/tools/:toolId/versions         // 获取工具的版本列表
GET /api/cms/tools/:toolId/description      // 获取工具说明
```

**CMS配置**：

```typescript
interface Tool {
  id: string
  name: string
  category: string // 所属分类
  description: string
  versions: ToolVersion[]
  sortOrder: number
}

interface ToolVersion {
  id: string
  name: string // "Fast" | "Basic" | "Pro"
  description: string
  costMultiplier: number // 成本倍数（相对于Basic）
  features: string[]
}
```

#### 2.3 独立会话历史

**前端需求**：

- 获取独立会话列表
- 重命名会话
- 关联项目
- 导出会话
- 删除会话

**后端API**：

```typescript
GET    /api/sessions?type=independent&page=1&pageSize=20
PUT    /api/sessions/:id/rename
PUT    /api/sessions/:id/associate-project
GET    /api/sessions/:id/export
DELETE /api/sessions/:id
```

**数据库表**：`sessions`

```sql
- id: 会话ID
- user_id: 用户ID
- project_id: 项目ID（NULL表示独立会话）
- title: 标题
- tool_type: 工具类型
- model_version: 模型版本
- created_at: 创建时间
- updated_at: 更新时间
```

#### 2.4 项目管理

**前端需求**：

- 获取项目列表
- 创建项目
- 进入项目详情页

**后端API**：

```typescript
GET  /api/projects?page=1&pageSize=20
POST /api/projects
GET  /api/projects/:id
PUT  /api/projects/:id
DELETE /api/projects/:id
```

**数据库表**：`projects`

---

### 3. 中间工作区

#### 3.1 进度指示

**前端需求**：

- 获取工作流步骤配置（CMS）
- 接收实时进度更新（Dify）

**CMS API**：

```typescript
GET /api/cms/workflow-steps/:toolId
```

**CMS配置**：

```typescript
interface WorkflowStep {
  label: string
  description?: string
}

// 不同工具有不同的工作流步骤
const workflowSteps = {
  技术交底书完善: [
    { label: '输入材料', description: '准备和输入原始材料' },
    { label: '生成内容', description: 'AI处理和生成内容' },
    { label: '校验与下载', description: '检查质量并下载结果' },
  ],
  权利要求生成: [
    { label: '输入方案', description: '输入技术方案' },
    { label: '生成权利要求', description: '生成权利要求书' },
    { label: '优化与导出', description: '优化并导出' },
  ],
}
```

**Dify实时进度**：使用Server-Sent Events (SSE)

```typescript
// 连接SSE
const eventSource = new EventSource('/api/ai/generate/stream')

// 接收进度事件
eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data)
  // data.type: "progress" | "milestone" | "chunk" | "complete"
  // data.step: 当前步骤索引
  // data.message: 进度消息
}
```

#### 3.2 输入区

**前端需求**：

- 获取章节配置（CMS + Dify）
- 保存输入内容（DB）
- 上传文件/图片（FS）
- 读取历史数据（DB + FS）

**CMS API**：获取输入章节配置

```typescript
GET /api/cms/tools/:toolId/input-sections
```

**CMS配置**：

```typescript
interface InputSection {
  key: string // "overview" | "background" | ...
  label: string // "技术交底书概要"
  placeholder?: string
  supportsFileUpload: boolean // 是否支持文件上传
  supportsImageUpload: boolean // 是否支持图片上传
  required: boolean
}
```

**保存输入内容**：

```typescript
PUT /api/sessions/:sessionId/inputs
// Body:
{
  sections: {
    overview: "内容...",
    background: "内容...",
    // ...
  }
}
```

**文件上传流程**：

```
1. 前端请求上传凭证
   POST /api/files/upload-token

2. 前端直接上传到OSS（使用STS临时凭证）

3. 上传成功后，前端确认文件
   POST /api/files/confirm
   Body: {
     filename: "xxx.pdf",
     ossKey: "uploads/2025/xxx.pdf",
     sessionId: 123
   }
```

**读取历史数据**：

```typescript
GET /api/sessions/:sessionId/history?type=input|output
```

#### 3.3 输出区

**前端需求**：

- 显示生成内容
- 版本历史管理
- 富文本/源码模式切换

**后端API**：

```typescript
GET /api/sessions/:sessionId/output            // 获取最新输出
GET /api/sessions/:sessionId/versions          // 获取版本列表
GET /api/sessions/:sessionId/versions/:id      // 获取特定版本
```

**数据库表**：`outputs`, `output_versions`

#### 3.4 指令栏

##### 关联项目

**后端API**：

```typescript
GET /api/projects/list-for-select          // 获取项目列表（下拉选择）
PUT /api/sessions/:id/project              // 设置会话的项目
```

##### 新建项目（快速创建）

**后端API**：

```typescript
POST /api/projects/quick-create
// Body:
{
  name: "项目名称",
  description: "项目描述"
}
```

##### 布局模式

**前端需求**：无需后端支持（纯前端）

##### 读取历史

**后端API**：

```typescript
GET /api/sessions/:sessionId/readable-history
// 返回当前项目内可读取的历史数据
```

**CMS配置**：每个工具可配置可读取的数据范围

##### 复制文本 / 清空

**前端需求**：无需后端支持（纯前端）

##### 一键添加示例

**后端API**：

```typescript
GET /api/cms/tools/:toolId/sample-data
```

**CMS配置**：

```typescript
interface SampleData {
  input: {
    overview: '示例输入...'
    background: '示例输入...'
    // ...
  }
  output: '示例输出...'
}
```

##### 富文本/源码

**前端需求**：无需后端支持（纯前端）

##### 生成

**后端API**：

```typescript
POST /api/ai/generate
// Body:
{
  sessionId: 123,
  toolType: "技术交底书完善",
  modelVersion: "Basic",
  inputs: {
    overview: "内容...",
    // ...
  }
}

// 流式版本（推荐）
POST /api/ai/generate/stream
// SSE响应
```

**业务逻辑**：

```
1. 验证用户余额是否充足
2. 获取工具定价（CMS配置）
3. 调用Dify API生成内容
4. 流式返回生成内容给前端
5. 生成完成后：
   - 扣除费用（DB）
   - 保存生成内容（DB）
   - 创建版本记录（DB）
   - 记录消费明细（DB）
```

**CMS配置**：定价策略

```typescript
interface PricingConfig {
  toolType: string
  version: string // "Fast" | "Basic" | "Pro"
  basePrice: number // 基础价格
  pricePerToken?: number // 按token计费（可选）
}
```

##### 下载

**后端API**：

```typescript
GET /api/sessions/:sessionId/generated-files
// 返回可下载的文件列表

POST /api/sessions/:sessionId/export
// Body:
{
  fileIds: [1, 2, 3],
  format: "zip"
}
// 返回下载链接
```

**Dify集成**：生成Word/PDF文档

##### 下一步

**后端API**：

```typescript
GET /api/cms/tools/:toolId/next-tool       // 获取下一个工具
POST /api/sessions/:id/continue-to-next    // 创建下一步会话
```

**CMS配置**：工作流链

```typescript
interface WorkflowChain {
  currentTool: string
  nextTool: string
  autoTransfer: boolean // 是否自动转移内容
}
```

---

### 4. 右侧对话面板

#### 4.1 对话模式

**前端需求**：获取对话模式配置

**后端API**：

```typescript
GET / api / cms / chat - modes
```

**CMS配置**：

```typescript
interface ChatMode {
  id: string // "general" | "image" | "focus"
  name: string
  description: string
  pricing: {
    version: string
    pricePerMessage: number
  }
  features: string[]
}
```

#### 4.2 消息输入框

**前端需求**：

- 发送消息
- 上传文件/图片
- 接收AI回复（流式）

**后端API**：

```typescript
POST /api/chat/send
// Body:
{
  sessionId: 123,
  message: "消息内容",
  mode: "general",
  attachments: [
    { type: "file", url: "xxx" }
  ]
}

// 流式版本
POST /api/chat/send/stream
// SSE响应
```

#### 4.3 指令栏

##### 独立会话标识

**前端需求**：无需后端支持（基于session的project_id判断）

##### 读取历史

**后端API**：

```typescript
GET /api/chat/history?sessionId=123&mode=general
```

**CMS配置**：读取范围限定

##### 清空对话

**后端API**：

```typescript
DELETE /api/chat/messages?sessionId=123&mode=general
```

##### 发送

**后端API**：同"消息输入框"

---

## 🔄 核心业务流程

### 1. 用户认证流程

```
前端                           后端                    数据库
 │                              │                      │
 │──── POST /api/auth/login ───→│                      │
 │     {email, password}        │                      │
 │                              │                      │
 │                              │──── 查询用户 ────────→│
 │                              │←─── 用户数据 ─────────│
 │                              │                      │
 │                              │  验证密码             │
 │                              │  生成JWT Token       │
 │                              │                      │
 │←─── 返回Token和用户信息 ──────│                      │
 │     {accessToken, user}      │                      │
 │                              │                      │
 │  存储Token到localStorage     │                      │
 │                              │                      │
```

**后端需要实现**：

1. 密码加密验证（bcrypt）
2. JWT Token生成（包含user_id, role等）
3. Refresh Token机制
4. Token黑名单（登出时）
