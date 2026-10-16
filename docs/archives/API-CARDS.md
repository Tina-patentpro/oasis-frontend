> **归档说明**：本文档为历史归档资料，可能不代表当前实现与当前规范；请优先以仓库当前代码、docs/CHANGELOG.md、docs/api/ 与最新审计/计划文件为准。

# API 接口卡片

本文档包含了OIW网站所有API接口的详细卡片说明。

## 📋 目录

- [工作流管理](#工作流管理)
- [对话流管理](#对话流管理)
- [会话管理](#会话管理)
- [项目管理](#项目管理)
- [用户认证](#用户认证)
- [计费与充值](#计费与充值)
- [使用统计](#使用统计)
- [建议与反馈](#建议与反馈)
- [用户支持](#用户支持)
- [文件服务](#文件服务)
- [指令库管理](#指令库管理)
- [工具与设置](#工具与设置)
- [运维状态](#运维状态)
- [性能监控](#性能监控)

---

## 🔄 工作流管理

### 🔹 1. 分页查询工作流目录

```
GET /api/workflows
```

**功能说明**: 按分类、关键字等条件分页检索当前租户可用的工作流，用于工作流中心列表页加载与搜索联想。

**请求参数**:
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| category | string | 否 | 工作流分类，由CMS配置 |
| keyword | string | 否 | 名称、描述模糊搜索 |
| page | integer | 否 | 页码，默认1，>=1 |
| pageSize | integer | 否 | 每页记录数，默认20，1-200 |

**响应示例** (200):

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "wf-legal-review",
        "name": "合同法律审查",
        "category": "compliance",
        "description": "结合法律模板快速识别合同风险",
        "icon": "https://cdn.example.com/icons/legal.svg",
        "tags": ["法务", "合同", "审核"],
        "version": "5.3.0",
        "lastUpdatedAt": "2025-10-22T08:30:00Z",
        "status": "published",
        "visibility": "team"
      },
      {
        "id": "wf-product-release",
        "name": "产品发布物料生成",
        "category": "marketing",
        "description": "统一输出发布会PPT、稿件与FAQ",
        "icon": "https://cdn.example.com/icons/product.svg",
        "tags": ["市场", "发布"],
        "version": "2.1.0",
        "lastUpdatedAt": "2025-10-21T11:45:00Z",
        "status": "published",
        "visibility": "organization"
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 12,
      "hasMore": false
    }
  }
}
```

**错误响应**:

- `401`: 未认证

---

### 🔹 2. 查看单个工作流详情

```
GET /api/workflows/{workflowId}
```

**功能说明**: 返回指定工作流的完整配置、动态输入参数与执行成本信息，供详情页和编辑器基于此进行渲染。

**路径参数**:
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| workflowId | string | 是 | 工作流ID |

**响应示例** (200):

```json
{
  "success": true,
  "data": {
    "id": "wf-patent-draft",
    "name": "专利权利要求生成",
    "category": "patent",
    "description": "根据技术方案生成权利要求书草稿",
    "icon": "https://cdn.example.com/icons/patent.svg",
    "tags": ["专利", "工作流"],
    "version": "1.2.0",
    "lastUpdatedAt": "2025-10-18T09:30:00Z",
    "inputSchema": {
      "type": "object",
      "properties": {
        "caseTitle": {
          "type": "string"
        },
        "problemStatement": {
          "type": "string"
        }
      }
    },
    "outputDescription": "返回主权利要求、从属权利要求及审核建议",
    "executionCost": {
      "credits": 12,
      "durationEstimate": "PT2M"
    },
    "createdAt": "2025-06-01T10:00:00Z",
    "createdBy": "admin@example.com",
    "isDeprecated": false
  }
}
```

**错误响应**:

- `401`: 未认证
- `404`: 资源不存在

---

### 🔹 3. 触发工作流执行

```
POST /api/workflows/{workflowId}/execute
```

**功能说明**: 根据提交的动态输入与附件立即启动工作流，返回执行ID供前端轮询结果与展示实时进度，适用于"立即运行""一键生成"等高频业务场景。

**路径参数**:
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| workflowId | string | 是 | 工作流ID |

**请求体**:

```json
{
  "inputs": {
    "caseTitle": "无人机喷洒控制算法",
    "problemStatement": "需生成主权利要求与从属权利要求",
    "priority": "high"
  },
  "attachments": [
    {
      "field": "techReport",
      "fileId": "file-123",
      "fileName": "report.pdf",
      "mimeType": "application/pdf"
    }
  ],
  "projectId": "prj-2024-001",
  "presetId": "chain-001",
  "metadata": {
    "triggeredFrom": "workspace"
  }
}
```

**请求体字段**:
| 字段名 | 类型 | 必填 | 说明 |
|----------|------|------|------|
| inputs | object | 是 | 动态参数，符合inputSchema |
| attachments | array | 否 | 附件上传配置列表 |
| projectId | string | 否 | 可选，关联项目 |
| presetId | string | 否 | 可选，链式调用预设 |
| metadata | object | 否 | 扩展字段（如来源页面、触发方式） |

**响应示例** (202):

```json
{
  "success": true,
  "data": {
    "executionId": "exec-789",
    "status": "queued"
  }
}
```

**错误响应**:

- `400`: 请求参数错误
- `401`: 未认证
- `409`: 工作流执行冲突

**性能指标**:

- P95延迟: 2000ms
- 成功率: 99.5%
- 并发限制: 每用户3个并发执行

---

### 🔹 4. 查询工作流执行结果

```
GET /api/workflow-executions/{executionId}
```

**功能说明**: 返回执行状态、生成内容、产出文件与错误信息，用于结果页或历史记录查看。

**路径参数**:
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| executionId | string | 是 | 执行ID |

**响应示例** (200):

```json
{
  "success": true,
  "data": {
    "executionId": "exec-789",
    "workflowId": "wf-patent-draft",
    "status": "completed",
    "startedAt": "2025-10-22T02:00:00Z",
    "completedAt": "2025-10-22T02:01:45Z",
    "triggeredBy": "user@example.com",
    "projectId": "prj-2024-001",
    "outputs": {
      "mainClaim": "一种...",
      "dependentClaims": ["根据权利要求1所述的方法..."]
    },
    "files": [
      {
        "fileId": "file-456",
        "fileName": "claims.docx",
        "mimeType": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "size": 23456,
        "downloadUrl": "https://example.com/files/file-456"
      }
    ]
  }
}
```

**错误响应**:

- `401`: 未认证
- `404`: 资源不存在

---

### 🔹 5. 获取工作流执行进度

```
GET /api/workflow-executions/{executionId}/progress
```

**功能说明**: 轮询或长轮询接口，返回当前进度百分比与步骤信息。

**路径参数**:
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| executionId | string | 是 | 执行ID |

**响应示例** (200):

```json
{
  "success": true,
  "data": {
    "status": "running",
    "percent": 65,
    "currentStep": "生成主权利要求",
    "estimatedRemainingSeconds": 45,
    "steps": [
      {
        "id": "draft",
        "label": "生成草稿",
        "status": "completed"
      },
      {
        "id": "review",
        "label": "模型审核",
        "status": "running"
      }
    ]
  }
}
```

**错误响应**:

- `401`: 未认证
- `404`: 资源不存在

**性能指标**:

- 推荐轮询间隔: 1000ms
- P95延迟: 150ms

---

### 🔹 6. 获取工作流历史执行记录

```
GET /api/workflows/{workflowId}/executions
```

**功能说明**: 按时间倒序返回执行历史，可用于"快速重复执行"。

**路径参数**:
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| workflowId | string | 是 | 工作流ID |

**查询参数**:
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| page | integer | 否 | 页码，默认1，>=1 |
| pageSize | integer | 否 | 每页记录数，默认20，1-100 |
| projectId | string | 否 | 过滤指定项目的执行记录 |
| status | string | 否 | 状态过滤：queued/running/completed/failed/cancelled |
| from | string | 否 | 起始时间（ISO8601） |
| to | string | 否 | 结束时间（ISO8601） |

**响应示例** (200):

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "executionId": "exec-789",
        "workflowId": "wf-patent-draft",
        "triggeredBy": "user@example.com",
        "triggeredAt": "2025-10-22T02:00:00Z",
        "status": "completed",
        "projectId": "prj-2024-001",
        "summary": "生成10条权利要求"
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 3,
      "hasMore": false
    }
  }
}
```

**错误响应**:

- `401`: 未认证

---

### 🔹 7. 获取工作流链式调用预设

```
GET /api/workflow-presets
```

**功能说明**: 用于"下一步自动填充"功能，返回预设的参数映射关系。

**查询参数**:
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| sourceWorkflowId | string | 否 | 来源工作流ID |
| targetWorkflowId | string | 否 | 目标工作流ID |

**响应示例** (200):

```json
{
  "success": true,
  "data": [
    {
      "id": "preset-001",
      "name": "专利撰写链",
      "description": "权利要求生成后自动进入说明书写作",
      "sourceWorkflowId": "wf-patent-draft",
      "targetWorkflowId": "wf-specification",
      "mappingRules": [
        {
          "targetField": "draftInput",
          "sourceField": "prev.outputs.dependentClaims",
          "transform": "string"
        }
      ],
      "createdAt": "2019-08-24T14:15:22Z",
      "updatedAt": "2019-08-24T14:15:22Z"
    }
  ]
}
```

**错误响应**:

- `401`: 未认证

---

### 🔹 8. 保存工作流链定义

```
POST /api/workflow-chains
```

**功能说明**: 允许管理员或团队负责人配置多个工作流的参数映射链路。

**请求体**:

```json
{
  "name": "专利撰写链",
  "description": "权利要求生成后自动进入说明书写作",
  "visibility": "team",
  "steps": [
    {
      "workflowId": "wf-patent-draft"
    },
    {
      "workflowId": "wf-specification",
      "mapping": [
        {
          "targetField": "draftInput",
          "source": "prev.outputs.dependentClaims",
          "transform": "string"
        }
      ]
    }
  ]
}
```

**请求体字段**:
| 字段名 | 类型 | 必填 | 说明 |
|----------|------|------|------|
| name | string | 是 | 链名称 |
| description | string | 否 | 链描述 |
| visibility | string | 否 | 可见范围：private/team/global，默认private |
| steps | array | 是 | 链中的工作流步骤，每个步骤包含workflowId和mapping |

**响应示例** (201):

```json
{
  "success": true,
  "data": {
    "id": "chain-001",
    "name": "专利撰写链",
    "description": "权利要求生成后自动进入说明书写作",
    "visibility": "team",
    "steps": [...],
    "createdAt": "2019-08-24T14:15:22Z",
    "createdBy": "admin@example.com"
  }
}
```

**错误响应**:

- `400`: 请求参数错误
- `401`: 未认证
- `403`: 权限不足

---

## 💬 对话流管理

### 🔹 9. 查看单个对话流配置

```
GET /api/chatflows/{chatflowId}
```

**功能说明**: 管理对话流输入渠道、Prompt配置。

**路径参数**:
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| chatflowId | string | 是 | 对话流ID |

**响应字段**:

- id: 对话流ID
- name: 对话流名称
- modes: 支持的对话模式列表
- inputConfig: 输入配置
- systemPrompt: 系统提示词

**错误响应**:

- `401`: 未认证
- `404`: 资源不存在

---

### 🔹 10. 更新对话流指令

```
PUT /api/chatflows/{chatflowId}/instructions
```

**功能说明**: 关联系统/团队/个人指令模板。

**路径参数**:
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| chatflowId | string | 是 | 对话流ID |

**请求体**:

- instructions: 指令列表
- scope: 作用域（system/team/personal）

**响应示例** (200):

```json
{
  "success": true,
  "data": {
    "chatflowId": "cf-general-assist",
    "instructions": [...],
    "updatedAt": "2025-10-22T10:00:00Z"
  }
}
```

**错误响应**:

- `400`: 请求参数错误
- `401`: 未认证
- `404`: 资源不存在

---

## 💬 会话管理

### 🔹 11. 查看会话消息历史

```
GET /api/conversations/{conversationId}/messages
```

**功能说明**: 查看会话消息历史与分页。

**路径参数**:
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| conversationId | string | 是 | 会话ID |

**查询参数**:
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| page | integer | 否 | 页码，默认1 |
| pageSize | integer | 否 | 每页记录数，默认20 |

**响应示例** (200):

```json
{
  "success": true,
  "data": {
    "messages": [...],
    "pagination": {...}
  }
}
```

**错误响应**:

- `401`: 未认证
- `404`: 会话不存在

---

### 🔹 12. 更新会话

```
PATCH /api/conversations/{conversationId}
```

**功能说明**: 重命名、归档或删除会话。

**路径参数**:
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| conversationId | string | 是 | 会话ID |

**请求体**:

- title: 新标题（可选）
- archived: 是否归档（可选）
- projectId: 关联项目ID（可选）

**响应示例** (200):

```json
{
  "success": true,
  "data": {
    "conversationId": "conv-123",
    "title": "技术调查讨论",
    "updatedAt": "2025-10-22T10:30:00Z"
  }
}
```

**错误响应**:

- `400`: 请求参数错误
- `401`: 未认证
- `404`: 会话不存在

---

### 🔹 13. 导出会话

```
POST /api/conversations/{conversationId}/export
```

**功能说明**: 生成对话导出任务。

**路径参数**:
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| conversationId | string | 是 | 会话ID |

**请求体**:

- format: 导出格式（pdf/html/markdown）
- includeMetadata: 是否包含元数据

**响应示例** (202):

```json
{
  "success": true,
  "data": {
    "taskId": "export-task-123",
    "status": "processing"
  }
}
```

**错误响应**:

- `400`: 请求参数错误
- `401`: 未认证

---

## 📁 项目管理

### 🔹 14. 创建项目

```
POST /api/projects
```

**功能说明**: 新建项目。

**请求体**:

```json
{
  "name": "专利撰写项目",
  "description": "无人机喷洒控制算法专利撰写",
  "type": "patent"
}
```

**请求体字段**:
| 字段名 | 类型 | 必填 | 说明 |
|----------|------|------|------|
| name | string | 是 | 项目名称 |
| description | string | 否 | 项目描述 |
| type | string | 否 | 项目类型 |

**响应示例** (201):

```json
{
  "success": true,
  "data": {
    "id": "prj-2024-001",
    "name": "专利撰写项目",
    "createdAt": "2025-10-01T10:00:00Z",
    "createdBy": "user@example.com"
  }
}
```

**错误响应**:

- `400`: 请求参数错误
- `401`: 未认证

---

### 🔹 15. 快捷创建项目

```
POST /api/projects/quick
```

**功能说明**: 一键创建项目（使用默认模板）。

**请求体**:

```json
{
  "name": "快速创建的项目"
}
```

**响应示例** (201):

```json
{
  "success": true,
  "data": {
    "id": "prj-2024-002",
    "name": "快速创建的项目",
    "type": "default"
  }
}
```

---

### 🔹 16. 查看项目详情

```
GET /api/projects/{projectId}
```

**功能说明**: 获取项目详情、成员、业务字段。

**路径参数**:
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| projectId | string | 是 | 项目ID |

**响应示例** (200):

```json
{
  "success": true,
  "data": {
    "id": "prj-2024-001",
    "name": "专利撰写项目",
    "description": "无人机喷洒控制算法专利撰写",
    "type": "patent",
    "members": [
      {
        "userId": "user-123",
        "role": "owner",
        "joinedAt": "2025-10-01T10:00:00Z"
      }
    ],
    "businessFields": {...},
    "createdAt": "2025-10-01T10:00:00Z",
    "updatedAt": "2025-10-22T10:00:00Z"
  }
}
```

**错误响应**:

- `401`: 未认证
- `404`: 项目不存在

---

### 🔹 17. 更新项目

```
PUT /api/projects/{projectId}
```

**功能说明**: 编辑项目信息。

**路径参数**:
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| projectId | string | 是 | 项目ID |

**请求体**:

- name: 项目名称（可选）
- description: 项目描述（可选）
- businessFields: 业务字段（可选）

**响应示例** (200):

```json
{
  "success": true,
  "data": {
    "id": "prj-2024-001",
    "name": "专利撰写项目（已更新）",
    "updatedAt": "2025-10-22T10:30:00Z"
  }
}
```

**错误响应**:

- `400`: 请求参数错误
- `401`: 未认证
- `403`: 权限不足
- `404`: 项目不存在

---

### 🔹 18. 删除项目

```
DELETE /api/projects/{projectId}
```

**功能说明**: 删除项目。

**路径参数**:
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| projectId | string | 是 | 项目ID |

**响应示例** (200):

```json
{
  "success": true,
  "data": {
    "deleted": true,
    "projectId": "prj-2024-001"
  }
}
```

**错误响应**:

- `401`: 未认证
- `403`: 权限不足
- `404`: 项目不存在

---

### 🔹 19. 归档项目

```
PATCH /api/projects/{projectId}/archive
```

**功能说明**: 将项目标记为已归档。

**响应示例** (200):

```json
{
  "success": true,
  "data": {
    "id": "prj-2024-001",
    "archived": true,
    "archivedAt": "2025-10-22T10:00:00Z"
  }
}
```

**错误响应**:

- `401`: 未认证
- `404`: 项目不存在

---

### 🔹 20. 取消归档项目

```
PATCH /api/projects/{projectId}/unarchive
```

**功能说明**: 取消项目归档状态。

**响应示例** (200):

```json
{
  "success": true,
  "data": {
    "id": "prj-2024-001",
    "archived": false,
    "unarchivedAt": "2025-10-22T10:00:00Z"
  }
}
```

**错误响应**:

- `401`: 未认证
- `404`: 项目不存在

---

### 🔹 21. 查看项目下的工作流执行

```
GET /api/projects/{projectId}/workflows
```

**功能说明**: 查看项目下的工作流执行。

**路径参数**:
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| projectId | string | 是 | 项目ID |

**响应示例** (200):

```json
{
  "success": true,
  "data": {
    "items": [...],
    "pagination": {...}
  }
}
```

**错误响应**:

- `401`: 未认证
- `404`: 项目不存在

---

### 🔹 22. 查看项目详情（含关联数据）

```
GET /api/projects/{projectId}/detail
```

**功能说明**: 获取项目内历史数据与文件。

**路径参数**:
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| projectId | string | 是 | 项目ID |

**响应示例** (200):

```json
{
  "success": true,
  "data": {
    "project": {...},
    "workflows": [...],
    "conversations": [...],
    "files": [...]
  }
}
```

---

### 🔹 23. 导出项目数据

```
GET /api/projects/{projectId}/export
```

**功能说明**: 导出项目相关数据及文件。

**路径参数**:
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| projectId | string | 是 | 项目ID |

**查询参数**:

- format: 导出格式（zip/json）

**响应示例** (202):

```json
{
  "success": true,
  "data": {
    "downloadUrl": "https://...",
    "expiresAt": "2025-10-23T10:00:00Z"
  }
}
```

---

### 🔹 24. 关联结果到项目

```
PATCH /api/sessions/{sessionId}/associate
```

**功能说明**: 将工作流/对话流成果与项目建立关联。

**路径参数**:
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| sessionId | string | 是 | 会话ID |

**请求体**:

```json
{
  "projectId": "prj-2024-001"
}
```

**响应示例** (200):

```json
{
  "success": true,
  "data": {
    "sessionId": "session-123",
    "projectId": "prj-2024-001",
    "associatedAt": "2025-10-22T10:00:00Z"
  }
}
```

**错误响应**:

- `400`: 请求参数错误
- `401`: 未认证
- `404`: 资源不存在

---

### 🔹 25. 解除项目关联

```
PATCH /api/sessions/{sessionId}/dissociate
```

**功能说明**: 将工作流/对话流成果与项目解除关联。

**响应示例** (200):

```json
{
  "success": true,
  "data": {
    "sessionId": "session-123",
    "dissociatedAt": "2025-10-22T10:00:00Z"
  }
}
```

---

### 🔹 26. 查看项目的会话列表

```
GET /api/projects/{projectId}/sessions
```

**功能说明**: 获取项目内的历史数据。

**路径参数**:
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| projectId | string | 是 | 项目ID |

**响应示例** (200):

```json
{
  "success": true,
  "data": {
    "sessions": [...],
    "pagination": {...}
  }
}
```

---

### 🔹 27. 批量导出会话

```
POST /api/sessions/batch-export
```

**功能说明**: 导出单个或批量会话内容。

**请求体**:

```json
{
  "sessionIds": ["session-123", "session-456"],
  "format": "zip"
}
```

**响应示例** (202):

```json
{
  "success": true,
  "data": {
    "taskId": "export-task-456",
    "estimatedCompletionAt": "2025-10-22T10:05:00Z"
  }
}
```

---

## 👤 用户认证

### 🔹 28. 用户注册

```
POST /api/auth/register
```

**功能说明**: 注册和用户信息管理。

**请求体**:

```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "username": "user123"
}
```

**响应示例** (201):

```json
{
  "success": true,
  "data": {
    "userId": "user-123",
    "email": "user@example.com",
    "token": "jwt-token-here"
  }
}
```

**错误响应**:

- `400`: 请求参数错误
- `409`: 邮箱已存在

---

### 🔹 29. 用户登录

```
POST /api/auth/login
```

**功能说明**: 登录。

**请求体**:

```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**响应示例** (200):

```json
{
  "success": true,
  "data": {
    "token": "jwt-token-here",
    "refreshToken": "refresh-token-here",
    "expiresIn": 3600
  }
}
```

**错误响应**:

- `400`: 请求参数错误
- `401`: 用户名或密码错误

---

### 🔹 30. 用户登出

```
POST /api/auth/logout
```

**功能说明**: 登出。

**响应示例** (200):

```json
{
  "success": true,
  "message": "Successfully logged out"
}
```

---

### 🔹 31. 刷新令牌

```
POST /api/auth/refresh
```

**功能说明**: 刷新访问令牌。

**请求体**:

```json
{
  "refreshToken": "refresh-token-here"
}
```

**响应示例** (200):

```json
{
  "success": true,
  "data": {
    "token": "new-jwt-token",
    "expiresIn": 3600
  }
}
```

---

### 🔹 32. 发送验证码

```
POST /api/auth/send-verification-code
```

**功能说明**: 发送邮箱验证码。

**请求体**:

```json
{
  "email": "user@example.com",
  "purpose": "register"
}
```

**响应示例** (200):

```json
{
  "success": true,
  "data": {
    "expiresIn": 300
  }
}
```

---

### 🔹 33. 验证邮箱

```
POST /api/auth/verify-email
```

**功能说明**: 验证邮箱验证码。

**请求体**:

```json
{
  "email": "user@example.com",
  "code": "123456"
}
```

**响应示例** (200):

```json
{
  "success": true,
  "message": "Email verified successfully"
}
```

---

### 🔹 34. 请求密码重置

```
POST /api/auth/request-password-reset
```

**功能说明**: 请求密码重置。

**请求体**:

```json
{
  "email": "user@example.com"
}
```

---

### 🔹 35. 重置密码

```
POST /api/auth/reset-password
```

**功能说明**: 重置密码。

**请求体**:

```json
{
  "token": "reset-token-here",
  "newPassword": "NewSecurePass456!"
}
```

---

### 🔹 36. 修改密码

```
POST /api/auth/change-password
```

**功能说明**: 修改密码（需登录）。

**请求体**:

```json
{
  "oldPassword": "SecurePass123!",
  "newPassword": "NewSecurePass456!"
}
```

---

### 🔹 37. 获取用户信息

```
GET /api/users/me
```

**功能说明**: 获取/更新用户资料与偏好。

**响应示例** (200):

```json
{
  "success": true,
  "data": {
    "userId": "user-123",
    "email": "user@example.com",
    "username": "user123",
    "avatar": "https://...",
    "preferences": {
      "theme": "dark",
      "language": "zh-CN"
    }
  }
}
```

---

### 🔹 38. 更新用户信息

```
PUT /api/users/me
```

**功能说明**: 更新用户资料。

**请求体**:

```json
{
  "username": "newusername",
  "avatar": "base64-image-data",
  "preferences": {
    "theme": "light"
  }
}
```

---

### 🔹 39. 上传头像

```
POST /api/user/avatar
```

**功能说明**: 上传用户头像。

**请求体**: multipart/form-data

---

### 🔹 40. 删除账号

```
DELETE /api/users/me
```

**功能说明**: 注销账号。

---

## 💳 计费与充值

### 🔹 41. 查看充值套餐

```
GET /cms/recharge-packages
```

**功能说明**: 查看套餐、发起充值和监控余额。

**响应示例** (200):

```json
{
  "success": true,
  "data": {
    "packages": [
      {
        "id": "pkg-basic",
        "name": "基础版",
        "credits": 1000,
        "price": 99
      },
      {
        "id": "pkg-pro",
        "name": "专业版",
        "credits": 5000,
        "price": 399
      }
    ]
  }
}
```

---

### 🔹 42. 创建充值订单

```
POST /api/billing/top-ups
```

**功能说明**: 创建充值订单、查询账务摘要。

**请求体**:

```json
{
  "packageId": "pkg-pro",
  "paymentMethod": "wechat"
}
```

**响应示例** (201):

```json
{
  "success": true,
  "data": {
    "orderId": "order-123",
    "amount": 399,
    "paymentUrl": "https://..."
  }
}
```

---

### 🔹 43. 查询支付状态

```
GET /api/payment/status/{paymentId}
```

**功能说明**: 查询支付状态。

**路径参数**:
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| paymentId | string | 是 | 支付ID |

**响应示例** (200):

```json
{
  "success": true,
  "data": {
    "paymentId": "payment-123",
    "status": "completed",
    "paidAt": "2025-10-22T10:00:00Z"
  }
}
```

---

### 🔹 44. 查询用户余额

```
GET /api/user/balance
```

**功能说明**: 查询余额。

**响应示例** (200):

```json
{
  "success": true,
  "data": {
    "balance": 2500,
    "currency": "CNY",
    "lastUpdated": "2025-10-22T10:00:00Z"
  }
}
```

---

## 📊 使用统计

### 🔹 45. 获取统计摘要

```
GET /api/usage/summary
```

**功能说明**: 提供项目维度与个人维度的统计数据。

**查询参数**:
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| period | string | 否 | 统计周期：day/week/month/year |
| projectId | string | 否 | 项目ID（可选） |

**响应示例** (200):

```json
{
  "success": true,
  "data": {
    "totalWorkflows": 150,
    "totalConversations": 520,
    "totalCreditsUsed": 12500,
    "activeProjects": 8,
    "period": "month"
  }
}
```

---

### 🔹 46. 获取统计明细

```
GET /api/usage/breakdown
```

**功能说明**: 统计分析明细。

**查询参数**:

- period: 统计周期
- category: 分类

**响应示例** (200):

```json
{
  "success": true,
  "data": {
    "byCategory": {
      "patent": 45,
      "compliance": 23,
      "marketing": 82
    },
    "byDay": [
      {
        "date": "2025-10-22",
        "count": 15
      }
    ]
  }
}
```

---

### 🔹 47. 导出统计报表

```
GET /api/usage/summary/export
```

**功能说明**: 导出统计数据。

**查询参数**:

- format: 导出格式（pdf/excel）

---

## 💡 建议与反馈

### 🔹 48. 提交建议

```
POST /api/feedback/suggestions
```

**功能说明**: 提交建议与投票，展示活动。

**请求体**:

```json
{
  "title": "建议增加工作流批量执行功能",
  "description": "建议支持同时启动多个工作流...",
  "category": "feature-request"
}
```

**响应示例** (201):

```json
{
  "success": true,
  "data": {
    "suggestionId": "sugg-123",
    "status": "pending",
    "submittedAt": "2025-10-22T10:00:00Z"
  }
}
```

---

### 🔹 49. 查看建议列表

```
GET /api/feedback/campaigns
```

**功能说明**: 查看有奖征集活动。

**响应示例** (200):

```json
{
  "success": true,
  "data": {
    "campaigns": [...]
  }
}
```

---

### 🔹 50. 获取推荐码

```
GET /api/referral/code
```

**功能说明**: 推荐/奖励机制收集用户建议。

**响应示例** (200):

```json
{
  "success": true,
  "data": {
    "code": "REF-ABC123",
    "shareUrl": "https://...",
    "rewardPerInvite": 100
  }
}
```

---

### 🔹 51. 使用推荐码

```
POST /api/referral/use
```

**功能说明**: 使用推荐码。

**请求体**:

```json
{
  "code": "REF-ABC123"
}
```

---

### 🔹 52. 查询推荐统计

```
GET /api/referral/statistics
```

**功能说明**: 查询推荐奖励统计。

**响应示例** (200):

```json
{
  "success": true,
  "data": {
    "totalInvites": 25,
    "successfulInvites": 18,
    "totalRewards": 1800,
    "pendingRewards": 600
  }
}
```

---

## 🎧 用户支持

### 🔹 53. 创建工单

```
POST /api/support/tickets
```

**功能说明**: 用户支持，包括微信客服联系信息提供和在线工单收集（转邮件发送）。

**请求体**:

```json
{
  "title": "工作流执行失败",
  "description": "执行ID exec-789 失败，错误信息...",
  "priority": "high",
  "category": "technical"
}
```

**响应示例** (201):

```json
{
  "success": true,
  "data": {
    "ticketId": "ticket-123",
    "status": "open",
    "createdAt": "2025-10-22T10:00:00Z"
  }
}
```

---

### 🔹 54. 查看工单详情

```
GET /api/support/tickets/{ticketId}
```

**功能说明**: 查询工单详情。

**路径参数**:
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| ticketId | string | 是 | 工单ID |

**响应示例** (200):

```json
{
  "success": true,
  "data": {
    "ticketId": "ticket-123",
    "title": "工作流执行失败",
    "status": "in-progress",
    "replies": [...]
  }
}
```

---

### 🔹 55. 获取客服信息

```
GET /api/cms/customer-service
```

**功能说明**: 获取微信/客服信息。

**响应示例** (200):

```json
{
  "success": true,
  "data": {
    "wechat": "wechat-service-id",
    "email": "support@example.com",
    "phone": "400-123-4567"
  }
}
```

---

## 📁 文件服务

### 🔹 56. 上传文件

```
POST /api/files/upload
```

**功能说明**: 支持OSS上传与下载。

**请求体**: multipart/form-data

- file: 文件数据
- field: 引用字段（可选）
- sessionId: 关联会话（可选）

**响应示例** (201):

```json
{
  "success": true,
  "data": {
    "fileId": "file-123",
    "fileName": "report.pdf",
    "size": 23456,
    "uploadUrl": "https://...",
    "downloadUrl": "https://..."
  }
}
```

---

### 🔹 57. 确认文件上传

```
POST /api/files/confirm
```

**功能说明**: 确认文件上传完成。

**请求体**:

```json
{
  "uploadId": "upload-123"
}
```

---

### 🔹 58. 获取上传令牌

```
POST /api/files/upload-token
```

**功能说明**: 获取临时上传令牌。

**响应示例** (200):

```json
{
  "success": true,
  "data": {
    "token": "upload-token-123",
    "expiresIn": 3600,
    "uploadUrl": "https://..."
  }
}
```

---

### 🔹 59. 下载文件

```
GET /api/files/{fileId}/download-url
```

**功能说明**: 获取文件下载地址。

**路径参数**:
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| fileId | string | 是 | 文件ID |

**响应示例** (200):

```json
{
  "success": true,
  "data": {
    "downloadUrl": "https://...",
    "expiresAt": "2025-10-23T10:00:00Z"
  }
}
```

---

### 🔹 60. 批量删除文件

```
POST /api/files/batch-delete
```

**功能说明**: 支持批量导出与文件批量删除。

**请求体**:

```json
{
  "fileIds": ["file-123", "file-456"]
}
```

---

## 📚 指令库管理

### 🔹 61. 获取指令列表

```
GET /api/instructions
```

**功能说明**: 指令库，针对不同的对话类别分别提供Ⅰ、Ⅱ、Ⅲ指令库。

**查询参数**:

- category: 指令类别
- scope: 作用域（system/team/personal）

**响应示例** (200):

```json
{
  "success": true,
  "data": {
    "instructions": [
      {
        "id": "inst-123",
        "title": "基础Prompt模板",
        "content": "你是一个专业的专利撰写助手...",
        "category": "patent",
        "scope": "team"
      }
    ]
  }
}
```

---

### 🔹 62. 保存自定义指令

```
POST /api/instructions
```

**功能说明**: 保存自定义指令。

**请求体**:

```json
{
  "title": "我的专利撰写模板",
  "content": "按照以下格式...",
  "category": "patent"
}
```

**响应示例** (201):

```json
{
  "success": true,
  "data": {
    "instructionId": "inst-456",
    "createdAt": "2025-10-22T10:00:00Z"
  }
}
```

---

### 🔹 63. 更新指令

```
PUT /api/instructions/{instructionId}
```

**功能说明**: 更新指令内容。

---

### 🔹 64. 删除指令

```
DELETE /api/instructions/{instructionId}
```

**功能说明**: 删除指令。

---

## ⚙️ 工具与设置

### 🔹 65. 导出个人数据

```
POST /api/utilities/export/data
```

**功能说明**: 启动个人数据导出任务。

**请求体**:

```json
{
  "format": "zip",
  "includeFiles": true
}
```

**响应示例** (202):

```json
{
  "success": true,
  "data": {
    "taskId": "export-task-789",
    "estimatedCompletionAt": "2025-10-22T10:05:00Z"
  }
}
```

---

### 🔹 66. 清理缓存

```
POST /api/utilities/cache/clear
```

**功能说明**: 清理客户端缓存/草稿。

**响应示例** (200):

```json
{
  "success": true,
  "message": "Cache cleared successfully"
}
```

---

### 🔹 67. 获取布局偏好

```
GET /api/utilities/preferences/layout
```

**功能说明**: 配置布局、密度。

**响应示例** (200):

```json
{
  "success": true,
  "data": {
    "layout": "horizontal",
    "density": "comfortable",
    "sidebar": {
      "left": true,
      "right": true
    }
  }
}
```

---

### 🔹 68. 更新布局偏好

```
PUT /api/utilities/preferences/layout
```

**功能说明**: 更新布局配置。

**请求体**:

```json
{
  "layout": "vertical",
  "density": "compact"
}
```

---

### 🔹 69. 获取帮助文档

```
GET /api/utilities/help-articles
```

**功能说明**: 获取帮助文章列表。

**查询参数**:

- category: 文档分类

**响应示例** (200):

```json
{
  "success": true,
  "data": {
    "articles": [...]
  }
}
```

---

### 🔹 70. 切换主题

```
PUT /api/utilities/theme
```

**功能说明**: 主题设置。

**请求体**:

```json
{
  "theme": "light",
  "primaryColor": "#1890ff"
}
```

---

### 🔹 71. 获取引导气泡设置

```
GET /api/utilities/tooltips
```

**功能说明**: 管理引导气泡显示。

**响应示例** (200):

```json
{
  "success": true,
  "data": {
    "enabled": true,
    "dismissedTips": ["tip-123", "tip-456"]
  }
}
```

---

### 🔹 72. 更新引导气泡设置

```
PATCH /api/utilities/tooltips
```

**功能说明**: 更新气泡显示设置。

**请求体**:

```json
{
  "enabled": false,
  "dismiss": "tip-789"
}
```

---

### 🔹 73. 查看版本差异说明

```
GET /api/utilities/release-notes
```

**功能说明**: 版本差异比较。

**响应示例** (200):

```json
{
  "success": true,
  "data": {
    "version": "2.0.0",
    "notes": [
      {
        "version": "2.0.0",
        "date": "2025-10-22",
        "changes": [...]
      }
    ]
  }
}
```

---

### 🔹 74. 获取模块可见性

```
GET /api/utilities/preferences/visibility
```

**功能说明**: 管理模块可见性（Visibility列）。

**响应示例** (200):

```json
{
  "success": true,
  "data": {
    "modules": {
      "workflows": true,
      "chatflows": true,
      "projects": true
    }
  }
}
```

---

### 🔹 75. 更新模块可见性

```
PATCH /api/utilities/preferences/visibility
```

**功能说明**: 更新模块可见性。

**请求体**:

```json
{
  "module": "workflows",
  "visible": false
}
```

---

## 🔔 运维状态

### 🔹 76. 获取通知列表

```
GET /api/notifications
```

**功能说明**: 拉取通知、批量已读、获取实时通道。

**查询参数**:

- page: 页码
- pageSize: 每页记录数
- status: 状态过滤（read/unread/all）

**响应示例** (200):

```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "notif-123",
        "type": "workflow-completed",
        "title": "工作流执行完成",
        "content": "专利权利要求生成已完成",
        "read": false,
        "createdAt": "2025-10-22T10:00:00Z"
      }
    ],
    "pagination": {...}
  }
}
```

---

### 🔹 77. 标记通知已读

```
PATCH /api/notifications/{id}/read
```

**功能说明**: 标记通知已读。

---

### 🔹 78. 批量标记已读

```
PATCH /api/notifications/read-all
```

**功能说明**: 批量标记已读。

---

### 🔹 79. 删除通知

```
DELETE /api/notifications/{id}
```

**功能说明**: 删除通知。

---

### 🔹 80. 清空所有通知

```
DELETE /api/notifications/clear-all
```

**功能说明**: 清空所有通知。

---

### 🔹 81. 获取实时通知通道

```
POST /api/notifications/channel-token
```

**功能说明**: 获取实时通知的WebSocket或SSE连接令牌。

**响应示例** (200):

```json
{
  "success": true,
  "data": {
    "channelToken": "channel-token-123",
    "expiresIn": 3600,
    "endpoint": "wss://api.example.com/notifications"
  }
}
```

---

## 📈 性能监控

### 🔹 82. 获取性能指标

```
GET /api/monitoring/metrics
```

**功能说明**: 前端性能监控数据接口。

**查询参数**:

- period: 时间范围
- metric: 指标类型（responseTime/errorRate/concurrency）

**响应示例** (200):

```json
{
  "success": true,
  "data": {
    "responseTime": {
      "p50": 250,
      "p95": 800,
      "p99": 1200
    },
    "errorRate": 0.5,
    "concurrency": 15
  }
}
```

---

### 🔹 83. 上报性能数据

```
POST /api/monitoring/report
```

**功能说明**: 上报前端性能指标。

**请求体**:

```json
{
  "endpoint": "/api/workflows/execute",
  "responseTime": 1500,
  "success": true,
  "timestamp": "2025-10-22T10:00:00Z"
}
```

---

## 📝 通用响应说明

### 标准响应结构

所有API响应都遵循以下标准结构：

**成功响应**:

```json
{
  "success": true,
  "data": { ... }
}
```

**错误响应**:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "错误说明",
    "details": { ... }
  }
}
```

### 通用错误码

| 错误码 | 说明             |
| ------ | ---------------- |
| 400    | 请求参数错误     |
| 401    | 未认证或令牌过期 |
| 403    | 权限不足         |
| 404    | 资源不存在       |
| 409    | 资源冲突         |
| 429    | 请求过于频繁     |
| 500    | 服务器内部错误   |

### 分页参数

所有分页接口返回的`pagination`对象包含以下字段：

| 字段名   | 说明                |
| -------- | ------------------- |
| page     | 当前页码（从1开始） |
| pageSize | 每页记录数          |
| total    | 总记录数            |
| hasMore  | 是否存在下一页      |

---

## 🔗 相关文档

- [API规范总览](./INDEX.md)
- [OpenAPI规范](./workflows.yaml)
- [API使用示例](./examples/workflows/)
- [设计目标说明](../网站设计目标说明.md)

---

**文档版本**: v1.0  
**最后更新**: 2025-12-30  
**维护者**: Workspace开发团队
