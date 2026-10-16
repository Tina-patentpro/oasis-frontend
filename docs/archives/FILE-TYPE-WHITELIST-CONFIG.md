> **归档说明**：本文档为历史归档资料，可能不代表当前实现与当前规范；请优先以仓库当前代码、docs/CHANGELOG.md、docs/api/ 与最新审计/计划文件为准。

# 文件类型白名单配置报告

## 📋 配置概览

**配置任务**：1.1.1 文件类型白名单配置  
**配置时间**：2025年10月24日 16:15  
**配置优先级**：高危  
**配置状态**：进行中  
**配置负责人**：赵六 (文件负责人)  
**联系方式**：zhaoliu@company.com  
**task_progress**：0%

---

## 🎯 配置目标

### 1. 配置描述

- **配置类型**：文件类型安全验证配置
- **配置位置**：文件上传验证系统
- **风险等级**：高危
- **影响范围**：所有涉及文件上传的功能
- **配置范围**：系统级文件类型白名单策略

### 2. 配置目标

- **目标1**：建立安全的文件类型白名单机制
- **目标2**：实现严格的文件类型验证和拒绝
- **目标3**：支持动态白名单更新和管理
- **目标4**：提供详细的配置管理和审计功能

---

## 🔍 配置实施方案

### 1. 文件类型白名单定义

#### 1.1 允许的文件类型列表

