> **归档说明**：本文档为历史归档资料，可能不代表当前实现与当前规范；请优先以仓库当前代码、docs/CHANGELOG.md、docs/api/ 与最新审计/计划文件为准。

# Phase 2 验收手册

最后更新：2025-10-23  
适用范围：API 质量改进计划 Phase 2（文档完善阶段）

---

## 1. 验收目标

- 所有 OpenAPI 规范文件满足 Phase 2 质量门槛：
  - 任何 `operation` 均提供 `operationId` 与 `description`。
  - `info.contact` 等基础元信息齐全。
  - Spectral 规则中 `operation-operationId`、`operation-description` 以 **error** 级别校验，无告警。
- 验收流程可在本地与 CI 中重复执行，团队成员能够自助完成质量确认。

---

## 2. 验收前准备

1. 安装依赖（首次执行或依赖变动时）：
   ```bash
   npm install
   ```
2. 确认 Spectral 配置位于 `.spectral.yml`，Phase 2 规则已开启。
3. 确认 `package.json` 中存在以下脚本：
   - `npm run api:lint:strict`
   - `npm run api:metadata`
   - `npm run api:validate`

---

## 3. 标准验收流程

| 步骤 | 命令                      | 预期结果                                                                     | 说明                   |
| ---- | ------------------------- | ---------------------------------------------------------------------------- | ---------------------- |
| 1    | `npm run api:lint:strict` | Spectral 输出 “No results with a severity of 'warn' or higher found!”        | Phase 2 规则全部通过   |
| 2    | `npm run api:metadata`    | 输出 “All API specs include contact metadata and required operation fields.” | 元数据巡检脚本通过     |
| 3    | `npm run api:test`        | TAP 测试全部通过                                                             | 合约/示例测试保持绿色  |
| 4    | `npm run api:validate`    | 三项检查串联执行并全部通过                                                   | 标准化的“一键验收”流程 |

> 建议在 PR 模板和 CI 中统一引用 `npm run api:validate`，保障提交质量。

---

## 4. 验收失败排查指引

| 失败环节            | 常见原因                                                       | 处理建议                                                           |
| ------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------ |
| Spectral 报告 error | 新增/修改的 API 缺少 `operationId`、`description` 或示例不合法 | 按提示定位文件与行号，补全缺失字段或修复示例结构                   |
| metadata 脚本返回 1 | 文档缺少 `info.contact` 或参数段落被误识别为 operation         | 检查 YAML 缩进；若为 `parameters` 级别声明无需补充，可忽略脚本输出 |
| 合约测试失败        | 示例结构或 Schema 发生破坏性变更                               | 与后端协同调整模型定义或更新测试用例                               |

---

## 5. 交付清单

完成 Phase 2 验收需同步以下内容：

- ✅ 运行结果截图或日志（Spectral、metadata、contract 三项）
- ✅ 更新 `.api-improvement-plan.md` 中 Phase 2 进度与剩余任务
- ✅ 如需，更新团队文档/FAQ，确保命名规则、验收流程可查

---

## 6. 常见问题

- **问：新 API 在哪一步需要添加 operationId？**  
  **答：** 开发初期即补充，建议使用 `资源 + 动作` 的 PascalCase 命名，具体规范见《OPERATION NAMING FAQ》。

- **问：脚本执行报错 `ENOENT`？**  
  **答：** 确认在仓库根目录执行命令，并检查是否存在 `docs/api` 目录。

- **问：CI 中应执行哪些脚本？**  
  **答：** 推荐直接使用 `npm run api:validate`，它会顺序触发严格 Spectral、元数据检查与契约测试。

---

## 7. 验收完成后的下一步

当 Phase 2 任务全部完成并验收通过后，可在 `.api-improvement-plan.md` 中将 “Phase 2 文档完善” 标记为完成，并开始筹备 Phase 3（高级质量阶段），包括：

- 清理无用引用
- 丰富 summary 与 schema 描述
- 引入自动化文档生成流程

如需协助，可在改进计划中补充具体待办或创建对应的 issue/任务单。祝验收顺利！
