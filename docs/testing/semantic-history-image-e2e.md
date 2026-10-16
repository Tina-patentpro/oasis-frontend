# 语义生图历史图片真实后端检查

这个检查用于覆盖完整链路：

1. 打开前端页面；
2. 读取真实后端历史列表 `/user/user/projectlist`；
3. 点击一条“语义生图”历史记录；
4. 等待真实后端详情接口 `/user/user/projectdetail/{id}`；
5. 确认历史消息里的图片已经在浏览器中真实加载成功。

## 运行命令

```bash
npm run e2e:semantic-history-image
```

## 必要配置

这个检查需要真实登录态，默认不会放进 `npm test`。

推荐使用 Playwright 登录态文件：

```bash
set OASIS_E2E_STORAGE_STATE=output/playwright/oasis-auth-state.json
npm run e2e:semantic-history-image
```

也可以使用访问令牌。注意：不要把令牌直接写在共享脚本、截图或日志里：

```bash
set OASIS_E2E_APP_URL=http://127.0.0.1:5173
set OASIS_E2E_ACCESS_TOKEN=你的登录令牌
npm run e2e:semantic-history-image
```

如果目标测试页面本身无需登录，或浏览器环境已经公开可访问，可以显式允许无登录态：

```bash
npm run e2e:semantic-history-image -- --allow-unauthenticated
```

## 常用筛选

如果历史记录很多，建议指定一条稳定记录：

```bash
set OASIS_E2E_SESSION_ID=123
npm run e2e:semantic-history-image
```

或按标题筛选：

```bash
set OASIS_E2E_SESSION_TITLE=语义生图：猫咪海报
npm run e2e:semantic-history-image
```

## 检查项目内历史

如果目标历史属于某个项目，需要指定项目。脚本会先进入“项目管理”，展开目标项目，再等待带 `folder_id` 的项目内历史列表。

按项目 ID 检查：

```bash
set OASIS_E2E_PROJECT_ID=193
set OASIS_E2E_SESSION_ID=1376
npm run e2e:semantic-history-image
```

如果项目 ID 无法解析出项目名称，可同时指定页面上可见的项目名称：

```bash
set OASIS_E2E_PROJECT_ID=193
set OASIS_E2E_PROJECT_TITLE=工学键盘
set OASIS_E2E_SESSION_ID=1376
npm run e2e:semantic-history-image
```

成功标准：

- 浏览器能展开指定项目；
- 能捕获 `/user/user/projectlist?...folder_id=项目ID`；
- 能点击指定历史记录；
- 能捕获 `/user/user/projectdetail/历史ID`；
- 至少 1 张历史图片完成加载，且图片宽高大于 0。

## 可选参数

- `OASIS_E2E_APP_URL`：前端地址，默认 `http://127.0.0.1:5173`。
- `OASIS_E2E_ACCESS_TOKEN`：登录令牌。
- `OASIS_E2E_STORAGE_STATE`：Playwright 登录态文件。
- `OASIS_E2E_SESSION_ID`：指定历史记录 ID。
- `OASIS_E2E_SESSION_TITLE`：指定可见历史标题。
- `OASIS_E2E_SESSION_KEYWORD`：标题关键词，默认 `语义生图`。
- `OASIS_E2E_PROJECT_ID`：指定项目 ID，用于检查项目内历史。
- `OASIS_E2E_PROJECT_TITLE`：指定页面上可见的项目名称。
- `OASIS_E2E_ALLOW_UNAUTHENTICATED`：设为 `1`、`true` 或 `yes` 时允许无登录态检查。
- `OASIS_E2E_TIMEOUT_MS`：超时时间，默认 45000 毫秒。
- `OASIS_E2E_SCREENSHOT`：截图保存路径，默认 `output/playwright/semantic-history-image.png`。

也可以运行：

```bash
npm run e2e:semantic-history-image -- --help
```