```typescript
// 文件类型白名单配置
export class FileWhitelistConfig {
  private allowedFileTypes: Map<string, FileTypeConfig>;
  private fileCategories: Map<string, FileCategoryConfig>;
  private securityLevels: Map<string, SecurityLevelConfig>;

  constructor() {
    this.allowedFileTypes = new Map();
    this.fileCategories = new Map();
    this.securityLevels = new Map();
    this.initializeWhitelist();
  }

  // 初始化白名单
  private initializeWhitelist(): void {
    // 文档类型
    this.addFileType('pdf', {
      category: 'document',
      mimeType: 'application/pdf',
      maxSize: 50 * 1024 * 1024, // 50MB
      description: 'PDF文档',
      securityLevel: 'low',
      allowed: true,
      requiresScan: false
    });

    this.addFileType('doc', {
      category: 'document',
      mimeType: 'application/msword',
      maxSize: 10 * 1024 * 1024, // 10MB
      description: 'Word文档',
      securityLevel: 'low',
      allowed: true,
      requiresScan: true
    });

    this.addFileType('docx', {
      category: 'document',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      maxSize: 10 * 1024 * 1024, // 10MB
      description: 'Word文档',
      securityLevel: 'low',
      allowed: true,
      requiresScan: true
    });

    this.addFileType('xls', {
      category: 'document',
      mimeType: 'application/vnd.ms-excel',
      maxSize: 10 * 1024 * 1024, // 10MB
      description: 'Excel文档',
      securityLevel: 'medium',
      allowed: true,
      requiresScan: true
    });

    this.addFileType('xlsx', {
      category: 'document',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      maxSize: 10 * 1024 * 1024, // 10MB
      description: 'Excel文档',
      securityLevel: 'medium',
      allowed: true,
      requiresScan: true
    });

    this.addFileType('ppt', {
      category: 'document',
      mimeType: 'application/vnd.ms-powerpoint',
      maxSize: 20 * 1024 * 1024, // 20MB
      description: 'PowerPoint文档',
      securityLevel: 'medium',
      allowed: true,
      requiresScan: true
    });

    this.addFileType('pptx', {
      category: 'document',
      mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      maxSize: 20 * 1024 * 1024, // 20MB
      description: 'PowerPoint文档',
      securityLevel: 'medium',
      allowed: true,
      requiresScan: true
    });

    // 图片类型
    this.addFileType('jpg', {
      category: 'image',
      mimeType: 'image/jpeg',
      maxSize: 10 * 1024 * 1024, // 10MB
      description: 'JPEG图片',
      securityLevel: 'low',
      allowed: true,
      requiresScan: true
    });

    this.addFileType('jpeg', {
      category: 'image',
      mimeType: 'image/jpeg',
      maxSize: 10 * 1024 * 1024, // 10MB
      description: 'JPEG图片',
      securityLevel: 'low',
      allowed: true,
      requiresScan: true
    });

    this.addFileType('png', {
      category: 'image',
      mimeType: 'image/png',
      maxSize: 10 * 1024 * 1024, // 10MB
      description: 'PNG图片',
      securityLevel: 'low',
      allowed: true,
      requiresScan: true
    });

    this.addFileType('gif', {
      category: 'image',
      mimeType: 'image/gif',
      maxSize: 5 * 1024 * 1024, // 5MB
      description: 'GIF图片',
      securityLevel: 'low',
      allowed: true,
      requiresScan: true
    });

    this.addFileType('bmp', {
      category: 'image',
      mimeType: 'image/bmp',
      maxSize: 5 * 1024 * 1024, // 5MB
      description: 'BMP图片',
      securityLevel: 'low',
      allowed: true,
      requiresScan: true
    });

    this.addFileType('svg', {
      category: 'image',
      mimeType: 'image/svg+xml',
      maxSize: 1 * 1024 * 1024, // 1MB
      description: 'SVG图片',
      securityLevel: 'medium',
      allowed: true,
      requiresScan: true
    });

    this.addFileType('webp', {
      category: 'image',
      mimeType: 'image/webp',
      maxSize: 10 * 1024 * 1024, // 10MB
      description: 'WebP图片',
      securityLevel: 'low',
      allowed: true,
      requiresScan: true
    });

    // 视频类型
    this.addFileType('mp4', {
      category: 'video',
      mimeType: 'video/mp4',
      maxSize: 500 * 1024 * 1024, // 500MB
      description: 'MP4视频',
      securityLevel: 'medium',
      allowed: true,
      requiresScan: true
    });

    this.addFileType('avi', {
      category: 'video',
      mimeType: 'video/x-msvideo',
      maxSize: 500 * 1024 * 1024, // 500MB
      description: 'AVI视频',
      securityLevel: 'medium',
      allowed: true,
      requiresScan: true
    });

    this.addFileType('mov', {
      category: 'video',
      mimeType: 'video/quicktime',
      maxSize: 500 * 1024 * 1024, // 500MB
      description: 'MOV视频',
      securityLevel: 'medium',
      allowed: true,
      requiresScan: true
    });

    // 音频类型
    this.addFileType('mp3', {
      category: 'audio',
      mimeType: 'audio/mpeg',
      maxSize: 50 * 1024 * 1024, // 50MB
      description: 'MP3音频',
      securityLevel: 'low',
      allowed: true,
      requiresScan: true
    });

    this.addFileType('wav', {
      category: 'audio',
      mimeType: 'audio/wav',
      maxSize: 50 * 1024 * 1024, // 50MB
      description: 'WAV音频',
      securityLevel: 'low',
      allowed: true,
      requiresScan: true
    });

    this.addFileType('aac', {
      category: 'audio',
      mimeType: 'audio/aac',
      maxSize: 50 * 1024 * 1024, // 50MB
      description: 'AAC音频',
      securityLevel: 'low',
      allowed: true,
      requiresScan: true
    });

    // 压缩文件类型
    this.addFileType('zip', {
      category: 'archive',
      mimeType: 'application/zip',
      maxSize: 100 * 1024 * 1024, // 100MB
      description: 'ZIP压缩包',
      securityLevel: 'high',
      allowed: true,
      requiresScan: true
    });

    this.addFileType('rar', {
      category: 'archive',
      mimeType: 'application/x-rar-compressed',
      maxSize: 100 * 1024 * 1024, // 100MB
      description: 'RAR压缩包',
      securityLevel: 'high',
      allowed: true,
      requiresScan: true
    });

    this.addFileType('7z', {
      category: 'archive',
      mimeType: 'application/x-7z-compressed',
      maxSize: 100 * 1024 * 1024, // 100MB
      description: '7Z压缩包',
      securityLevel: 'high',
      allowed: true,
      requiresScan: true
    });

    this.addFileType('tar', {
      category: 'archive',
      mimeType: 'application/x-tar',
      maxSize: 100 * 1024 * 1024, // 100MB
      description: 'TAR压缩包',
      securityLevel: 'medium',
      allowed: true,
      requiresScan: true
    });

    this.addFileType('gz', {
      category: 'archive',
      mimeType: 'application/gzip',
      maxSize: 100 * 1024 * 1024, // 100MB
      description: 'GZIP压缩包',
      securityLevel: 'medium',
      allowed: true,
      requiresScan: true
    });

    // 代码文件类型
    this.addFileType('js', {
      category: 'code',
      mimeType: 'text/javascript',
      maxSize: 5 * 1024 * 1024, // 5MB
      description: 'JavaScript文件',
      securityLevel: 'high',
      allowed: false, // 默认不允许，特殊情况下需要管理员审批
      requiresScan: true,
      requiresApproval: true
    });

    this.addFileType('ts', {
      category: 'code',
      mimeType: 'text/typescript',
      maxSize: 5 * 1024 * 1024, // 5MB
      description: 'TypeScript文件',
      securityLevel: 'high',
      allowed: false, // 默认不允许，特殊情况下需要管理员审批
      requiresScan: true,
      requiresApproval: true
    });

    this.addFileType('html', {
      category: 'code',
      mimeType: 'text/html',
      maxSize: 1 * 1024 * 1024, // 1MB
      description: 'HTML文件',
      securityLevel: 'high',
      allowed: false, // 默认不允许，特殊情况下需要管理员审批
      requiresScan: true,
      requiresApproval: true
    });

    this.addFileType('css', {
      category: 'code',
      mimeType: 'text/css',
      maxSize: 1 * 1024 * 1024, // 1MB
      description: 'CSS文件',
      securityLevel: 'medium',
      allowed: false, // 默认不允许，特殊情况下需要管理员审批
      requiresScan: true,
      requiresApproval: true
    });

    // 文本文件类型
    this.addFileType('txt', {
      category: 'text',
      mimeType: 'text/plain',
      maxSize: 10 * 1024 * 1024, // 10MB
      description: '文本文件',
      securityLevel: 'low',
      allowed: true,
      requiresScan: false
    });

    this.addFileType('md', {
      category: 'text',
      mimeType: 'text/markdown',
      maxSize: 5 * 1024 * 1024, // 5MB
      description: 'Markdown文件',
      securityLevel: 'low',
      allowed: true,
      requiresScan: false
    });

    this.addFileType('csv', {
      category: 'text',
      mimeType: 'text/csv',
      maxSize: 10 * 1024 * 1024, // 10MB
      description: 'CSV文件',
      securityLevel: 'medium',
      allowed: true,
      requiresScan: true
    });

    // 禁止的文件类型（明确禁止）
    this.addFileType('exe', {
      category: 'executable',
      mimeType: 'application/x-msdownload',
      maxSize: 0, // 完全禁止
      description: '可执行文件',
      securityLevel: 'critical',
      allowed: false,
      requiresScan: false,
      blocked: true
    });

    this.addFileType('bat', {
      category: 'executable',
      mimeType: 'text/plain',
      maxSize: 0, // 完全禁止
      description: '批处理文件',
      securityLevel: 'critical',
      allowed: false,
      requiresScan: false,
      blocked: true
    });

    this.addFileType('sh', {
      category: 'executable',
      mimeType: 'text/plain',
      maxSize: 0, // 完全禁止
      description: 'Shell脚本文件',
      securityLevel: 'critical',
      allowed: false,
      requiresScan: false,
      blocked: true
    });

    this.addFileType('scr', {
      category: 'executable',
      mimeType: 'text/plain',
      maxSize: 0, // 完全禁止
      description: '屏幕录制文件',
      securityLevel: 'critical',
      allowed: false,
      requiresScan: false,
      blocked: true
    });
  }

  // 添加文件类型配置
  private addFileType(extension: string, config: FileTypeConfig): void {
    this.allowedFileTypes.set(extension.toLowerCase(), config);
  }

  // 获取文件类型配置
  public getFileTypeConfig(extension: string): FileTypeConfig | null {
    return this.allowedFileTypes.get(extension.toLowerCase()) || null;
  }

  // 检查文件类型是否允许
  public isFileTypeAllowed(extension: string): boolean {
    const config = this.getFileTypeConfig(extension);
    return config ? config.allowed : false;
  }

  // 检查文件类型是否被阻止
  public isFileTypeBlocked(extension: string): boolean {
    const config = this.getFileTypeConfig(extension);
    return config ? config.blocked === true : false;
  }

  // 获取文件类型的安全等级
  public getFileTypeSecurityLevel(extension: string): string {
    const config = this.getFileTypeConfig(extension);
    return config ? config.securityLevel : 'unknown';
  }

  // 检查文件类型是否需要扫描
  public requiresFileTypeScan(extension: string): boolean {
    const config = this.getFileTypeConfig(extension);
    return config ? config.requiresScan : false;
  }

  // 检查文件类型是否需要审批
  public requiresFileTypeApproval(extension: string): boolean {
    const config = this.getFileTypeConfig(extension);
    return config ? config.requiresApproval === true : false;
  }

  // 验证文件大小限制
  public validateFileSize(extension: string, fileSize: number): boolean {
    const config = this.getFileTypeConfig(extension);
    if (!config) return false;

    return fileSize <= config.maxSize;
  }

  // 获取允许的文件类型列表
  public getAllowedFileTypes(): string[] {
    const allowedTypes: string[] = [];

    for (const [extension, config] of this.allowedFileTypes) {
      if (config.allowed && !config.blocked) {
        allowedTypes.push(extension);
      }
    }

    return allowedTypes;
  }

  // 获取被阻止的文件类型列表
  public getBlockedFileTypes(): string[] {
    const blockedTypes: string[] = [];

    for (const [extension, config] of this.allowedFileTypes) {
      if (config.blocked) {
        blockedTypes.push(extension);
      }
    }

    return blockedTypes;
  }

  // 更新文件类型配置
  public updateFileTypeConfig(extension: string, updates: Partial<FileTypeConfig>): boolean {
    const existingConfig = this.getFileTypeConfig(extension);
    if (!existingConfig) return false;

    const updatedConfig = { ...existingConfig, ...updates };
    this.allowedFileTypes.set(extension.toLowerCase(), updatedConfig);

    return true;
  }

  // 添加新的文件类型
  public addNewFileType(extension: string, config: FileTypeConfig): boolean {
    if (this.getFileTypeConfig(extension)) {
      return false; // 文件类型已存在
    }

    this.addFileType(extension, config);
    return true;
  }

  // 移除文件类型
  public removeFileType(extension: string): boolean {
    return this.allowedFileTypes.delete(extension.toLowerCase());
  }

  // 批量更新文件类型配置
  public batchUpdateFileTypes(updates: Array<{extension: string, config: Partial<FileTypeConfig>}): boolean {
    let successCount = 0;

    for (const update of updates) {
      if (this.updateFileTypeConfig(update.extension, update.config)) {
        successCount++;
      }
    }

    return successCount === updates.length;
  }

  // 导出配置
  public exportConfig(): any {
    const config = {
      allowedFileTypes: {},
      fileCategories: {},
      securityLevels: {},
      metadata: {
        version: '1.0',
        lastUpdated: new Date().toISOString(),
        totalFileTypes: this.allowedFileTypes.size
      }
    };

    // 导出文件类型配置
    for (const [extension, typeConfig] of this.allowedFileTypes) {
      config.allowedFileTypes[extension] = typeConfig;
    }

    // 导出分类配置
    for (const [category, categoryConfig] of this.fileCategories) {
      config.fileCategories[category] = categoryConfig;
    }

    // 导出安全等级配置
    for (const [level, levelConfig] of this.securityLevels) {
      config.securityLevels[level] = levelConfig;
    }

    return config;
  }

  // 导入配置
  public importConfig(config: any): boolean {
    try {
      // 验证配置格式
      if (!config || !config.allowedFileTypes) {
        return false;
      }

      // 清空现有配置
      this.allowedFileTypes.clear();

      // 导入文件类型配置
      for (const [extension, typeConfig] of Object.entries(config.allowedFileTypes)) {
        this.addFileType(extension, typeConfig as FileTypeConfig);
      }

      // 导入其他配置（如果存在）
      if (config.fileCategories) {
        for (const [category, categoryConfig] of Object.entries(config.fileCategories)) {
          this.fileCategories.set(category, categoryConfig as FileCategoryConfig);
        }
      }

      if (config.securityLevels) {
        for (const [level, levelConfig] of Object.entries(config.securityLevels)) {
          this.securityLevels.set(level, levelConfig as SecurityLevelConfig);
        }
      }

      return true;
    } catch (error) {
      console.error('Failed to import file type whitelist config:', error);
      return false;
    }
  }
}

// 文件类型配置接口
interface FileTypeConfig {
  category: string;
  mimeType: string;
  maxSize: number;
  description: string;
  securityLevel: string;
  allowed: boolean;
  requiresScan: boolean;
  requiresApproval?: boolean;
  blocked?: boolean;
  customValidations?: string[];
  allowedUsers?: string[];
  allowedRoles?: string[];
  timeRestrictions?: TimeRestrictions;
}

// 文件分类配置接口
interface FileCategoryConfig {
  name: string;
  description: string;
  securityLevel: string;
  defaultAllowed: boolean;
  requiresScan: boolean;
  maxTotalSize?: number;
  maxFilesPerDay?: number;
}

// 安全等级配置接口
interface SecurityLevelConfig {
  name: string;
  description: string;
  riskScore: number;
  requiresManualReview: boolean;
  requiresAdditionalScanning: boolean;
  alertThresholds: AlertThresholds;
}

// 时间限制配置接口
interface TimeRestrictions {
  allowedDays?: number[];
  allowedHours?: number[];
  allowedTimezones?: string[];
  maxUploadsPerHour?: number;
  maxUploadsPerDay?: number;
}

// 告警阈值配置接口
interface AlertThresholds {
  suspiciousUploadsPerHour?: number;
  blockedUploadsPerHour?: number;
  scanFailureRate?: number;
  unusualFileTypeDetections?: number;
}
```

