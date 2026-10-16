> **归档说明**：本文档为历史归档资料，可能不代表当前实现与当前规范；请优先以仓库当前代码、docs/CHANGELOG.md、docs/api/ 与最新审计/计划文件为准。

# 前后端对接技术规范文档（续）

> 本文档是 `FRONTEND-BACKEND-INTEGRATION.md` 的补充部分

---

### 2. 内容生成流程

```
前端                    后端                     Dify                数据库
 │                       │                       │                   │
 │── POST /api/ai/──────→│                       │                   │
 │   generate/stream     │                       │                   │
 │                       │                       │                   │
 │                       │── 验证余额 ───────────→│                   │
 │                       │                       │                   │
 │                       │── 获取定价(CMS) ──────→│                   │
 │                       │                       │                   │
 │                       │── 调用Dify API ───────→│                   │
 │                       │                       │                   │
 │                       │                       │  开始生成          │
 │←── SSE: start ────────│←─────────────────────│                   │
 │                       │                       │                   │
 │←── SSE: chunk ────────│←── 流式输出 ──────────│                   │
 │←── SSE: chunk ────────│←─────────────────────│                   │
 │                       │                       │                   │
 │←── SSE: complete ─────│←── 生成完成 ──────────│                   │
 │                       │                       │                   │
 │                       │── 保存输出 ──────────────────────────────→│
 │                       │── 扣除费用 ──────────────────────────────→│
 │                       │── 记录消费 ──────────────────────────────→│
 │                       │                       │                   │
```

**后端需要实现**：

1. **余额验证**：生成前检查用户余额
2. **流式响应**：使用SSE返回实时生成内容
3. **事务处理**：确保费用扣除和内容保存的原子性
4. **错误处理**：生成失败时退款
5. **限流控制**：防止滥用

**关键代码示例**：

```typescript
// 后端SSE流式响应
async function generateContent(req, res) {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')

  try {
    // 1. 验证余额
    const cost = await calculateCost(req.body)
    if (userBalance < cost) {
      throw new Error('余额不足')
    }

    // 2. 调用Dify API（流式）
    const difyStream = await difyClient.generateStream(req.body)

    // 3. 转发流到前端
    for await (const chunk of difyStream) {
      res.write(`data: ${JSON.stringify(chunk)}\n\n`)
    }

    // 4. 保存结果并扣费（事务）
    await db.transaction(async (trx) => {
      await saveOutput(sessionId, fullContent, trx)
      await deductBalance(userId, cost, trx)
      await recordTransaction(userId, cost, sessionId, trx)
    })

    res.write(`data: ${JSON.stringify({ type: 'complete' })}\n\n`)
    res.end()
  } catch (error) {
    res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`)
    res.end()
  }
}
```

### 3. 文件上传流程

```
前端                    后端                    OSS
 │                       │                       │
 │── POST /upload-token─→│                       │
 │                       │                       │
 │                       │── 生成STS临时凭证 ────→│
 │←── 返回凭证 ──────────│                       │
 │                       │                       │
 │──────────── 直接上传文件 ──────────────────────→│
 │                       │                       │
 │←─────────── 上传成功 ───────────────────────────│
 │                       │                       │
 │── POST /files/confirm→│                       │
 │   {ossKey, filename}  │                       │
 │                       │                       │
 │                       │── 保存文件记录 ───────→DB
 │←── 确认成功 ──────────│                       │
 │                       │                       │
```

**后端需要实现**：

1. **STS临时凭证生成**：有效期15分钟
2. **文件记录管理**：保存文件元信息
3. **文件类型验证**：限制允许的文件类型
4. **文件大小限制**：单个文件最大10MB
5. **自动清理**：定期清理未确认的文件

---

## 📚 API接口规范

### 通用规范

#### 请求头

```http
Content-Type: application/json
Authorization: Bearer <access_token>
Accept: application/json
```

#### 响应格式

```typescript
// 成功响应
interface SuccessResponse<T> {
  success: true
  data: T
  message?: string
  timestamp: string
}

// 错误响应
interface ErrorResponse {
  success: false
  error: {
    code: string
    message: string
    details?: any
  }
  timestamp: string
}

