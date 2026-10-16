# 绿洲慧写 3.0 前端提交前全面审计（2026-07-10）

## task understanding（任务理解）

本次目标是审计当前分支中全部待提交内容，修复前端仓库内可以安全落地的问题，完成代码、API 契约、安全、性能、界面和浏览器回归，再将安全文件统一提交到本地 Git。审计从真实工作区差异开始，不把旧报告或旧构建结果当成当前证据。

## assumptions（假设）

- 当前分支 `codex/upload-performance-governance` 中原有的 71 个跟踪文件改动和 11 个安全未跟踪文件均属于本次待提交范围；不回滚这些既有改动。
- `test-results/.last-run.json` 是测试生成状态，不纳入提交；`performance/*/browser-profile/` 含 Chrome 登录与会话缓存，已加入 `.gitignore`，不得提交。
- 本仓库只能证明前端代码、文档、自动化测试、本地预览和线上只读响应头；后端真实接口、支付平台、任务系统与生产部署结果必须单独联调。
- 工作区以桌面端为主要产品形态；本次只修复明确的小屏与可访问性缺陷，不在一次提交中重设计移动端导航。

## files affected（影响文件）

主要影响范围如下，完整清单以本提交为准：

- API 与网络：`src/api/`、`vite.config.ts`、`docs/api/`、`scripts/api/`
- 工作区与异步任务：`src/modules/workspace/`、`src/components/workspace/`
- 上传与内容显示：`src/constants/uploadLimits.ts`、`src/components/chat/`、`src/components/ContentRenderer/`
- 支付、设置和通知：`src/components/settings/`、`src/app/providers/`、`src/components/NotificationCenter.tsx`
- 动画、可访问性与界面规范：`src/components/ui/motion.tsx` 及相关界面组件
- 安全与错误处理：`src/monitoring/`、`src/utils/errorHandler.ts`、`.gitignore`
- 自动化测试、审计报告和本地预览脚本

## implementation summary（实现摘要）

### 已修复的高优先级问题

1. **删除回退过宽**：会话删除只有在新接口明确返回 404/405 时才调用旧接口；鉴权、服务器错误和网络错误直接上抛。
2. **项目创建失败丢输入**：父层失败会返回错误，弹窗不关闭，用户输入保留，可原地重试。
3. **支付状态误判**：“我已完成支付”改为向后端核验，不再直接显示成功；所有轮询和延时任务在关闭时清理，重新打开使用全新订单状态。
4. **异步任务错误归档**：匹配窗口收紧为 30 秒，优先精确匹配 `api_name`、工具类型和标题，避免把旧会话误当成本次结果。
5. **Sentry 脱敏盲区**：请求正文、标签、上下文和用户对象统一脱敏，避免错误上报携带密码、令牌或密钥。
6. **前端密钥契约**：移除 `ApiDetail` 中的 `api_key` 和 `credentials`，并用源码安全测试防止回归。
7. **API 漂移盲区**：扫描器现在包含真实请求 helper（辅助文件），支持声明备用端点和路径参数；7 条项目旧兼容路径已明确写入契约文件。

### 稳定性、性能和界面改进

1. 统一上传上限为 10MB，并让聊天、生成区和文件组件共享同一常量。
2. 长会话列表增加虚拟列表（只渲染可见行），并用会话 ID 保持行身份稳定。
3. `framer-motion` 改为共享 `LazyMotion`，遵守用户“减少动态效果”设置；当前 `ui-vendor` 从旧审计约 115 KiB 降到约 76 KiB。
4. `JSZip` 已在构建中形成独立延迟加载分块，不再作为首屏阻断问题。
5. 工作区、右侧对话面板和项目选择弹窗增加可见加载提示，慢网不再表现为空白。
6. 项目卡片取消不可聚焦的整卡点击，只保留有明确语义的按钮；虚拟列表、弹窗、加载状态和关键图片补齐可访问性。
7. 清理生产代码中的 `transition-all`、中文三点号 `...`、无尺寸图片和空 `Suspense`，并新增持续规则测试。规则依据为最新 [Vercel Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md)。
8. API 地址解析、预览代理和网络错误提示统一，生产预览中 `/api` 保持同源，不再意外请求远程地址。

### 安全治理

- Chrome 浏览器资料目录被永久忽略，避免 Cookies、Login Data 和会话缓存进入 Git。
- SVG、HTML、XML 等可执行上传内容的服务端下载、`nosniff` 和隔离预览要求已写入安全策略。
- 线上入口只读检查返回 200，并包含 CSP（内容安全策略）、HSTS、`X-Content-Type-Options: nosniff`、`X-Frame-Options` 和严格来源策略。该证据只说明 2026-07-10 的线上响应头，不代表本提交已部署。

