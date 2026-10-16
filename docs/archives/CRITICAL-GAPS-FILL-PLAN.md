> **归档说明**：本文档为历史归档资料，可能不代表当前实现与当前规范；请优先以仓库当前代码、docs/CHANGELOG.md、docs/api/ 与最新审计/计划文件为准。

# 关键缺口补齐实施计划

## 概述

本文档详细记录了6个关键缺口的补齐实施计划，基于现有API架构和设计模式，确保新接口与现有系统的一致性和兼容性。

## 缺口清单与优先级

### M1: 核心功能解锁（高优先级）

1. **用户注册入口缺失** - 影响新用户自助入驻
2. **文件/附件服务缺失** - 阻塞核心功能
3. **历史执行输入缺失** - 影响用户体验

### M2: 功能完善（中优先级）

4. **指令库管理缺失** - 用户无法自建指令
5. **赠送额度缺失** - 运营无法配置策略

### M3: 合规能力（标准优先级）

6. **数据删除接口缺失** - GDPR合规要求

## 实施计划详细设计

### 1. 用户注册入口缺失（目标 7.a）

#### 现状分析

- `docs/api/users-auth.yaml` 仅涵盖登录/刷新/登出/2FA
- 缺少注册或用户创建接口
- 新用户无法自助入驻，生产环境需依赖人工开通

#### 设计方案

**注册流程选择：** 邀请制 + 邮箱验证

- 支持管理员邀请码注册
- 邮箱验证码二次确认
- 防刷和节流机制

**新增API接口：**

```yaml
/api/auth/register                 # POST - 注册申请
/api/auth/register/verify          # POST - 邮箱验证
/api/auth/register/resend          # POST - 重发验证码
/api/auth/invitations/{code}       # GET - 验证邀请码
```

**安全措施：**

- IP级别的节流限制
- 验证码有效期控制
- 邮箱域名白名单
- 重复注册检测

#### 实施步骤

- [x] 扩展 `users-auth.yaml` 添加注册相关接口
- [x] 创建注册相关的Schema定义
- [x] 更新安全策略和权限说明
- [x] 补充 `api-validate.yml` 测试用例
- [x] 创建SDK示例和前端注册视图Mock

### 2. 文件/附件服务缺失（目标 3.b、4.a）

#### 现状分析

- 工作流和会话接口引用 `fileId` 但缺少上传/列举API
- 无法上传文本/文件/图片，阻塞核心功能

#### 设计方案

**存储方案：** 对象存储 + 本地缓存

- 支持多种存储后端（AWS S3、阿里云OSS、本地）
- 文件类型和大小校验
- 病毒扫描集成

**新增API接口：**

```yaml
/api/files                        # POST - 文件上传
/api/files                        # GET - 文件列表
/api/files/{fileId}               # GET - 文件下载
/api/files/{fileId}               # DELETE - 删除文件
/api/files/batch                  # POST - 批量上传
/api/files/{fileId}/metadata      # GET - 文件元数据
```

**功能特性：**

- 多部分上传支持
- 断点续传
- 文件预览生成
- 访问权限控制

#### 实施步骤

- [x] 创建 `files.yaml` API文档
- [x] 设计文件存储Schema
- [x] 定义文件类型校验规则
- [x] 集成安全扫描流程
- [x] 创建前端SDK和上传组件
- [x] 补充Mock服务和单元测试

### 3. 历史执行输入缺失（目标 3.c）

#### 现状分析

- `WorkflowExecutionDetail` 只返回输出/文件，缺少原始输入
- 无法基于历史任务自动回填参数

#### 设计方案

**数据扩展：** 输入快照存储

- 扩展现有Schema添加inputs字段
- 敏感信息脱敏策略
- 可配置字段过滤

**Schema扩展：**

```yaml
WorkflowExecutionDetail:
  properties:
    inputs:
      type: object
      description: 原始输入参数快照
    inputsSnapshot:
      type: object
      description: 脱敏后的输入摘要
    inputAttachments:
      type: array
      items:
        $ref: '#/components/schemas/InputAttachment'
```

#### 实施步骤

- [x] 扩展 `workflows.yaml` 中的 `WorkflowExecutionDetail` Schema
- [x] 添加敏感信息脱敏策略定义
- [x] 更新执行历史查询接口
- [x] 评估存储成本与隐私策略
- [x] 升级前端历史面板支持快速填充

### 4. 指令库管理缺失（目标 4.c）

#### 现状分析

- `chatflows.yaml` 只能绑定已有指令ID，缺指令CRUD
- 用户无法自建/编辑专属指令

#### 设计方案

**权限模型：** RBAC控制

- personal：仅创建者可改
- team：团队管理员可管理
- public：全局共享只读

**新增API接口：**

```yaml
/api/instructions                # GET - 指令列表
/api/instructions                # POST - 创建指令
/api/instructions/{id}           # GET - 指令详情
/api/instructions/{id}           # PATCH - 更新指令
/api/instructions/{id}           # DELETE - 删除指令
/api/instructions/{id}/versions  # GET - 版本历史
```

