# 绿洲慧写 3.0 前端全面审计报告

- **审计日期**：2026-06-23
- **审计范围**：四个维度 —— 代码质量与健壮性、安全、性能与体积、架构与可维护性
- **审计方式**：superpowers brainstorming 流程 + 授权 subagent 并行取证 + 主代理交叉验证
- **审计对象**：664 个 TS/TSX 文件（src 下 components 241、modules 181、api 63、hooks 59、utils 39、types 22、stores 9）
- **产出形式**：仅报告，不改动任何业务代码

---

## 0. 总体结论（先说结论）

**这是一个工程质量明显高于平均水平的项目。** 静态检查全绿（type-check / lint / knip / npm audit 均 0 问题），代码规范度高（全项目非空断言仅 1 处，业务代码几乎零 `any`，定时器全部带清理，0 个 TODO/FIXME），utils 零反向依赖。

**真正值得处理的问题集中在三处**：
1. 凭证存储偏弱（token 明文存 localStorage + 手机号明文落盘）—— R2，需评估是否升级 httpOnly Cookie
2. bundle 余量极小（diagram-parser-vendor 距 600 KiB 阈值仅剩 3.4 KiB）—— R3，mermaid 一升级就触发 gate
3. 上传链路客户端大小校验不一致（通用 FileUpload 有，generation 上传没有）—— R2，需服务端兜底

下面按风险等级（R1 最重 → R4 最轻）展开。术语对照：R1=功能直接出错，R2=共享组件/接口契约/安全风险，R3=样式/体积回归，R4=约定不一致的隐患。

---

## 1. 基线检查结果（既有问题）

| 检查项 | 命令 | 结果 |
|---|---|---|
| TypeScript 类型 | `npm run type-check` | **0 错误** |
| ESLint | `npm run lint` | **0 错误** |
| 无用依赖 | `npm run deps:check`（knip） | **0 项** |
| 生产依赖漏洞 | `npm run audit:prod` | **0 漏洞** |
| 重新构建 | `npm run build` | 成功（16.8s，KaTeX strip 正常删除 40 个 ttf/woff） |
| 体积门禁 | `npm run build:size-check` | **通过**，最大 diagram-parser-vendor 596.60 KiB（阈值 600） |

**说明**：基线工具检测不到的问题，才是本次审计的重点（运行时健壮性、安全配置、性能、架构）。

---

## 2. 风险清单（按等级排序）

### R2 级（应处理）

#### R2-1 凭证存储偏弱，叠加 XSS 即可全量窃取
- **位置**：`src/api/core/token-storage.ts:96-106`、`src/stores/useAuthStore.ts:103,128`
- **现象**：
  - access token 明文存入 `localStorage`（key `auth_access_token_v1`），TTL 30 天（`SESSION_TTL_MS`）。
  - binding 仅用 `language|userAgent`（`token-storage.ts:22-29`），不是设备指纹，浏览器 UA 可伪造。
  - 用户对象（含手机号 PII）通过 `safeSetLocalStorageJson('user', fetchedUser)` 明文落盘。
- **风险**：localStorage 对任意 XSS 完全可读，一旦存在 XSS 漏洞，token + 手机号可被一次性窃取，30 天 TTL 放大危害。
- **建议**：
  1. 短期：把手机号落盘前脱敏（只存中间四位掩码），或改 sessionStorage。
  2. 中期：access token 迁移到 httpOnly Cookie（需后端配合），或至少加更可识别的设备指纹绑定。
  3. 收紧 token TTL（如缩短到 1 天 + refresh）。
- **前提**：需确认后端是否支持 httpOnly Cookie / refresh token 机制，属跨端改动。

#### R2-2 generation 上传链路缺少客户端文件大小校验
- **位置**：`src/modules/workspace/hooks/content-sections/generation-upload-validation.ts:44-56`
- **现象**：`isSupportedUploadFile` 只比对扩展名白名单和 MIME 白名单，**不校验 `file.size`**。
- **对比**：通用上传组件 `src/components/ui/file-upload/validation.ts:65` 的 `buildValidationResult` **有** maxSize 校验。两套校验逻辑不一致。
- **风险**：客户端可绕过类型/MIME 白名单（MIME 浏览器可伪造），且无大小上限存在超大文件 DoS 风险。
- **建议**：
  1. 给 `isSupportedUploadFile` 增加大小参数，复用通用校验的 maxSize 模式。
  2. **关键是服务端必须兜底**（客户端校验只是体验层，不能作为安全边界）。
- **前提**：需确认服务端 generation 上传接口是否已有类型/大小校验。

#### R2-3 CSP 以 meta 形式下发，connect-src 过宽
- **位置**：`src/config/security.ts:11-15`、`vite.config.ts:33-45`
- **现象**：
  - 生产 CSP 经 `inject-csp-meta` 插入 `<meta>` 标签下发。meta CSP 无法生效 `frame-ancestors`、无法用 nonce，防护弱于 HTTP 头。
  - `connect-src 'self' https: http://127.0.0.1:* ...` —— `https:` 全域开放，数据外联面较大。
  - `style-src 'unsafe-inline'`（Tailwind 等 inline style 需要，可接受）。
