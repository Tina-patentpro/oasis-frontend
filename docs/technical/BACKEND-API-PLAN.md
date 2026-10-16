# 绿洲慧写后台接口规划

## 技术栈

- **后端框架**: Node.js + Nest.js (TypeScript)
- **数据库**: MySQL 8.0+
- **ORM**: TypeORM
- **文件存储**: 阿里云 OSS
- **认证**: OAuth 2.0 (支持第三方登录 + 自有账号系统)
- **实时通信**: Server-Sent Events (SSE)
- **API 文档**: Swagger/OpenAPI 3.0

---

## 项目结构

```
backend/
├── src/
│   ├── auth/              # 认证模块 (OAuth 2.0)
│   ├── users/             # 用户管理
│   ├── sessions/          # 会话管理
│   ├── projects/          # 项目管理
│   ├── documents/         # 文档管理
│   ├── files/             # 文件管理 (OSS)
│   ├── ai/                # AI 服务集成 (Dify)
│   ├── dictionary/        # 术语词典
│   ├── notifications/     # 通知系统
│   ├── common/            # 公共模块
│   │   ├── guards/        # 守卫 (认证/授权)
│   │   ├── interceptors/  # 拦截器
│   │   ├── filters/       # 异常过滤器
│   │   └── decorators/    # 装饰器
│   ├── config/            # 配置
│   └── main.ts            # 入口文件
├── test/                  # 测试
├── migrations/            # 数据库迁移
└── package.json
```

---

## 数据库设计

### 1. 用户表 (users)

```sql
CREATE TABLE `users` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `email` VARCHAR(255) UNIQUE NOT NULL,
  `username` VARCHAR(100) UNIQUE NOT NULL,
  `password_hash` VARCHAR(255),  -- 可为空,支持第三方登录
  `oauth_provider` ENUM('local', 'wechat', 'github', 'google'),
  `oauth_id` VARCHAR(255),
  `avatar_url` VARCHAR(500),
  `balance` DECIMAL(10, 2) DEFAULT 0.00,
  `role` ENUM('user', 'admin') DEFAULT 'user',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_oauth (oauth_provider, oauth_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 2. 项目表 (projects)

```sql
CREATE TABLE `projects` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `name` VARCHAR(200) NOT NULL,
  `description` TEXT,
  `status` ENUM('active', 'archived') DEFAULT 'active',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 3. 会话表 (sessions)

