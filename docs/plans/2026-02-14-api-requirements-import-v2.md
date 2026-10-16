# API Requirements Import V2 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将 `API接口需求落地映射-独立文件.md` 的要求完整、可追溯地导入 `API接口文档-用户端.md`，并形成逐项核对证据。

**Architecture:** 采用“规则先行 + 接口逐项 + 双向核对”的三层导入流程。先落地全局规则，再按接口章节导入约束与示例，最后用正向/反向清单做闭环验证。每个阶段设置审批门禁，避免一次性大改不可回滚。

**Tech Stack:** Markdown, `rg`, `git`, `cmd`

---

## Reflection (V2 vs V1)

1. 新增反向覆盖检查（`API接口文档-用户端.md` -> 独立文件），防止“只做正向映射”造成漏项。
2. 将“规则条款、接口条款、验收条款”拆分为独立核对轨道，避免混检导致误判。
3. 增加冲突优先级（`冲突 > 未提供 > 部分提供 > 已提供`）和强制处理动作。
4. 增加审批门禁（Gate A/B/C），每阶段可暂停、复核、回滚。
5. 增加可执行验证命令，确保“有结论必有证据”。

---

### Task 1: 建立导入基线与核对矩阵

**Files:**

- Create: `Todo/解决-后端API开发需求：接口需求导入核对报告.md`
- Modify: `API接口需求落地映射-独立文件.md`
- Modify: `API接口文档-用户端.md`
- Test: `Todo/解决-后端API开发需求：接口需求导入核对报告.md`

**Step 1: 生成基线指纹**

Run: `git status --short`
Expected: 显示当前改动状态，记录基线。

**Step 2: 创建核对报告骨架（Check-ID 表）**

在 `Todo/解决-后端API开发需求：接口需求导入核对报告.md` 建立字段：
`Check-ID | 独立文件条目 | API来源章节 | API文档证据 | 判定 | 处理动作`

**Step 3: 正向录入独立文件全部条目**

将 `API接口需求落地映射-独立文件.md` 中 1.1、1.2、2.1、2.2、3.1、3.2 逐条写入报告。

**Step 4: 反向录入 API 文档相关条目**

从 `API接口文档-用户端.md` 抽取全部写操作与零透传相关接口，写入“反向检查”区。

**Step 5: Commit（仅计划执行时）**

```bash
git add "Todo/解决-后端API开发需求：接口需求导入核对报告.md"
git commit -m "docs: add API requirements import verification matrix"
```

---

### Task 2: 导入全局规则（规则先行）

**Files:**

- Modify: `API接口文档-用户端.md`
- Test: `API接口文档-用户端.md`

**Step 1: 写入失败前置检查（当前应缺失）**

Run: `rg -n "写操作成功后，`data` 必须返回|禁止返回、禁止接收、禁止透传" API接口文档-用户端.md`
Expected: 无匹配或不完整匹配（FAIL）。

**Step 2: 在 API 文档新增“全局规则”段**

新增两组规则：

1. 写操作成功后 `data` 返回完整对象/结果对象。
2. 用户端接口零透传密钥字段（含请求与响应约束）。

**Step 3: 回链独立文件来源**

在规则段注明来源：`API接口需求落地映射-独立文件.md`。

**Step 4: 通过检查**

Run: `rg -n "写操作成功后，`data` 必须返回|零透传|第三方密钥" API接口文档-用户端.md`
Expected: 命中新规则段（PASS）。

**Step 5: Commit（仅计划执行时）**

```bash
git add "API接口文档-用户端.md"
git commit -m "docs: add global write-response and zero-transmission rules"
```

---

### Task 3: 导入写操作接口条款（1.1 + 1.2）

**Files:**

- Modify: `API接口文档-用户端.md`
- Modify: `Todo/解决-后端API开发需求：接口需求导入核对报告.md`
- Test: `API接口文档-用户端.md`

**Step 1: 失败前置检查（定位空 data 写接口）**

Run: `rg -n "\"data\": \\{\\}" API接口文档-用户端.md`
Expected: 命中多处写接口（FAIL）。

**Step 2: 逐接口改写响应示例**

按独立文件接口来源章节逐项更新，至少覆盖：
`2.3`、`2.4`、`3.2-3.5`、`6.3-6.5`、`7.1`、`7.3`、`7.4`、`8.3`、`8.5`、`8.9`、`9.1`。

**Step 3: 每完成一个接口即更新核对报告**

在报告中写入：

- API文档证据行号
- 判定从“冲突/未提供”更新为“已导入”
- 变更说明

**Step 4: 回归检查**

Run: `rg -n "### 2.3|### 7.1|### 8.5|### 9.1" API接口文档-用户端.md`
Expected: 章节存在且响应示例为非空对象结构（PASS，需人工 spot-check）。

