> **归档说明**：本文档为历史归档资料，可能不代表当前实现与当前规范；请优先以仓库当前代码、docs/CHANGELOG.md、docs/api/ 与最新审计/计划文件为准。

# 文件类型校验规则

## 概述

本文档定义了文件上传系统的类型校验规则、安全检查机制和处理策略，确保文件安全性和系统稳定性。

## 文件类型白名单

### 1. 文档类型

```yaml
PDF文档:
  mime_type: application/pdf
  extensions: [.pdf]
  max_size: 50MB
  description: PDF格式文档

Word文档:
  mime_types:
    - application/msword
    - application/vnd.openxmlformats-officedocument.wordprocessingml.document
  extensions: [.doc, .docx]
  max_size: 20MB
  description: Microsoft Word文档

Excel表格:
  mime_types:
    - application/vnd.ms-excel
    - application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
  extensions: [.xls, .xlsx]
  max_size: 20MB
  description: Microsoft Excel表格

PowerPoint演示:
  mime_types:
    - application/vnd.ms-powerpoint
    - application/vnd.openxmlformats-officedocument.presentationml.presentation
  extensions: [.ppt, .pptx]
  max_size: 50MB
  description: Microsoft PowerPoint演示

纯文本:
  mime_types:
    - text/plain
    - text/markdown
    - text/csv
    - application/json
  extensions: [.txt, .md, .csv, .json]
  max_size: 10MB
  description: 纯文本文件
```

### 2. 图片类型

```yaml
常见图片:
  mime_types:
    - image/jpeg
    - image/png
    - image/gif
    - image/webp
  extensions: [.jpg, .jpeg, .png, .gif, .webp]
  max_size: 20MB
  description: 常见图片格式

矢量图形:
  mime_types:
    - image/svg+xml
  extensions: [.svg]
  max_size: 5MB
  description: SVG矢量图形
  security_note: 需要额外安全检查

图标文件:
  mime_types:
    - image/x-icon
    - image/vnd.microsoft.icon
  extensions: [.ico, .icon]
  max_size: 2MB
  description: 网站图标文件
```

### 3. 压缩文件

```yaml
压缩包:
  mime_types:
    - application/zip
    - application/x-rar-compressed
    - application/x-7z-compressed
    - application/gzip
  extensions: [.zip, .rar, .7z, .gz]
  max_size: 100MB
  description: 压缩文件包
  security_note: 需要内容扫描
```

### 4. 音频文件

```yaml
音频文件:
  mime_types:
    - audio/mpeg
    - audio/wav
    - audio/ogg
    - audio/mp4
  extensions: [.mp3, .wav, .ogg, .m4a]
  max_size: 50MB
  description: 音频文件
```

### 5. 视频文件

```yaml
视频文件:
  mime_types:
    - video/mp4
    - video/quicktime
    - video/x-msvideo
  extensions: [.mp4, .mov, .avi]
  max_size: 200MB
  description: 视频文件
  processing_note: 需要转码处理
```

## 禁止文件类型

### 1. 可执行文件

```yaml
Windows可执行:
  extensions: [.exe, .com, .bat, .cmd, .scr, .pif]
  reason: 可执行文件存在安全风险

Unix可执行:
  extensions: [.sh, .bash, .ksh, .csh, .pl, .py, .rb]
  reason: 脚本文件可能包含恶意代码

系统文件:
  extensions: [.dll, .sys, .drv, .ocx]
  reason: 系统级文件可能危害系统安全
```

### 2. 脚本文件

```yaml
Web脚本:
  extensions: [.js, .vbs, .ps1, .php, .asp, .jsp]
  mime_types:
    - application/javascript
    - text/javascript
    - application/x-javascript
  reason: 可能包含跨站脚本攻击代码

宏文件:
  extensions: [.xlsm, .docm, .pptm]
  reason: 可能包含恶意宏代码
```

### 3. 危险文件

```yaml
配置文件:
  extensions: [.ini, .cfg, .conf, .config]
  reason: 可能包含系统配置信息

数据库文件:
  extensions: [.db, .sqlite, .mdb]
  reason: 可能包含敏感数据

磁盘镜像:
  extensions: [.iso, .img, .vhd]
  reason: 可能包含恶意软件
```

## 文件内容检查

### 1. 文件头验证

```yaml
文件头检查:
  PDF文件:
    - 必须以 %PDF- 开头
    - 检查版本号 1.4-2.0

  图片文件:
    JPEG: 检查 FF D8 FF
    PNG: 检查 89 50 4E 47
    GIF: 检查 47 49 46 38
    WebP: 检查 52 49 46 46

  压缩文件:
    ZIP: 检查 50 4B 03 04
    RAR: 检查 52 61 72 21
    7Z: 检查 37 7A BC AF
```

### 2. 内容扫描

```yaml
恶意代码检测:
  脚本注入:
    - <script> 标签
    - javascript: 协议
    - onerror= 事件
    - onload= 事件

  可疑字符串:
    - eval( 函数
    - document.cookie
    - window.location
    - XMLHttpRequest

  元数据检查:
    - EXIF数据中的GPS信息
    - 文档属性中的宏
    - 压缩包中的可执行文件
```

### 3. 文件大小检查

