# 项目列表分页功能更新

## 概述

将项目列表接口从"一次性加载全部"改造为"支持分页+懒加载+搜索+归档筛选"的架构，提升性能和用户体验。

## 改动文件

- `app/services/userfolder_services.py` - 服务层
- `app/api/v1/user.py` - 路由层

---

## 功能特性

### 1. 分页加载

- 支持分页查询，避免一次加载过多数据
- 默认每页 **15 条**，最大 100 条

### 2. 懒加载子项目

- 根据父项目 ID 按需加载子项目
- 减少初始加载时间

### 3. 关键字搜索

- 匹配字段：`name`、`coustomer_name`
- 自动去首尾空格，空字符串不过滤

### 4. 归档状态筛选

- `archive=0` - 未归档
- `archive=1` - 已归档
- 不传该参数 - 全部

### 5. 统计信息

- `child_count` - 子项目数量
- `project_count` - 项目数量
- `has_children` - 是否有子项目（前端判断是否显示展开按钮）

---

## API 接口

### 请求

```
GET /user/user/folderlist
```

### 查询参数

| 参数        | 类型   | 默认值 | 说明                                    |
| ----------- | ------ | ------ | --------------------------------------- |
| `parent_id` | int    | 0      | 父项目ID，0=获取根项目                  |
| `page`      | int    | 1      | 页码（从1开始）                         |
| `limit`     | int    | 15     | 每页数量（1-100）                       |
| `keyword`   | string | null   | 搜索关键字，匹配 name 和 coustomer_name |
| `archive`   | int    | null   | 归档状态，0=未归档，1=已归档，不传=全部 |

### 请求示例

```bash
# 获取根项目列表（默认分页）
GET /user/user/folderlist

# 搜索项目名称
GET /user/user/folderlist?keyword=项目

# 只看未归档的项目
GET /user/user/folderlist?archive=0

# 获取指定项目的子项目
GET /user/user/folderlist?parent_id=123&page=1&limit=20

# 组合查询：搜索未归档的项目
GET /user/user/folderlist?keyword=客户&archive=0&page=1&limit=15
```

### 响应格式

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "total": 45,
    "items": [
      {
        "id": 1,
        "name": "我的项目",
        "parent_id": 0,
        "coustomer_name": "张三",
        "archive": 0,
        "child_count": 5,
        "project_count": 12,
        "has_children": true
      },
      {
        "id": 2,
        "name": "工作项目",
        "parent_id": 0,
        "coustomer_name": "李四",
        "archive": 0,
        "child_count": 0,
        "project_count": 8,
        "has_children": false
      }
    ]
  }
}
```

### 响应字段说明

| 字段    | 类型  | 说明             |
| ------- | ----- | ---------------- |
| `total` | int   | 过滤后的总记录数 |
| `items` | array | 项目列表         |

### 项目对象字段

| 字段             | 类型    | 说明                           |
| ---------------- | ------- | ------------------------------ |
| `id`             | int     | 项目ID                         |
| `name`           | string  | 项目名称                       |
| `parent_id`      | int     | 父项目ID（0表示根项目）        |
| `coustomer_name` | string  | 客户名称                       |
| `archive`        | int     | 归档状态（0=未归档，1=已归档） |
| `child_count`    | int     | 子项目数量                     |
| `project_count`  | int     | 项目数量                       |
| `has_children`   | boolean | 是否有子项目                   |

---

## 前端使用示例

```typescript
// 获取根项目列表
const loadRootFolders = async () => {
  const response = await fetch('/user/user/folderlist?page=1&limit=15')
  const result = await response.json()

  console.log('总数:', result.data.total)
  console.log('列表:', result.data.items)

  result.data.items.forEach((folder) => {
    // 根据 has_children 判断是否显示展开按钮
    if (folder.has_children) {
      showExpandButton(folder.id)
    }
  })
}

// 搜索项目
const searchFolders = async (keyword: string) => {
  const response = await fetch(`/user/user/folderlist?keyword=${encodeURIComponent(keyword)}`)
  const result = await response.json()
  return result.data
}

// 获取未归档的项目
const loadActiveFolders = async () => {
  const response = await fetch('/user/user/folderlist?archive=0')
  const result = await response.json()
  return result.data
}

// 加载子项目
const loadChildren = async (parentId: number) => {
  const response = await fetch(`/user/user/folderlist?parent_id=${parentId}`)
  const result = await response.json()
  return result.data.items
}
```

---

## 后端开发检查清单

- [x] `GET /user/user/folderlist` 支持 `page/limit/keyword/archive` 参数
- [x] 返回结构改为 `data.total + data.items`
- [x] 搜索命中字段覆盖 `name` 与 `coustomer_name`
- [x] 关键字去首尾空格后生效，空字符串不过滤
- [x] 归档状态筛选支持
- [x] 默认排序 `id DESC`
- [x] 分页在过滤后执行，`total` 返回过滤后总数
- [x] 兼容性：不传参数时等价于"第 1 页、每页 15 条"

---

## 兼容性说明

### 版本变更

| 版本 | 变更内容                             |
| ---- | ------------------------------------ |
| 旧版 | 返回数组格式，无分页                 |
| 新版 | 返回 `{total, items}` 格式，支持分页 |

### 升级指南

**旧版客户端：**

```javascript
// 旧版：直接获取数组
const folders = response.data // 数组
```

**新版客户端：**

```javascript
// 新版：从 items 中获取数组
const folders = response.data.items // 数组
const total = response.data.total // 总数
```

### 回退方案

如需回退到旧版本：

```python
# user.py
obj = await get_userfolderselect_old(db, current_user.id)
```

---

## 后续优化建议

1. **性能优化**：批量统计 `child_count` 和 `project_count`，避免循环查询
2. **缓存**：对频繁访问的项目列表进行缓存
3. **更多排序**：支持按名称、创建时间等字段排序
4. **批量操作**：支持批量移动、批量归档等功能
