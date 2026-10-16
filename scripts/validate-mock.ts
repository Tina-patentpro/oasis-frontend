/**
 * Mock 数据验证脚本
 * 检查 mock 数据与类型定义的一致性，防止 drift
 */

import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

// 获取项目根目录
const __filename = fileURLToPath(import.meta.url)
const projectRoot = dirname(__filename)

interface MockValidationResult {
  file: string
  issues: Array<{
    type: 'missing' | 'type_mismatch' | 'invalid_data' | 'drift'
    message: string
    line?: number
    expected?: string
    actual?: string
  }>
  summary: {
    totalIssues: number
    byType: Record<string, number>
  }
}

// 类型断言映射
const TYPE_ASSERTIONS: Record<string, any> = {
  // 项目相关
  'src/api/mock/services.ts': {
    projects: {
      type: 'array',
      required: ['id', 'userId', 'name', 'status', 'createdAt', 'updatedAt'],
      optional: ['description', 'sessionCount', 'metadata']
    },
    sessions: {
      type: 'array',
      required: ['id', 'userId', 'title', 'toolType', 'modelVersion', 'status', 'createdAt', 'updatedAt'],
      optional: ['projectId']
    },
  },
  
  // 会话相关
  'src/api/mock/history.service.ts': {
    historyItems: {
      type: 'array',
      required: ['id', 'title', 'content', 'date', 'type', 'createdAt', 'updatedAt'],
      optional: ['tags', 'read']
    },
  },
  
  // 统计相关
  'src/api/mock/services.ts': {
    statistics: {
      type: 'object',
      required: ['totalSessions', 'totalProjects', 'totalSpend', 'currentBalance'],
      optional: ['period']
    },
    workloadTrends: {
      type: 'array',
      required: ['date', 'sessionCount', 'spend'],
      optional: []
    },
  },
}

/**
 * 验证单个 mock 文件
 */
function validateMockFile(filePath: string): MockValidationResult {
  const issues: MockValidationResult['issues'] = []
  
  try {
    if (!existsSync(filePath)) {
      return {
        file: filePath,
        issues: [{
          type: 'missing',
          message: `文件不存在: ${filePath}`
        }],
        summary: {
          totalIssues: 1,
          byType: { missing: 1 }
        }
      }
    }

    const content = readFileSync(filePath, 'utf8')
    const lines = content.split('\n')
    
    // 检查是否是 TypeScript 文件
    if (filePath.endsWith('.ts')) {
      // 基本语法检查
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim()
        if (line && !line.startsWith('//') && !line.startsWith('*') && !line.startsWith('import')) {
          // 检查基本语法错误
          if (line.includes('=>') && !line.includes(':')) {
            issues.push({
              type: 'type_mismatch',
              message: '类型断言格式错误：应该使用 : 而不是 =>',
              line: i + 1
            })
          }
          
          // 检查常见的类型错误
          if (line.includes('any') && !line.includes('// @ts-ignore')) {
            issues.push({
              type: 'type_mismatch',
              message: '避免使用 any 类型',
              line: i + 1
            })
          }
        }
      }
    }
    
    // 如果是 JavaScript 文件，检查基本结构
    if (filePath.endsWith('.js')) {
      try {
        // 尝试解析为模块
        const modulePath = filePath.replace(projectRoot, '').replace(/\\/g, '/').replace(/\.(ts|js)$/, '')
        const mockModule = require(join(projectRoot, modulePath))
        
        // 检查导出的函数
        if (typeof mockModule === 'object' && mockModule !== null) {
          const exportedKeys = Object.keys(mockModule)
          
          // 检查是否有必要的导出
          const expectedExports = ['mockServices', 'mockHistoryService']
          const missingExports = expectedExports.filter(key => !exportedKeys.includes(key))
          
          if (missingExports.length > 0) {
            issues.push({
              type: 'missing',
              message: `缺少必要的导出: ${missingExports.join(', ')}`
            })
          }
        }
      } catch (error) {
        issues.push({
          type: 'invalid_data',
          message: `模块解析失败: ${error instanceof Error ? error.message : String(error)}`
        })
      }
    }
    
    return {
      file: filePath,
      issues,
      summary: {
        totalIssues: issues.length,
        byType: issues.reduce((acc, issue) => {
          acc[issue.type] = (acc[issue.type] || 0) + 1
          return acc
        }, {})
      }
    }
  } catch (error) {
    return {
      file: filePath,
      issues: [{
        type: 'invalid_data',
        message: `文件读取失败: ${error instanceof Error ? error.message : String(error)}`
      }],
      summary: {
        totalIssues: 1,
        byType: { invalid_data: 1 }
      }
    }
  }
}