#### 1.2 文件类型验证规则

```typescript
// 文件类型验证器
export class FileTypeValidator {
  private whitelistConfig: FileWhitelistConfig
  private securityScanner: FileSecurityScanner
  private auditLogger: AuditLogger

  constructor() {
    this.whitelistConfig = new FileWhitelistConfig()
    this.securityScanner = new FileSecurityScanner()
    this.auditLogger = new AuditLogger()
  }

  // 验证文件类型
  async validateFileType(file: Express.Multer.File): Promise<FileValidationResult> {
    const result: FileValidationResult = {
      isValid: false,
      errors: [],
      warnings: [],
      securityLevel: 'unknown',
      requiresScan: false,
      requiresApproval: false,
      blocked: false,
    }

    try {
      // 1. 获取文件扩展名
      const extension = this.getFileExtension(file.originalname)
      if (!extension) {
        result.errors.push('无法确定文件类型')
        return result
      }

      // 2. 检查文件类型是否被明确阻止
      if (this.whitelistConfig.isFileTypeBlocked(extension)) {
        result.blocked = true
        result.errors.push(`文件类型 ${extension} 被系统阻止`)
        result.securityLevel = 'critical'
        await this.logSecurityEvent('FILE_TYPE_BLOCKED', file, extension)
        return result
      }

      // 3. 检查文件类型是否在白名单中
      if (!this.whitelistConfig.isFileTypeAllowed(extension)) {
        result.errors.push(`文件类型 ${extension} 不在允许列表中`)
        result.securityLevel = 'high'
        await this.logSecurityEvent('FILE_TYPE_NOT_ALLOWED', file, extension)
        return result
      }

      // 4. 获取文件类型配置
      const fileConfig = this.whitelistConfig.getFileTypeConfig(extension)
      if (!fileConfig) {
        result.errors.push(`无法找到文件类型 ${extension} 的配置`)
        result.securityLevel = 'medium'
        await this.logSecurityEvent('FILE_TYPE_CONFIG_MISSING', file, extension)
        return result
      }

      // 5. 验证文件大小
      if (!this.whitelistConfig.validateFileSize(extension, file.size)) {
        result.errors.push(`文件大小 ${file.size} 超过限制 ${fileConfig.maxSize}`)
        result.warnings.push(`文件大小超过建议限制，请考虑压缩文件`)
        result.securityLevel = fileConfig.securityLevel
      } else {
        result.isValid = true
      }

      // 6. 检查文件类型的安全要求
      result.securityLevel = fileConfig.securityLevel
      result.requiresScan = fileConfig.requiresScan
      result.requiresApproval = fileConfig.requiresApproval || false

      // 7. 检查自定义验证规则
      if (fileConfig.customValidations) {
        const customValidationResult = await this.validateCustomRules(
          file,
          fileConfig.customValidations,
        )
        if (!customValidationResult.isValid) {
          result.errors.push(...customValidationResult.errors)
          result.warnings.push(...customValidationResult.warnings)
        }
      }

      // 8. 检查用户权限和时间限制
      const authValidationResult = await this.validateUserPermissions(file, fileConfig)
      if (!authValidationResult.isValid) {
        result.errors.push(...authValidationResult.errors)
        result.requiresApproval = true
      }

      const timeValidationResult = await this.validateTimeRestrictions(file, fileConfig)
      if (!timeValidationResult.isValid) {
        result.errors.push(...timeValidationResult.errors)
        result.warnings.push(...timeValidationResult.warnings)
      }

      // 9. 如果所有基础验证通过，设置isValid
      if (result.errors.length === 0) {
        result.isValid = true
      }

      // 10. 记录验证日志
      await this.logValidationResult(file, result)

      return result
    } catch (error) {
      console.error('File type validation error:', error)
      result.errors.push(`文件类型验证过程中发生错误: ${error.message}`)
      await this.logValidationError(file, error)
      return result
    }
  }

  // 获取文件扩展名
  private getFileExtension(filename: string): string {
    const lastDot = filename.lastIndexOf('.')
    if (lastDot === -1 || lastDot === filename.length - 1) {
      return '' // 没有扩展名
    }
    return filename.substring(lastDot + 1).toLowerCase()
  }

  // 验证自定义规则
  private async validateCustomRules(
    file: Express.Multer.File,
    rules: string[],
  ): Promise<CustomValidationResult> {
    const result: CustomValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
    }

    for (const rule of rules) {
      try {
        // 这里可以添加各种自定义验证规则
        switch (rule) {
          case 'no_executable_content':
            const executableValidationResult = await this.validateNoExecutableContent(file)
            if (!executableValidationResult.isValid) {
              result.errors.push(executableValidationResult.error)
              result.isValid = false
            }
            break

          case 'no_script_content':
            const scriptValidationResult = await this.validateNoScriptContent(file)
            if (!scriptValidationResult.isValid) {
              result.errors.push(scriptValidationResult.error)
              result.isValid = false
            }
            break

          case 'no_hidden_files':
            const hiddenFilesValidationResult = await this.validateNoHiddenFiles(file)
            if (!hiddenFilesValidationResult.isValid) {
              result.errors.push(hiddenFilesValidationResult.error)
              result.isValid = false
            }
            break

          case 'file_structure_validation':
            const structureValidationResult = await this.validateFileStructure(file)
            if (!structureValidationResult.isValid) {
              result.errors.push(structureValidationResult.error)
              result.isValid = false
            }
            break

          default:
            result.warnings.push(`未知的自定义验证规则: ${rule}`)
        }
      } catch (error) {
        result.errors.push(`自定义验证规则 ${rule} 执行失败: ${error.message}`)
        result.isValid = false
      }
    }

    return result
  }

  // 验证无可执行内容
  private async validateNoExecutableContent(file: Express.Multer.File): Promise<ValidationResult> {
    const result: ValidationResult = { isValid: true, error: '' }

    try {
      const fileBuffer = await this.readFileBuffer(file)
      const content = fileBuffer.toString('binary')

      // 检查PE文件头
      if (content.startsWith('MZ')) {
        result.isValid = false
        result.error = '检测到PE文件头，可能是可执行文件'
      }

      // 检查ELF文件头
      if (content.startsWith('\x7fELF')) {
        result.isValid = false
        result.error = '检测到ELF文件头，可能是可执行文件'
      }

      // 检查脚本文件开头
      const scriptPatterns = [
        '#!/bin/bash',
        '#!/usr/bin/env',
        '#!/usr/bin/perl',
        '#!/usr/bin/python',
        '#!/usr/bin/node',
        '#!/bin/sh',
        '@echo off',
        '%~dp0',
      ]

      const contentStart = content.substring(0, 1024).toLowerCase()
      for (const pattern of scriptPatterns) {
        if (contentStart.includes(pattern.toLowerCase())) {
          result.isValid = false
          result.error = `检测到脚本文件开头模式: ${pattern}`
          break
        }
      }
    } catch (error) {
      result.error = `可执行内容验证失败: ${error.message}`
      result.isValid = false
    }

    return result
  }

  // 验证无脚本内容
  private async validateNoScriptContent(file: Express.Multer.File): Promise<ValidationResult> {
    const result: ValidationResult = { isValid: true, error: '' }

    try {
      const fileBuffer = await this.readFileBuffer(file)
      const content = fileBuffer.toString('binary')
      const contentLower = content.toLowerCase()

      // 检查常见的脚本关键字
      const scriptKeywords = [
        'javascript:',
        'vbscript:',
        'jscript:',
        'eval(',
        'exec(',
        'system(',
        'shell_exec',
        'passthru',
        '<script',
        '</script>',
        'function(',
        'var ',
        'let ',
        'const ',
        'import ',
        'require(',
        'export ',
      ]

      for (const keyword of scriptKeywords) {
        if (contentLower.includes(keyword)) {
          result.isValid = false
          result.error = `检测到脚本关键字: ${keyword}`
          break
        }
      }
    } catch (error) {
      result.error = `脚本内容验证失败: ${error.message}`
      result.isValid = false
    }

    return result
  }

  // 验证无隐藏文件
  private async validateNoHiddenFiles(file: Express.Multer.File): Promise<ValidationResult> {
    const result: ValidationResult = { isValid: true, error: '' }

    try {
      // 检查文件名中是否有隐藏文件的标识
      const filename = file.originalname
      const hiddenFilePatterns = [
        '.', // Unix隐藏文件
        'Thumbs.db', // macOS缩略图数据库
        '.DS_Store', // macOS系统文件
        'desktop.ini', // Windows桌面配置
        'folder.jpg', // Windows缩略图
        'folder.png', // Windows缩略图
        '.git', // Git配置目录
        '.svn', // SVN配置目录
        '.idea', // IntelliJ配置目录
        '.vscode', // VS Code配置目录
        'node_modules', // Node.js依赖目录
        '.env', // 环境配置文件
        'package-lock.json', // NPM锁定文件
      ]

      for (const pattern of hiddenFilePatterns) {
        if (filename === pattern || filename.startsWith(pattern)) {
          result.isValid = false
          result.error = `检测到隐藏文件模式: ${pattern}`
          break
        }
      }
    } catch (error) {
      result.error = `隐藏文件验证失败: ${error.message}`
      result.isValid = false
    }

    return result
  }

  // 验证文件结构
  private async validateFileStructure(file: Express.Multer.File): Promise<ValidationResult> {
    const result: ValidationResult = { isValid: true, error: '' }

    try {
      const filename = file.originalname.toLowerCase()

      // 检查ZIP文件中的潜在风险结构
      if (filename.endsWith('.zip')) {
        const zipStructureValidationResult = await this.validateZipStructure(file)
        if (!zipStructureValidationResult.isValid) {
          result.error = zipStructureValidationResult.error
          result.isValid = false
        }
      }

      // 检查PDF文件中的潜在风险结构
      if (filename.endsWith('.pdf')) {
        const pdfStructureValidationResult = await this.validatePdfStructure(file)
        if (!pdfStructureValidationResult.isValid) {
          result.error = pdfStructureValidationResult.error
          result.isValid = false
        }
      }

      // 检查Office文档中的潜在风险结构
      if (filename.match(/\.(doc|docx|xls|xlsx|ppt|pptx)$/)) {
        const officeStructureValidationResult = await this.validateOfficeStructure(file)
        if (!officeStructureValidationResult.isValid) {
          result.error = officeStructureValidationResult.error
          result.isValid = false
        }
      }
    } catch (error) {
      result.error = `文件结构验证失败: ${error.message}`
      result.isValid = false
    }

    return result
  }

  // 验证ZIP文件结构
  private async validateZipStructure(file: Express.Multer.File): Promise<ValidationResult> {
    const result: ValidationResult = { isValid: true, error: '' }

    try {
      const fileBuffer = await this.readFileBuffer(file)
      const zip = await this.extractZip(fileBuffer)

      // 检查ZIP中是否有危险文件
      const dangerousFiles = await this.scanZipForDangerousFiles(zip)
      if (dangerousFiles.length > 0) {
        result.isValid = false
        result.error = `ZIP中包含危险文件: ${dangerousFiles.join(', ')}`
      }

      // 检查ZIP深度（防止ZIP炸弹）
      const depthResult = await this.checkZipDepth(zip)
      if (!depthResult.isValid) {
        result.error = depthResult.error
        result.isValid = false
      }

      // 检查ZIP压缩比（防止压缩炸弹）
      const compressionRatioResult = await this.checkZipCompressionRatio(zip, fileBuffer.length)
      if (!compressionRatioResult.isValid) {
        result.error = compressionRatioResult.error
        result.isValid = false
      }
    } catch (error) {
      result.error = `ZIP结构验证失败: ${error.message}`
      result.isValid = false
    }

    return result
  }

  // 验证PDF文件结构
  private async validatePdfStructure(file: Express.Multer.File): Promise<ValidationResult> {
    const result: ValidationResult = { isValid: true, error: '' }

    try {
      const fileBuffer = await this.readFileBuffer(file)

      // 检查PDF中的JavaScript或恶意内容
      const pdfContentCheck = await this.scanPdfForMaliciousContent(fileBuffer)
      if (!pdfContentCheck.isValid) {
        result.error = pdfContentCheck.error
        result.isValid = false
      }

      // 检查PDF中的恶意链接
      const pdfLinkCheck = await this.scanPdfForMaliciousLinks(fileBuffer)
      if (!pdfLinkCheck.isValid) {
        result.error = pdfLinkCheck.error
        result.isValid = false
      }

      // 检查PDF中的恶意表单
      const pdfFormCheck = await this.scanPdfForMaliciousForms(fileBuffer)
      if (!pdfFormCheck.isValid) {
        result.error = pdfFormCheck.error
        result.isValid = false
      }
    } catch (error) {
      result.error = `PDF结构验证失败: ${error.message}`
      result.isValid = false
    }

    return result
  }

  // 验证Office文档结构
  private async validateOfficeStructure(file: Express.Multer.File): Promise<ValidationResult> {
    const result: ValidationResult = { isValid: true, error: '' }

    try {
      const fileBuffer = await this.readFileBuffer(file)

      // 检查Office文档中的宏
      const macroCheck = await this.scanOfficeForMacros(fileBuffer)
      if (!macroCheck.isValid) {
        result.error = macroCheck.error
        result.isValid = false
      }

      // 检查Office文档中的恶意内容
      const contentCheck = await this.scanOfficeForMaliciousContent(fileBuffer)
      if (!contentCheck.isValid) {
        result.error = contentCheck.error
        result.isValid = false
      }

      // 检查Office文档中的恶意链接
      const linkCheck = await this.scanOfficeForMaliciousLinks(fileBuffer)
      if (!linkCheck.isValid) {
        result.error = linkCheck.error
        result.isValid = false
      }
    } catch (error) {
      result.error = `Office结构验证失败: ${error.message}`
      result.isValid = false
    }

    return result
  }

  // 读取文件缓冲区
  private async readFileBuffer(file: Express.Multer.File): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = []
      file.on('data', (chunk) => chunks.push(chunk))
      file.on('end', () => resolve(Buffer.concat(chunks)))
      file.on('error', reject)
    })
  }

  // 记录安全事件
  private async logSecurityEvent(
    eventType: string,
    file: Express.Multer.File,
    details: string,
  ): Promise<void> {
    const securityEvent = {
      timestamp: new Date().toISOString(),
      eventType,
      fileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
      details,
      clientIP: this.getClientIP(file),
      userAgent: this.getUserAgent(file),
    }

    this.auditLogger.logSecurityEvent(securityEvent)
  }

  // 记录验证错误
  private async logValidationError(file: Express.Multer.File, error: Error): Promise<void> {
    const validationError = {
      timestamp: new Date().toISOString(),
      fileName: file.originalname,
      fileSize: file.size,
      errorMessage: error.message,
      stackTrace: error.stack,
      clientIP: this.getClientIP(file),
      userAgent: this.getUserAgent(file),
    }

    this.auditLogger.logValidationError(validationError)
  }

  // 获取客户端IP
  private getClientIP(req: Express.Multer.File): string {
    // 从请求中获取客户端IP地址
    return req.ip || req.connection.remoteAddress || 'unknown'
  }

  // 获取用户代理
  private getUserAgent(req: Express.Multer.File): string {
    // 从请求中获取用户代理信息
    return req.get('User-Agent') || 'unknown'
  }
}

// 验证结果接口
interface ValidationResult {
  isValid: boolean
  error: string
}

// 自定义验证结果接口
interface CustomValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}
```

