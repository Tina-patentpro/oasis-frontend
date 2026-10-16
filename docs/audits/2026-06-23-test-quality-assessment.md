# 绿洲慧写 3.0 测试质量评估报告

- **评估日期**：2026-06-23
- **评估对象**：217 个测试文件（1209 passed / 1 failed / 1210 total）
- **评估方法**：跑全量覆盖率 + lcov 精确解析 + 断言密度统计 + 关键路径抽样精读 + 失败测试根因定位
- **产出形式**：仅报告，不改动任何代码

---

## 0. 总体结论（先说结论）

**测试套件整体质量良好，覆盖广度达标、关键路径断言扎实、几乎无"凑数"反模式。但存在三类明确短板：一个失败测试长期未修、一批零覆盖热点文件、覆盖率阈值设得过低留出退化空间。**

| 维度 | 评价 | 证据 |
|---|---|---|
| 覆盖广度 | ✅ 达标 | 行 64.3%、分支 55.7%、函数 58.6%，均超 jest 阈值 |
| 断言深度 | ✅ 扎实 | 全局 expect/it 比 2.5:1，核心 hook 高达 7-8:1 |
| 反模式 | ✅ 干净 | 0 个 skip/only/todo，mock 集中在复杂边界（合理） |
| 失败处理 | ⚠️ 有问题 | 1 个测试在报红，疑似实现加确认框后测试未同步 |
| 覆盖盲区 | ⚠️ 有热点 | 38 个文件 <30% 行覆盖，含核心 sidebar/settings 模块 |
| 阈值设置 | ⚠️ 偏低 | 阈值 48/49/56，实际 55/58/64，留出 ~10% 退化空间 |

---

## 1. 基础数据

### 1.1 测试规模
- 测试文件：217 个（src 下，含 4 个 __tests__ 目录）
- 测试用例：1209 passed / 1 failed / 1210 total
- describe 块：267 个
- test/it 块：1181 个
- expect 调用：2940 个
- **平均断言密度**：2.5 expect/test —— 健康水平（业界常见 1.5-3.0 区间）

### 1.2 全局覆盖率（基于 lcov 精确解析）

| 指标 | 覆盖 | 总数 | 实际百分比 | jest 阈值 | 余量 |
|---|---|---|---|---|---|
| 行（Lines） | 9996 | 15548 | **64.3%** | 56% | +8.3pt |
| 分支（Branches） | 5922 | 10633 | **55.7%** | 48% | +7.7pt |
| 函数（Functions） | 2142 | 3657 | **58.6%** | 49% | +9.6pt |

**说明**：阈值注释明确写着"Keep CI aligned with the current tested baseline ... raise these numbers incrementally"（让 CI 与当前基线对齐，逐步提高）。实际覆盖远超阈值是正常的，但**阈值与实际差 ~8-10 个百分点，意味着即使退化较多也不会被门禁拦下**。

### 1.3 测试分布（按目录）
- `src/modules/workspace/hooks/sidebar` — 30 个测试文件（最密集）
- `src/modules/workspace/hooks/content-sections` — 18 个
- `src/api/services` — 14 个
- `src/hooks`、`src/components` — 各 13 个
- `src/utils` — 12 个

分布与代码体量基本匹配，sidebar 是交互最复杂的模块，测试密度合理。

---

## 2. 优点（值得肯定）

### 2.1 零"逃避"反模式
- **0 个 `.skip` / `.only` / `.todo` / `xit` / `xdescribe`** —— 没有临时关闭或独占测试，套件是"全量真跑"的。

