#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
从YAML文件中提取完整的API清单（包括HTTP method和path）
"""

import yaml
import json
from pathlib import Path

def extract_apis_from_yaml(yaml_file):
    """从单个YAML文件中提取所有API的完整信息"""
    apis = []
    
    try:
        with open(yaml_file, 'r', encoding='utf-8') as f:
            spec = yaml.safe_load(f)
        
        # 获取优先级配置（如果有）
        priority_map = {}
        if 'x-priority-levels' in spec:
            for level, ops in spec['x-priority-levels'].items():
                for op in ops:
                    priority_map[op] = level.upper()
        
        # 遍历所有路径和操作
        paths = spec.get('paths', {})
        for path, path_item in paths.items():
            # 遍历HTTP方法
            for method in ['get', 'post', 'put', 'patch', 'delete', 'options', 'head']:
                if method in path_item:
                    operation = path_item[method]
                    operation_id = operation.get('operationId')
                    
                    if operation_id:
                        # 获取中文名称
                        summary = operation.get('summary', '')
                        description = operation.get('description', '')
                        name = summary or description or operation_id
                        
                        # 获取优先级
                        priority = priority_map.get(operation_id, 'P2')
                        
                        apis.append({
                            'id': operation_id,
                            'method': method.upper(),
                            'path': path,
                            'name': name,
                            'priority': priority,
                            'endpoint': f"{method.upper()} {path}"
                        })
        
        return apis
        
    except Exception as e:
        print(f"❌ 解析 {yaml_file.name} 出错: {e}")
        return []

def main():
    """主函数"""
    api_dir = Path('docs/api')
    
    # 要扫描的YAML文件
    yaml_files = [
        'workflows.yaml',
        'conversations.yaml',
        'projects.yaml',
        'files.yaml',
        'users-auth.yaml',
        'billing.yaml',
        'billing-grants.yaml',
        'support-feedback.yaml',
        'chatflows.yaml',
        'instructions.yaml',
        'performance.yaml',
        'usage-insights.yaml',
        'data-deletion.yaml',
        'ops-status.yaml',
        'utilities.yaml'
    ]
    
    all_apis = []
    apis_by_file = {}
    
    print("开始提取API信息...")
    print("="*70)
    
    for yaml_file in yaml_files:
        file_path = api_dir / yaml_file
        if file_path.exists():
            apis = extract_apis_from_yaml(file_path)
            if apis:
                apis_by_file[yaml_file] = apis
                all_apis.extend(apis)
                print(f"✅ {yaml_file:30s} - {len(apis):3d} 个API")
        else:
            print(f"⚠️  {yaml_file} 文件不存在")
    
    print("="*70)
    print(f"总计: {len(all_apis)} 个API")
    
    # 按优先级统计
    priority_count = {'P0': 0, 'P1': 0, 'P2': 0}
    for api in all_apis:
        priority_count[api['priority']] += 1
    
    print(f"\n按优先级统计:")
    print(f"  P0 (核心): {priority_count['P0']}")
    print(f"  P1 (常用): {priority_count['P1']}")
    print(f"  P2 (辅助): {priority_count['P2']}")
    
    # 保存完整清单
    output = {
        'total_apis': len(all_apis),
        'by_priority': priority_count,
        'apis_by_file': apis_by_file,
        'all_apis': all_apis
    }
    
    output_file = api_dir / 'full-api-inventory.json'
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    
    print(f"\n✅ 完整API清单已保存到: {output_file}")
    
    # 输出前10个API示例
    print("\n前10个API示例:")
    for i, api in enumerate(all_apis[:10], 1):
        print(f"{i:2d}. {api['endpoint']:40s} - {api['name'][:30]:30s} [{api['priority']}]")

if __name__ == '__main__':
    main()
