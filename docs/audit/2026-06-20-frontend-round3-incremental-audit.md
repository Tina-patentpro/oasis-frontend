# 绿洲慧写 3.0 前端第三轮增量审计报告

- **审计日期**：2026-06-20（第三轮）
- **审计性质**：增量审计（聚焦前两轮未覆盖角度 + 纠正前轮误判）
- **审计基线**：当前工作区（与第二轮逐字节相同——18 文件 staged 改动，无新修复）
- **审计方式**：superpowers（计划 → 实施 → 反思 → 完善）+ 2 个增量聚焦子代理 + 主代理逐项核验
- **前置报告**：`docs/audit/2026-06-20-frontend-audit-report.md`（第一轮）、`docs/audit/2026-06-20-frontend-fixes-verification-report.md`（第二轮 v2）

---

## 0. 本轮定位与诚实声明

> 本轮启动前，主代理核验发现**当前工作区与第二轮完全一致**（同 18 文件、462 增 245 删），即用户本轮未做新修复。经与用户确认，意图是"审计当前状态"。
>
> 因此本轮**不重复**前两轮的全量分析（架构/质量/性能/构建/修复验证/回归），聚焦两件事：
>
> 1. **增量发现**：前两轮未深挖的角落（i18n/a11y/ErrorBoundary/内存/竞态/storage/密钥卫生）。
> 2. **纠正误判**：主代理本轮亲自核验时，发现前两轮报告有 1 处结论错误，予以修正。

**核验方法**：遵循 verification-before-completion 铁律——所有"通过/绿"结论均基于本轮主代理亲自读取的命令输出；所有子代理高风险结论（R1/R2）均经主代理独立复核。

---

## 1. 基线（本轮亲自跑、亲自读输出）

| 检查项                 | 结果                                    | 证据出处              |
| ---------------------- | --------------------------------------- | --------------------- |
| type-check             | ✅ 0 错误                               | 日志无输出            |
| lint                   | ✅ 0 error / 0 warning                  | 日志无输出            |
| 测试                   | ✅ **206 套件 / 1176 用例全过，0 失败** | 基线1 日志第 15-16 行 |
| build                  | ✅ 16.36s 成功                          | 基线2 日志第 4 行     |
| size-check             | ✅ 37 chunks，最大 596.33 KiB 通过      | 基线2 日志第 10 行    |
| audit（官方 registry） | ✅ `found 0 vulnerabilities`，exit 0    | 基线2 日志第 12 行    |

**结论**：工程基线与第二轮一致，全绿。本轮所有新发现都是"基线绿灯之下的质量/安全/UX 隐患"，不影响构建运行。

---

## 2. 前轮误判纠正（主代理本轮复核发现，诚实修正）

### ⚠️ 纠正 1：第二轮"CI audit 镜像裸跑"结论错误

- **第二轮原文**（v2 报告 §0 提醒）：声称项目默认 registry 是淘宝镜像，"CI 若直接跑会得到误导结果"。
- **本轮核验**（`package.json:34-37`）：四个 audit 脚本**全部显式带 `--registry=https://registry.npmjs.org`**：
  - `audit:full` / `audit:full:json` / `audit:prod` / `audit:prod:ci`
- **结论**：CI 脚本正确指向官方源，**第二轮的担心不成立**。仅"本地开发者直接敲 `npm audit` 会命中淘宝镜像报 NOT_IMPLEMENTED"这一点成立（属本地体验问题，非 CI 风险）。
- **修正动作**：从风险清单移除该项；本地体验问题降级为 R4 文档备注（建议在 README 注明本地跑 audit 要用 `npm run audit:prod`）。

### ⚠️ 纠正 2：第二轮"nul 文件是构建持续重生"判断不准

- **第二轮原文**：R2-NEW 建议删除 nul + .gitignore，但未说明来源。
- **W2 子代理猜测**：nul mtime 比 dist 新，"是构建工具链持续重生"。
- **本轮核验**（`node fs.readFileSync`）：nul 文件内容 = `/usr/bin/bash: line 1: type: .gitignore: not found\n`，51 字节。
- **真相**：这是**某次审计命令的 bash 报错被重定向到 `> nul` 时产生的**（bash 不认 Windows 的 `nul` 设备名，于是创建成真实文件）。**不是构建重生，是一次性命令副产物**。删一次 + 加 .gitignore 即可根治。W2 的"持续重生"判断是误读 mtime（构建后的命令操作自然更新了 mtime）。
- **修正动作**：维持"删除 + .gitignore"建议，但删除来源描述的误导。