// 分页响应
interface PaginatedResponse<T> {
  success: true
  data: {
    items: T[]
    pagination: {
      page: number
      pageSize: number
      total: number
      totalPages: number
    }
  }
}
```

### API分组清单

#### 1. 认证相关 (Auth)

```
POST   /api/auth/register           # 注册
POST   /api/auth/login              # 登录
POST   /api/auth/logout             # 登出
POST   /api/auth/refresh            # 刷新Token
GET    /api/auth/oauth/:provider    # OAuth登录
```

#### 2. 用户相关 (Users)

```
GET    /api/users/me                # 获取当前用户
PUT    /api/users/me                # 更新用户信息
POST   /api/users/me/avatar         # 上传头像
GET    /api/users/me/balance        # 获取余额
PUT    /api/users/me/password       # 修改密码
```

#### 3. 项目相关 (Projects)

```
GET    /api/projects                # 获取项目列表
POST   /api/projects                # 创建项目
GET    /api/projects/:id            # 获取项目详情
PUT    /api/projects/:id            # 更新项目
DELETE /api/projects/:id            # 删除项目
POST   /api/projects/quick-create   # 快速创建项目
```

#### 4. 会话相关 (Sessions)

```
GET    /api/sessions                     # 获取会话列表
POST   /api/sessions                     # 创建会话
GET    /api/sessions/:id                 # 获取会话详情
PUT    /api/sessions/:id                 # 更新会话
DELETE /api/sessions/:id                 # 删除会话
PUT    /api/sessions/:id/rename          # 重命名会话
PUT    /api/sessions/:id/project         # 关联项目
PUT    /api/sessions/:id/inputs          # 保存输入
GET    /api/sessions/:id/output          # 获取输出
GET    /api/sessions/:id/versions        # 获取版本列表
GET    /api/sessions/:id/export          # 导出会话
```

#### 5. AI生成相关 (AI)

```
POST   /api/ai/generate              # 生成内容（非流式）
POST   /api/ai/generate/stream       # 生成内容（流式）
POST   /api/ai/chat                  # AI对话（非流式）
POST   /api/ai/chat/stream           # AI对话（流式）
```

#### 6. 文件相关 (Files)

```
POST   /api/files/upload-token       # 获取上传凭证
POST   /api/files/confirm            # 确认上传
GET    /api/files                    # 获取文件列表
DELETE /api/files/:id                # 删除文件
GET    /api/files/:id/download       # 下载文件
```

#### 7. CMS配置相关 (CMS)

```
GET    /api/cms/model-categories         # 获取模型分类
GET    /api/cms/tools                    # 获取工具列表
GET    /api/cms/tools/:id/versions       # 获取工具版本
GET    /api/cms/tools/:id/input-sections # 获取输入章节配置
GET    /api/cms/workflow-steps/:toolId   # 获取工作流步骤
GET    /api/cms/recharge-packages        # 获取充值套餐
GET    /api/cms/chat-modes               # 获取对话模式
GET    /api/cms/help-docs                # 获取帮助文档
GET    /api/cms/customer-service         # 获取客服信息
```

#### 8. 支付相关 (Payments)

```
POST   /api/payments/recharge        # 发起充值
GET    /api/payments/:id/status      # 查询支付状态
POST   /api/payments/callback        # 支付回调（内部）
```

#### 9. 交易相关 (Transactions)

```
GET    /api/transactions             # 获取交易记录
GET    /api/transactions/export      # 导出交易记录
```

#### 10. 通知相关 (Notifications)

```
GET    /api/notifications/unread-count   # 未读数量
GET    /api/notifications               # 获取通知列表
PUT    /api/notifications/:id/read      # 标记已读
PUT    /api/notifications/read-all      # 全部标记已读
DELETE /api/notifications/:id           # 删除通知
DELETE /api/notifications               # 清空所有
```

#### 11. 推荐码相关 (Referral)

```
GET    /api/referral/my-code         # 获取我的推荐码
POST   /api/referral/use-code        # 使用推荐码
GET    /api/referral/statistics      # 获取推荐统计
GET    /api/referral/records         # 获取推荐记录
```

#### 12. 统计相关 (Statistics)

```
GET    /api/statistics/overview          # 总览统计
GET    /api/statistics/workload-trend    # 工作量趋势
GET    /api/statistics/by-customer       # 按客户统计
GET    /api/statistics/by-task-type      # 按任务类型统计
```

---

## 💾 数据模型设计

### 核心表结构

#### 1. users - 用户表

```sql
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  phone VARCHAR(20),
  avatar_url VARCHAR(500),
  balance DECIMAL(10, 2) DEFAULT 0.00,
  oauth_provider ENUM('local', 'wechat', 'github') DEFAULT 'local',
  oauth_id VARCHAR(255),
  role ENUM('user', 'admin') DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_email (email),
  INDEX idx_oauth (oauth_provider, oauth_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

#### 2. projects - 项目表

```sql
CREATE TABLE projects (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  status ENUM('active', 'archived') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

#### 3. sessions - 会话表

```sql
CREATE TABLE sessions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  project_id INT NULL,
  title VARCHAR(300) NOT NULL,
  tool_type VARCHAR(100) NOT NULL,
  model_version VARCHAR(50) NOT NULL,
  status ENUM('draft', 'completed') DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
  INDEX idx_user_id (user_id),
  INDEX idx_project_id (project_id),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

#### 4. session_inputs - 会话输入表

```sql
CREATE TABLE session_inputs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  session_id INT NOT NULL,
  section_key VARCHAR(50) NOT NULL,
  content LONGTEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
  INDEX idx_session_id (session_id),
  UNIQUE KEY uk_session_section (session_id, section_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

#### 5. session_outputs - 会话输出表

```sql
CREATE TABLE session_outputs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  session_id INT NOT NULL,
  content LONGTEXT NOT NULL,
  version INT DEFAULT 1,
  tokens_used INT,
  cost DECIMAL(10, 4),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
  INDEX idx_session_id (session_id),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

#### 6. chat_messages - 聊天消息表

```sql
CREATE TABLE chat_messages (
  id INT PRIMARY KEY AUTO_INCREMENT,
  session_id INT NOT NULL,
  role ENUM('user', 'assistant') NOT NULL,
  content TEXT NOT NULL,
  mode ENUM('general', 'image', 'focus') NOT NULL,
  tokens_used INT,
  cost DECIMAL(10, 4),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
  INDEX idx_session_id (session_id),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

#### 7. files - 文件表

```sql
CREATE TABLE files (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  session_id INT NULL,
  filename VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  file_type ENUM('image', 'document', 'other') NOT NULL,
  mime_type VARCHAR(100),
  size BIGINT,
  oss_url VARCHAR(500) NOT NULL,
  oss_key VARCHAR(500) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE SET NULL,
  INDEX idx_user_id (user_id),
  INDEX idx_session_id (session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

#### 8. transactions - 交易记录表

```sql
CREATE TABLE transactions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  type ENUM('recharge', 'consume', 'bonus', 'refund') NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  balance_after DECIMAL(10, 2) NOT NULL,
  description VARCHAR(500),
  session_id INT NULL,
  payment_id VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE SET NULL,
  INDEX idx_user_id (user_id),
  INDEX idx_type (type),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

#### 9. notifications - 通知表

```sql
CREATE TABLE notifications (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  type ENUM('info', 'success', 'warning', 'error') NOT NULL,
  title VARCHAR(200) NOT NULL,
  message TEXT,
  `read` BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_read (read),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

#### 10. referral_codes - 推荐码表

```sql
CREATE TABLE referral_codes (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  code VARCHAR(20) UNIQUE NOT NULL,
  max_usage INT DEFAULT 10,
  used_count INT DEFAULT 0,
  reward_amount DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

#### 11. referral_records - 推荐记录表

```sql
CREATE TABLE referral_records (
  id INT PRIMARY KEY AUTO_INCREMENT,
  referral_code_id INT NOT NULL,
  referrer_user_id INT NOT NULL,
  referee_user_id INT NOT NULL,
  reward_amount DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (referral_code_id) REFERENCES referral_codes(id),
  FOREIGN KEY (referrer_user_id) REFERENCES users(id),
  FOREIGN KEY (referee_user_id) REFERENCES users(id),
  INDEX idx_referrer (referrer_user_id),
  INDEX idx_referee (referee_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 表关系图

```
users (用户)
  │
  ├─→ projects (项目) 1:N
  │     │
  │     └─→ sessions (会话) 1:N
  │
  ├─→ sessions (独立会话) 1:N
  │     │
  │     ├─→ session_inputs (输入) 1:N
  │     ├─→ session_outputs (输出) 1:N
  │     ├─→ chat_messages (消息) 1:N
  │     └─→ files (文件) 1:N
  │
  ├─→ files (文件) 1:N
  ├─→ transactions (交易) 1:N
  ├─→ notifications (通知) 1:N
  └─→ referral_codes (推荐码) 1:1
        │
        └─→ referral_records (推荐记录) 1:N
```

---

## 🔌 系统集成方案

### 1. CMS集成

**技术选型建议**：

- Strapi（开源无头CMS）
- Directus
- 自研管理后台

**配置项管理**：

```typescript
// CMS配置数据结构示例
interface CMSConfig {
  // 模型配置
  modelCategories: ModelCategory[]
  tools: Tool[]

  // 工作流配置
  workflowSteps: Record<string, WorkflowStep[]>
  workflowChains: WorkflowChain[]

  // 定价配置
  pricing: PricingConfig[]

  // 充值套餐
  rechargePackages: RechargePackage[]

  // 推荐码配置
  referralConfig: ReferralConfig

  // 其他配置
  helpDocs: HelpDoc[]
  customerService: CustomerServiceInfo
}
```

**API设计**：

```
GET /api/cms/config              # 获取全部配置
GET /api/cms/config/:key         # 获取特定配置
PUT /api/cms/config/:key         # 更新配置（管理员）
```

**缓存策略**：

- 配置数据使用Redis缓存，TTL: 5分钟
- 配置更新时清除缓存
- 前端定期轮询配置更新

### 2. Dify集成

**API调用示例**：

```typescript
import axios from 'axios'

class DifyService {
  private apiKey: string
  private baseUrl: string

  constructor() {
    this.apiKey = process.env.DIFY_API_KEY
    this.baseUrl = process.env.DIFY_API_URL
  }

  // 流式生成
  async generateStream(params: GenerateParams): Promise<ReadableStream> {
    const response = await fetch(`${this.baseUrl}/workflows/run`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: params.inputs,
        response_mode: 'streaming',
        user: params.userId,
      }),
    })

    return response.body
  }

  // 对话
  async chat(params: ChatParams): Promise<ChatResponse> {
    const response = await axios.post(
      `${this.baseUrl}/chat-messages`,
      {
        query: params.message,
        inputs: params.context,
        response_mode: 'streaming',
        conversation_id: params.conversationId,
        user: params.userId,
      },
      {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      },
    )

    return response.data
  }
}
```

**错误处理**：

```typescript
// Dify错误处理
try {
  const result = await difyService.generate(params)
} catch (error) {
  if (error.response?.status === 429) {
    // 限流，等待后重试
    await sleep(1000)
    return retry()
  } else if (error.response?.status >= 500) {
    // 服务器错误，退款并通知用户
    await refundUser(userId, cost)
    throw new Error('AI服务暂时不可用，费用已退回')
  } else {
    throw error
  }
}
```

### 3. 文件系统（OSS）集成

**阿里云OSS集成示例**：

```typescript
import OSS from 'ali-oss'

class OSSService {
  private client: OSS

  constructor() {
    this.client = new OSS({
      region: process.env.OSS_REGION,
      accessKeyId: process.env.OSS_ACCESS_KEY_ID,
      accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET,
      bucket: process.env.OSS_BUCKET,
    })
  }

  // 生成STS临时凭证
  async getSTS(): Promise<STSCredentials> {
    const sts = new STS({
      accessKeyId: process.env.OSS_ACCESS_KEY_ID,
      accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET,
    })

    const result = await sts.assumeRole(
      process.env.OSS_ROLE_ARN,
      {},
      900, // 15分钟过期
      'upload-session',
    )

    return {
      accessKeyId: result.credentials.AccessKeyId,
      accessKeySecret: result.credentials.AccessKeySecret,
      securityToken: result.credentials.SecurityToken,
      expiration: result.credentials.Expiration,
      bucket: process.env.OSS_BUCKET,
      region: process.env.OSS_REGION,
    }
  }

  // 生成签名URL
  async getSignedUrl(key: string, expires: number = 3600): Promise<string> {
    return this.client.signatureUrl(key, { expires })
  }

  // 删除文件
  async deleteFile(key: string): Promise<void> {
    await this.client.delete(key)
  }
}
```

---

## 📝 开发规范

### 1. 代码规范

**命名规范**：

- API路由：小写字母 + 连字符（`/api/user-profile`）
- 数据库表：小写字母 + 下划线（`user_profiles`）
- 变量/函数：驼峰命名（`getUserProfile`）
- 类名：帕斯卡命名（`UserService`）
- 常量：全大写 + 下划线（`MAX_FILE_SIZE`）

**注释规范**：

```typescript
/**
 * 生成内容（流式）
 * @param userId - 用户ID
 * @param params - 生成参数
 * @returns 流式响应
 * @throws {InsufficientBalanceError} 余额不足时抛出
 */
async function generateStream(userId: number, params: GenerateParams): Promise<ReadableStream> {
  // 实现代码
}
```

### 2. 安全规范

**必须实现**：

1. **SQL注入防护**：使用参数化查询
2. **XSS防护**：对用户输入进行转义
3. **CSRF防护**：使用CSRF Token
4. **密码安全**：bcrypt加密，盐值长度≥10
5. **文件上传安全**：验证文件类型和大小
6. **API限流**：防止DDoS攻击
7. **敏感数据加密**：用户隐私数据加密存储
8. **HTTPS强制**：生产环境强制HTTPS

### 3. 性能优化

**数据库优化**：

```sql
-- 为高频查询添加索引
CREATE INDEX idx_sessions_user_created ON sessions(user_id, created_at DESC);
CREATE INDEX idx_transactions_user_type ON transactions(user_id, type, created_at DESC);

-- 使用覆盖索引
CREATE INDEX idx_sessions_list ON sessions(user_id, status, created_at DESC, title);
```

**缓存策略**：

```typescript
// Redis缓存示例
async function getUser(userId: number): Promise<User> {
  // 1. 尝试从缓存获取
  const cached = await redis.get(`user:${userId}`)
  if (cached) {
    return JSON.parse(cached)
  }

  // 2. 从数据库查询
  const user = await db.query('SELECT * FROM users WHERE id = ?', [userId])

  // 3. 写入缓存（TTL: 1小时）
  await redis.setex(`user:${userId}`, 3600, JSON.stringify(user))

  return user
}
```

**分页优化**：

```typescript
// 使用游标分页（适合大数据量）
async function getSessions(userId: number, cursor?: number, limit = 20) {
  const query = `
    SELECT * FROM sessions 
    WHERE user_id = ? 
    ${cursor ? 'AND id < ?' : ''}
    ORDER BY id DESC 
    LIMIT ?
  `

  const params = cursor ? [userId, cursor, limit] : [userId, limit]

  const sessions = await db.query(query, params)

  return {
    items: sessions,
    nextCursor: sessions.length === limit ? sessions[sessions.length - 1].id : null,
  }
}
```

### 4. 错误处理

**统一错误码**：

```typescript
enum ErrorCode {
  // 认证错误 (1xxx)
  UNAUTHORIZED = 1001,
  TOKEN_EXPIRED = 1002,
  INVALID_TOKEN = 1003,

  // 业务错误 (2xxx)
  INSUFFICIENT_BALANCE = 2001,
  RESOURCE_NOT_FOUND = 2002,
  PERMISSION_DENIED = 2003,

  // 验证错误 (3xxx)
  VALIDATION_ERROR = 3001,
  INVALID_FILE_TYPE = 3002,
  FILE_TOO_LARGE = 3003,

  // 系统错误 (5xxx)
  SERVER_ERROR = 5001,
  DATABASE_ERROR = 5002,
  EXTERNAL_SERVICE_ERROR = 5003,
}
```

**错误处理中间件**：

```typescript
function errorHandler(err, req, res, next) {
  console.error(err)

  if (err instanceof ValidationError) {
    return res.status(400).json({
      success: false,
      error: {
        code: ErrorCode.VALIDATION_ERROR,
        message: err.message,
        details: err.details,
      },
    })
  }

  if (err instanceof InsufficientBalanceError) {
    return res.status(402).json({
      success: false,
      error: {
        code: ErrorCode.INSUFFICIENT_BALANCE,
        message: '余额不足',
      },
    })
  }

  // 默认服务器错误
  res.status(500).json({
    success: false,
    error: {
      code: ErrorCode.SERVER_ERROR,
      message: '服务器内部错误',
    },
  })
}
```

---

## 🚀 部署与运维

### 1. 环境配置

**开发环境** (.env.development)

```env
NODE_ENV=development
PORT=3000

# 数据库
DB_HOST=localhost
DB_PORT=3306
DB_NAME=oasis_dev
DB_USER=root
DB_PASS=password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Dify
DIFY_API_URL=https://api.dify.ai/v1
DIFY_API_KEY=your-dev-key

# OSS
OSS_REGION=oss-cn-hangzhou
OSS_BUCKET=oasis-dev
```

**生产环境** (.env.production)

```env
NODE_ENV=production
PORT=8080

# 使用环境变量或密钥管理服务
# 不要在代码仓库中存储生产环境密钥
```

### 2. 监控和日志

**日志规范**：

```typescript
import winston from 'winston'

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
})

// 记录关键操作
logger.info('User login', { userId, ip, timestamp })
logger.warn('Insufficient balance', { userId, required, available })
logger.error('Dify API error', { error, userId, sessionId })
```

### 3. 备份策略

**数据库备份**：

```bash
# 每日全量备份
mysqldump -u root -p oasis_db > backup_$(date +%Y%m%d).sql

# 定期清理旧备份（保留30天）
find /backups -name "*.sql" -mtime +30 -delete
```

**文件备份**：

- OSS启用版本控制
- 定期备份到异地存储

---

## 📞 联系与支持

如有技术问题，请联系：

- **后端负责人**：[待填写]
- **前端负责人**：[待填写]
- **架构师**：[待填写]

---

**文档维护者**：开发团队  
**最后更新**：2025-10-04