**功能特性：**

- 标签分类管理
- 版本控制
- 审计日志
- 使用统计

#### 实施步骤

- [x] 创建 `instructions.yaml` API文档
- [x] 设计指令管理Schema和权限模型
- [x] 实现RBAC权限校验
- [x] 更新前端 `InstructionLibraryPanel`
- [x] 初始化系统指令数据
- [x] 补充自动化测试覆盖

### 5. 赠送额度缺失（目标 7.b）

#### 现状分析

- `billing.yaml` 无赠送/奖励API
- 运营无法配置赠送策略，余额统计不完整

#### 设计方案

**赠送场景：**

- 运营后台手动赠送
- 客服奖励机制
- 活动奖励系统
- 推荐奖励

**新增API接口：**

```yaml
/api/billing/grants               # POST - 创建赠送
/api/billing/grants               # GET - 赠送记录
/api/billing/grants/{id}          # GET - 赠送详情
/api/billing/grants/{id}/cancel   # POST - 取消赠送
```

**数据模型扩展：**

```yaml
BillingSummary:
  properties:
    grantedBalance:
      type: number
      description: 赠送余额
    totalGrants:
      type: number
      description: 累计赠送金额

Transaction:
  properties:
    source:
      type: string
      enum: [topup, consumption, refund, adjustment, grant]
```

#### 实施步骤

- [x] 扩展 `billing.yaml` 添加赠送相关接口
- [x] 更新 `BillingSummary` 和 `Transaction` Schema
- [x] 设计赠送来源和过期策略
- [x] 创建对账流程和风控阈值
- [x] 更新前端余额页面和通知中心

### 6. 数据删除接口缺失（目标 8.a）

#### 现状分析

- `Utilities` 提供导出/清缓存，无个人数据删除
- 未满足GDPR/个人信息保护法要求

#### 设计方案

**删除策略：** 异步处理 + 冷静期

- 支持软删除和硬删除
- 30天冷静期恢复机制
- 管理员审批流程

**新增API接口：**

```yaml
/api/utilities/data/delete-request  # POST - 申请删除
/api/utilities/data/delete-request/{id}  # GET - 查询状态
/api/utilities/data/delete-request/{id}/cancel  # POST - 取消删除
/api/utilities/data/delete-request/{id}/restore  # POST - 恢复数据
```

**删除范围：**

- 用户基础信息
- 项目和会话数据
- 上传文件
- 操作日志

#### 实施步骤

- [x] 扩展 `utilities.yaml` 添加数据删除接口
- [x] 设计异步任务处理流程
- [x] 实现冷静期和恢复机制
- [x] 添加管理员审批流程
- [x] 更新用户中心删除入口
- [x] 补充合规审计功能

## 里程碑计划

### M1: 核心功能解锁（2周）

**Week 1:**

- [x] 完成用户注册接口设计和文档
- [x] 完成文件服务API设计和安全策略
- [x] 开始前端注册页面开发

**Week 2:**

- [x] 完成历史执行输入扩展
- [x] 文件服务前端集成
- [x] 注册流程端到端测试

### M2: 功能完善（2周）

**Week 3:**

- [x] 指令库管理API设计
- [x] 赠送额度接口设计
- [x] 开始指令库前端开发

**Week 4:**

- [x] 完成赠送额度前端集成
- [x] 指令库功能测试
- [x] 运营后台集成

### M3: 合规能力（1周）

**Week 5:**

- [x] 数据删除接口设计
- [x] 合规流程实施
- [x] 法务审查和最终测试

## 质量保证

### API设计规范

- 遵循现有OpenAPI 3.1.0规范
- 保持与现有接口的一致性
- 完整的错误处理和响应格式

### 安全要求

- 所有新接口都需要认证
- 敏感操作需要审计日志
- 实施适当的权限控制

### 测试策略

- API文档验证（Spectral）
- Mock服务集成测试
- 前端组件单元测试
- 端到端功能测试

## 风险评估

### 技术风险

- **文件存储扩展性** - 需要评估不同存储方案的兼容性
- **数据删除复杂性** - 涉及多个数据源的级联删除

### 业务风险

- **注册流程安全性** - 需要防范恶意注册和垃圾账户
- **赠送额度滥用** - 需要严格的风控机制

### 合规风险

- **数据删除完整性** - 确保符合GDPR等法规要求
- **用户隐私保护** - 敏感信息脱敏策略的有效性

## 后续维护

### 监控指标

- 注册转化率
- 文件上传成功率
- 指令库使用情况
- 赠送额度使用统计
- 数据删除请求处理时间

### 运维支持

- API性能监控
- 错误日志分析
- 用户反馈收集
- 定期安全审计

---

**文档版本：** 1.0  
**创建时间：** 2025-10-23  
**负责人：** API开发团队  
**审核人：** 产品、安全、法务团队
