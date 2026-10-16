import { useState } from 'react';
import { ShoppingCart, DollarSign, TrendingUp, Activity, Search, Filter } from 'lucide-react';

interface ConsumptionRecord {
  id: string;
  consumptionNumber: string;
  user: {
    id: string;
    username: string;
  };
  api: string;
  consumptionAmount: number;
  accountBalance: number;
  status: '已完成' | '处理中' | '已失败';
  createdTime: string;
}

// 模拟消费数据
const mockConsumptions: ConsumptionRecord[] = [
  {
    id: '#C2025001',
    consumptionNumber: 'C2025090110303',
    user: { id: '张三', username: '张三' },
    api: '说明书生成-Basic1',
    consumptionAmount: 0.50,
    accountBalance: 99.50,
    status: '已完成',
    createdTime: '2025-09-01 10:30'
  },
  {
    id: '#C2025002',
    consumptionNumber: 'C2025090210451',
    user: { id: '李四', username: '李四' },
    api: '技术要求提炼-Basic2',
    consumptionAmount: 1.20,
    accountBalance: 108.80,
    status: '已完成',
    createdTime: '2025-09-02 10:45'
  },
  {
    id: '#C2025003',
    consumptionNumber: 'C2025090314302',
    user: { id: '李四', username: '李四' },
    api: '校对审核-Pro',
    consumptionAmount: 2.30,
    accountBalance: 577.70,
    status: '已完成',
    createdTime: '2025-09-03 14:30'
  },
  {
    id: '#C2025004',
    consumptionNumber: 'C2025090409156',
    user: { id: '罗晓芳', username: '罗晓芳' },
    api: '翻译生成-Standard',
    consumptionAmount: 3.50,
    accountBalance: 496.50,
    status: '已完成',
    createdTime: '2025-09-04 09:15'
  },
  {
    id: '#C2025005',
    consumptionNumber: 'C2025090516207',
    user: { id: '陈文静', username: '陈文静' },
    api: '图像识别-Pro',
    consumptionAmount: 5.80,
    accountBalance: 194.20,
    status: '已完成',
    createdTime: '2025-09-05 16:20'
  },
  {
    id: '#C2025006',
    consumptionNumber: 'C2025090608309',
    user: { id: '王大明', username: '王大明' },
    api: '说明书生成-Basic1',
    consumptionAmount: 0.80,
    accountBalance: 999.20,
    status: '已完成',
    createdTime: '2025-09-06 08:30'
  },
  {
    id: '#C2025007',
    consumptionNumber: 'C2025090713451',
    user: { id: '赵敏', username: '赵敏' },
    api: '技术要求提炼-Basic2',
    consumptionAmount: 1.50,
    accountBalance: 48.50,
    status: '处理中',
    createdTime: '2025-09-07 13:45'
  },
  {
    id: '#C2025008',
    consumptionNumber: 'C2025090815234',
    user: { id: '周星星', username: '周星星' },
    api: '校对审核-Pro',
    consumptionAmount: 2.10,
    accountBalance: 16.40,
    status: '已完成',
    createdTime: '2025-09-08 15:23'
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

function ConsumptionManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const filteredConsumptions = mockConsumptions.filter(record => {
    const matchesSearch = 
      record.consumptionNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.api.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || record.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  // 计算统计数据
  const totalAmount = mockConsumptions.reduce((sum, r) => sum + r.consumptionAmount, 0);
  const completedCount = mockConsumptions.filter(r => r.status === '已完成').length;
  const avgAmount = totalAmount / mockConsumptions.length;
  const uniqueUsers = new Set(mockConsumptions.map(r => r.user.id)).size;

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h2 className="text-2xl font-bold text-gray-800">消费管理</h2>
        <p className="text-gray-600 mt-1">管理用户消费记录和API调用费用</p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="消费总额"
          value={`¥${totalAmount.toFixed(2)}`}
          change="15.3%"
          icon={<DollarSign className="w-6 h-6" />}
          trend="up"
        />
        <StatCard
          title="消费笔数"
          value={mockConsumptions.length}
          change={`${mockConsumptions.length}笔`}
          icon={<ShoppingCart className="w-6 h-6" />}
          trend="up"
        />
        <StatCard
          title="平均消费金额"
          value={`¥${avgAmount.toFixed(2)}`}
          change="8.7%"
          icon={<TrendingUp className="w-6 h-6" />}
          trend="up"
        />
        <StatCard
          title="消费用户数"
          value={uniqueUsers}
          change={`${uniqueUsers}人`}
          icon={<Activity className="w-6 h-6" />}
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
              placeholder="搜索消费单号、用户名或API名称..."
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

      {/* 消费记录表格 */}
      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  消费单号
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  用户
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  API名称
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  消费金额
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  账户余额
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
              {filteredConsumptions.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <ShoppingCart className="w-4 h-4 text-gray-400 mr-2" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {record.id}
                        </div>
                        <div className="text-xs text-gray-500">{record.consumptionNumber}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{record.user.username}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{record.api}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-red-600">
                      -¥{record.consumptionAmount.toFixed(2)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      ¥{record.accountBalance.toFixed(2)}
                    </div>
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
              <span className="font-medium">{filteredConsumptions.length}</span> 条，
              共 <span className="font-medium">{filteredConsumptions.length}</span> 条
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

export default ConsumptionManagement;