```yaml
大小限制策略:
  基础用户:
    单文件: 10MB
    总量: 100MB/天

  高级用户:
    单文件: 50MB
    总量: 500MB/天

  团队用户:
    单文件: 100MB
    总量: 2GB/天

  系统限制:
    最大单文件: 200MB
    最大批量: 50个文件
    并发上传: 3个/用户
```

## 文件名规则

### 1. 允许的字符

```yaml
允许字符:
  - 字母: a-z, A-Z
  - 数字: 0-9
  - 中文: \u4e00-\u9fa5
  - 特殊字符: -._()[]

禁止字符:
  - 路径字符: /\:*?"<>|
  - 控制字符: \x00-\x1f
  - Unicode特殊字符: \u202e, \u200e
```

### 2. 文件名长度

```yaml
长度限制:
  最小长度: 1个字符
  最大长度: 255个字符
  推荐长度: 50个字符以内
```

### 3. 保留文件名

```yaml
系统保留名:
  Windows:
    - CON, PRN, AUX, NUL
    - COM1-COM9, LPT1-LPT9

  Unix:
    - ., .., .htaccess
    - .git, .svn

  应用保留:
    - index.html, default.html
    - web.config, .htpasswd
```

## 病毒扫描集成

### 1. 扫描引擎配置

```yaml
ClamAV配置:
  数据库更新: 每小时
  扫描级别: 标准
  归档扫描: 启用
  最大文件大小: 100MB

云扫描服务:
  VirusTotal:
    API限制: 1000次/天
    响应时间: 30秒
    重试次数: 3次

  多引擎扫描:
    引擎数量: 5个
    一致性要求: 3/5同意
    超时时间: 60秒
```

### 2. 扫描流程

```yaml
扫描阶段:
  1. 上传前检查:
    - 文件类型验证
    - 文件名检查
    - 大小限制检查

  2. 上传时扫描:
    - 实时病毒扫描
    - 文件头验证
    - 内容快速检查

  3. 上传后扫描:
    - 深度病毒扫描
    - 恶意代码检测
    - 元数据分析

处理策略:
  清洁文件:
    - 立即标记为安全
    - 生成预览图
    - 更新索引

  可疑文件:
    - 隔离24小时
    - 人工审核
    - 附加安全标记

  感染文件:
    - 立即删除
    - 记录安全事件
    - 通知用户

  扫描失败:
    - 重试3次
    - 暂时隔离
    - 人工介入
```

## 错误处理

### 1. 错误代码

```yaml
文件类型错误:
  1001: 不支持的文件类型
  1002: 禁止的文件扩展名
  1003: MIME类型不匹配
  1004: 文件头验证失败

文件大小错误:
  2001: 文件过大
  2002: 批量上传超限
  2003: 用户配额不足
  2004: 系统存储不足

安全检查错误:
  3001: 包含恶意代码
  3002: 病毒扫描失败
  3003: 文件名包含非法字符
  3004: 内容检查失败

系统错误:
  5001: 上传服务不可用
  5002: 存储服务错误
  5003: 扫描服务超时
  5004: 内部处理错误
```

### 2. 错误响应格式

```yaml
标准错误响应:
  success: false
  error:
    code: '1001'
    message: '不支持的文件类型'
    details:
      file_type: 'application/x-executable'
      allowed_types: ['application/pdf', 'image/jpeg']
      suggestion: '请上传PDF或图片文件'
```

## 性能优化

### 1. 缓存策略

```yaml
文件类型缓存:
  缓存时间: 1小时
  缓存键: 文件扩展名 + MIME类型
  更新策略: 配置变更时清理

扫描结果缓存:
  缓存时间: 24小时
  缓存键: 文件哈希值
  清理策略: 定期清理过期记录
```

### 2. 并发控制

```yaml
上传队列:
  最大并发: 100个
  队列长度: 1000个
  超时时间: 30分钟

扫描队列:
  最大并发: 50个
  优先级: 小文件优先
  重试机制: 指数退避
```

## 监控指标

### 1. 业务指标

```yaml
上传统计:
  - 上传成功率
  - 平均上传时间
  - 文件类型分布
  - 用户使用情况

安全指标:
  - 病毒检出率
  - 恶意文件拦截数
  - 异常行为检测
  - 安全事件统计

性能指标:
  - 扫描响应时间
  - 队列等待时间
  - 系统资源使用
  - 错误率统计
```

### 2. 告警规则

```yaml
告警阈值: 上传失败率 > 5%
  扫描响应时间 > 60秒
  病毒检出数 > 10/小时
  磁盘使用率 > 80%

告警方式:
  - 邮件通知
  - 短信告警
  - 系统日志
  - 监控面板
```

## 配置管理

### 1. 配置文件

```yaml
文件: file-validation-config.yaml
更新频率: 按需更新
版本控制: Git管理
回滚机制: 支持快速回滚
```

### 2. 动态配置

```yaml
支持动态更新:
  - 文件类型白名单
  - 大小限制设置
  - 扫描引擎配置
  - 安全策略规则

更新流程: 1. 配置验证
  2. 灰度发布
  3. 全量更新
  4. 效果验证
```

---

**文档版本：** 1.0  
**创建时间：** 2025-10-23  
**负责人：** 安全团队、文件服务团队  
**审核人：** 技术负责人