### 2.2 关键路径覆盖扎实
- **鉴权**：35 个测试文件（ProtectedRoute 集成测试、token-storage、auth-refresh、useAuthStore logout/unauthorized、LoginForm/RegisterForm/SessionExpiryBanner 等）。ProtectedRoute 集成测试精确覆盖了未登录跳转、已登录渲染、初始化中 loading、selector 一致性 4 个关键行为，断言精准。
- **支付**：6 个测试文件（billing.service、RechargeDialog、WeChatPayDialog、BalanceSettingsSection、ProfileAndRewardPage）。WeChatPayDialog 测试覆盖了无障碍语义（dialog role、aria-modal）、键盘交互（Escape 关闭）、焦点管理，不是浅测。
- **AI 生成流程**：15 个测试文件（generation-actions 的 contract/session-restore/state/request/navigation/upload-validation 等多维度）。
- **文件上传/下载**：19 个测试文件。

### 2.3 核心逻辑断言深度高
断言密度 top 测试都集中在 `useChatManagement` 系列（聊天/重新生成/发送会话上下文），达到 **7-8 expect/test**，说明核心业务逻辑测试做了多状态、多边界断言，而非"渲染不报错"式浅测。

### 2.4 失败处理方式好
全局错误处理、token 刷新、Sentry 脱敏都有专门测试。

---

## 3. 短板与风险

### T1 测试与实现不同步：AsyncTaskMenu 1 个测试在报红（R1，最优先）

- **位置**：`src/components/workspace/navigation/AsyncTaskMenu.status.test.tsx:300-304`
- **失败用例**："clear completed keeps failed records for troubleshooting"
- **现状**：`npm run test` 结果 1209 passed / **1 failed**。
- **根因**（已定位）：
  - 实现层 `AsyncTaskMenu.tsx:92-95,109-112` 中，点"清除已完成"按钮**先弹确认对话框**（`requestClearCompletedTasks` → `setIsClearConfirmOpen(true)`），需再点"确认清除"才真正调用 `clearCompletedTasks()`。
  - 这个失败测试点完"清除已完成"后**直接断言** store 已清空，**漏了确认对话框这一步**。
  - 对比同目录 `AsyncTaskMenu.test.tsx:248-253` 的正确写法：点清除 → 断言弹确认框 → 点"确认清除" → 再断言。那个测试是对的。
- **性质判断**：不是产品 bug，是**测试未随实现更新**。但后果是——**当前 `npm run test` 是红的**，如果 CI 没强失败或开发者习惯性忽略，会掩盖后续真实回归。
- **建议**：修复该测试（补确认步骤），并确认 CI 是否真的在 `npm run test` 失败时拦住合并。

### T2 38 个文件覆盖率 <30%（含核心模块，R2/R4 混合）

基于 lcov 精确解析，低覆盖文件分两类：

**一类：核心业务、应有覆盖但没有（R2，建议补）**

| 文件 | 行覆盖 | 风险说明 |
|---|---|---|
| `src/modules/workspace/hooks/useWorkspaceSidebar.ts` | 0/113 | 侧边栏核心 hook，行数最大、零测试 |
| `src/components/settings/sections/ModelPreferenceSection.tsx` | 0/117 | 设置页核心区块，零测试 |
| `src/components/workspace/left-sidebar/management/tabs.tsx` | 0/126 | 左侧栏管理 tab，零测试 |
| `src/components/workspace/left-sidebar/management/useProjectManagementState.ts` | 0/120 | 项目管理状态机，零测试 |
| `src/workers/useFileHasher.ts` | 0/92 | 文件哈希 worker hook，零测试 |
| `src/hooks/dynamic-tabs/useCategoriesData.ts` | 0/90 | 动态 tab 数据加载，零测试 |
| `src/components/settings/sections/ProfileSettingsSection.tsx` | 0/79 | 个人资料设置，零测试 |
| `src/hooks/useProjects.ts` | 0/49 | 项目列表 hook，零测试 |
| `src/hooks/useFileUpload.ts` | 0/24 | 通用上传 hook，零测试（注意：generation 上传有测试，通用 hook 没有） |
| `src/modules/workspace/WorkspaceApp.tsx` | 5/60 (8.3%) | 工作区主入口，几乎零测试 |
| `src/api/core/retry-policy.ts` | 3/35 (8.6%) | 重试策略，网络健壮性关键，几乎零测试 |
| `src/api/core/client-helpers.ts` | 26/126 (20.6%) | API client 核心（token 注入、401 处理），覆盖偏低 |