```sql
CREATE TABLE `sessions` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `project_id` INT NOT NULL,
  `title` VARCHAR(300) NOT NULL,
  `tool_type` VARCHAR(50),  -- '技术交底书完善', '权利要求生成' 等
  `model_version` VARCHAR(50),  -- 'Basic 1.1', 'Pro 1.0' 等
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  INDEX idx_project_id (project_id),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 4. 文档表 (documents)

```sql
CREATE TABLE `documents` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `session_id` INT NOT NULL,
  `title` VARCHAR(300),
  `content_type` ENUM('overview', 'background', 'solution', 'benefit', 'example', 'drawing'),
  `content` LONGTEXT,
  `generated_content` LONGTEXT,
  `version` INT DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
  INDEX idx_session_id (session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 5. 文档版本表 (document_versions)

```sql
CREATE TABLE `document_versions` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `document_id` INT NOT NULL,
  `version` INT NOT NULL,
  `content` LONGTEXT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
  INDEX idx_document_id (document_id),
  UNIQUE KEY uk_doc_version (document_id, version)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 6. 文件表 (files)

```sql
CREATE TABLE `files` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `session_id` INT,
  `filename` VARCHAR(255) NOT NULL,
  `original_name` VARCHAR(255) NOT NULL,
  `file_type` ENUM('image', 'document', 'other'),
  `mime_type` VARCHAR(100),
  `size` BIGINT,  -- 字节
  `oss_url` VARCHAR(500) NOT NULL,
  `oss_key` VARCHAR(500) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE SET NULL,
  INDEX idx_user_id (user_id),
  INDEX idx_session_id (session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 7. 聊天消息表 (chat_messages)

```sql
CREATE TABLE `chat_messages` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `session_id` INT NOT NULL,
  `role` ENUM('user', 'assistant') NOT NULL,
  `content` TEXT NOT NULL,
  `chat_tab` ENUM('general', 'image', 'focus'),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
  INDEX idx_session_id (session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 8. 术语词典表 (dictionary_terms)

```sql
CREATE TABLE `dictionary_terms` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `term` VARCHAR(200) NOT NULL,
  `definition` TEXT,
  `category` VARCHAR(100),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_term (term)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 9. 余额使用记录表 (usage_records)

```sql
CREATE TABLE `usage_records` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `action` VARCHAR(100) NOT NULL,  -- '生成内容', 'AI对话' 等
  `amount` DECIMAL(10, 2) NOT NULL,
  `balance_after` DECIMAL(10, 2) NOT NULL,
  `session_id` INT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE SET NULL,
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 10. 通知表 (notifications)

```sql
CREATE TABLE `notifications` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `type` ENUM('info', 'success', 'warning', 'error'),
  `title` VARCHAR(200) NOT NULL,
  `message` TEXT,
  `read` BOOLEAN DEFAULT FALSE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_read (read)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 11. OAuth 令牌表 (oauth_tokens)

```sql
CREATE TABLE `oauth_tokens` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `access_token` VARCHAR(500) NOT NULL,
  `refresh_token` VARCHAR(500),
  `expires_at` TIMESTAMP NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_access_token (access_token(255))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

---

## API 接口规范

### 基础信息

- **Base URL**: `https://api.yourdomain.com/v1`
- **认证方式**: Bearer Token (OAuth 2.0)
- **内容类型**: `application/json`
- **字符编码**: UTF-8

### 通用响应格式

#### 成功响应

```json
{
  "success": true,
  "data": {
    /* 响应数据 */
  },
  "message": "操作成功",
  "timestamp": "2025-01-01T12:00:00Z"
}
```

#### 错误响应

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "错误描述",
    "details": {
      /* 详细信息 */
    }
  },
  "timestamp": "2025-01-01T12:00:00Z"
}
```

#### 分页响应

```json
{
  "success": true,
  "data": {
    "items": [
      /* 数据列表 */
    ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 100,
      "totalPages": 5
    }
  }
}
```

---

## 1. 认证模块 (Auth)

### 1.1 注册

```
POST /auth/register
```

**请求体**:

```json
{
  "email": "user@example.com",
  "username": "username",
  "password": "password123"
}
```

**响应**:

```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "username": "username"
    },
    "tokens": {
      "accessToken": "eyJhbGc...",
      "refreshToken": "eyJhbGc...",
      "expiresIn": 3600
    }
  }
}
```

### 1.2 登录

```
POST /auth/login
```

**请求体**:

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

### 1.3 OAuth 登录 (微信/GitHub/Google)

```
GET /auth/oauth/:provider
GET /auth/oauth/:provider/callback
```

**流程**:

1. 前端重定向到 `/auth/oauth/wechat`
2. 用户在第三方平台授权
3. 回调到 `/auth/oauth/wechat/callback?code=xxx`
4. 后端返回 JWT tokens

### 1.4 刷新 Token

```
POST /auth/refresh
```

**请求体**:

```json
{
  "refreshToken": "eyJhbGc..."
}
```

### 1.5 登出

```
POST /auth/logout
```

**Headers**: `Authorization: Bearer {accessToken}`

---

## 2. 用户模块 (Users)

### 2.1 获取当前用户信息

```
GET /users/me
```

**Headers**: `Authorization: Bearer {accessToken}`

**响应**:

```json
{
  "success": true,
  "data": {
    "id": 1,
    "email": "user@example.com",
    "username": "username",
    "avatarUrl": "https://oss.example.com/avatar.jpg",
    "balance": 100.5,
    "role": "user",
    "createdAt": "2025-01-01T12:00:00Z"
  }
}
```

### 2.2 更新用户信息

```
PUT /users/me
```

**请求体**:

```json
{
  "username": "newname",
  "avatarUrl": "https://oss.example.com/new-avatar.jpg"
}
```

### 2.3 修改密码

```
PUT /users/me/password
```

**请求体**:

```json
{
  "oldPassword": "old123",
  "newPassword": "new123"
}
```

### 2.4 获取余额

```
GET /users/me/balance
```

### 2.5 充值

```
POST /users/me/recharge
```

**请求体**:

```json
{
  "amount": 100.0,
  "paymentMethod": "alipay"
}
```

### 2.6 使用记录

```
GET /users/me/usage?page=1&pageSize=20&startDate=2025-01-01&endDate=2025-01-31
```

**查询参数**:

- `page`: 页码 (默认 1)
- `pageSize`: 每页数量 (默认 20)
- `startDate`: 开始日期
- `endDate`: 结束日期

---

## 3. 项目模块 (Projects)

### 3.1 创建项目

```
POST /projects
```

**请求体**:

```json
{
  "name": "智能机器人底盘",
  "description": "项目描述"
}
```

### 3.2 获取项目列表

```
GET /projects?page=1&pageSize=20&status=active
```

**查询参数**:

- `page`: 页码
- `pageSize`: 每页数量
- `status`: 状态 (active | archived)

**响应**:

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": 1,
        "name": "智能机器人底盘",
        "description": "项目描述",
        "status": "active",
        "sessionCount": 5,
        "createdAt": "2025-01-01T12:00:00Z",
        "updatedAt": "2025-01-01T12:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 10,
      "totalPages": 1
    }
  }
}
```