#### 1.3 动态白名单管理

```typescript
// 动态白名单管理器
export class DynamicWhitelistManager {
  private whitelistConfig: FileWhitelistConfig
  private database: DatabaseManager
  private cacheManager: CacheManager
  private auditLogger: AuditLogger

  constructor() {
    this.whitelistConfig = new FileWhitelistConfig()
    this.database = new DatabaseManager()
    this.cacheManager = new CacheManager()
    this.auditLogger = new AuditLogger()
  }

  // 动态添加文件类型
  async addFileTypeDynamically(
    extension: string,
    config: FileTypeConfig,
    adminId: string,
    reason: string,
  ): Promise<boolean> {
    try {
      // 1. 验证管理员权限
      const hasPermission = await this.validateAdminPermission(adminId)
      if (!hasPermission) {
        throw new Error('管理员权限不足')
      }

      // 2. 验证配置有效性
      const validationResult = this.validateFileConfig(config)
      if (!validationResult.isValid) {
        throw new Error(`配置验证失败: ${validationResult.errors.join(', ')}`)
      }

      // 3. 检查文件类型是否已存在
      const existingConfig = this.whitelistConfig.getFileTypeConfig(extension)
      if (existingConfig) {
        throw new Error(`文件类型 ${extension} 已存在`)
      }

      // 4. 记录配置变更
      const changeRecord = {
        action: 'ADD_FILE_TYPE',
        extension,
        config,
        adminId,
        reason,
        timestamp: new Date().toISOString(),
        status: 'PENDING',
      }

      const recordId = await this.database.insertWhitelistChange(changeRecord)

      try {
        // 5. 更新白名单配置
        const success = this.whitelistConfig.addNewFileType(extension, config)

        if (success) {
          // 6. 更新记录状态
          await this.database.updateWhitelistChange(recordId, {
            status: 'COMPLETED',
            completedAt: new Date().toISOString(),
          })

          // 7. 清除缓存
          await this.cacheManager.clearWhitelistCache()

          // 8. 记录审计日志
          await this.auditLogger.logWhitelistChange({
            action: 'FILE_TYPE_ADDED',
            extension,
            config,
            adminId,
            reason,
            success: true,
            timestamp: new Date().toISOString(),
          })

          return true
        } else {
          throw new Error('添加文件类型失败')
        }
      } catch (error) {
        // 9. 更新记录状态为失败
        await this.database.updateWhitelistChange(recordId, {
          status: 'FAILED',
          error: error.message,
          completedAt: new Date().toISOString(),
        })

        throw error
      }
    } catch (error) {
      // 10. 记录错误日志
      await this.auditLogger.logWhitelistChange({
        action: 'ADD_FILE_TYPE',
        extension,
        config,
        adminId,
        reason,
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      })

      throw error
    }
  }

  // 动态移除文件类型
  async removeFileTypeDynamically(
    extension: string,
    adminId: string,
    reason: string,
  ): Promise<boolean> {
    try {
      // 1. 验证管理员权限
      const hasPermission = await this.validateAdminPermission(adminId)
      if (!hasPermission) {
        throw new Error('管理员权限不足')
      }

      // 2. 检查文件类型是否存在
      const existingConfig = this.whitelistConfig.getFileTypeConfig(extension)
      if (!existingConfig) {
        throw new Error(`文件类型 ${extension} 不存在`)
      }

      // 3. 记录配置变更
      const changeRecord = {
        action: 'REMOVE_FILE_TYPE',
        extension,
        oldConfig: existingConfig,
        adminId,
        reason,
        timestamp: new Date().toISOString(),
        status: 'PENDING',
      }

      const recordId = await this.database.insertWhitelistChange(changeRecord)

      try {
        // 4. 移除文件类型配置
        const success = this.whitelistConfig.removeFileType(extension)

        if (success) {
          // 5. 更新记录状态
          await this.database.updateWhitelistChange(recordId, {
            status: 'COMPLETED',
            completedAt: new Date().toISOString(),
          })

          // 6. 清除缓存
          await this.cacheManager.clearWhitelistCache()

          // 7. 记录审计日志
          await this.auditLogger.logWhitelistChange({
            action: 'FILE_TYPE_REMOVED',
            extension,
            oldConfig: existingConfig,
            adminId,
            reason,
            success: true,
            timestamp: new Date().toISOString(),
          })

          return true
        } else {
          throw new Error('移除文件类型失败')
        }
      } catch (error) {
        // 8. 更新记录状态为失败
        await this.database.updateWhitelistChange(recordId, {
          status: 'FAILED',
          error: error.message,
          completedAt: new Date().toISOString(),
        })

        throw error
      }
    } catch (error) {
      // 9. 记录错误日志
      await this.auditLogger.logWhitelistChange({
        action: 'REMOVE_FILE_TYPE',
        extension,
        oldConfig: existingConfig || null,
        adminId,
        reason,
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      })

      throw error
    }
  }

  // 动态更新文件类型配置
  async updateFileTypeDynamically(
    extension: string,
    updates: Partial<FileTypeConfig>,
    adminId: string,
    reason: string,
  ): Promise<boolean> {
    try {
      // 1. 验证管理员权限
      const hasPermission = await this.validateAdminPermission(adminId)
      if (!hasPermission) {
        throw new Error('管理员权限不足')
      }

      // 2. 验证更新内容
      const validationResult = this.validateFileConfigUpdates(updates)
      if (!validationResult.isValid) {
        throw new Error(`更新内容验证失败: ${validationResult.errors.join(', ')}`)
      }

      // 3. 获取现有配置
      const existingConfig = this.whitelistConfig.getFileTypeConfig(extension)
      if (!existingConfig) {
        throw new Error(`文件类型 ${extension} 不存在`)
      }

      // 4. 记录配置变更
      const changeRecord = {
        action: 'UPDATE_FILE_TYPE',
        extension,
        oldConfig: existingConfig,
        updates,
        adminId,
        reason,
        timestamp: new Date().toISOString(),
        status: 'PENDING',
      }

      const recordId = await this.database.insertWhitelistChange(changeRecord)

      try {
        // 5. 更新文件类型配置
        const newConfig = { ...existingConfig, ...updates }
        const success = this.whitelistConfig.updateFileTypeConfig(extension, newConfig)

        if (success) {
          // 6. 更新记录状态
          await this.database.updateWhitelistChange(recordId, {
            status: 'COMPLETED',
            completedAt: new Date().toISOString(),
            newConfig,
          })

          // 7. 清除缓存
          await this.cacheManager.clearWhitelistCache()

          // 8. 记录审计日志
          await this.auditLogger.logWhitelistChange({
            action: 'FILE_TYPE_UPDATED',
            extension,
            oldConfig: existingConfig,
            updates,
            newConfig,
            adminId,
            reason,
            success: true,
            timestamp: new Date().toISOString(),
          })

          return true
        } else {
          throw new Error('更新文件类型配置失败')
        }
      } catch (error) {
        // 9. 更新记录状态为失败
        await this.database.updateWhitelistChange(recordId, {
          status: 'FAILED',
          error: error.message,
          completedAt: new Date().toISOString(),
        })

        throw error
      }
    } catch (error) {
      // 10. 记录错误日志
      await this.auditLogger.logWhitelistChange({
        action: 'UPDATE_FILE_TYPE',
        extension,
        oldConfig: existingConfig || null,
        updates,
        adminId,
        reason,
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      })

      throw error
    }
  }

  // 批量更新文件类型
  async batchUpdateFileTypesDynamically(
    updates: Array<{ extension: string; config: Partial<FileConfig>; reason: string }>,
    adminId: string,
  ): Promise<boolean> {
    try {
      // 1. 验证管理员权限
      const hasPermission = await this.validateAdminPermission(adminId)
      if (!hasPermission) {
        throw new Error('管理员权限不足')
      }

      const results = []
      const recordIds = []

      // 2. 预先验证所有更新
      for (const update of updates) {
        const validationResult = this.validateFileConfigUpdates(update.config)
        if (!validationResult.isValid) {
          results.push({
            extension: update.extension,
            success: false,
            error: `配置更新验证失败: ${validationResult.errors.join(', ')}`,
          })
        }
      }

      // 如果有验证失败，提前返回
      if (results.length > 0) {
        await this.auditLogger.logBatchWhitelistChange({
          action: 'BATCH_UPDATE_FILE_TYPES',
          results,
          adminId,
          reason: '批量更新失败 - 验证错误',
          success: false,
          timestamp: new Date().toISOString(),
        })

        return false
      }

      // 3. 记录所有配置变更
      for (const update of updates) {
        const existingConfig = this.whitelistConfig.getFileTypeConfig(update.extension)
        const changeRecord = {
          action: 'BATCH_UPDATE_FILE_TYPE',
          extension: update.extension,
          oldConfig: existingConfig,
          updates: update.config,
          adminId,
          reason: update.reason,
          timestamp: new Date().toISOString(),
          status: 'PENDING',
        }

        recordIds.push(await this.database.insertWhitelistChange(changeRecord))
      }

      // 4. 执行所有更新
      let successCount = 0

      for (let i = 0; i < updates.length; i++) {
        const update = updates[i]
        const recordId = recordIds[i]

        try {
          const existingConfig = this.whitelistConfig.getFileTypeConfig(update.extension)
          const newConfig = { ...existingConfig, ...update.config }
          const success = this.whitelistConfig.updateFileTypeConfig(update.extension, newConfig)

          if (success) {
            await this.database.updateWhitelistChange(recordId, {
              status: 'COMPLETED',
              completedAt: new Date().toISOString(),
              newConfig,
            })

            successCount++
          } else {
            await this.database.updateWhitelistChange(recordId, {
              status: 'FAILED',
              error: '更新配置失败',
              completedAt: new Date().toISOString(),
            })
          }
        } catch (error) {
          await this.database.updateWhitelistChange(recordId, {
            status: 'FAILED',
            error: error.message,
            completedAt: new Date().toISOString(),
          })
        }
      }

      // 5. 清除缓存
      if (successCount > 0) {
        await this.cacheManager.clearWhitelistCache()
      }

      // 6. 记录批量更新审计日志
      await this.auditLogger.logBatchWhitelistChange({
        action: 'BATCH_UPDATE_FILE_TYPES',
        results: results,
        successCount,
        totalCount: updates.length,
        adminId,
        reason: '批量文件类型更新',
        success: successCount === updates.length,
        timestamp: new Date().toISOString(),
      })

      return successCount === updates.length
    } catch (error) {
      await this.auditLogger.logWhitelistChange({
        action: 'BATCH_UPDATE_FILE_TYPES',
        results: [],
        adminId,
        reason: '批量更新失败',
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      })

      throw error
    }
  }

  // 获取白名单变更历史
  async getWhitelistChangeHistory(
    extension?: string,
    action?: string,
    adminId?: string,
    startDate?: Date,
    endDate?: Date,
    limit?: number,
  ): Promise<WhitelistChangeRecord[]> {
    return this.database.getWhitelistChangeHistory({
      extension,
      action,
      adminId,
      startDate,
      endDate,
      limit,
    })
  }

  // 获取当前白名单配置
  async getCurrentWhitelistConfig(): Promise<any> {
    return this.whitelistConfig.exportConfig()
  }

  // 验证管理员权限
  private async validateAdminPermission(adminId: string): Promise<boolean> {
    // 这里应该调用用户管理系统验证管理员权限
    // 实际实现中需要与用户系统集成
    return true // 简化实现
  }

  // 验证文件配置
  private validateFileConfig(config: FileTypeConfig): ValidationResult {
    const result: ValidationResult = { isValid: true, error: '' }

    // 验证必需字段
    if (!config.category || !config.mimeType || !config.securityLevel) {
      result.isValid = false
      result.error = '缺少必需的配置字段'
      return result
    }

    // 验证安全等级
    const validSecurityLevels = ['low', 'medium', 'high', 'critical']
    if (!validSecurityLevels.includes(config.securityLevel)) {
      result.isValid = false
      result.error = `无效的安全等级: ${config.securityLevel}`
      return result
    }

    // 验证文件大小限制
    if (config.maxSize <= 0) {
      result.isValid = false
      result.error = '文件大小限制必须大于0'
      return result
    }

    return result
  }

  // 验证文件配置更新
  private validateFileConfigUpdates(updates: Partial<FileTypeConfig>): ValidationResult {
    const result: ValidationResult = { isValid: true, error: '' }

    // 如果更新了安全等级，验证新值
    if (updates.securityLevel) {
      const validSecurityLevels = ['low', 'medium', 'high', 'critical']
      if (!validSecurityLevels.includes(updates.securityLevel)) {
        result.isValid = false
        result.error = `无效的安全等级: ${updates.securityLevel}`
        return result
      }
    }

    // 如果更新了大小限制，验证新值
    if (updates.maxSize !== undefined && updates.maxSize <= 0) {
      result.isValid = false
      result.error = '文件大小限制必须大于0'
      return result
    }

    return result
  }
}

// 白名单变更记录接口
interface WhitelistChangeRecord {
  id: string
  action: string
  extension: string
  oldConfig?: FileTypeConfig
  updates?: Partial<FileTypeConfig>
  newConfig?: FileTypeConfig
  adminId: string
  reason: string
  timestamp: string
  status: string
  completedAt?: string
  error?: string
}
```

