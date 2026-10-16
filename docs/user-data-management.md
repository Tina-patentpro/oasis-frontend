# 用户数据管理接口文档

## 概述

提供用户数据的导出和清空功能，支持用户下载自己的所有项目数据和清空所有记录。

## 安全性

- 所有接口都需要 Bearer Token 认证
- 导出数据仅包含当前用户的数据，严禁越权访问
- 清空操作为软删除（`is_del = 1`），具备原子性

---

## API 接口

### 1. 获取数据统计

```
GET /user/user/data/stats
```

**描述**: 获取当前用户的数据统计信息

**请求头**:

```
Authorization: Bearer <token>
```

**响应示例**:

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "workflow_count": 15,
    "chatflow_count": 8,
    "folder_count": 3,
    "total_count": 26
  }
}
```

**字段说明**:

| 字段             | 类型 | 说明                 |
| ---------------- | ---- | -------------------- |
| `workflow_count` | int  | 工作流数量（type=1） |
| `chatflow_count` | int  | 聊天流数量（type=2） |
| `folder_count`   | int  | 文件夹数量           |
| `total_count`    | int  | 总数量               |

**数据说明**:

- 所有数据统一来自 `lz_workflow_logs` 表
- 通过 `type` 字段区分：`1` = workflow，`2` = chatflow

---

### 2. 导出用户数据

```
GET /user/user/data/export
```

**描述**: 导出当前用户的所有数据为 ZIP 包

**请求头**:

```
Authorization: Bearer <token>
```

**响应**:

- Content-Type: `application/zip`
- 文件名格式: `user_data_{user_id}_{timestamp}.zip`

**ZIP 包结构**:

```
user_data_123_20260129_143020.zip
├── README.md                    # 导出说明和统计信息
├── workflows/                   # 工作流项目（type=1）
│   ├── 2026-01-29_项目A_1.md
│   ├── 2026-01-28_项目B_2.md
│   └── ...
└── chatflows/                   # 聊天流记录（type=2）
    ├── 2026-01-29_对话A_1.md
    ├── 2026-01-28_对话B_2.md
    └── ...
```

**数据说明**:

- 所有数据来自 `lz_workflow_logs` 表
- `type=1`: workflow（工作流）
- `type=2`: chatflow（聊天流）

**MD 文件格式** (workflows):

```markdown
# 项目A

**项目ID**: 1
**API名称**: GPT-4
**创建时间**: 2026-01-29 14:30:20
**类型**: 1

---

# 项目内容

这里是 answer_text 的内容...
```

**使用场景**:

- 用户备份自己的数据
- 数据迁移
- 离线查看历史记录

---

### 3. 清空用户数据

```
POST /user/user/data/clear
```

**描述**: 清空当前用户的所有数据（软删除）

**请求头**:

```
Authorization: Bearer <token>
```

**响应示例**:

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "workflow_count": 23,
    "folder_count": 3,
    "total_count": 26
  }
}
```

**字段说明**:

| 字段             | 类型 | 说明                                    |
| ---------------- | ---- | --------------------------------------- |
| `workflow_count` | int  | 删除的记录总数（包含 type=1 和 type=2） |
| `folder_count`   | int  | 删除的文件夹数量                        |
| `total_count`    | int  | 删除的总数量                            |

**操作说明**:

- 软删除：设置 `is_del = 1`，数据仍在数据库中
- 不可逆：前端需增加二次确认弹窗
- 原子性：要么全部成功，要么全部回滚

**数据说明**:

- 所有记录来自 `lz_workflow_logs` 表
- 包含 `type=1` (workflow) 和 `type=2` (chatflow)

---

## 前端对接示例

### TypeScript

```typescript
// src/api/services/session.service.ts

/**
 * 获取用户数据统计
 */
export async function getUserDataStats(): Promise<DataStats> {
  const response = await fetch('/user/user/data/stats', {
    headers: {
      Authorization: `Bearer ${getToken()}`,
    },
  })
  return response.json()
}

/**
 * 导出用户数据
 */
export async function exportUserData(): Promise<Blob> {
  const response = await fetch('/user/user/data/export', {
    headers: {
      Authorization: `Bearer ${getToken()}`,
    },
  })
  return response.blob()
}

/**
 * 清空用户数据
 */
export async function clearUserData(): Promise<ClearResult> {
  const response = await fetch('/user/user/data/clear', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getToken()}`,
      'Content-Type': 'application/json',
    },
  })
  return response.json()
}
```

### 组件对接

```typescript
// src/components/settings/hooks/useSettingsPanelState.ts

const handleExportData = async () => {
  try {
    setLoading(true)

    // 1. 获取统计信息
    const stats = await getUserDataStats()
    if (stats.total_count === 0) {
      message.info('暂无数据可导出')
      return
    }

    // 2. 下载 ZIP
    const blob = await exportUserData()

    // 3. 触发浏览器下载
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `user_data_${Date.now()}.zip`
    a.click()
    URL.revokeObjectURL(url)

    message.success(`成功导出 ${stats.total_count} 条记录`)
  } catch (error) {
    message.error('导出失败')
  } finally {
    setLoading(false)
  }
}

const handleClearData = async () => {
  try {
    // 二次确认
    Modal.confirm({
      title: '确认清空所有数据？',
      content: '此操作不可逆，所有项目、文件夹、聊天记录将被清空。',
      okText: '确认清空',
      okType: 'danger',
      onOk: async () => {
        const result = await clearUserData()
        message.success(`已清空 ${result.total_count} 条记录`)
        // 刷新列表
        refetchData()
      },
    })
  } catch (error) {
    message.error('清空失败')
  }
}
```

---

## 数据库变更

### WorkflowLog 表 (lz_workflow_logs)

| 字段   | 类型    | 操作   | 说明                       |
| ------ | ------- | ------ | -------------------------- |
| is_del | boolean | UPDATE | 设置为 `True`              |
| type   | int     | FILTER | `1`=workflow, `2`=chatflow |

**说明**: 该表统一存储工作流和聊天流记录，通过 `type` 字段区分

### UserFolder 表 (lz_user_folder)

| 字段   | 类型 | 操作   | 说明       |
| ------ | ---- | ------ | ---------- |
| is_del | int  | UPDATE | 设置为 `1` |

---

## 测试检查清单

- [ ] 导出功能正常，ZIP 包可解压
- [ ] MD 文件内容完整（包含 answer_text）
- [ ] 统计数量准确
- [ ] 清空功能正常，数据被软删除
- [ ] 未登录用户无法访问（401）
- [ ] 用户只能访问自己的数据（403）
- [ ] 空数据用户导出返回空 ZIP（含 README）
- [ ] 清空后前端列表为空

---

## 后续优化建议

1. **增量导出**: 支持按时间范围导出
2. **格式选择**: 支持 JSON、CSV 等多种导出格式
3. **异步处理**: 大数据量时使用异步任务 + 进度通知
4. **数据恢复**: 提供导入功能，支持从 ZIP 恢复数据
