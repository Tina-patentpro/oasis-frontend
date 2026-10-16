#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
识别API-CARDS-ENHANCED.md中缺失的API
"""

import json
import re
from pathlib import Path

def extract_documented_apis(md_file):
    """从Markdown文件中提取已文档化的API的operationId"""
    documented = set()
    
    # 使用块读取以避免超时
    try:
        with open(md_file, 'r', encoding='utf-8') as f:
            content = f.read()
            
        # 匹配API文档标题格式: ### 🔹 1. createConversation - 创建新会话 [P0]
        # 或: ### 🔹 68. updateTooltipSettings - 更新气泡提示配置 [P2]
        pattern = r'### 🔹 \d+\.\s+(\w+)\s+-\s+.+?\s+\[P[012]\]'
        matches = re.findall(pattern, content)
        
        documented.update(matches)
        
        print(f"✅ 从Markdown文件中提取了 {len(documented)} 个已文档化的API")
        
    except Exception as e:
        print(f"❌ 读取Markdown文件出错: {e}")
        return set()
    
    return documented

def find_missing_apis():
    """找出缺失的API"""
    
    # 读取完整的API清单
    inventory_file = Path('docs/api/complete-api-inventory.json')
    with open(inventory_file, 'r', encoding='utf-8') as f:
        inventory = json.load(f)
    
    # 提取所有API的operationId
    all_apis = {}
    for yaml_file, apis in inventory['apis_by_file'].items():
        for api in apis:
            all_apis[api['id']] = {
                'name': api['name'],
                'priority': api['priority'],
                'source': yaml_file
            }
    
    print(f"📊 总API数量: {len(all_apis)}")
    
    # 提取已文档化的API
    md_file = Path('docs/api/API-CARDS-ENHANCED.md')
    documented = extract_documented_apis(md_file)
    
    print(f"📝 已文档化API数量: {len(documented)}")
    
    # 找出缺失的API
    missing = []
    for api_id, info in all_apis.items():
        if api_id not in documented:
            missing.append({
                'id': api_id,
                'name': info['name'],
                'priority': info['priority'],
                'source': info['source']
            })
    
    # 按优先级和文件分组
    missing_by_priority = {'P0': [], 'P1': [], 'P2': []}
    for api in missing:
        missing_by_priority[api['priority']].append(api)
    
    # 输出结果
    print("\n" + "="*70)
    print("🔍 缺失的API分析")
    print("="*70)
    
    for priority in ['P0', 'P1', 'P2']:
        apis = missing_by_priority[priority]
        if apis:
            print(f"\n{priority} 级别缺失 {len(apis)} 个:")
            for api in sorted(apis, key=lambda x: x['source']):
                print(f"  - {api['id']:30s} | {api['name']:20s} | {api['source']}")
    
    print(f"\n总计缺失: {len(missing)} 个API")
    
    # 保存缺失的API列表
    output_file = Path('docs/api/missing-apis.json')
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump({
            'total_missing': len(missing),
            'by_priority': {
                'P0': len(missing_by_priority['P0']),
                'P1': len(missing_by_priority['P1']),
                'P2': len(missing_by_priority['P2'])
            },
            'missing_apis': missing
        }, f, ensure_ascii=False, indent=2)
    
    print(f"\n✅ 缺失API列表已保存到: {output_file}")
    
    return missing

if __name__ == '__main__':
    find_missing_apis()
