const fs = require('fs');
const path = require('path');

// 配置路径
const SOURCE_CODEX = 'C:\\Users\\TinaD\\Desktop\\codex';
const SOURCE_ADMINS = 'C:\\Users\\TinaD\\Desktop\\AdminS';
const TARGET_BASE = 'C:\\Users\\TinaD\\Desktop\\OIW网站';
const TARGET_WORKAREA = path.join(TARGET_BASE, 'workarea');
const TARGET_ADMINS = path.join(TARGET_BASE, 'AdminS');

// 要排除的目录
const EXCLUDE_DIRS = ['node_modules', '.git', 'dist', 'build', '.cache', '.temp'];
const EXCLUDE_FILES = ['.log', '.DS_Store', 'Thumbs.db'];

console.log('========================================');
console.log('开始复制项目到OIW网站目录');
console.log('========================================\n');

// 检查源目录是否存在
console.log('检查源目录...');
if (!fs.existsSync(SOURCE_CODEX)) {
    console.error(`错误: 源目录不存在: ${SOURCE_CODEX}`);
    process.exit(1);
}
if (!fs.existsSync(SOURCE_ADMINS)) {
    console.error(`错误: 源目录不存在: ${SOURCE_ADMINS}`);
    process.exit(1);
}
console.log('✓ 源目录检查通过\n');

// 递归复制目录
function copyDirectory(source, target, excludeDirs = [], excludeFiles = []) {
    // 确保目标目录存在
    if (!fs.existsSync(target)) {
        fs.mkdirSync(target, { recursive: true });
    }

    const items = fs.readdirSync(source);
    let copiedCount = 0;
    let skippedCount = 0;

    for (const item of items) {
        const sourcePath = path.join(source, item);
        const targetPath = path.join(target, item);
        const stat = fs.statSync(sourcePath);

        // 检查是否应该排除
        if (stat.isDirectory()) {
            if (excludeDirs.includes(item)) {
                skippedCount++;
                continue;
            }
            // 递归复制子目录
            const result = copyDirectory(sourcePath, targetPath, excludeDirs, excludeFiles);
            copiedCount += result.copied;
            skippedCount += result.skipped;
        } else {
            // 检查文件扩展名是否应该排除
            const shouldExclude = excludeFiles.some(ext => item.endsWith(ext));
            if (shouldExclude) {
                skippedCount++;
                continue;
            }
            // 复制文件
            fs.copyFileSync(sourcePath, targetPath);
            copiedCount++;
        }
    }

    return { copied: copiedCount, skipped: skippedCount };
}

// 准备目标目录
console.log('准备目标目录...');
if (!fs.existsSync(TARGET_BASE)) {
    console.log(`创建目标基础目录: ${TARGET_BASE}`);
    fs.mkdirSync(TARGET_BASE, { recursive: true });
}

// 清空并创建workarea目录
if (fs.existsSync(TARGET_WORKAREA)) {
    console.log('清空workarea目录...');
    fs.rmSync(TARGET_WORKAREA, { recursive: true, force: true });
}
fs.mkdirSync(TARGET_WORKAREA, { recursive: true });
console.log('✓ workarea目录已准备');

// 清空并创建AdminS目录
if (fs.existsSync(TARGET_ADMINS)) {
    console.log('清空AdminS目录...');
    fs.rmSync(TARGET_ADMINS, { recursive: true, force: true });
}
fs.mkdirSync(TARGET_ADMINS, { recursive: true });
console.log('✓ AdminS目录已准备\n');

// 复制codex到workarea
console.log('========================================');
console.log('复制 codex -> workarea');
console.log('========================================');
console.log(`源: ${SOURCE_CODEX}`);
console.log(`目标: ${TARGET_WORKAREA}\n`);

try {
    const result1 = copyDirectory(SOURCE_CODEX, TARGET_WORKAREA, EXCLUDE_DIRS, EXCLUDE_FILES);
    console.log(`✓ codex项目复制完成 (复制: ${result1.copied} 文件, 跳过: ${result1.skipped} 项)\n`);
} catch (error) {
    console.error(`错误: 复制codex失败 - ${error.message}`);
    process.exit(1);
}

// 复制AdminS
console.log('========================================');
console.log('复制 AdminS -> AdminS');
console.log('========================================');
console.log(`源: ${SOURCE_ADMINS}`);
console.log(`目标: ${TARGET_ADMINS}\n`);

try {
    const result2 = copyDirectory(SOURCE_ADMINS, TARGET_ADMINS, EXCLUDE_DIRS, EXCLUDE_FILES);
    console.log(`✓ AdminS项目复制完成 (复制: ${result2.copied} 文件, 跳过: ${result2.skipped} 项)\n`);
} catch (error) {
    console.error(`错误: 复制AdminS失败 - ${error.message}`);
    process.exit(1);
}

// 生成复制报告
console.log('========================================');
console.log('复制完成报告');
console.log('========================================');

function getDirectorySize(dir) {
    let size = 0;
    const items = fs.readdirSync(dir);
    for (const item of items) {
        const itemPath = path.join(dir, item);
        const stat = fs.statSync(itemPath);
        if (stat.isDirectory()) {
            size += getDirectorySize(itemPath);
        } else {
            size += stat.size;
        }
    }
    return size;
}

const workareaSize = getDirectorySize(TARGET_WORKAREA) / (1024 * 1024);
const adminSSize = getDirectorySize(TARGET_ADMINS) / (1024 * 1024);

console.log('workarea目录:');
console.log(`  路径: ${TARGET_WORKAREA}`);
console.log(`  大小: ${workareaSize.toFixed(2)} MB\n`);

console.log('AdminS目录:');
console.log(`  路径: ${TARGET_ADMINS}`);
console.log(`  大小: ${adminSSize.toFixed(2)} MB\n`);

console.log(`总大小: ${(workareaSize + adminSSize).toFixed(2)} MB\n`);

console.log('========================================');
console.log('✓ 所有复制操作完成!');
console.log('========================================\n');

console.log('下一步操作建议:');
console.log('1. 在workarea目录运行: npm install');
console.log('2. 检查复制的文件是否完整');
console.log('3. 根据需要更新配置文件\n');
