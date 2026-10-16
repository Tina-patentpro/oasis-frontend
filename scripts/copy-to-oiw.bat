@echo off
chcp 65001 >nul
echo ========================================
echo 开始复制项目到OIW网站目录
echo ========================================
echo.

set "SOURCE_CODEX=C:\Users\TinaD\Desktop\codex"
set "SOURCE_ADMINS=C:\Users\TinaD\Desktop\AdminS"
set "TARGET_BASE=C:\Users\TinaD\Desktop\OIW网站"
set "TARGET_WORKAREA=%TARGET_BASE%\workarea"
set "TARGET_ADMINS=%TARGET_BASE%\AdminS"

echo 检查源目录...
if not exist "%SOURCE_CODEX%" (
    echo 错误: 源目录不存在: %SOURCE_CODEX%
    pause
    exit /b 1
)
if not exist "%SOURCE_ADMINS%" (
    echo 错误: 源目录不存在: %SOURCE_ADMINS%
    pause
    exit /b 1
)
echo ✓ 源目录检查通过
echo.

echo 准备目标目录...
if not exist "%TARGET_BASE%" (
    echo 创建目标基础目录: %TARGET_BASE%
    mkdir "%TARGET_BASE%"
)

if exist "%TARGET_WORKAREA%" (
    echo 目标workarea目录已存在，将清空后重新复制
    set /p CONFIRM="是否继续? (Y/N): "
    if /i not "%CONFIRM%"=="Y" (
        echo 操作已取消
        pause
        exit /b 0
    )
    rmdir /s /q "%TARGET_WORKAREA%"
)
mkdir "%TARGET_WORKAREA%"
echo ✓ workarea目录已准备

if exist "%TARGET_ADMINS%" (
    echo 目标AdminS目录已存在，将清空后重新复制
    rmdir /s /q "%TARGET_ADMINS%"
)
mkdir "%TARGET_ADMINS%"
echo ✓ AdminS目录已准备
echo.

echo ========================================
echo 复制 codex -^> workarea
echo ========================================
echo 源: %SOURCE_CODEX%
echo 目标: %TARGET_WORKAREA%
echo.

robocopy "%SOURCE_CODEX%" "%TARGET_WORKAREA%" /E /XD node_modules .git dist build .cache .temp /XF *.log .DS_Store Thumbs.db /NFL /NDL /NP /NS /NC
if %ERRORLEVEL% LEQ 3 (
    echo ✓ codex项目复制完成
) else (
    echo 错误: 复制codex失败
    pause
    exit /b 1
)
echo.

echo ========================================
echo 复制 AdminS -^> AdminS
echo ========================================
echo 源: %SOURCE_ADMINS%
echo 目标: %TARGET_ADMINS%
echo.

robocopy "%SOURCE_ADMINS%" "%TARGET_ADMINS%" /E /XD node_modules .git dist build .cache .temp /XF *.log .DS_Store Thumbs.db /NFL /NDL /NP /NS /NC
if %ERRORLEVEL% LEQ 3 (
    echo ✓ AdminS项目复制完成
) else (
    echo 错误: 复制AdminS失败
    pause
    exit /b 1
)
echo.

echo ========================================
echo ✓ 所有复制操作完成!
echo ========================================
echo.
echo 下一步操作建议:
echo 1. 在workarea目录运行: npm install
echo 2. 检查复制的文件是否完整
echo 3. 根据需要更新配置文件
echo.
pause
