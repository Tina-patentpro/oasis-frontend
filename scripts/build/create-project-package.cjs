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
const outputPath = path.join(outputDir, `oasis-workspace-${timestamp}.zip`);

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

console.log('📦 开始打包项目文件...');

// 需要包含的文件和目录
const includes = [
  // 源代码
  { src: 'src/**/*', dest: 'src' },
  
  // node_modules (所有依赖)
  { src: 'node_modules/**/*', dest: 'node_modules' },
  
  // 公共资源
  { src: 'public/**/*', dest: 'public' },
  
  // 配置文件
  'package.json',
  'package-lock.json',
  'tsconfig.json',
  'tsconfig.node.json',
  'vite.config.ts',
  'tailwind.config.js',
  'postcss.config.js',
  'index.html',
  '.gitignore',
  
  // 文档
  'README.md',
  'STAGE9-INTEGRATION-GUIDE.md',
  '使用说明.txt',
];

// 需要排除的模式（不再排除node_modules）
const excludes = [
  '**/dist/**',
  '**/build/**',
  '**/.vite/**',
  '**/packages/**',
  '**/*.backup*',
  '**/*.log',
  '**/.DS_Store',
  '**/thumbs.db',
  '**/*.cjs',
];

// 但要包含重要文档
const importantDocs = [
  'README.md',
  'STAGE9-INTEGRATION-GUIDE.md',
];

// 添加文件到归档
includes.forEach(item => {
  if (typeof item === 'string') {
    // 单个文件
    if (fs.existsSync(item)) {
      archive.file(item, { name: item });
      console.log(`  ✓ ${item}`);
    }
  } else {
    // glob模式
    const options = {
      ignore: excludes
    };
    archive.glob(item.src, options, { prefix: item.dest });
    console.log(`  ✓ ${item.src}`);
  }
});

// 单独添加重要文档（避免被排除）
importantDocs.forEach(doc => {
  if (fs.existsSync(doc)) {
    archive.file(doc, { name: doc });
    console.log(`  ✓ ${doc} (重要文档)`);
  }
});

// 完成归档
archive.finalize();
