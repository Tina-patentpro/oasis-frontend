# 🤝 贡献指南

感谢您对 Codex 项目的关注！我们欢迎任何形式的贡献。

## 📋 目录

- [行为准则](#行为准则)
- [如何贡献](#如何贡献)
- [开发流程](#开发流程)
- [代码规范](#代码规范)
- [提交规范](#提交规范)
- [测试要求](#测试要求)

## 🌟 行为准则

参与本项目即表示您同意遵守我们的行为准则：

- 尊重所有贡献者
- 使用友善和包容的语言
- 接受建设性的批评
- 关注对社区最有利的事情

## 🚀 如何贡献

### 报告 Bug

如果您发现了 bug，请：

1. 检查 [Issues](https://github.com/yourproject/codex/issues) 确认问题未被报告
2. 创建新 Issue 并包含：
   - 清晰的标题和描述
   - 复现步骤
   - 预期行为和实际行为
   - 屏幕截图（如适用）
   - 环境信息（浏览器、操作系统等）

### 建议新功能

1. 先在 Issues 中讨论您的想法
2. 等待维护者反馈
3. 获得批准后开始实现

### 提交代码

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 💻 开发流程

### 环境设置

```bash
# 克隆仓库
git clone https://github.com/yourproject/codex.git
cd codex

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

### 分支策略

- `main` - 生产分支，始终保持稳定
- `develop` - 开发分支，用于集成新功能
- `feature/*` - 功能分支
- `bugfix/*` - Bug 修复分支
- `hotfix/*` - 紧急修复分支

## 📝 代码规范

### TypeScript/JavaScript

- 使用 TypeScript 编写代码
- 遵循 ESLint 配置
- 使用有意义的变量和函数名
- 添加必要的注释

```typescript
// ✅ 好的示例
const fetchUserData = async (userId: string): Promise<User> => {
  // 实现...
}

// ❌ 不好的示例
const f = async (id: string) => {
  // 实现...
}
```

### React 组件

- 使用函数组件和 Hooks
- 遵循单一职责原则
- 适当拆分组件
- 使用 TypeScript 类型

```typescript
// ✅ 好的示例
interface ButtonProps {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}

export const Button: React.FC<ButtonProps> = ({ label, onClick, variant = 'primary' }) => {
  return (
    <button className={`btn btn-${variant}`} onClick={onClick}>
      {label}
    </button>
  );
};
```

### CSS/样式

- 使用 Tailwind CSS 优先
- 自定义样式使用 CSS Modules 或 styled-components
- 使用 CSS 变量进行主题化
- 遵循 BEM 命名规范（如使用原生 CSS）

## 📦 提交规范

我们使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

### 提交类型

- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档更新
- `style`: 代码格式调整（不影响功能）
- `refactor`: 代码重构
- `perf`: 性能优化
- `test`: 测试相关
- `chore`: 构建/工具相关

### 示例

```bash
feat: 添加用户认证功能
fix: 修复登录按钮点击无响应问题
docs: 更新 API 文档
style: 格式化代码
refactor: 重构状态管理逻辑
perf: 优化列表渲染性能
test: 添加用户服务单元测试
chore: 更新依赖包版本
```

### 提交消息格式

```
<type>(<scope>): <subject>

<body>

<footer>
```

示例：

```
feat(auth): 添加 OAuth 2.0 登录支持

- 实现 Google OAuth 登录
- 实现 GitHub OAuth 登录
- 添加登录状态持久化

Closes #123
```

## ✅ 测试要求

### 单元测试

- 为新功能编写单元测试
- 确保测试覆盖率 ≥ 80%
- 使用有意义的测试描述

```typescript
describe('UserService', () => {
  describe('fetchUser', () => {
    it('should return user data when user exists', async () => {
      // 测试实现
    })

    it('should throw error when user does not exist', async () => {
      // 测试实现
    })
  })
})
```

### 运行测试

```bash
# 运行所有测试
npm test

# 运行测试并查看覆盖率
npm run test:coverage

# 监听模式
npm run test:watch
```

## 🔍 代码审查

所有 PR 都需要至少一位维护者审查：

- 代码符合项目规范
- 包含必要的测试
- 文档已更新
- 通过所有 CI 检查

## 📚 文档

更新代码时请同步更新文档：

- 更新 README.md（如有重大变化）
- 更新 API 文档
- 添加/更新代码注释
- 更新 CHANGELOG.md

## 🆘 需要帮助？

- 查看 [文档](./README.md)
- 在 Issues 中提问
- 加入我们的社区讨论

## 📄 许可

通过贡献代码，您同意您的贡献将按照项目的许可证进行授权。

---

再次感谢您的贡献！🎉
