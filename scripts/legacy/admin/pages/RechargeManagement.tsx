import { useState } from 'react';
import { CreditCard, DollarSign, TrendingUp, Users, Activity, Search, Filter } from 'lucide-react';

interface RechargeRecord {
  id: string;
  chargeNumber: string;
  user: {
    id: string;
    username: string;
  };
  chargeAmount: number;
  accountBalance: number;
  type: string;
  status: '已完成' | '处理中' | '已失败';
  createdTime: string;
}

// 模拟充值数据
const mockRecharges: RechargeRecord[] = [
  {
    id: '#R2025001',
    chargeNumber: 'R2025090110303',
    user: { id: '张三', username: '张三' },
    chargeAmount: 100.00,
    accountBalance: 100.00,
    type: '在线支付',
    status: '已完成',
    createdTime: '2025-09-01 10:30'
  },
  {
    id: '#R2025002',
    chargeNumber: 'R2025090210451',
    user: { id: '李四', username: '李四' },
    chargeAmount: 10.00,
    accountBalance: 110.00,
    type: '在线支付',
    status: '已完成',
    createdTime: '2025-09-02 10:45'
  },
  {
    id: '#R2025003',
    chargeNumber: 'R2025090314302',
    user: { id: '李四', username: '李四' },
    chargeAmount: 80.00,
    accountBalance: 580.00,
    type: '在线支付',
    status: '已完成',
    createdTime: '2025-09-03 14:30'
  },
  {
    id: '#R2025004',
    chargeNumber: 'R2025090409156',
    user: { id: '罗晓芳', username: '罗晓芳' },
    chargeAmount: 500.00,
    accountBalance: 500.00,
    type: '在线支付',
    status: '已完成',
    createdTime: '2025-09-04 09:15'
  },
  {
    id: '#R2025005',
    chargeNumber: 'R2025090516207',
    user: { id: '陈文静', username: '陈文静' },
    chargeAmount: 200.00,
    accountBalance: 200.00,
    type: '在线支付',
    status: '已完成',
    createdTime: '2025-09-05 16:20'
  },
  {
    id: '#R2025006',
    chargeNumber: 'R2025090608309',
    user: { id: '王大明', username: '王大明' },
    chargeAmount: 1000.00,
    accountBalance: 1000.00,
    type: '在线支付',
    status: '已完成',
    createdTime: '2025-09-06 08:30'
  },
  {
    id: '#R2025007',
    chargeNumber: 'R2025090713451',
    user: { id: '赵敏', username: '赵敏' },
    chargeAmount: 50.00,
    accountBalance: 50.00,
    type: '在线支付',
    status: '处理中',
    createdTime: '2025-09-07 13:45'
  }
];

interface StatCardProps {
  title: string;
  value: string | number;
  change: string;
  icon: React.ReactNode;
  trend: 'up' | 'down' | 'neutral';
}

function StatCard({ title, value, change, icon, trend }: StatCardProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-gray-600">{title}</p>
        <div className="text-blue-600">{icon}</div>
      </div>
      <p className="text-3xl font-bold text-gray-800 mb-2">{value}</p>
      <p className={`text-sm ${
        trend === 'up' ? 'text-green-600' : 
        trend === 'down' ? 'text-red-600' : 
        'text-gray-600'
      }`}>
        {trend === 'up' && '↑ '}
        {trend === 'down' && '↓ '}
        {change}
      </p>
    </div>
  );
}

function RechargeManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const filteredRecharges = mockRecharges.filter(record => {
    const matchesSearch = 
      record.chargeNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.user.username.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || record.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  // 计算统计数据
  const totalAmount = mockRecharges.reduce((sum, r) => sum + r.chargeAmount, 0);
  const completedCount = mockRecharges.filter(r => r.status === "已完成").length;
  const avgAmount = totalAmount / mockRecharges.length;

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h2 className="text-2xl font-bold text-gray-800">充值管理</h2>
        <p className="text-gray-600 mt-1">管理用户充值记录和充值套餐</p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        <StatCard
          title="充值总额"
          value={`¥${totalAmount.toLocaleString()}`}
          change="18.3%"
          icon={<DollarSign className="w-6 h-6" />}
          trend="up"
        />
        <StatCard
          title="充值笔数"
          value={mockRecharges.length}
          change="12笔"
          icon={<CreditCard className="w-6 h-6" />}
          trend="up"
        />
        <StatCard
          title="平均充值金额"
          value={`¥${avgAmount.toFixed(2)}`}
          change="5.2%"
          icon={<TrendingUp className="w-6 h-6" />}
          trend="up"
        />
        <StatCard
          title="充值成功笔数"
          value={completedCount}
          change={`${Math.round((completedCount / mockRecharges.length) * 100)}%`}
          icon={<Activity className="w-6 h-6" />}
          trend="up"
        />
        <StatCard
          title="充值用户数"
          value={new Set(mockRecharges.map(r => r.user.id)).size}
          change="6人"
          icon={<Users className="w-6 h-6" />}
          trend="up"
        />
      </div>

      {/* 搜索和筛选 */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
        <div className="flex gap-4">
          {/* 搜索框 */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="搜索充值单号或用户名..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* 状态筛选 */}
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              <option value="all">全部状态</option>
              <option value="已完成">已完成</option>
              <option value="处理中">处理中</option>
              <option value="已失败">已失败</option>
            </select>
          </div>
        </div>
      </div>

      {/* 充值记录表格 */}
      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  充值单号
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  用户
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  充值金额
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  账户余额
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  类型
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  状态
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  创建时间
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredRecharges.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <CreditCard className="w-4 h-4 text-gray-400 mr-2" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {record.id}
                        </div>
                        <div className="text-xs text-gray-500">{record.chargeNumber}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{record.user.username}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      ¥{record.chargeAmount.toFixed(2)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      ¥{record.accountBalance.toFixed(2)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                      {record.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        record.status === '已完成'
                          ? 'bg-green-100 text-green-800'
                          : record.status === '处理中'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {record.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{record.createdTime}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button className="text-blue-600 hover:text-blue-900 transition-colors">
                      查看
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 分页 */}
        <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              显示 <span className="font-medium">1</span> 到{' '}
              <span className="font-medium">{filteredRecharges.length}</span> 条，
              共 <span className="font-medium">{filteredRecharges.length}</span> 条
            </div>
            <div className="flex gap-2">
              <button className="px-3 py-1 border border-gray-300 rounded-md text-sm hover:bg-gray-100 transition-colors">
                上一页
              </button>
              <button className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition-colors">
                1
              </button>
              <button className="px-3 py-1 border border-gray-300 rounded-md text-sm hover:bg-gray-100 transition-colors">
                下一页
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RechargeManagement;
