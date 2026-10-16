> **归档说明**：本文档为历史归档资料，可能不代表当前实现与当前规范；请优先以仓库当前代码、docs/CHANGELOG.md、docs/api/ 与最新审计/计划文件为准。

# Spectral Lint 修复计划

## 问题概览

- **总问题数**: 145个（129个错误，16个警告）
- **影响文件**: 6个YAML文件
- **优先级**: 高（影响API文档质量）

## 问题分类

### 1. 严重错误 (Critical Errors)

- **data-deletion.yaml**: 语法错误、重复键、缩进问题、无效引用
- **instructions.yaml**: 语法错误、重复键、缩进问题、无效引用
- **billing-grants.yaml**: 枚举类型错误、模式验证错误

### 2. 中等错误 (Medium Errors)

- **files.yaml**: 媒体验证错误
- **ops-status.yaml**: 媒体验证错误
- **users-auth.yaml**: 媒体验证错误

### 3. 警告 (Warnings)

- **billing-grants.yaml**: 未使用的组件

## 修复策略

### 阶段1: 语法和结构修复

1. 修复data-deletion.yaml的语法错误
2. 修复instructions.yaml的语法错误
3. 解决所有parser错误、重复键、缩进问题

### 阶段2: 引用和模式修复

1. 修复所有无效引用（invalid-ref）
2. 修复枚举类型错误（typed-enum）
3. 修复模式验证错误（oas3-schema）

### 阶段3: 媒体验证修复

1. 修复所有媒体验证错误（oas3-valid-media-example）

### 阶段4: 清理优化

1. 移除未使用的组件（可选）
2. 验证修复结果

## 预期结果

- 错误数量从129个减少到0个
- 警告数量显著减少
- 所有API文档符合OpenAPI 3.0规范
- 通过Spectral验证