- **优点**：`script-src 'self'`，无 unsafe-inline/eval，核心防护到位。
- **建议**：
  1. 优先级高：在生产部署层（nginx/CDN）改用 HTTP `Content-Security-Policy` 响应头下发，而非 meta。
  2. 把 `connect-src` 收窄到实际需要的域名白名单（后端 API 域、Sentry、aliyun 等），去掉 `https:`。
- **前提**：需运维侧配合改响应头，属部署配置改动。

### R3 级（应优化）

#### R3-1 bundle 体积余量极小，mermaid 升级即触发门禁
- **位置**：`scripts/build/check-bundle-size.mjs:9`（阈值 `maxDiagramKib:600`），实测 `dist/assets/diagram-parser-vendor-xNeKdyA8.js` = **596.60 KiB**
- **现象**：最大 chunk 距阈值仅剩 ~3.4 KiB。该 chunk 是 mermaid 的 langium/chevrotain 解析器栈，mermaid 任何小版本升级都可能超阈值导致 `build:verify` 失败。
- **建议**：把 `diagram-parser-vendor` 再拆一层 chunk（langium 与 chevrotain 分离），或上调阈值并补充说明。
- **注意**：子代理曾误报"已超阈值"，经主代理重跑 size-check 确认实际通过（单位 KiB vs kB 差异）。**余量小但未破**。

#### R3-2 framer-motion 全量 motion 进入 ui-vendor，未做树摇优化
- **位置**：全站 11 处 `import { motion } from 'framer-motion'`（如 `NotificationCenter.tsx:1`、`AccessibleDialog.tsx:1`、`AsyncTaskMenu.tsx:12`）
- **现象**：`ui-vendor` chunk 118 KiB（gzip 39 KiB），用的是全量 `motion`，未用 `LazyMotion` + `m.*`。
- **建议**：迁移到 `LazyMotion` + `m.div`，可省约 40 KiB。改动面广，建议单独排期。

#### R3-3 左侧栏会话/项目列表未虚拟化
- **位置**：`src/components/workspace/left-sidebar/management/tabs.tsx:57`、`ProjectCard.tsx:385`
- **现象**：`sessions.map(...)`、`sessionsForProject.map(...)` 全量渲染。虽有分页加载，但单项目下会话数多时仍全量渲染。
- **对比**：消息列表已正确用 react-virtuoso（`ChatConversationPane.tsx:223`）。
- **建议**：会话列表可按虚拟化阈值（如 >50 项）切换到 react-virtuoso。

### R4 级（可选优化）

#### R4-1 14 个 service 缺少独立的 service 级测试
- **位置**：`src/api/services/`
- **现象**：15 个 service 文件，仅 `project-service-normalizers` 有专门测试，其余 14 个（ai/auth/cms/file/history/instruction/notification/project/referral/session/statistics/user 等）无 service 级单测。
- **说明**：部分逻辑可能被组件/集成测试覆盖，但 service 层（数据转换、错误映射）是契约边界，独立测试价值高。
- **建议**：优先给数据转换复杂度高的 service 补 normalizer/selector 测试（ai、session、project 已有 normalizer 文件，最该补）。

#### R4-2 三个 normalizer 各自独立，存在抽象重复机会
- **位置**：`ai-service-normalizers.ts`、`project-service-normalizers.ts`、`session-service-normalizers.ts`
- **现象**：三个文件各自实现字段映射/默认值填充/时间戳转换，模式相似。
- **建议**：抽公共 `createNormalizer` helper 或共享字段映射工具。属可选重构，不影响正确性。

#### R4-3 MermaidChart sanitize 用黑名单而非白名单
- **位置**：`src/components/ContentRenderer/MermaidChart.tsx:32-38`
- **现象**：DOMPurify 用 `FORBID_TAGS`/`FORBID_ATTR`（黑名单），仅禁 `script`/`foreignObject` + 4 个 on* 属性，其余 SVG 事件属性（`onfocus`、`onpointer*` 等）未直接禁。
- **实际风险低**：第 146 行有二次正则兜底 `UNSAFE_SVG_PATTERN`（匹配所有 `on[a-z]+=`）+ mermaid `securityLevel:'strict'` + `htmlLabels:false`，纵深防御足够。
- **建议**：长期改用 `ALLOW_TAGS` 白名单更稳。优先级低。

#### R4-4 Sentry 脱敏未覆盖身份证号、银行卡号
- **位置**：`src/monitoring/sentry-scrubbing.ts:1-7`
- **现象**：覆盖 token/password/secret/key/auth 键名 + Bearer + 邮箱 + 大陆手机号 `\b1[3-9]\d{9}\b`。未覆盖身份证（18 位）、银行卡（13-19 位）正则。
- **建议**：若业务涉及身份证/银行卡数据，补充对应正则。当前业务（写作 + 充值）主要 PII 是手机号，影响有限。