**二类：非关键或测试在别处覆盖（R4，可选）**

纯展示组件、barrel index、简单的 shared 组件（PageHeader/PlaceholderCard/StatCard）、以及被集成测试间接覆盖的 provider（AuthProvider/LayoutProvider）。这些可以不强求独立测试。

### T3 覆盖率阈值留出退化空间（R4）

- **现状**：阈值 48/49/56，实际 55/57/64。
- **风险**：即使代码质量退化 ~8 个百分点，门禁也不会报警。
- **建议**：分步把阈值提到接近当前实际值（如先提到 52/53/60），再随补测试逐步逼近实际。jest.config.ts 注释本身也鼓励"raise incrementally"。

### T4 低断言密度文件需甄别（R4，非一律视为问题）

18 个文件 expect/it 比为 1:1。**不能简单判定为浅测**——需区分：
- **合理 1:1**（纯函数、一输入一输出）：如 `chatInputAppend`、`dify-file-object`、`chatContentSanitizer`、纯 selectors。这些一个 case 一个断言完全合理。
- **值得复审**：`mermaid-blocks.test.ts`（11 tests/11 expects）、`generation-navigation.test.ts`（6/6）等——它们测的是渲染产物，需确认是否每个用例都验证了关键内容，而非只验证"渲染出了某个元素"。

---

## 4. 建议处理优先级

| 优先级 | 编号 | 一句话 |
|---|---|---|
| **P0（立即）** | T1 | 修复 AsyncTaskMenu 失败测试（补确认对话框步骤），确认 CI 对 `npm run test` 失败强失败 |
| **P1（近期）** | T2-一类 | 给 12 个核心零覆盖文件补测试，优先 useWorkspaceSidebar、retry-policy、client-helpers、WorkspaceApp |
| **P2（排期）** | T3 | 把 jest 覆盖率阈值从 48/49/56 提到 52/53/60，收紧退化保护 |
| **P3（有空）** | T2-二类 | 非关键零覆盖文件，按需补 |
| **P3（有空）** | T4 | 复审低断言密度文件，区分"合理浅测"与"应加深" |

---

## 5. 评估方法说明（含这次踩的坑）

- **断言密度用正则统计**：首次用 grep 统计 it/test 数量时，bash 历史扩展把 `as any`、`!.` 当成命令执行报错，改用 Grep 工具解决。expect/it 比用 python 按文件聚合更准。
- **覆盖率用 lcov 精确解析**：jest 的 text 输出在 OneDrive 慢盘下被日志截断，只拿到尾部。改用完整的 `coverage/lcov.info` + python 解析，得到精确的全局数字和 38 个低覆盖文件清单。
- **失败测试根因用源码验证**：没有只看测试报错就下结论，而是读了 store 的 `clearCompletedTasks` 实现（逻辑正确）+ 组件按钮绑定（发现确认对话框）+ 同目录正确测试的对照，才确认是"测试漏步骤"而非"产品 bug"。这条结论可靠。
- **低断言密度不等于浅测**：没有把 18 个 1:1 文件一律标为问题，而是区分纯函数（合理）和渲染测试（需复审），避免误判。

---

## 附：与上一份审计报告（2026-06-23-frontend-audit.md）的衔接

本次评估补充了上一份报告第 6 节"范围外后续建议"中提到的第一项："未对 217 个测试的质量做评估"。结论：上一份报告 R4-1（14 个 service 缺独立测试）成立，本次进一步发现 useWorkspaceSidebar/retry-policy/WorkspaceApp 等核心文件也是零覆盖，建议优先级高于 service 测试补全。