### 3.3 获取项目详情

```
GET /projects/:id
```

**响应**:

```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "智能机器人底盘",
    "description": "项目描述",
    "status": "active",
    "sessions": [
      {
        "id": 1,
        "title": "Gen · 2024-09-21 Draft",
        "toolType": "技术交底书完善",
        "modelVersion": "Basic 1.1",
        "createdAt": "2025-01-01T12:00:00Z"
      }
    ],
    "createdAt": "2025-01-01T12:00:00Z",
    "updatedAt": "2025-01-01T12:00:00Z"
  }
}
```

### 3.4 更新项目

```
PUT /projects/:id
```

**请求体**:

```json
{
  "name": "新项目名称",
  "description": "新描述"
}
```

### 3.5 归档项目

```
PUT /projects/:id/archive
```

### 3.6 删除项目

```
DELETE /projects/:id
```

---

## 4. 会话模块 (Sessions)

### 4.1 创建会话

```
POST /sessions
```

**请求体**:

```json
{
  "projectId": 1,
  "title": "Sample · UAV Route",
  "toolType": "技术交底书完善",
  "modelVersion": "Basic 1.1"
}
```

### 4.2 获取会话列表

```
GET /sessions?projectId=1&page=1&pageSize=20
```

### 4.3 获取会话详情

```
GET /sessions/:id
```

**响应**:

```json
{
  "success": true,
  "data": {
    "id": 1,
    "projectId": 1,
    "title": "Sample · UAV Route",
    "toolType": "技术交底书完善",
    "modelVersion": "Basic 1.1",
    "documents": [
      {
        "id": 1,
        "contentType": "overview",
        "content": "用户输入的内容",
        "generatedContent": "AI生成的内容",
        "version": 2
      }
    ],
    "chatMessages": [
      {
        "id": 1,
        "role": "user",
        "content": "消息内容",
        "chatTab": "general",
        "createdAt": "2025-01-01T12:00:00Z"
      }
    ],
    "createdAt": "2025-01-01T12:00:00Z"
  }
}
```

### 4.4 更新会话

```
PUT /sessions/:id
```

**请求体**:

```json
{
  "title": "新标题"
}
```

### 4.5 删除会话

```
DELETE /sessions/:id
```

---

## 5. 文档模块 (Documents)

### 5.1 保存文档内容

```
PUT /documents/:sessionId
```

**请求体**:

```json
{
  "title": "文档标题",
  "contentType": "overview",
  "content": "用户输入的内容"
}
```

### 5.2 获取文档版本历史

```
GET /documents/:id/versions
```

**响应**:

```json
{
  "success": true,
  "data": {
    "versions": [
      {
        "id": 1,
        "version": 1,
        "content": "版本1内容",
        "createdAt": "2025-01-01T12:00:00Z"
      },
      {
        "id": 2,
        "version": 2,
        "content": "版本2内容",
        "createdAt": "2025-01-01T13:00:00Z"
      }
    ]
  }
}
```

### 5.3 获取特定版本

```
GET /documents/:id/versions/:version
```

---

## 6. AI 服务模块 (AI)

### 6.1 生成内容 (流式)

```
POST /ai/generate/stream
```

**Headers**:

- `Accept: text/event-stream`
- `Authorization: Bearer {accessToken}`

**请求体**:

```json
{
  "sessionId": 1,
  "title": "智能机器人控制系统",
  "input": "用户输入的技术交底书内容",
  "toolType": "技术交底书完善",
  "modelVersion": "Basic 1.1"
}
```

**响应 (SSE 流)**:

```
data: {"type":"start","message":"开始生成..."}

data: {"type":"chunk","content":"# 智能机器人控制系统\n\n"}

data: {"type":"chunk","content":"## 1. 技术背景\n\n"}

data: {"type":"chunk","content":"本发明涉及..."}

data: {"type":"end","fullContent":"完整内容..."}
```

