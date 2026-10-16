# API 契约复核报告（2026-04-18）

## 1. 复核范围

- 业务说明基线：`D:\OneDrive\4、董娣相关\绿洲慧写3.0\绿洲前端\API接口文档-用户端.md`
- 仓库契约基线：`D:\OneDrive\4、董娣相关\绿洲慧写3.0\绿洲前端\docs\api\`
- 前端真实调用基线：`D:\OneDrive\4、董娣相关\绿洲慧写3.0\绿洲前端\src\api\services\`

## 2. 一句话结论

当前不是“某几个接口写错了”，而是**同一套前端正在同时依赖三种接口口径**：

1. 面向业务/联调的用户端 Markdown 文档
2. 面向规范化交付的 OpenAPI YAML
3. 面向真实运行的前端 service 实现

它们之间有一部分只是 `/api` 网关前缀差异，但更大的问题是：**资源模型、方法语义、返回结构和是否已下线的旧接口并没有真正统一。**

## 3. 快速盘点

- `API接口文档-用户端.md` 可解析到 **47** 个接口条目
- `docs/api/complete-api-inventory.json` 记录的 OpenAPI 操作数是 **83**
- `npm run report:code-metrics` 显示前端当前有 **45** 个 `apiClient` 端点（GET 28 / POST 16 / DELETE 1）
- `npm run api:validate` **只验证 `docs/api/*.yaml`**，不能发现：
  - Markdown 文档与前端不一致
  - 前端使用了 YAML 里不存在的旧接口
  - service 返回类型与 `response-parser` 真实行为不一致

## 4. 判定标准

- **文档正确、前端正确**：业务 Markdown 与前端调用一致；OpenAPI 若只差 `/api` 代理前缀，可视为低风险
- **文档正确、前端有偏差**：业务 Markdown 写得清楚，但前端自己又补了别的调用或别的返回假设
- **前端能跑，但文档已过时**：前端已经依赖真实接口，但业务 Markdown 没更新
- **文档、前端、仓库契约三方不一致**：这类问题优先级最高

## 5. 差异矩阵

| ID           | 模块                     | 业务文档路径（方法）                                                                                                                                                                                     | 仓库契约                                                                                                                                                                          | 前端真实调用                                                                                                                                                   | 参数 / 响应差异                                                                                                                                               | 认证要求 | 风险等级 | 结论分类                       | 建议以谁为准                                                             |
| ------------ | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | -------- | ------------------------------ | ------------------------------------------------------------------------ |
| AUTH-001     | 登录                     | `POST /auth/login`（`API接口文档-用户端.md:221`）                                                                                                                                                        | `POST /api/auth/login`（`docs/api/users-auth.yaml:179`）                                                                                                                          | `POST /auth/login`（`src/api/services/auth.service.ts:97`）                                                                                                    | 目前主要是网关前缀差异，业务文档与前端一致                                                                                                                    | 无需登录 | 低       | 文档正确、前端正确             | 业务文档 + OpenAPI 合并时统一写清“网关前缀是否由前端代理补齐”            |
| PROJECT-001  | 项目列表                 | `GET /user/user/folderlist`（`API接口文档-用户端.md:1168`）                                                                                                                                              | 既有 `GET /api/user/user/folderlist`（`docs/api/projects-legacy-folderlist.yaml:24`），也有全新资源式 `/api/projects`（`docs/api/projects.yaml:26`）                              | `['/user/user/folderlist', '/user/folderlist']`（`src/api/services/project.service.ts:33`）                                                                    | 仓库同时维护“legacy folder”和“resource projects”两套模型                                                                                                      | 需登录   | 高       | 文档、前端、仓库契约三方不一致 | 先定项目域到底沿用 `folder*` 还是全面切到 `/projects`                    |
| SESSION-001  | 会话删除                 | `GET /user/user/workflowdelete/{id}`（`API接口文档-用户端.md:1059`）                                                                                                                                     | 资源式会话/项目模型见 `docs/api/conversations.yaml:26`、`docs/api/projects.yaml:276`                                                                                              | 先 `DELETE /projects/{id}`，失败再 `GET /user/user/workflowdelete/{id}`（`src/api/services/session.service.ts:529-546`，`src/api/core/session-routes.ts:7-8`） | 同一删除动作有双路径；方法语义也不统一                                                                                                                        | 需登录   | 高       | 文档、前端、仓库契约三方不一致 | 以后端最终落地路径为准，尽快废弃 GET 删除                                |
| INSTR-001    | 指令库列表/创建          | `GET /apicategories/instructionlist`、`POST /apicategories/instructioncreate`（`API接口文档-用户端.md:1917`、`1954`）                                                                                    | `GET /api/instructions`、`/api/instructions/{instructionId}`、`/api/chatflows/{chatflowId}/instructions`（`docs/api/instructions.yaml:30`、`121`；`docs/api/chatflows.yaml:320`） | 仍走 `/apicategories/*` 旧路径（`src/components/chat/hooks/useInstructionLibrary.ts:286`、`420`）                                                              | 业务文档与前端一致，但与 OpenAPI 指令模型完全不是一套                                                                                                         | 需登录   | 高       | 文档、前端、仓库契约三方不一致 | 先决定指令库是否属于“全局 instructions”还是“chatflow 子资源”             |
| INSTR-002    | 指令库删除               | 业务 Markdown **未登记**                                                                                                                                                                                 | OpenAPI 侧可由 `/api/instructions/{instructionId}` 推导删除模型（`docs/api/instructions.yaml:121`）                                                                               | `POST /apicategories/instructiondelete`（`src/api/services/instruction.service.ts:121-122`）                                                                   | 前端真实在用，但业务文档没有；方法也和 OpenAPI 思路不同                                                                                                       | 需登录   | 高       | 前端能跑，但文档已过时         | 先补文档，再决定是否迁移到统一 `/api/instructions/{id}`                  |
| CMS-001      | 模型配置详情             | `POST /apicategories/apidetail`（`API接口文档-用户端.md:1644`）且要求“零透传第三方密钥”（`API接口文档-用户端.md:126`）                                                                                   | OpenAPI 未看到同名资源式定义                                                                                                                                                      | `POST /apicategories/apidetail`（`src/api/services/cms.service.ts:425`）                                                                                       | 路径表面一致，但前端类型 `ApiDetail` 仍声明 `api_key` / `credentials`（`src/types/api/ai-categories.ts:56-63`）                                               | 需登录   | 高       | 文档正确、前端有偏差           | 业务文档为准，先把敏感字段从前端类型里删掉                               |
| BILL-001     | 充值单创建 / 列表 / 查询 | `GET /recharge/list`（`608`）、`POST /recharge/createorder`（`677`）、`GET /recharge/orderquery`（`715`）                                                                                                | 资源式计费模型：`/api/billing/summary`、`/api/billing/top-ups`、`/api/billing/top-ups/{orderId}`（`docs/api/billing.yaml:26`、`126`、`160`）                                      | `/recharge/list`、`/recharge/createorder`、`/recharge/orderquery?order_no=...`（`src/api/services/billing.service.ts:20`、`37`、`54-56`）                      | 业务文档与前端仍是旧充值域；OpenAPI 已抽象成 billing 资源；返回值在页面层还要兼容“数字 vs result.data”（`src/components/settings/WeChatPayDialog.tsx:32-36`） | 需登录   | 高       | 文档、前端、仓库契约三方不一致 | 以真实计费域规划为准，先统一订单查询返回结构                             |
| NOTIFY-001   | 消息中心                 | `GET /user/usermessagelist`、`GET /user/userhasread/{id}`、`GET /user/userhasreadall`、`GET /user/userhasdel/{id}`、`GET /user/userhasdelall`（`API接口文档-用户端.md:410`、`445`、`473`、`495`、`523`） | OpenAPI 未见同组资源式通知契约                                                                                                                                                    | 前端完全按旧接口调用（`src/api/services/notification.service.ts:217-239`）                                                                                     | 文档与前端一致，但写操作全部走 GET；service 返回类型仍写成 `{ code, message, data }`，而运行时会被 `response-parser` 拆开                                     | 需登录   | 中       | 文档正确、前端有偏差           | 短期先统一返回类型，长期改方法语义                                       |
| FEEDBACK-001 | 用户建议                 | `POST /usersuggestion/create`（`API接口文档-用户端.md:2004`）                                                                                                                                            | `POST /api/feedback/suggestions`（`docs/api/support-feedback.yaml:240`）                                                                                                          | `POST /usersuggestion/create`（`src/api/services/user.service.ts:115`）                                                                                        | 旧“建议”接口和新 feedback 资源并存                                                                                                                            | 需登录   | 中       | 文档、前端、仓库契约三方不一致 | 产品域若继续演进，建议收敛到 feedback 资源模型                           |
| DATA-001     | 数据导出 / 清空          | `GET /user/user/data/export`（`API接口文档-用户端.md:2078`）、`POST /user/user/data/clear`（`2099`）                                                                                                     | `docs/api/data-deletion.yaml:28-365` 已是“删除请求 / 批准 / 执行 / 恢复 / 审计”整套治理模型                                                                                       | 前端仍直接调用旧接口（`src/api/services/user.service.ts:184`、`194`、`211`、`214`）                                                                            | 业务文档与前端一致，但和 OpenAPI 的治理化模型完全不在一层                                                                                                     | 需登录   | 高       | 文档、前端、仓库契约三方不一致 | 若后端已转向治理模型，前端需补审批/审计状态；若没转，则 OpenAPI 过度超前 |

## 6. 关键专项问题

### 6.1 `response-parser` 已拆 `data`，但多个 service 仍按“响应包裹体”写类型

- 解析逻辑：`src/api/core/response-parser.ts:67-88`
- 典型问题：
  - `src/api/services/notification.service.ts:217-239`
  - `src/api/services/billing.service.ts:54-56`
  - `src/components/settings/WeChatPayDialog.tsx:32-36`
- 风险：
  - 组件层不得不猜“result 到底是最终值，还是还包着一层 data”
  - 新人维护时最容易被这种“看类型像 A，运行时像 B”的情况误导

### 6.2 业务 Markdown 不适合继续兼任“严格机器契约”

- 统一规则写得很清楚：`API接口文档-用户端.md:94-100`
- 但同文档又保留了大量兼容历史：
  - `msg` / `message` 混用：`89`、`706`、`788`
  - 历史拼写：`386`、`1137`、`1862`
  - `file_url` 形态漂移：`926`、`1843`、`1854`
- 建议：
  - 继续保留 Markdown 做“业务说明文档”
  - 机器契约统一迁到 OpenAPI，并生成前端类型和校验

## 7. 建议的收敛顺序

1. **先选唯一基线**
   - 如果真实后端已转向 OpenAPI 资源模型，就让前端逐域迁移
   - 如果真实线上仍以旧路径为主，就不要让 OpenAPI 继续写成另一套世界
2. **再清理最危险的“半迁移状态”**
   - 会话删除双路径
   - 指令库删除未文档化
   - 充值订单查询返回结构不稳
   - `ApiDetail` 敏感字段类型残留
3. **最后把校验接进 CI**
   - `docs/api/*.yaml`
   - `API接口文档-用户端.md`
   - `src/api/services/*.ts`
   - 三者至少做路径、方法、返回形态的自动比对

## 8. 本轮未验证项

- 没有测试账号，因此还没抓到登录后的真实网络请求
- 所以本报告能证明“代码与文档存在漂移”，但**不能替代一轮测试环境下的真实抓包验收**
