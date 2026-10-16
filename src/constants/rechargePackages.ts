// 充值套餐配置
// 这些配置由CMS系统管理，用于定额充值功能
//
// 注意：此文件仅包含纯静态常量和纯函数。
// 运行时从 CMS API 获取充值套餐的逻辑已迁移至 API 服务层
// (billingService.getRechargePackages / cmsService.getRechargePackages)，
// 请勿在常量文件中引入运行时依赖（如 billingService 等）。

import type { RechargePackage } from '@/types/api'

// 默认充值套餐配置：空数组作为后备。
// 实际套餐数据从 CMS API 动态获取 (billingService.getRechargePackages)，
// 此处不再硬编码带 new Date().toISOString() 的模拟数据，
// 因为 new Date() 在模块加载时求值，属于非纯副作用。
const RECHARGE_PACKAGES: RechargePackage[] = []

/**
 * 获取充值套餐配置（基于本地常量）
 * 注意：实际应用中应使用 billingService.getRechargePackages() 从 API 获取。
 * @returns 充值套餐数组
 */
export function getRechargePackages(): RechargePackage[] {
  return [...RECHARGE_PACKAGES].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
}

/**
 * 计算充值套餐的实际到账金额
 * @param pkg 充值套餐
 * @returns 实际到账金额
 */
export function calculateTotalAmount(pkg: RechargePackage): number {
  return pkg.amount + pkg.bonusAmount
}

/**
 * 验证自定义充值金额
 * @param amount 充值金额
 * @returns 是否有效
 */
export function validateCustomAmount(amount: number): boolean {
  // 最低1元，最多支持小数点后两位
  return amount >= 1 && Number.isFinite(amount) && /^\d+(\.\d{1,2})?$/.test(amount.toString())
}