### 6.2 生成内容 (非流式)

```
POST /ai/generate
```

**请求体**: 同上

**响应**:

```json
{
  "success": true,
  "data": {
    "generatedContent": "生成的完整内容...",
    "tokenUsed": 1500,
    "cost": 0.15
  }
}
```

### 6.3 AI 对话 (流式)

```
POST /ai/chat/stream
```

**Headers**: `Accept: text/event-stream`

**请求体**:

```json
{
  "sessionId": 1,
  "message": "请帮我优化这段描述",
  "chatTab": "general",
  "context": "前文上下文..."
}
```

**响应 (SSE 流)**:

```
data: {"type":"chunk","content":"当然"}

data: {"type":"chunk","content":"，我可以"}

data: {"type":"end","fullContent":"当然,我可以帮你优化..."}
```

### 6.4 AI 对话 (非流式)

```
POST /ai/chat
```

### 6.5 图像语义分析

```
POST /ai/image-to-text
```

**请求体**:

```json
{
  "imageUrl": "https://oss.example.com/image.jpg",
  "prompt": "描述这张图片的技术特征"
}
```

---

## 7. 文件管理模块 (Files)

### 7.1 获取 OSS 上传凭证

```
POST /files/upload-token
```

**请求体**:

```json
{
  "filename": "document.pdf",
  "fileType": "document",
  "sessionId": 1
}
```

**响应**:

```json
{
  "success": true,
  "data": {
    "accessKeyId": "STS.xxx",
    "accessKeySecret": "xxx",
    "securityToken": "xxx",
    "expiration": "2025-01-01T13:00:00Z",
    "bucket": "your-bucket",
    "region": "oss-cn-hangzhou",
    "key": "uploads/2025/01/01/xxx.pdf"
  }
}
```

### 7.2 确认文件上传

```
POST /files/confirm
```

**请求体**:

```json
{
  "filename": "document.pdf",
  "originalName": "我的文档.pdf",
  "fileType": "document",
  "mimeType": "application/pdf",
  "size": 1024000,
  "ossKey": "uploads/2025/01/01/xxx.pdf",
  "sessionId": 1
}
```

### 7.3 获取文件列表

```
GET /files?sessionId=1&fileType=image&page=1&pageSize=20
```

### 7.4 删除文件

```
DELETE /files/:id
```

---

## 8. 术语词典模块 (Dictionary)

### 8.1 获取术语列表

```
GET /dictionary/terms?category=技术术语&search=机器人&page=1&pageSize=20
```

### 8.2 添加术语

```
POST /dictionary/terms
```

**请求体**:

```json
{
  "term": "伺服电机",
  "definition": "一种能够精确控制位置、速度的电机",
  "category": "技术术语"
}
```

### 8.3 更新术语

```
PUT /dictionary/terms/:id
```

### 8.4 删除术语

```
DELETE /dictionary/terms/:id
```

### 8.5 批量导入术语

```
POST /dictionary/terms/import
```

**请求体**:

```json
{
  "terms": [
    {
      "term": "术语1",
      "definition": "定义1",
      "category": "分类1"
    }
  ]
}
```

---

## 9. 聊天消息模块 (Chat)

### 9.1 获取聊天历史

```
GET /chat/messages?sessionId=1&chatTab=general&page=1&pageSize=50
```

### 9.2 保存聊天消息

```
POST /chat/messages
```

**请求体**:

```json
{
  "sessionId": 1,
  "role": "user",
  "content": "消息内容",
  "chatTab": "general"
}
```

### 9.3 清空聊天历史

```
DELETE /chat/messages/:sessionId?chatTab=general
```

---

## 10. 通知模块 (Notifications)

### 10.1 获取通知列表

```
GET /notifications?read=false&page=1&pageSize=20
```

### 10.2 标记为已读

```
PUT /notifications/:id/read
```

### 10.3 标记全部已读

```
PUT /notifications/read-all
```

### 10.4 删除通知

```
DELETE /notifications/:id
```

### 10.5 清空所有通知

```
DELETE /notifications
```

### 10.6 获取未读数量

```
GET /notifications/unread-count
```

**响应**:

```json
{
  "success": true,
  "data": {
    "count": 5
  }
}
```

---

## 错误代码