**Step 5: Commit（仅计划执行时）**

```bash
git add "API接口文档-用户端.md" "Todo/解决-后端API开发需求：接口需求导入核对报告.md"
git commit -m "docs: import write-operation response requirements by endpoint"
```

---

### Task 4: 导入零透传接口条款（2.1 + 2.2）

**Files:**

- Modify: `API接口文档-用户端.md`
- Modify: `Todo/解决-后端API开发需求：接口需求导入核对报告.md`
- Test: `API接口文档-用户端.md`

**Step 1: 失败前置检查（当前密钥字段暴露）**

Run: `rg -n "api_key|credentials|access_key" API接口文档-用户端.md`
Expected: 有命中（FAIL）。

**Step 2: 更新 8.4 接口**

在 `8.4 获取 API 详情` 中移除密钥字段示例，新增“禁止密钥字段”约束。

**Step 3: 更新 8.5 接口**

在 `8.5 执行工作流` 中加入“密钥字段处理策略（忽略并告警或 400）”。

**Step 4: 通过检查**

Run: `rg -n "api_key|credentials|access_key" API接口文档-用户端.md`
Expected: 0 命中（PASS）。

**Step 5: Commit（仅计划执行时）**

```bash
git add "API接口文档-用户端.md" "Todo/解决-后端API开发需求：接口需求导入核对报告.md"
git commit -m "docs: enforce zero-transmission requirements for API detail/create"
```

---

### Task 5: 反向补全与遗漏处理

**Files:**

- Modify: `Todo/解决-后端API开发需求：接口需求导入核对报告.md`
- Modify: `API接口需求落地映射-独立文件.md`
- Modify: `API接口文档-用户端.md`
- Test: `Todo/解决-后端API开发需求：接口需求导入核对报告.md`

**Step 1: 反向列出 API 文档全部写接口**

Run: `rg -n "POST /|PUT /|PATCH /|DELETE /|workflowupd|workflowdelete|folderarchive|folderupd|userhasread|userhasdel" API接口文档-用户端.md`
Expected: 输出完整写接口候选集。

**Step 2: 与独立文件比对差集**

在核对报告中标注“未覆盖接口”，判定为“补充导入”或“豁免并说明理由”。

**Step 3: 对差集执行文档补全或显式豁免**

对保留接口补条款；对不纳入接口写明“非本次范围 + 原因”。

**Step 4: 完整性门禁**

确保核对报告中无空白项：
每个 Check-ID 必须有 `API文档证据 + 判定 + 处理动作`。

**Step 5: Commit（仅计划执行时）**

```bash
git add "Todo/解决-后端API开发需求：接口需求导入核对报告.md" "API接口需求落地映射-独立文件.md" "API接口文档-用户端.md"
git commit -m "docs: close coverage gaps and finalize import scope decisions"
```

---

### Task 6: 最终验证与审批包输出

**Files:**

- Modify: `Todo/解决-后端API开发需求：接口需求导入核对报告.md`
- Test: `API接口文档-用户端.md`
- Test: `API接口需求落地映射-独立文件.md`

**Step 1: 结构验证**

Run: `rg -n "写操作|零透传|验收" API接口文档-用户端.md`
Expected: 关键规则段存在。

**Step 2: 安全验证**

Run: `rg -n "api_key|credentials|access_key" API接口文档-用户端.md`
Expected: 无命中。

**Step 3: 响应验证**

Run: `rg -n "\"data\": \\{\\}" API接口文档-用户端.md`
Expected: 仅允许非写接口或已豁免项命中。

**Step 4: 输出审批摘要**

在核对报告末尾输出：
`总条目数 / 已导入 / 豁免 / 待决策 / 风险项`。

**Step 5: Commit（仅计划执行时）**

```bash
git add "Todo/解决-后端API开发需求：接口需求导入核对报告.md"
git commit -m "docs: finalize API requirements import verification package"
```

---

## Gates (Approval Checkpoints)

1. **Gate A（Task 1 完成后）**：确认核对矩阵字段与范围。
2. **Gate B（Task 3-4 完成后）**：确认接口改写方向与零透传策略文本。
3. **Gate C（Task 6 完成后）**：确认最终统计与豁免项。

---

## Risks and Mitigations

1. `cmd` 下正则/引号导致命令误判  
   缓解：优先使用简单关键词分步检索，复杂匹配改为多次 `rg -n -e`。
2. 写接口定义边界不一致（历史 GET 做写操作）  
   缓解：以“行为语义”而非 HTTP 方法单独标注。
3. 文档改动量大导致回归难  
   缓解：按任务分批提交，保留 Gate 审批点。

---

## Out of Scope

1. 后端接口实现改造（本计划仅导入文档与核对证据）。
2. 前端业务逻辑改造（仅记录验收要求，不执行代码修改）。
