## 数据接入前的落地指引

在将工作台接入真实后端服务之前，可以按以下步骤逐步替换当前的 Mock 方案，确保联调阶段风险可控。

### 1. 统一请求与校验

- `src/api/client.ts` 支持在 `get/post/put/delete` 等方法中传入 `validator`。  
  通过 `src/api/validation.ts` 暴露的 `createSchemaValidator`，可以轻松对接 zod/valibot 等 Schema 库。
- 针对 204/205 或空响应体，客户端会返回 `undefined`，避免 JSON 解析异常。
- 建议为关键接口在 `src/api/schemas/` 下编写 Schema，并在对应 service 中引用：

```ts
const listProjects = () =>
  apiClient.get('/projects', params, createSchemaValidator(ProjectListSchema))
```

### 2. 错误映射与提示

- 新增的 `ApiError#toDisplayInfo()` 会根据错误码、HTTP 状态码输出统一的展示文案（见 `src/api/errorMapping.ts`）。  
  在全局通知或弹窗中优先使用该方法，避免散落的字符串提示。
- 当需要自定义提示时，可扩展 `ERROR_CODE_MAP` 或 `STATUS_CODE_MAP`，覆盖后端约定的业务码。

### 3. Mock 数据与 MSW 迁移

- 现有的假数据集中在 `src/stores/mock/` 与 `src/utils/mockWorkspace.ts`。后续可引入 [MSW](https://mswjs.io/) 在 `src/mocks/` 下统一拦截请求：
  1. 安装 `msw` 并在 `vite.config.ts` 的开发服务器中注册 Service Worker；
  2. 将 `useMockWorkspaceData` 等 Hook 改为调用真实 service，在开发模式下由 MSW 返回相同结构的数据。
- 通过 `npm run lint` 或新增的 `npm run type-check` 持续校验 schema，确保 Mock 与真实接口保持一致。

### 4. 环境变量与部署

- `VITE_API_BASE_URL` 现默认指向 `/api`，可在 `.env.development.local`、`.env.production` 中分别配置测试、预发、生产地址。
- 建议在 `scripts/` 目录补充部署脚本示例，明确构建参数（如 `--mode staging`）与所需的环境变量。

### 5. 监控与埋点预留

- 在全局通知函数或 `handleAPIError` 中加入事件上报钩子，例如：

```ts
const error = handleAPIError(err)
analytics.capture('api_error', error.toJSON())
notify(error.toDisplayInfo().description)
```

- 便于接入 Sentry、阿里 ARMS、数数科技等监控平台时统一查询。

---

按照以上步骤逐项推进，可以在不依赖真实后端的情况下验证业务流程；当接口准备就绪时，只需替换 service 层请求与 MSW 配置，即可切换到真实数据。
