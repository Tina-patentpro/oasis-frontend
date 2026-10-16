# 2026-05-31 依赖安全扫描复查记录

## 结论

当前没有活动中的依赖安全例外。

此前记录的 Mermaid 运行时依赖告警和 `nodemailer` 开发依赖告警，已通过依赖覆盖和开发依赖升级处理。复查时执行的完整依赖审计结果为 `0 vulnerabilities`。

2026-06-01 追加复查：已移除未接入真实界面的 `@emailjs/browser` 依赖和对应死代码；同时将运行时代码直接引用的 `dompurify`、Lint 配置直接引用的 `@eslint/js` 写入显式依赖清单，避免依赖隐式挂在传递依赖上。

## 当前状态

| 检查项             | 当前结果         | 说明                                                     |
| ------------------ | ---------------- | -------------------------------------------------------- |
| 完整依赖审计       | 0 个漏洞         | `npm audit --json --registry=https://registry.npmjs.org` |
| 生产依赖审计       | 0 个漏洞         | `npm run audit:prod:ci`                                  |
| Mermaid 图表依赖链 | 已升级并通过构建 | `dompurify` / `lodash-es` 已解除旧版本覆盖               |
| 发布通知脚本依赖   | 已升级           | `nodemailer` 已升级到审计建议的修复版本                  |
| 依赖声明一致性     | 已通过           | `npm run deps:check`                                     |

## 已采取的处理

- 将 `dompurify` 覆盖版本提升到 `3.4.7`。
- 将 `dompurify` 作为直接运行时依赖固定到 `3.4.7`，不再依赖 Mermaid 间接带入。
- 将 `lodash-es` 覆盖版本提升到 `4.18.1`。
- 将 `lodash` 覆盖版本提升到 `4.18.1`。
- 将开发依赖 `nodemailer` 提升到 `^8.0.10`。
- 将 `@eslint/js` 作为直接开发依赖补入，匹配 `eslint.config.js` 的直接 import。
- 移除未接入真实客服界面的 `@emailjs/browser` 依赖及对应邮件工单死代码。
- 保留 Mermaid 渲染安全测试和构建体积门禁。
- 保留生产登录脚本、账号密码组合等密钥扫描规则，防止调试凭据再次进入仓库。

## 复查条件

满足任一条件时，需要重新做依赖安全复查：

1. `npm audit --omit=dev` 出现新的 High 或 Critical 告警。
2. Mermaid、Markdown 渲染、DOMPurify 或图表分包策略再次调整。
3. 发布通知脚本接入真实邮件发送流程，或扩大使用范围。
4. `package-lock.json` 出现大范围依赖重算。

## 下一次建议复查日期

2026-06-30。
