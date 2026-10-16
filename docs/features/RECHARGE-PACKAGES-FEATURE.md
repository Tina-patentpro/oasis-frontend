# 充值套餐功能说明

## 功能概述

充值套餐功能提供了灵活的账户充值方式，支持定额充值和自定义金额充值两种模式。套餐配置由CMS系统管理，支持动态配置套餐种类、金额和赠送金额。

## 系统架构

### 技术栈

- **配置管理**：CMS系统配置套餐信息
- **数据存储**：DB数据库执行充值和赠送逻辑
- **前端实现**：React + TypeScript + Tailwind CSS

### 文件结构

```
src/
├── constants/
│   └── rechargePackages.ts       # 充值套餐配置和工具函数
├── components/
│   └── RechargeDialog.tsx         # 充值对话框组件
```

## 功能特性

### 1. 定额充值

- 由CMS配置多个预设套餐
- 每个套餐包含：
  - 套餐名称
  - 充值金额
  - 赠送金额
  - 套餐描述
  - 推荐标记
  - 排序顺序

**示例套餐**：

```typescript
{
  id: 'recommended',
  name: '推荐套餐',
  amount: 100,        // 充值100元
  bonusAmount: 10,    // 赠送10元
  description: '超值优惠，赠送10元',
  recommended: true,
  sortOrder: 2
}
```

### 2. 自定义金额充值

- 用户可输入任意金额
- 最低充值：1元
- 支持小数点后两位
- 无额外赠送

### 3. 快捷金额

提供常用金额快捷按钮：50元、100元、200元、500元

## 配置管理

### 本地配置（开发环境）

位置：`src/constants/rechargePackages.ts`

```typescript
export const DEFAULT_RECHARGE_PACKAGES: RechargePackage[] = [
  {
    id: 'basic',
    name: '基础套餐',
    amount: 50,
    bonusAmount: 0,
    description: '适合个人用户，满足基本使用需求',
    recommended: false,
    sortOrder: 1,
  },
  // ... 更多套餐
]
```

### CMS配置（生产环境）

#### API接口（待实现）

```typescript
// GET /api/cms/recharge-packages
// 返回格式：
{
  "packages": [
    {
      "id": "string",
      "name": "string",
      "amount": number,
      "bonusAmount": number,
      "description": "string",
      "recommended": boolean,
      "sortOrder": number
    }
  ]
}
```

#### 配置方法

1. 在CMS后台配置套餐信息
2. 前端通过API获取最新配置
3. 实时更新充值选项

```typescript
// 使用方法
const packages = await fetchRechargePackagesFromCMS()
```

## 充值流程

### 定额充值流程

```
1. 用户选择充值套餐
2. 系统显示：充值金额 + 赠送金额 = 实际到账金额
3. 用户确认充值
4. 调用数据库执行：
   - 充值金额入账
   - 赠送金额入账
   - 记录交易明细
5. 更新账户余额显示
```

### 自定义充值流程

```
1. 用户输入充值金额
2. 系统验证金额有效性（≥1元，≤2位小数）
3. 系统显示实际到账金额（无赠送）
4. 用户确认充值
5. 调用数据库执行充值
6. 更新账户余额显示
```

## 数据库操作

### 充值记录表（示例）

```sql
CREATE TABLE recharge_records (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  package_id VARCHAR(50),           -- 套餐ID，自定义充值为NULL
  recharge_amount DECIMAL(10, 2),   -- 充值金额
  bonus_amount DECIMAL(10, 2),      -- 赠送金额
  total_amount DECIMAL(10, 2),      -- 实际到账金额
  payment_method VARCHAR(20),       -- 支付方式
  status VARCHAR(20),               -- 状态：pending/success/failed
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### 余额更新逻辑

```sql
-- 充值成功后更新余额
UPDATE user_accounts
SET balance = balance + #{totalAmount},
    updated_at = NOW()
WHERE user_id = #{userId};

