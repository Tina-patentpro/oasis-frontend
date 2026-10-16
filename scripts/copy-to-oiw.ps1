# 复制项目到OIW网站目录
# 用途：将codex项目和AdminS项目复制到OIW网站目录

# 设置错误处理
$ErrorActionPreference = "Stop"

# 定义源路径和目标路径
$sourceCodex = "C:\Users\TinaD\Desktop\codex"
$sourceAdminS = "C:\Users\TinaD\Desktop\AdminS"
$targetBase = "C:\Users\TinaD\Desktop\OIW网站"
$targetWorkarea = Join-Path $targetBase "workarea"
$targetAdminS = Join-Path $targetBase "AdminS"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "开始复制项目到OIW网站目录" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 检查源目录是否存在
Write-Host "检查源目录..." -ForegroundColor Yellow
if (-not (Test-Path $sourceCodex)) {
    Write-Host "错误: 源目录不存在: $sourceCodex" -ForegroundColor Red
    exit 1
}
if (-not (Test-Path $sourceAdminS)) {
    Write-Host "错误: 源目录不存在: $sourceAdminS" -ForegroundColor Red
    exit 1
}
Write-Host "✓ 源目录检查通过" -ForegroundColor Green
Write-Host ""

# 创建目标基础目录（如果不存在）
Write-Host "准备目标目录..." -ForegroundColor Yellow
if (-not (Test-Path $targetBase)) {
    Write-Host "创建目标基础目录: $targetBase" -ForegroundColor Cyan
    New-Item -Path $targetBase -ItemType Directory -Force | Out-Null
}

# 创建或清空workarea目录
if (Test-Path $targetWorkarea) {
    Write-Host "目标workarea目录已存在，将清空后重新复制" -ForegroundColor Yellow
    $response = Read-Host "是否继续? (Y/N)"
    if ($response -ne "Y" -and $response -ne "y") {
        Write-Host "操作已取消" -ForegroundColor Yellow
        exit 0
    }
    Remove-Item -Path $targetWorkarea -Recurse -Force
}
New-Item -Path $targetWorkarea -ItemType Directory -Force | Out-Null
Write-Host "✓ workarea目录已准备" -ForegroundColor Green

# 创建或清空AdminS目录
if (Test-Path $targetAdminS) {
    Write-Host "目标AdminS目录已存在，将清空后重新复制" -ForegroundColor Yellow
    Remove-Item -Path $targetAdminS -Recurse -Force
}
New-Item -Path $targetAdminS -ItemType Directory -Force | Out-Null
Write-Host "✓ AdminS目录已准备" -ForegroundColor Green
Write-Host ""

# 定义要排除的目录和文件
$excludeDirs = @('node_modules', '.git', 'dist', 'build', '.cache', '.temp')
$excludeFiles = @('*.log', '.DS_Store', 'Thumbs.db')

# 复制codex到workarea
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "复制 codex -> workarea" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "源: $sourceCodex" -ForegroundColor Gray
Write-Host "目标: $targetWorkarea" -ForegroundColor Gray
Write-Host ""

$copyParams = @{
    Path = "$sourceCodex\*"
    Destination = $targetWorkarea
    Recurse = $true
    Force = $true
    Exclude = $excludeFiles
}

try {
    Copy-Item @copyParams
    
    # 删除排除的目录
    foreach ($dir in $excludeDirs) {
        $excludePath = Join-Path $targetWorkarea $dir
        if (Test-Path $excludePath) {
            Remove-Item -Path $excludePath -Recurse -Force
            Write-Host "  已排除: $dir" -ForegroundColor Gray
        }
    }
    
    Write-Host "✓ codex项目复制完成" -ForegroundColor Green
} catch {
    Write-Host "错误: 复制codex失败 - $_" -ForegroundColor Red
    exit 1
}
Write-Host ""

# 复制AdminS
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "复制 AdminS -> AdminS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "源: $sourceAdminS" -ForegroundColor Gray
Write-Host "目标: $targetAdminS" -ForegroundColor Gray
Write-Host ""

$copyParams = @{
    Path = "$sourceAdminS\*"
    Destination = $targetAdminS
    Recurse = $true
    Force = $true
    Exclude = $excludeFiles
}

try {
    Copy-Item @copyParams
    
    # 删除排除的目录
    foreach ($dir in $excludeDirs) {
        $excludePath = Join-Path $targetAdminS $dir
        if (Test-Path $excludePath) {
            Remove-Item -Path $excludePath -Recurse -Force
            Write-Host "  已排除: $dir" -ForegroundColor Gray
        }
    }
    
    Write-Host "✓ AdminS项目复制完成" -ForegroundColor Green
} catch {
    Write-Host "错误: 复制AdminS失败 - $_" -ForegroundColor Red
    exit 1
}
Write-Host ""

# 生成复制报告
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "复制完成报告" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$workareaSize = (Get-ChildItem -Path $targetWorkarea -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB
$adminSSize = (Get-ChildItem -Path $targetAdminS -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB

Write-Host "workarea目录:" -ForegroundColor Yellow
Write-Host "  路径: $targetWorkarea" -ForegroundColor Gray
Write-Host "  大小: $([math]::Round($workareaSize, 2)) MB" -ForegroundColor Gray
Write-Host ""

Write-Host "AdminS目录:" -ForegroundColor Yellow
Write-Host "  路径: $targetAdminS" -ForegroundColor Gray
Write-Host "  大小: $([math]::Round($adminSSize, 2)) MB" -ForegroundColor Gray
Write-Host ""

Write-Host "总大小: $([math]::Round($workareaSize + $adminSSize, 2)) MB" -ForegroundColor Cyan
Write-Host ""

Write-Host "========================================" -ForegroundColor Green
Write-Host "✓ 所有复制操作完成!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "下一步操作建议:" -ForegroundColor Yellow
Write-Host "1. 在workarea目录运行: npm install" -ForegroundColor Gray
Write-Host "2. 检查复制的文件是否完整" -ForegroundColor Gray
Write-Host "3. 根据需要更新配置文件" -ForegroundColor Gray