### 2. 中间件实现

#### 2.1 文件上传验证中间件

```typescript
// 文件上传验证中间件
import { Request, Response, NextFunction } from 'express'
import { FileTypeValidator } from './FileTypeValidator'
import { SecurityScanner } from './SecurityScanner'
import { FileStorageManager } from './FileStorageManager'
import { AuditLogger } from './AuditLogger'

export class FileUploadValidationMiddleware {
  private fileTypeValidator: FileTypeValidator
  private securityScanner: SecurityScanner
  private fileStorageManager: FileStorageManager
  private auditLogger: AuditLogger

  constructor() {
    this.fileTypeValidator = new FileTypeValidator()
    this.securityScanner = new SecurityScanner()
    this.fileStorageManager = new FileStorageManager()
    this.auditLogger = new AuditLogger()
  }

  // 文件上传验证中间件
  async validateFileUpload(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // 1. 检查请求中是否有文件
      if (!req.file && req.file.length === 0) {
        return res.status(400).json({
          error: 'No file uploaded',
          message: '请求中没有包含文件',
        })
      }

      // 2. 验证每个上传的文件
      const validationResults = []

      for (const file of req.files as Express.Multer.File[]) {
        const validationResult = await this.fileTypeValidator.validateFileType(file)
        validationResults.push({
          file,
          result: validationResult,
        })
      }

      // 3. 检查是否有验证失败的文件
      const failedFiles = validationResults.filter((result) => !result.result.isValid)

      if (failedFiles.length > 0) {
        const errorMessages = failedFiles.map((result) => {
          const file = result.file
          const errors = result.result.errors

          return {
            filename: file.originalname,
            errors: errors,
            warnings: result.result.warnings || [],
            securityLevel: result.result.securityLevel,
          }
        })

        return res.status(400).json({
          error: 'File validation failed',
          message: '以下文件验证失败',
          files: errorMessages,
        })
      }

      // 4. 检查是否有被阻止的文件
      const blockedFiles = validationResults.filter((result) => result.result.blocked)

      if (blockedFiles.length > 0) {
        const blockMessages = blockedFiles.map((result) => {
          const file = result.file

          return {
            filename: file.originalname,
            reason: '文件类型被系统阻止',
            securityLevel: result.result.securityLevel,
          }
        })

        return res.status(403).json({
          error: 'File type blocked',
          message: '以下文件类型被系统阻止',
          files: blockMessages,
        })
      }

      // 5. 检查需要审批的文件
      const approvalRequiredFiles = validationResults.filter(
        (result) => result.result.requiresApproval,
      )

      if (approvalRequiredFiles.length > 0) {
        const approvalMessages = approvalRequiredFiles.map((result) => {
          const file = result.file

          return {
            filename: file.originalname,
            reason: '文件需要管理员审批',
            securityLevel: result.result.securityLevel,
            warnings: result.result.warnings || [],
          }
        })

        return res.status(403).json({
          error: 'File approval required',
          message: '以下文件需要管理员审批',
          files: approvalMessages,
        })
      }

      // 6. 检查需要扫描的文件
      const scanRequiredFiles = validationResults.filter((result) => result.result.requiresScan)

      if (scanRequiredFiles.length > 0) {
        // 标记需要扫描的文件
        for (const result of scanRequiredFiles) {
          result.file.requiresScan = true
        }
      }

      // 7. 将验证结果附加到请求对象
      req.fileValidationResults = validationResults

      // 8. 继续处理请求
      next()
    } catch (error) {
      console.error('File upload validation error:', error)

      return res.status(500).json({
        error: 'Internal server error',
        message: '文件上传验证过程中发生错误',
      })
    }
  }

  // 文件安全扫描中间件
  async scanUploadedFiles(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // 检查请求中是否有需要扫描的文件
      if (!req.fileValidationResults) {
        return next()
      }

      const scanRequiredFiles = req.fileValidationResults.filter(
        (result) => result.result.requiresScan,
      )

      if (scanRequiredFiles.length === 0) {
        return next()
      }

      const scanResults = []

      // 扫描每个需要扫描的文件
      for (const result of scanRequiredFiles) {
        const file = result.file

        try {
          const scanResult = await this.securityScanner.scanFile(file)
          scanResults.push({
            file,
            result: scanResult,
          })

          // 更新文件的扫描结果
          result.scanResult = scanResult
        } catch (error) {
          console.error(`文件扫描失败 ${file.originalname}:`, error)

          scanResults.push({
            file,
            result: {
              success: false,
              error: error.message,
              scanType: 'security',
            },
          })

          // 更新文件的扫描结果
          result.scanResult = {
            success: false,
            error: error.message,
            scanType: 'security',
          }
        }
      }

      // 检查是否有扫描失败的文件
      const failedScans = scanResults.filter((result) => !result.result.success)

      if (failedScans.length > 0) {
        const errorMessages = failedScans.map((result) => {
          const file = result.file
          const scanResult = result.result

          return {
            filename: file.originalname,
            scanType: scanResult.scanType || 'unknown',
            error: scanResult.error || '未知扫描错误',
          }
        })

        return res.status(400).json({
          error: 'File scan failed',
          message: '以下文件扫描失败',
          files: errorMessages,
        })
      }

      // 检查是否有安全风险的文件
      const riskScans = scanResults.filter(
        (result) =>
          result.result.success &&
          result.result.riskLevel &&
          ['high', 'critical'].includes(result.result.riskLevel),
      )

      if (riskScans.length > 0) {
        const riskMessages = riskScans.map((result) => {
          const file = result.file
          const scanResult = result.result

          return {
            filename: file.originalname,
            riskLevel: scanResult.riskLevel,
            threats: scanResult.threats || [],
            recommendations: scanResult.recommendations || [],
          }
        })

        // 记录安全事件
        for (const riskScan of riskScans) {
          await this.auditLogger.logSecurityScanRisk(riskScan.file, riskScan.result)
        }

        return res.status(403).json({
          error: 'File security risk detected',
          message: '以下文件存在安全风险',
          files: riskMessages,
        })
      }

      // 将扫描结果附加到请求对象
      req.fileScanResults = scanResults

      // 继续处理请求
      next()
    } catch (error) {
      console.error('File security scan error:', error)

      return res.status(500).json({
        error: 'Internal server error',
        message: '文件安全扫描过程中发生错误',
      })
    }
  }

  // 文件存储中间件
  async storeFiles(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.fileValidationResults || !req.fileScanResults) {
        return next()
      }

      const storageResults = []

      // 存储每个文件
      for (const result of req.fileValidationResults) {
        const file = result.file

        try {
          // 生成安全的文件名
          const safeFilename = this.generateSafeFilename(file)
          file.safeFilename = safeFilename

          // 存储文件
          const storageResult = await this.fileStorageManager.storeFile(file, safeFilename)

          storageResults.push({
            file,
            result: storageResult,
          })
        } catch (error) {
          console.error(`文件存储失败 ${file.originalname}:`, error)

          storageResults.push({
            file,
            result: {
              success: false,
              error: error.message,
            },
          })

          // 更新存储结果
          result.storageResult = {
            success: false,
            error: error.message,
          }
        }
      }

      // 检查是否有存储失败的文件
      const failedStores = storageResults.filter((result) => !result.result.success)

      if (failedStores.length > 0) {
        const errorMessages = failedStores.map((result) => {
          const file = result.file
          const storageResult = result.result

          return {
            filename: file.originalname,
            safeFilename: file.safeFilename || 'unknown',
            error: storageResult.error || '存储失败',
          }
        })

        return res.status(500).json({
          error: 'File storage failed',
          message: '以下文件存储失败',
          files: errorMessages,
        })
      }

      // 将存储结果附加到请求对象
      req.fileStorageResults = storageResults

      // 继续处理请求
      next()
    } catch (error) {
      console.error('File storage error:', error)

      return res.status(500).json({
        error: 'Internal server error',
        message: '文件存储过程中发生错误',
      })
    }
  }

  // 生成安全的文件名
  private generateSafeFilename(file: Express.Multer.File): string {
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 15)

    const extension = file.originalname.split('.').pop()
    const baseName = file.originalname.substring(0, file.originalname.length - extension.length - 1)

    // 移除危险字符
    const safeBaseName = baseName.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').replace(/\s+/g, '_')

    return `${safeBaseName}_${timestamp}_${randomString}.${extension}`
  }

  // 响应文件验证错误
  private respondWithValidationError(
    res: Response,
    files: Array<{ filename: string; errors: string[]; warnings: string[]; securityLevel: string }>,
    status: number = 400,
  ): void {
    res.status(status).json({
      error: 'File validation failed',
      message: '文件验证失败',
      files: files,
    })
  }

  // 响应安全扫描错误
  private respondWithScanError(
    res: Response,
    files: Array<{
      filename: string
      scanType: string
      error: string
      threats: string[]
      recommendations: string[]
    }>,
    status: number = 400,
  ): void {
    res.status(status).json({
      error: 'File security scan failed',
      message: '文件安全扫描失败',
      files: files,
    })
  }

  // 响应存储错误
  private respondWithStorageError(
    res: Response,
    files: Array<{ filename: string; safeFilename: string; error: string }>,
    status: number = 500,
  ): void {
    res.status(status).json({
      error: 'File storage failed',
      message: '文件存储失败',
      files: files,
    })
  }
}
```