-- 插入交易记录
INSERT INTO transactions (user_id, type, amount, description, created_at)
VALUES (#{userId}, 'recharge', #{rechargeAmount}, '账户充值', NOW());

-- 如果有赠送
INSERT INTO transactions (user_id, type, amount, description, created_at)
VALUES (#{userId}, 'bonus', #{bonusAmount}, '充值赠送', NOW());
```

## 组件使用

### 基本用法

```typescript
import { RechargeDialog } from '@/components/RechargeDialog';

function MyComponent() {
  const [isOpen, setIsOpen] = useState(false);
  const currentBalance = 100.50; // 从用户状态获取

  const handleConfirm = (amount: number, bonusAmount: number, packageId?: string) => {
    // 处理充值逻辑
    console.log('充值金额:', amount);
    console.log('赠送金额:', bonusAmount);
    console.log('套餐ID:', packageId);

    // 调用API执行充值
    // await rechargeAPI({ amount, bonusAmount, packageId });
  };

  return (
    <>
      <button onClick={() => setIsOpen(true)}>充值</button>

      <RechargeDialog
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onConfirm={handleConfirm}
        currentBalance={currentBalance}
        themeColor="#059669"
      />
    </>
  );
}
```

## 工具函数

### getRechargePackages()

获取充值套餐配置

```typescript
const packages = getRechargePackages()
```

### validateCustomAmount(amount)

验证自定义充值金额

```typescript
if (validateCustomAmount(100.5)) {
  // 金额有效
}
```

### calculateTotalAmount(package)

计算套餐实际到账金额

```typescript
const totalAmount = calculateTotalAmount(package)
// totalAmount = package.amount + package.bonusAmount
```

### calculateCustomAmount(amount)

计算自定义充值到账金额

```typescript
const totalAmount = calculateCustomAmount(100)
// totalAmount = 100 (无赠送)
```

## CMS配置指南

### 配置项说明

| 字段        | 类型    | 必填 | 说明                     |
| ----------- | ------- | ---- | ------------------------ |
| id          | string  | 是   | 套餐唯一标识             |
| name        | string  | 是   | 套餐名称                 |
| amount      | number  | 是   | 充值金额（元）           |
| bonusAmount | number  | 是   | 赠送金额（元），可为0    |
| description | string  | 否   | 套餐描述                 |
| recommended | boolean | 否   | 是否推荐                 |
| sortOrder   | number  | 是   | 排序顺序，数字越小越靠前 |

### 配置建议

1. **套餐数量**：建议3-5个套餐
2. **价格梯度**：套餐间价格拉开差距，如50、100、200
3. **赠送策略**：
   - 小额套餐可不赠送
   - 中等套餐赠送5-10%
   - 大额套餐赠送15-20%
4. **推荐标记**：选择一个性价比最高的套餐标记为推荐

### 配置示例

```json
{
  "packages": [
    {
      "id": "starter",
      "name": "新手套餐",
      "amount": 30,
      "bonusAmount": 0,
      "description": "小额充值，无赠送",
      "recommended": false,
      "sortOrder": 1
    },
    {
      "id": "popular",
      "name": "热门套餐",
      "amount": 100,
      "bonusAmount": 10,
      "description": "最受欢迎，赠送10元",
      "recommended": true,
      "sortOrder": 2
    },
    {
      "id": "vip",
      "name": "VIP套餐",
      "amount": 500,
      "bonusAmount": 100,
      "description": "大额充值，赠送100元",
      "recommended": false,
      "sortOrder": 3
    }
  ]
}
```

## 未来扩展

### 1. 支付集成

- 微信支付
- 支付宝
- 银行卡支付

### 2. 充值历史

- 查看充值记录
- 导出充值明细
- 发票申请

### 3. 优惠活动

- 首充优惠
- 限时活动
- 满额赠送

### 4. 会员等级

- 不同等级不同赠送比例
- VIP专属套餐

## 注意事项

1. **金额精度**：所有金额计算使用Decimal类型，避免浮点数精度问题
2. **安全验证**：服务端必须再次验证充值金额和赠送金额
3. **幂等性**：充值操作需要保证幂等性，避免重复充值
4. **事务处理**：充值和赠送需要在同一个数据库事务中完成
5. **日志记录**：记录所有充值操作的详细日志

## 维护日志

- 2025-10-04：初始版本，支持定额充值和自定义金额充值
- 待实现：CMS API集成、支付接口集成

---

**维护者**：绿洲慧写 开发团队  
**最后更新**：2025-10-04