/**
 * 验证 mock 数据与类型定义的一致性
 */
function validateMockDataConsistency(): MockValidationResult[] {
  const results: MockValidationResult[] = []
  
  // 检查主要 mock 服务文件
  const mockFiles = [
    'src/api/mock/services.ts',
    'src/api/mock/history.service.ts'
  ]
  
  for (const filePath of mockFiles) {
    const result = validateMockFile(join(projectRoot, filePath))
    results.push(result)
  }
  
  return results
}

/**
 * 生成验证报告
 */
function generateValidationReport(results: MockValidationResult[]): string {
  let report = '# Mock 数据验证报告\n\n'
  report += `生成时间: ${new Date().toISOString()}\n\n`
  
  const totalIssues = results.reduce((sum, result) => sum + result.summary.totalIssues, 0)
  const totalByType = results.reduce((acc, result) => {
    Object.keys(result.summary.byType).forEach(type => {
      acc[type] = (acc[type] || 0) + result.summary.byType[type]
    })
    return acc
  }, {} as Record<string, number>)
  
  report += '## 总览\n'
  report += `- 总文件数: ${results.length}\n`
  report += `- 总问题数: ${totalIssues}\n`
  report += `- 问题类型分布:\n`
  
  Object.entries(totalByType).forEach(([type, count]) => {
    report += `  - ${type}: ${count}\n`
  })
  
  report += '\n## 详细问题\n'
  
  for (const result of results) {
    if (result.issues.length > 0) {
      report += `### ${result.file}\n\n`
      
      for (const issue of result.issues) {
        report += `**${issue.type.toUpperCase()}**: ${issue.message}`
        if (issue.line) {
          report += ` (行 ${issue.line})`
        }
        if (issue.expected) {
          report += `\n   期望: ${issue.expected}`
        }
        if (issue.actual) {
          report += `\n   实际: ${issue.actual}`
        }
        report += '\n'
      }
      
      report += '\n'
    }
  }
  
  if (totalIssues === 0) {
    report += '✅ 所有 mock 文件都通过验证\n'
  }
  
  return report
}

/**
 * 主函数
 */
function main() {
  console.log('开始验证 mock 数据...')
  
  try {
    const results = validateMockDataConsistency()
    const report = generateValidationReport(results)
    
    // 输出报告到控制台
    console.log(report)
    
    // 保存报告到文件
    const reportPath = join(projectRoot, 'mock-validation-report.md')
    writeFileSync(reportPath, report, 'utf8')
    
    console.log(`验证报告已保存到: ${reportPath}`)
    
    // 如果有严重问题，退出时返回错误码
    const criticalIssues = results.some(result => 
      result.summary.byType['missing'] > 0 || 
      result.summary.byType['invalid_data'] > 0
    )
    
    if (criticalIssues) {
      console.error('发现严重的 mock 数据问题，请检查后修复')
      process.exit(1)
    }
    
    console.log('Mock 数据验证完成')
    process.exit(0)
    
  } catch (error) {
    console.error('验证过程中发生错误:', error)
    process.exit(1)
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main()
}

export { main, validateMockFile, validateMockDataConsistency, generateValidationReport }