---

## 📋 配置实现步骤

### 步骤1：文件类型白名单配置（16:15-16:30）

- [ ] **1.1.1** 创建文件类型白名单基础配置
  - **任务描述**：建立基础文件类型白名单配置
  - **所需工具**：配置管理系统、文件类型验证库
  - **验收标准**：白名单配置完成，验证机制生效
  - **依赖关系**：无
  - **执行状态**：准备中
  - **完成时间**：预计2025-10-24 16:30
  - **执行证据**：待定

- [ ] **1.1.2** 实现文件类型验证器核心逻辑
  - **任务描述**：实现文件类型验证和检查逻辑
  - **所需工具**：TypeScript验证库、安全检查工具
  - **验收标准**：验证器实现完成，验证逻辑正确
  - **依赖关系**：1.1.1
  - **执行状态**：准备中
  - **完成时间**：预计2025-10-24 16:30
  - **执行证据**：待定

- [ ] **1.1.3** 创建文件类型配置管理接口
  - **任务描述**：创建文件类型配置的管理和操作接口
  - **所需工具**：配置管理API、数据库操作库
  - **验收标准**：管理接口完成，操作功能正常
  - **依赖关系**：1.1.1, 1.1.2
  - **执行状态**：准备中
  - **完成时间**：预计2025-10-24 16:30
  - **执行证据**：待定