#### R4-5 WeChatPayDialog 倒计时 effect 的 setTimeout 未存 ref
- **位置**：`src/components/settings/WeChatPayDialog.tsx:110-116`
- **现象**：`countdown <= 0` 触发的 `setTimeout(() => setPaymentStatus('expired'), 0)` 未存 ref，组件在此 0ms 窗口内卸载会触发 setState on unmounted（React 18 已不报警告，但仍是小隐患）。
- **建议**：存 ref 并在 cleanup 清理。影响极小。

#### R4-6 多处最大文件偏大（疑似职责过重）
- **位置（行数）**：
  - `src/api/services/project.service.ts` — 588
  - `src/modules/workspace/hooks/content-sections/generation-actions.ts` — 560
  - `src/hooks/useChatManagement.ts` — 540
  - `src/modules/workspace/hooks/useWorkspaceSidebar.ts` — 534
  - `src/components/workspace/left-sidebar/LeftSidebar.tsx` — 523
  - `src/components/workspace/InputSection.tsx` — 516
  - `src/api/services/ai-service-normalizers.ts` — 513
- **建议**：非紧急。若后续迭代这些文件继续增长，再考虑拆分。当前单文件未超 600 行，尚在可控范围。

---

## 3. 维度小结

### 代码质量与健壮性 —— 优秀
- 非空断言 `!` 全项目仅 1 处（`cms.service.ts`），业务代码几乎零 `any`（199 处 any 全在测试 mock）。
- 63 处 setTimeout/setInterval 全部带 timerRef + cleanup 模式，规范。
- 路由懒加载、useEffect 依赖、错误处理整体规范。
- **未发现高危运行时问题**。

### 安全 —— 良好，有 3 个值得处理项
- 0 个 eval/innerHTML/document.write/开放重定向/硬编码密钥/跨窗口 postMessage 漏洞。
- 生产 `drop console` 生效，无 console 泄漏。
- 支付 window.open 有域名白名单 + noopener，规范。
- 主要短板是凭证存储（R2-1）和上传校验不一致（R2-2）。

### 性能与体积 —— 良好，bundle 策略成熟
- mermaid/syntax-highlighter 均动态 import + 按需注册，markdown/diagram 已切分独立 chunk。
- 搜索输入全部防抖（300/400ms），消息列表已虚拟化。
- 定时器/选择器使用规范，无明显泄漏。
- 主要优化点：bundle 余量小（R3-1）、framer-motion 可树摇（R3-2）、左侧栏列表可虚拟化（R3-3）。

### 架构与可维护性 —— 良好
- 目录职责边界清晰（utils 零反向依赖）。
- 命名一致（PascalCase 组件、use 开头 hook）。
- 0 个 TODO/FIXME/HACK。
- 主要改进点：service 层测试覆盖（R4-1）、normalizer 抽象（R4-2）、部分大文件（R4-6）。

---

## 4. 本次审计过程中的子代理误报（已修正）

为保证报告准确，主代理对子代理结论做了交叉验证，修正了以下误报：

| 子代理结论 | 主代理验证 | 修正后定级 |
|---|---|---|
| KaTeX strip 脚本未接入构建，dist 残留 502 KiB ttf | dist 是陈旧产物；重 build 后 strip 删除 40 个 ttf/woff，正常 | **删除该发现** |
| diagram-parser-vendor 已超 600 KiB 阈值，gate 会失败 | 重跑 size-check，596.60 KiB < 600，**通过**（单位 KiB/kB 差异） | R3-1（余量小，非已破） |
| 文件上传无大小上限 | 通用 FileUpload 有 maxSize；仅 generation 上传链路缺 | R2-2（精确到 generation 链路） |

**教训**：OneDrive 慢盘环境下子代理容易超时；基于陈旧 dist 的体积判断不可靠；主代理交叉验证不可省。

---

## 5. 建议处理优先级

| 优先级 | 编号 | 一句话 | 是否需跨端/运维配合 |
|---|---|---|---|
| **P0（尽快）** | R2-2 | generation 上传补大小校验 + 确认服务端兜底 | 需确认后端 |
| **P1（近期）** | R2-1 | 手机号落盘脱敏；评估 token 迁 httpOnly Cookie | 需后端配合 |
| **P1（近期）** | R3-1 | 拆 diagram-parser chunk 或上调阈值 | 否 |
| **P2（排期）** | R2-3 | CSP 改 HTTP 头下发，收窄 connect-src | 需运维 |
| **P2（排期）** | R3-2 | framer-motion 迁 LazyMotion | 否 |
| **P3（有空）** | R4-1 | 补 service 级测试 | 否 |
| **P3（有空）** | R3-3、R4-2~R4-6 | 列表虚拟化、normalizer 抽象等 | 否 |

---

## 附：审计方法说明

- **流程**：brainstorming → 计划确认 → 阶段1 基线（主代理跑工具 + 1 个 repo_mapper 子代理摸全貌）→ 阶段2 四维度取证 → 阶段3 主代理定级出报告。
- **子代理使用**：1 个 repo_mapper 完成；4 个维度子代理中安全/性能完成，代码质量/架构因 OneDrive 慢盘超时，改为主代理直接完成（更快更可控）。
- **未改动任何业务代码**，所有验证基于只读检查 + 一次重新 build（仅产物，不涉及源码）。