> 这两处纠正印证了第二轮 §6.2 的方法论反思：**上一轮报告的结论也要被质疑**。本轮把这条原则用在了自己身上。

---

## 3. 增量新发现（W1 子代理 + 主代理复核，按等级排序）

### 🔴 R1 — 立即处理（1 项）

#### R1-A【可用性】10 个懒加载弹窗共用单个 `<Suspense fallback={null}>`，无局部 ErrorBoundary，chunk 加载失败整页白屏

- **位置**：`src/modules/workspace/WorkspaceApp.tsx:159-273`（单个 Suspense 包裹 SettingsPanel / ReleaseNotesDialog / HelpDocumentation / CustomerServiceDialog / HistoryDataDialog / LocalHistoryFilesDialog / QuickCreateProjectDialog / DownloadFilesDialog / AssociateProjectDialog / RewardSuggestionDialog 共 10 个 lazy 组件）；外层 `WorkspaceApp.tsx:280-282` 仅 `PageErrorBoundary`
- **主代理已核验**：grep 确认结构与子代理描述一致。
- **现象**：vite 无 ChunkLoadError 重试机制。新版本部署后，浏览器持有旧 index.html 引用的已删 chunk → `import()` 抛 ChunkLoadError → 冒泡越过 Suspense → 触发 `PageErrorBoundary` 整页错误态。且 `PageErrorBoundary.resetError()` 无法刷新已 404 的 chunk（缓存仍指旧 hash）。
- **影响**：发版窗口期（用户在用旧版）打开设置/帮助/历史/下载等任一弹窗 → 整个工作台白屏错误页，而非"弹窗打不开，请刷新"的优雅降级。频繁发版产品此问题常态性触发。
- **既有资产**：`src/components/error-boundaries/` 下已有 `ComponentErrorBoundary`、`AsyncBoundary`，但**全仓零引用（死代码）**。
- **建议**：每个 lazy 弹窗外包 `ComponentErrorBoundary`（启用既有死代码）；或给该 Suspense 配带"加载失败，点击刷新"按钮 + `window.location.reload()` 的错误态。最小改动：先给这 10 个 lazy 组件包一层薄边界 + reload 兜底。

### 🟠 R2 — 本迭代处理（4 项）

#### R2-A【卫生】`.env.production` / `.env.development` 被误入版本库（.gitignore 失效），含生产域名与短信配置

- **位置**：`.env.production`、`.env.development`（`git ls-files` 确认均在版本库）；`.gitignore:60-63` 规则因文件已 `git add` 而失效
- **主代理已核验**：`.env.production:25-26` 确含 `AL_SIGN_NAME=绿洲慧业` / `AL_TEMPLATE_CODE=SMS_324425418`；`:5` 含 `VITE_API_BASE_URL=https://lzhxpy.oasisintwrite.com/api`。
- **定级说明**：W1 子代理初判 R1。**主代理复核后降为 R2**——泄露的是短信**模板编码**与签名名，**不是 access key**（滥用门槛较高，需配合阿里云账号权限），紧急度低于密钥泄露，但仍是应治理的卫生问题。
- **影响**：生产域名、短信模板编码暴露在仓库历史；养成"环境配置进仓库"习惯，未来真密钥易被静默提交。注：`.env.local`（含 EMAILJS key）已确认**未追踪**，该项无问题。
- **建议**：`git rm --cached .env.production .env.development`（保留本地），确认 .gitignore 生效；生产域名/短信配置改走 CI 注入。已泄露的评估是否轮换短信模板。
- **代码侧干净**：`src/**` grep 硬编码实域名**零命中**（真实域名全走 `import.meta.env`），仅 `AuthPolicyNotice.tsx:5` 的隐私政策链接合理硬编码。

#### R2-B【可用性】错误提示文案三套体系并存，措辞冲突