### 步骤2：验证机制测试（16:30-16:45）

- [ ] **1.1.4** 编写文件类型验证测试用例
  - **任务描述**：编写全面的文件类型验证测试用例
  - **所需工具**：测试框架、验证测试工具
  - **验收标准**：测试用例覆盖所有验证场景
  - **依赖关系**：1.1.1, 1.1.2, 1.1.3
  - **执行状态**：准备中
  - **完成时间**：预计2025-10-24 16:45
  - **执行证据**：待定

- [ ] **1.1.5** 执行文件类型验证测试
  - **任务描述**：执行文件类型验证测试
  - **所需工具**：测试运行环境、验证检查工具
  - **验收标准**：所有测试用例通过，验证机制有效
  - **依赖关系**：1.1.4
  - **执行状态**：准备中
  - **完成时间**：预计2025-10-24 16:45
  - **执行证据**：测试报告

### 步骤3：白名单配置部署（16:45-17:00）

- [ ] **1.1.6** 部署白名单配置到生产环境
  - **任务描述**：将白名单配置部署到生产环境
  - **所需工具**：部署脚本、配置管理系统
  - **验收标准**：配置部署成功，生产环境生效
  - **依赖关系**：1.1.1, 1.1.2, 1.1.3, 1.1.4, 1.1.5
  - **执行状态**：准备中
  - **完成时间**：预计2025-10-24 17:00
  - **执行证据**：部署报告

