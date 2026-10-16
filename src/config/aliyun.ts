export type AliyunSmsScene = 'login' | 'register' | 'reset-password'

type TemplateMap = Record<AliyunSmsScene, string>

type TemplateDescriptionMap = Record<AliyunSmsScene, string>

const defaultTemplates: TemplateMap = {
  login: '',
  register: '',
  'reset-password': '',
}

const templateDescriptions: TemplateDescriptionMap = {
  login: '登陆短信模板 (VITE_ALIYUN_SMS_TEMPLATE_LOGIN)',
  register: '注册短信模板 (VITE_ALIYUN_SMS_TEMPLATE_REGISTER)',
  'reset-password': '重置密码短信模板 (VITE_ALIYUN_SMS_TEMPLATE_RESET)',
}

const templateOverrides: Partial<TemplateMap> = {
  login: import.meta.env['VITE_ALIYUN_SMS_TEMPLATE_LOGIN'] ?? undefined,
  register: import.meta.env['VITE_ALIYUN_SMS_TEMPLATE_REGISTER'] ?? undefined,
  'reset-password': import.meta.env['VITE_ALIYUN_SMS_TEMPLATE_RESET'] ?? undefined,
}

export const ALIYUN_SMS_SIGN_NAME = import.meta.env['VITE_ALIYUN_SMS_SIGN_NAME'] ?? '阿里云通知'

export const ALIYUN_SMS_TEMPLATES: TemplateMap = {
  login: templateOverrides.login ?? defaultTemplates.login,
  register: templateOverrides.register ?? defaultTemplates.register,
  'reset-password': templateOverrides['reset-password'] ?? defaultTemplates['reset-password'],
}

export const ALIYUN_SMS_TEMPLATE_DESCRIPTIONS = templateDescriptions
