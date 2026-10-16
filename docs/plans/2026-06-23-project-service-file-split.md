# project.service.ts 超长文件拆分计划

## 背景

`src/api/services/project.service.ts` 当前有效行数约 552 行，仍在 ESLint 超长文件豁免名单中。目标是在不改变项目接口行为的前提下，把清晰独立的辅助逻辑移出主文件，让主文件回到 500 行以内。

## 计划

1. 先跑项目服务相关测试  
   - 做什么：执行 `project.service`、项目字段转换、项目筛选排序相关测试。
   - 为什么做：确认拆分前行为是稳定的。
   - 完成标准：相关测试全部通过。

2. 抽出请求辅助逻辑  
   - 做什么：把 folder 接口路径、接口兜底请求、等待函数、详情记录提取函数移到新文件。
   - 为什么做：这些逻辑不依赖 `ProjectService` 内部状态，适合独立维护。
   - 完成标准：`project.service.ts` 只保留业务编排，调用新辅助函数。

3. 移除超长豁免并验证  
   - 做什么：从 `eslint.config.js` 的历史超长文件名单中移除 `project.service.ts`。
   - 为什么做：让后续检查能持续防止文件再次变长。
   - 完成标准：`project.service.ts` 有效行数小于 500，相关测试、类型检查和 lint 全部通过。

## 不做事项

- 不改 API 地址和参数。
- 不改项目创建、删除、归档、列表分页逻辑。
- 不处理剩余的 `ai.service.ts` 与 `session.service.ts`。
