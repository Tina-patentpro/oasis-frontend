# 文档自动化方案（D6）

最后更新：2025-10-22  
目标：让 API 文档与合约测试在 CI/CD 中自动生成、校验与发布，降低人工维护成本。

## 1. 工具选型

| 目标             | 工具                                                | 说明                                    |
| ---------------- | --------------------------------------------------- | --------------------------------------- |
| OpenAPI 语法校验 | [Spectral](https://github.com/stoplightio/spectral) | 自定义规则，校验 `$ref`、描述、错误码。 |
| 合约测试执行     | Node.js 原生 `node --test`                          | 运行 `docs/api/contracts/*.test.js`。   |
| 静态站点生成     | Redocly CLI 或 `npx @redocly/cli build-docs`        | 生成 HTML/静态站点，部署到 CDN。        |
| Swagger UI 预览  | `swagger-ui-dist` + 简单 HTML                       | 提供交互式调试入口。                    |
| 归档/打包        | `zip`、`tar` 或自定义脚本                           | 将生成的站点与原始 YAML 一并打包。      |

## 2. CI/CD 流程（示例：GitHub Actions）

```yaml
name: api-docs
on:
  pull_request:
    paths:
      - 'docs/api/**'
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 18
      - name: Install dependencies
        run: npm ci
      - name: Validate API contracts
        run: npm run api:validate:ci
      - name: Check API docs site sync
        run: npm run api:docs:check
      - name: Build Redoc site
        run: npm run api:docs
      - name: Upload artifact
        uses: actions/upload-artifact@v4
        with:
          name: api-docs-site
          path: docs/api/site
```

> 常规 PR CI 推荐执行 `npm run api:validate:ci` 和 `npm run api:docs:check` 保持只读；只有需要同步静态站点产物时，再执行 `npm run api:docs` 并提交 `docs/api/site` 更新。

## 3. 本地开发脚本

在 `package.json` 中新增命令：

```json
{
  "scripts": {
    "api:validate": "npm run api:lint:strict && npm run api:metadata && npm run api:unused && npm run api:test && node scripts/api/update-trend.mjs",
    "api:validate:ci": "npm run api:lint:strict && npm run api:metadata && npm run api:unused && npm run api:test",
    "api:docs": "node scripts/api/build-docs.mjs",
    "api:docs:check": "node scripts/api/build-docs.mjs --check",
    "api:mock": "node scripts/api/mock-server.mjs"
  }
}
```

- `npm run api:validate`：串联 Spectral、元数据校验、未使用组件检测与合约测试，同时刷新 `api-quality-trend.json`。
- `npm run api:validate:ci`：CI 专用只读校验，执行同一组检查但不刷新趋势文件，避免流水线产生工作区改动。
- `npm run api:docs`：基于 Redocly 生成静态站点（`docs/api/site`），可直接发布或上传到对象存储。
- `npm run api:docs:check`：在临时目录生成静态站点并与 `docs/api/site` 对比，发现未同步时失败。
- `npm run api:mock`：启动本地 Mock 服务，覆盖 workflow 执行、SSE、支付回调、批量下载场景，便于前端联调。
- 在提交前推荐执行 `npm run api:validate && npm run api:docs`，保证文档与站点同步更新。

## 4. 发布策略

- **静态站点**：部署到对象存储（OSS/S3）或 GitHub Pages，域名如 `https://docs.demo-platform.cn/api`.
- **访问控制**：若包含敏感接口，可通过 VPN/IP 白名单限制访问。
- **版本管理**：每次发布使用 `${MAJOR}.${MINOR}.${PATCH}` 目录或标签，保留历史版本。

## 5. 与团队协作

- 在 `DELIVERY-CHECKLIST.md` 增加“CI 运行通过”项，若失败必须解决后才能交付。
- 将生成的站点链接同步到 `README.md` 与内部维基，便于 PM/QA 访问。
- 针对大型发布，在评审会议上展示自动化过程与结果，减少手工签核。

## 6. 后续迭代

1. 整合 Postman/Newman 或 Dredd 等工具，扩展端到端校验。
2. 引入 `openapi-diff`，自动比较版本差异并生成报告。
3. 与设计系统联动，自动生成 SDK / TypeScript 类型定义。
4. 若文档数量增加，可采用 Redocly 管理多模块站点。
