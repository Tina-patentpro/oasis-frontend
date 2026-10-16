@echo off
chcp 65001
echo 正在打包绿洲慧写工作区项目...

REM 创建时间戳
for /f "tokens=2-4 delims=/ " %%a in ("%date%") do set "date=%%c-%%a-%%b"
for /f "tokens=1-3 delims=:." %%a in ("%time%") do set "time=%%a-%%b-%%c"
set "timestamp=%date%_%time%"
set "timestamp=%timestamp: =0%"

REM 打包文件
powershell -Command "Compress-Archive -Path . -DestinationPath '../绿洲慧写工作区_%timestamp%.zip' -Force"

echo.
echo 打包完成！
echo 压缩包已保存到上级目录：绿洲慧写工作区_%timestamp%.zip
echo.
pause
