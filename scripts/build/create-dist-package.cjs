const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

// 创建输出目录
const outputDir = path.join(__dirname, 'packages');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// 生成时间戳
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
const outputPath = path.join(outputDir, `oasis-workspace-dist-${timestamp}.zip`);

// 创建写入流和archiver实例
const output = fs.createWriteStream(outputPath);
const archive = archiver('zip', {
  zlib: { level: 9 } // 最高压缩级别
});

// 监听所有archive数据写入完成
output.on('close', function() {
  console.log('✅ 打包完成！');
  console.log(`📦 文件大小: ${(archive.pointer() / 1024 / 1024).toFixed(2)} MB`);
  console.log(`📁 保存位置: ${outputPath}`);
  console.log('\n🚀 部署说明：');
  console.log('   1. 解压文件');
  console.log('   2. 将dist目录内容部署到Web服务器');
  console.log('   3. 访问index.html即可使用');
});

// 监听警告
archive.on('warning', function(err) {
  if (err.code === 'ENOENT') {
    console.warn('⚠️  警告:', err);
  } else {
    throw err;
  }
});

// 监听错误
archive.on('error', function(err) {
  throw err;
});

// 连接archive到输出流
archive.pipe(output);

console.log('📦 开始打包构建输出...');

// 打包dist目录（构建后的生产文件）
if (fs.existsSync('dist')) {
  archive.directory('dist/', 'dist');
  console.log('  ✓ dist/ (构建输出)');
} else {
  console.error('❌ 错误: dist目录不存在，请先运行 npm run build');
  process.exit(1);
}

// 添加部署说明文档
const deploymentGuide = `# Oasis Workspace 生产部署指南

## 📦 包含内容

此包包含完整的生产构建文件，可直接部署到任何Web服务器。

## 🚀 部署步骤

### 方法1: 静态文件服务器

1. 解压此文件
2. 将 \`dist\` 目录中的所有文件上传到Web服务器
3. 确保服务器配置正确的MIME类型
4. 访问 \`index.html\` 即可使用

### 方法2: 使用Node.js serve

\`\`\`bash
# 安装serve
npm install -g serve

# 进入dist目录
cd dist

# 启动服务器
serve -s . -p 3000

# 浏览器访问
# http://localhost:3000
\`\`\`

### 方法3: Nginx部署

\`\`\`nginx
# Do not use a generic SPA fallback for assets, source maps or /api.
# Generate and review the versioned candidate before merging into the
# existing HTTPS server block:
# npm run release:nginx:candidate -- --output output/deployment-candidates/<version>
root /path/to/dist;
include /etc/nginx/snippets/oasis-frontend-locations.conf;
\`\`\`

## 📊 文件说明

- \`index.html\` - 应用入口文件
- \`assets/\` - 静态资源（CSS、JS、字体等）
- 所有资源已优化和压缩

## ⚙️ 服务器要求

- 支持静态文件服务
- 建议启用gzip压缩
- 建议启用浏览器缓存

## 🎯 性能优化建议

1. 启用gzip/brotli压缩
2. 设置静态资源缓存
3. 使用CDN加速
4. 启用HTTP/2

## 📝 版本信息

- 构建时间: ${new Date().toLocaleString('zh-CN')}
- 项目版本: 1.0.0

## 💡 技术栈

- React 18.2
- TypeScript 5.3
- Vite 5.0
- Tailwind CSS 3.4
- Markdown渲染支持
- 数学公式支持
- 图表渲染支持
`;

// 创建部署指南文件
archive.append(deploymentGuide, { name: 'DEPLOYMENT.md' });
console.log('  ✓ DEPLOYMENT.md (部署指南)');

// 完成归档
archive.finalize();