- **位置**：体系A `src/api/errorMapping.ts:21-26`（默认"操作失败/请稍后重试或联系管理员。"）、体系B `src/utils/errorHandler.ts:17,28`（"请求失败，请稍后重试"/"发生未知错误"）、体系C 散落 ~20 文件
- **现象**：同一"失败重试"语义写成 4 种措辞："请稍后重试"（多数）、"请稍后再试"（SERVER_ERROR、useSmsCode）、"请重试"（useInstructionLibrary）、"请稍后重试。"（带句号，HistoryDataDialog/RewardSuggestionDialog）。同一发送验证码场景 useSmsCode 用"再试"其余用"重试"。
- **影响**：UI 文案不统一降低专业感；三套错误路径让人难判断该用哪个，维护易再分叉。
- **建议**：选定单一文案常量表（以 `errorMapping.ts` 为基），收敛所有 notify/setError 走常量；先统一句末标点。最小改动。

#### R2-C【可用性】`text-gray-400`（#9ca3af）大量用于功能性正文，对比度不达 WCAG AA

- **位置**：`ChatMessageItem.tsx:141,215`（10px 时间戳）、`EmptyChatState.tsx:65`（11px 空状态说明）、`InstructionLibraryPanel.tsx:305,324`（加载/空状态）、`ProjectCard.tsx:322,371,405,431`（会话/子项目状态）、`DownloadFilesDialog.tsx:737,806`、`SettingsPanel.tsx:323,327`、`AsyncTaskMenu.tsx:163` 等
- **现象**：`text-gray-400`=#9ca3af 在白底约 2.85:1，**正文需 ≥4.5:1（WCAG AA 1.4.3）**，小字连大字 3:1 都不满足。
- **影响**：低视力/强光/老年用户难读时间戳/状态/空状态。
- **建议**：功能性文字改 `text-gray-500`（#6b7280，约 4.6:1）或 `text-gray-600`；装饰/placeholder 可保留。最小改动。

#### R2-D【紧迫性上升】全局缺失 `unhandledrejection` 兜底，叠加本轮 staged 新增异步解析路径

- **位置**：`src/main.tsx`（无 window.onerror/unhandledrejection）；本轮 staged 改动 `session.service.ts` 新增 `extractConversationIdFromResponse`（JSON.parse + 多层 unknown 解构）、`oasis-actions.ts` 新增多段类型守卫
- **现象**：全仓仍无全局异步错误兜底（唯一的是 `useFileHasher.ts:108` 的 worker.onerror，作用域隔离）。本轮 staged 代码在 Promise 链中处理不可信后端响应，守卫一旦遗漏，失败静默丢失。
- **影响**：相较前两轮，R2-5 的紧迫性**实质性上升**——新增的深度解析路径扩大了"无兜底"的危害面。
- **建议**：在 `initMonitoring` 注册 `window.addEventListener('unhandledrejection', ...)`，统一调 reportError。

### 🟡 R3 — 排期（2 项）

#### R3-E【健壮性】`localStorage.setItem` 未捕获 QuotaExceededError

- **位置**：`src/api/core/token-storage.ts:96-102`（`writePersistedToken` 无 try/catch）；`src/modules/workspace/hooks/sidebar/session-click.ts:47-49`（`isSessionClickDebugEnabled` 读 debug flag 无 try/catch）
- **现象**：隐私模式/禁用 storage/配额满时 setItem 抛 `QuotaExceededError`/`SecurityError`；getItem 极端禁用抛 `SecurityError`。
- **影响**：token 写入抛错可能中断登录流程（虽有内存兜底 cacheMemoryToken，但 writePersistedToken 抛在它之后）。对比：同文件 `readPersistedToken:83-94` 已规范包 try/catch，唯独写路径没包，不一致。
- **建议**：`writePersistedToken` 包 try/catch 吞掉异常（降级用内存 token）；`isSessionClickDebugEnabled` 加 try/catch 返回 false。低风险最小改动。

#### R3-F【文档失效，紧迫化】3 份文档引用已删 useContentStore 路径，已到"误导"门槛

- **位置**：`docs/technical/STATE-MANAGEMENT-IMPLEMENTATION.md:160`（`from '@/stores'`）、`docs/archives/STATE-MANAGEMENT-MIGRATION-STATUS.md:119`（`from './stores'`）、`docs/technical/CODE-REVIEW-AND-IMPROVEMENTS-2025-10-07.md`
- **现象**：文档示例写从根 `@/stores` 导入 useContentStore，但根 store 已删（第一轮 R1-1），实际路径是 `src/modules/workspace/stores`。代码里实际用 `from '../../stores'`（session-click.ts:9）、`from '../stores'`（useWorkspaceChatPanel.ts:11）。
- **影响**：照文档抄会得到 TS2307 找不到模块。已存在多轮未修，"人因风险"累积。
- **建议**：更新示例路径或标注"已过时"。低风险。