---

## 📊 配置验证方案

### 1. 自动化验证测试

- [ ] **1.1.7** 配置正确性验证
  - **任务描述**：自动验证白名单配置的正确性
  - **所需工具**：自动化测试框架、配置验证工具
  - **验收标准**：配置正确性验证通过
  - **依赖关系**：1.1.6
  - **执行状态**：准备中
  - **完成时间**：预计2025-10-24 17:00
  - **执行证据**：验证报告

### 2. 手动验证测试

- [ ] **1.1.8** 手动文件上传测试
  - **任务描述**：手动测试各种文件类型的上传验证
  - **所需工具**：浏览器、文件上传测试工具
  - **验收标准**：所有文件类型验证按预期工作
  - **依赖关系**：1.1.6
  - **执行状态**：准备中
  - **完成时间**：预计2025-10-24 17:00
  - **执行证据**：测试截图和报告

---

## 📊 配置交付物

### 1. 配置文件

- [ ] **文件类型白名单配置文件**：完整的白名单配置定义
- [ ] **文件类型验证器代码**：完整的验证器实现代码
- [ ] **文件类型管理器代码**：完整的配置管理实现代码
- [ **动态白名单管理代码**：完整的动态管理实现代码

### 2. 中间件代码

- [ ] **文件上传验证中间件**：文件上传验证中间件实现代码
- [ ] **文件安全扫描中间件**：文件安全扫描中间件实现代码
- [ ] **文件存储中间件**：文件存储中间件实现代码

### 3. 测试文件

- [ ] **文件类型验证测试用例**：完整的验证测试用例
- [ ] **文件上传集成测试**：文件上传集成测试代码
- [ ] **白名单管理测试**：白名单管理功能测试代码

### 4. 配置文档

- [ ] **文件类型白名单配置指南**：配置指南和操作手册
- [ ] **文件上传安全配置指南**：安全配置和操作指南
- [ ] **白名单管理操作手册**：管理操作手册和流程指南

---

## 📋 配置成功标准

### 1. 技术成功标准

- **配置完整性**：所有文件类型都有明确的配置
- **配置正确性**：配置语法和逻辑正确
- **配置有效性**：配置能够正确验证文件类型
- **配置可维护性**：配置易于维护和更新

### 2. 安全成功标准

- **安全性**：恶意文件类型被有效阻止
- **准确性**：文件类型验证准确率达到100%
- **实时性**：文件类型验证实时生效
- **可扩展性**：配置易于扩展新文件类型

### 3. 功能成功标准

- **上传功能**：允许的文件类型正常上传
- **阻止功能**：阻止的文件类型被正确拒绝
- **管理功能**：白名单管理功能正常工作
- **监控功能**：文件类型验证过程可被监控

---

**配置版本**：1.0  
**创建时间**：2025年10月24日  
**配置类型**：文件类型白名单配置  
**配置状态**：进行中  
**完成度**：0%（目标100%）  
**负责人**：赵六 (文件负责人)  
**更新频率**：按需更新
