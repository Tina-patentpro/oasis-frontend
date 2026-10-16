/**
 * 项目字段配置
 * 这些配置通常从CMS后台获取，这里提供Mock数据用于演示
 */

import type { ProjectFieldGroup } from '@/types/api'

// Mock项目字段配置组
export const PROJECT_FIELD_GROUPS: ProjectFieldGroup[] = [
  {
    category: 'customer',
    label: '客户信息',
    bgColor: '#d1fae5', // emerald-200的hex
    textColor: '#065f46', // emerald-800的hex
    borderColor: '#a7f3d0', // emerald-300的hex
    fields: [
      {
        key: 'customerName',
        label: '客户名称',
        type: 'text',
        category: 'customer',
        placeholder: '请输入客户名称',
        required: true,
        sortOrder: 1,
      },
      {
        key: 'customerLevel',
        label: '客户级别',
        type: 'select',
        category: 'customer',
        placeholder: '请选择客户级别',
        required: false,
        options: ['VIP客户', '客户', '新客户'],
        sortOrder: 2,
      },
      {
        key: 'contactPerson',
        label: '联系人',
        type: 'text',
        category: 'customer',
        placeholder: '请输入联系人姓名',
        required: false,
        sortOrder: 3,
      },
      {
        key: 'contactRole',
        label: '职位',
        type: 'text',
        category: 'customer',
        placeholder: '如：PM、技术负责人',
        required: false,
        sortOrder: 4,
      },
      {
        key: 'contactMethod',
        label: '联系方式',
        type: 'text',
        category: 'customer',
        placeholder: '邮箱或电话',
        required: false,
        sortOrder: 5,
      },
      {
        key: 'cooperationType',
        label: '合作类型',
        type: 'select',
        category: 'customer',
        placeholder: '请选择合作类型',
        required: false,
        options: ['技术交底书撰写', '专利检索', '术语校验', '全流程服务', '其他'],
        sortOrder: 6,
      },
    ],
  },
  {
    category: 'basic',
    label: '基础信息',
    bgColor: '#dbeafe', // sky-200的hex
    textColor: '#075985', // sky-800的hex
    borderColor: '#bae6fd', // sky-200的hex
    fields: [
      {
        key: 'projectStartDate',
        label: '立项时间',
        type: 'date',
        category: 'basic',
        placeholder: '选择立项日期',
        required: false,
        sortOrder: 1,
      },
      {
        key: 'projectDeadline',
        label: '截止日期',
        type: 'datetime',
        category: 'basic',
        placeholder: '选择截止时间',
        required: false,
        sortOrder: 2,
      },
      {
        key: 'deliverables',
        label: '交付物',
        type: 'text',
        category: 'basic',
        placeholder: '如：DOCX、权利要求、数据字典',
        required: false,
        sortOrder: 3,
      },
      {
        key: 'projectStatus',
        label: '项目阶段',
        type: 'select',
        category: 'basic',
        placeholder: '请选择项目阶段',
        required: false,
        options: ['撰写', '校验', '检索', '审核', '完成'],
        sortOrder: 4,
      },
      {
        key: 'projectPhase',
        label: '当前状态',
        type: 'select',
        category: 'basic',
        placeholder: '请选择当前状态',
        required: false,
        options: ['进行中', '已暂停', '待审核', '已完成'],
        sortOrder: 5,
      },
    ],
  },
]

// 获取所有字段的扁平列表
export const getAllProjectFields = () => {
  return PROJECT_FIELD_GROUPS.flatMap((group) => group.fields)
}

// 根据类别获取字段
export const getFieldsByCategory = (category: 'customer' | 'basic' | 'other') => {
  const group = PROJECT_FIELD_GROUPS.find((g) => g.category === category)
  return group?.fields || []
}

// 获取字段配置
export const getFieldConfig = (key: string) => {
  const allFields = getAllProjectFields()
  return allFields.find((field) => field.key === key)
}