### 🟢 R4 — 跟进（1 项）

#### R4-G【可维护性】无 i18n 框架，全量中文硬编码

- **现象**：`src/i18n/` 不存在；中文文案直接写 JSX/字符串。
- **影响**：当前中文单语产品无即时问题；未来出海迁移成本随文案增长线性放大。
- **建议**：确认产品语言边界。若长期仅中文，记录架构说明即可；若有出海计划，尽早引入 react-i18next 并先抽 errorMapping 文案做样板。

---

## 4. 增量"未发现新问题"的角度（W1 核实的强项）

为完整起见，本轮专门深挖但**确认健康**的角度：

| 角度                      | 结论        | 证据                                                                                                                                  |
| ------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| 内存泄漏                  | ✅ 未发现   | AsyncTaskDaemon/BackgroundTaskPoller/useAsyncTaskPolling/useSmsCode 的 timer 全有 cleanup；无 ResizeObserver 等需 disconnect 的未清理 |
| sendChat 竞态             | ✅ 防护充分 | `use-chat-request-state.ts:33-60` 有请求版本号 + abortController 双保险；session-click isSessionOutputRestoring 叠加                  |
| label/aria-label/焦点管理 | ✅ 质量高   | ~15 处表单 htmlFor 正确关联；~100 处 aria-label；LeftSidebar/InstructionLibraryPanel 键盘导航完整                                     |
| 硬编码 URL/密钥（代码侧） | ✅ 干净     | src/\*\* 硬编码实域名零命中，全走 import.meta.env（仅 env 文件本身有问题，见 R2-A）                                                   |

---

## 5. 本轮新发现的优先级建议（短期/中期）

### 短期（建议尽快，R1 + 高紧迫 R2）

1. **R1-A**（ErrorBoundary 覆盖）：给 10 个 lazy 弹窗包局部 ErrorBoundary + reload 兜底。**这是本轮最值得立即处理的项**——发版窗口期的白屏是高频用户可见问题。
2. **R2-A**（.env 误入库）：`git rm --cached` + 确认 .gitignore 生效。5 分钟的事。
3. **nul 垃圾文件**：`del \\?\...nul` 删除 + .gitignore 加 nul 条目。

### 中期（R2 文案/对比度/错误兜底）

4. **R2-D**（全局错误兜底）：注册 unhandledrejection，配合本轮 staged 的新解析路径尤为重要。
5. **R2-C**（对比度）：功能性文字 text-gray-400 → text-gray-500。
6. **R2-B**（文案统一）：收敛到单一常量表。
7. **R3-E / R3-F**（storage 健壮性 + 文档）。

### 长期

8. **R4-G**（i18n）：取决于出海计划。

---

## 6. 子代理分工与主代理复核率

| 子代理        | 范围                                           | 新发现                                   | 主代理复核                                 |
| ------------- | ---------------------------------------------- | ---------------------------------------- | ------------------------------------------ |
| W1 遗漏项深挖 | i18n/a11y/ErrorBoundary/内存/竞态/storage/密钥 | 6 项（2R1→复核后1R1+1R2, 2R2, 1R3, 1R4） | .env/ErrorBoundary/对比度/storage 均已核验 |
| W2 遗留项恶化 | 8 项遗留项现状                                 | 2 项纠正（CI 误判属实、nul 重生误判）    | CI 脚本/nul 内容/.env 均已核验             |

**主代理复核率**：本轮所有 R1/R2 新发现（5 项）+ 2 项前轮纠正，**全部经主代理独立证据复核**。其中 1 项子代理定级被调整（.env R1→R2）、1 项子代理猜测被推翻（nul 重生）、1 项前轮结论被推翻（CI 镜像）。

---

_本报告为只读审计产物，未修改任何源代码。本轮与前两轮报告构成完整审计链：第一轮全量摸底、第二轮修复验证+深度反思、第三轮增量深挖+误判纠正。_