| 错误代码                    | HTTP 状态码 | 说明              |
| --------------------------- | ----------- | ----------------- |
| `AUTH_INVALID_CREDENTIALS`  | 401         | 用户名或密码错误  |
| `AUTH_TOKEN_EXPIRED`        | 401         | Token 已过期      |
| `AUTH_TOKEN_INVALID`        | 401         | Token 无效        |
| `AUTH_INSUFFICIENT_BALANCE` | 402         | 余额不足          |
| `AUTH_FORBIDDEN`            | 403         | 无权限访问        |
| `RESOURCE_NOT_FOUND`        | 404         | 资源不存在        |
| `VALIDATION_ERROR`          | 400         | 参数验证失败      |
| `FILE_TOO_LARGE`            | 413         | 文件过大          |
| `FILE_TYPE_NOT_SUPPORTED`   | 415         | 文件类型不支持    |
| `RATE_LIMIT_EXCEEDED`       | 429         | 请求频率超限      |
| `SERVER_ERROR`              | 500         | 服务器内部错误    |
| `AI_SERVICE_ERROR`          | 503         | AI 服务暂时不可用 |

---

## 开发部署流程

### 环境要求

- Node.js >= 18.x
- MySQL >= 8.0
- Redis >= 6.0 (用于 session 存储和缓存)
- 阿里云 OSS 账号

### 安装步骤

1. **初始化项目**

```bash
# 创建项目
npm i -g @nestjs/cli
nest new backend
cd backend

# 安装依赖
npm install @nestjs/typeorm typeorm mysql2
npm install @nestjs/passport passport passport-jwt passport-oauth2
npm install @nestjs/config
npm install ali-oss
npm install class-validator class-transformer
npm install @nestjs/swagger swagger-ui-express
```

2. **配置环境变量** (`.env`)

```env
# 数据库
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=password
DB_DATABASE=oasis_writing

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=1h
REFRESH_TOKEN_EXPIRES_IN=7d

# 阿里云 OSS
OSS_REGION=oss-cn-hangzhou
OSS_ACCESS_KEY_ID=your-key-id
OSS_ACCESS_KEY_SECRET=your-key-secret
OSS_BUCKET=your-bucket

# OAuth (微信)
WECHAT_APP_ID=your-app-id
WECHAT_APP_SECRET=your-app-secret

# OAuth (GitHub)
GITHUB_CLIENT_ID=your-client-id
GITHUB_CLIENT_SECRET=your-client-secret

# Dify API
DIFY_API_KEY=your-dify-api-key
DIFY_API_URL=https://api.dify.ai/v1
```

3. **创建数据库**

```bash
mysql -u root -p
CREATE DATABASE oasis_writing CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

4. **运行迁移**

```bash
npm run typeorm migration:run
```

5. **启动服务**

```bash
# 开发环境
npm run start:dev

# 生产环境
npm run build
npm run start:prod
```

### API 文档访问

启动后访问: `http://localhost:3000/api/docs`

---

## 性能优化建议

### 1. 数据库优化

- 为常用查询字段添加索引
- 使用连接池 (最大连接数 20-50)
- 启用查询缓存
- 定期清理过期数据

### 2. 缓存策略

- 使用 Redis 缓存用户信息 (TTL: 1小时)
- 缓存项目列表 (TTL: 5分钟)
- 缓存术语词典 (TTL: 1天)

### 3. 文件处理

- 图片自动压缩 (最大 2MB)
- 使用 CDN 加速
- 设置合理的过期时间

### 4. API 限流

- 普通接口: 100 req/min/user
- AI 生成接口: 10 req/min/user
- 文件上传: 20 req/min/user

---

## 安全建议

1. **密码安全**: 使用 bcrypt 加密,盐值长度 >= 10
2. **SQL 注入防护**: 使用 ORM 参数化查询
3. **XSS 防护**: 对用户输入进行转义
4. **CSRF 防护**: 使用 CSRF Token
5. **文件上传**: 验证文件类型和大小
6. **API 访问控制**: 实现基于角色的权限管理 (RBAC)
7. **日志记录**: 记录所有敏感操作
8. **HTTPS**: 生产环境强制使用 HTTPS

---

## 后续扩展

- [ ] WebSocket 支持(实时协作编辑)
- [ ] 微服务拆分(用户服务、文档服务、AI服务)
- [ ] 消息队列 (处理异步任务)
- [ ] 全文搜索 (Elasticsearch)
- [ ] 数据分析和报表
- [ ] 移动端 API 适配