## validation run（验证执行）

### 已完成且通过

- `npm run type-check`
- `npm run lint`
- Jest 全量测试：268 个测试套件、1428 个测试通过
- `npm run scripts:test`：52 个脚本测试通过
- `npm run security:scan`：扫描 1403 个文件，未发现凭证泄漏
- `npm run deps:check`
- `npm run audit:prod`：0 个生产依赖漏洞
- `npm run api:validate`
- `npm run api:drift:strict`
- `npm run api:docs` 与 `npm run api:docs:check`
- `npm run build`
- `npm run build:size-check`：37 个图表分块，最大 596.60 KiB，低于 600 KiB 门禁
- `npm run test:e2e`：Playwright 4/4 通过
- 生产预览冒烟：退出码 0，本地 `/api` 路由正确，无远程 API、请求失败或业务控制台错误
- `curl.exe -I -L --max-time 20 https://oasisintwrite.com/`：200，关键安全响应头存在

浏览器证据：

`D:\OneDrive\4、董娣相关\3、绿洲慧写3.0\绿洲前端\output\browser-evidence\2026-07-10-full-audit\summary.md`

### 提交前门禁

全量类型、代码规范、测试、API、构建和安全检查已按最终源代码重新执行；暂存后还会执行暂存区敏感信息和差异检查。

## risk list（风险列表）

| 边界                         | 当前结论                                                                                                | 后续责任                           |
| ---------------------------- | ------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| 访问令牌仍由前端持久化       | 迁移到 HttpOnly Cookie（脚本不可读 Cookie）需要后端登录、刷新和退出接口共同变更，不能由前端单边安全修改 | 后端与鉴权专项                     |
| 旧 GET 写接口仍需兼容        | 前端已把可识别的备用路径纳入契约和漂移扫描；直接删除会破坏现有后端兼容                                  | 后端逐接口迁移到 POST/DELETE/PATCH |
| SVG/HTML/XML 下载安全        | 前端策略已明确，真实响应头和隔离域必须由后端或网关实施                                                  | 后端/网关上线验证                  |
| Mermaid 分块余量较小         | 当前门禁通过，不是功能故障；依赖升级时需要继续看 600 KiB 门禁                                           | 依赖升级回归                       |
| 真实 Chrome 补充核验未完成   | 控制工具因无法可靠确认当前网址而安全中止，未绕过；Playwright 生产预览和 4 个现有场景均通过              | 人工 Chrome 登录态复核             |
| 真实支付、异步任务和生产数据 | 自动化使用模拟接口，没有产生外部副作用                                                                  | 上线前后端联调                     |

## manual QA checklist（人工检查清单）

### page or route（页面或路由）

- `/auth/login`
- `/workspace`
- 工作区中的快速创建项目、支付、历史记录、异步任务、设置和左右侧栏

### setup or prerequisite（准备条件）

- 使用真实 Google Chrome。
- 准备普通测试账号；支付使用沙箱或明确不扣款的测试配置。
- 分别准备正常网络、慢网和可控的接口失败环境。

### steps（步骤）

1. 登录并只用 Tab、Enter、Space 完成主要导航。
2. 创建项目时模拟失败，确认弹窗不关闭、输入不丢失；恢复接口后重试。
3. 打开支付弹窗后关闭再开，确认不会继承旧订单；“我已完成支付”必须等待后端核验。
4. 检查长会话列表滚动、选择、删除和焦点状态。
5. 打开 Mermaid、代码块、图片、历史恢复和异步任务结果。
6. 在 1440、1024、768、390 像素宽度下检查遮挡、滚动和弹窗。
7. 打开浏览器控制台，确认没有业务错误或明显网络失败。

### expected result（预期结果）

- 失败可重试且不丢用户输入；重复点击不会重复提交。
- 加载、空、错误、禁用和成功状态都可见。
- 键盘焦点清楚，交互不依赖点击非按钮空白区域。
- 长列表滚动顺畅，选择不会跳到另一行。
- 支付成功只来源于后端核验。

### edge case to verify（边界检查）

- 登录过期、403、500、断网、慢响应、空项目、超长项目名、支付关闭重开、旧异步会话同名、恶意 SVG/HTML 下载。

## out-of-scope follow-up improvements（范围外后续建议）

1. 后端配合把登录令牌迁移到 HttpOnly Cookie，并重新做 CSRF（跨站请求伪造）与刷新流程测试。
2. 后端逐步移除 GET 写接口；完成迁移后删除前端旧兼容路径。
3. 在网关对上传文件做内容嗅探、病毒扫描、附件下载和独立域隔离，并用真实文件做验收。
4. 若产品正式支持手机端，单独设计移动端导航和工作区布局，不在本次治理提交中混入大范围重构。
