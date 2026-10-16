import { useState } from 'react';
import { Users, Calendar, TrendingUp, Search } from 'lucide-react';

interface User {
  id: string;
  avatar: string;
  username: string;
  registrationTime: string;
  lastLogin: string;
  apiUsage: number;
  apiLimit: number;
  rechargeAmount: number;
  status: 'active' | 'inactive';
}

// 模拟用户数据
const mockUsers: User[] = [
  {
    id: '1',
    avatar: 'https://ui-avatars.com/api/?name=王大明&background=3b82f6&color=fff',
    username: '王大明',
    registrationTime: '2025-09-15',
    lastLogin: '2025-10-05 14:30',
    apiUsage: 8,
    apiLimit: 156,
    rechargeAmount: 12580,
    status: 'active'
  },
  {
    id: '2',
    avatar: 'https://ui-avatars.com/api/?name=李晓红&background=8b5cf6&color=fff',
    username: '李晓红',
    registrationTime: '2025-09-10',
    lastLogin: '2025-10-04 09:15',
    apiUsage: 23,
    apiLimit: 156,
    rechargeAmount: 8920,
    status: 'active'
  },
  {
    id: '3',
    avatar: 'https://ui-avatars.com/api/?name=张三&background=ec4899&color=fff',
    username: '张三',
    registrationTime: '2025-08-25',
    lastLogin: '2025-10-06 16:45',
    apiUsage: 12,
    apiLimit: 89,
    rechargeAmount: 6340,
    status: 'active'
  },
  {
    id: '4',
    avatar: 'https://ui-avatars.com/api/?name=罗晓芳&background=f59e0b&color=fff',
    username: '罗晓芳',
    registrationTime: '2025-09-20',
    lastLogin: '2025-10-01 11:20',
    apiUsage: 45,
    apiLimit: 45,
    rechargeAmount: 2100,
    status: 'inactive'
  },
  {
    id: '5',
    avatar: 'https://ui-avatars.com/api/?name=陈文静&background=10b981&color=fff',
    username: '陈文静',
    registrationTime: '2025-09-05',
    lastLogin: '2025-10-07 08:30',
    apiUsage: 67,
    apiLimit: 156,
    rechargeAmount: 15230,
    status: 'active'
  },
  {
    id: '6',
    avatar: 'https://ui-avatars.com/api/?name=赵敏&background=6366f1&color=fff',
    username: '赵敏',
    registrationTime: '2025-08-30',
    lastLogin: '2025-10-06 19:10',
    apiUsage: 34,
    apiLimit: 89,
    rechargeAmount: 4850,
    status: 'active'
  },
  {
    id: '7',
    avatar: 'https://ui-avatars.com/api/?name=刘德华&background=ef4444&color=fff',
    username: '刘德华',
    registrationTime: '2025-09-12',
    lastLogin: '2025-09-28 15:40',
    apiUsage: 12,
    apiLimit: 45,
    rechargeAmount: 1200,
    status: 'inactive'
  },
  {
    id: '8',
    avatar: 'https://ui-avatars.com/api/?name=周星星&background=14b8a6&color=fff',
    username: '周星星',
    registrationTime: '2025-09-18',
    lastLogin: '2025-10-07 10:25',
    apiUsage: 89,
    apiLimit: 156,
    rechargeAmount: 18760,
    status: 'active'
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

function UserManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');

  const filteredUsers = mockUsers.filter(user => {
    const matchesSearch = user.username.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === 'all' || 
      (filterType === 'active' && user.status === 'active') ||
      (filterType === 'inactive' && user.status === 'inactive');
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h2 className="text-2xl font-bold text-gray-800">用户管理</h2>
        <p className="text-gray-600 mt-1">管理系统用户信息及权限</p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="总用户数"
          value={mockUsers.length}
          change="18.3%"
          icon={<Users className="w-6 h-6" />}
          trend="up"
        />
        <StatCard
          title="近24小时"
          value="12"
          change="26.0%"
          icon={<Calendar className="w-6 h-6" />}
          trend="up"
        />
        <StatCard
          title="近7天"
          value="23"
          change="19.6%"
          icon={<TrendingUp className="w-6 h-6" />}
          trend="up"
        />
        <StatCard
          title="近30天"
          value="45"
          change="28.6%"
          icon={<TrendingUp className="w-6 h-6" />}
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
              placeholder="搜索用户名..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* 筛选下拉 */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
          >
            <option value="all">全部用户</option>
            <option value="active">活跃用户</option>
            <option value="inactive">非活跃用户</option>
          </select>
        </div>
      </div>

      {/* 用户列表 */}
      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  用户
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  注册时间
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  最后登录
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  API使用
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  充值金额
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  状态
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <img
                        src={user.avatar}
                        alt={user.username}
                        className="w-10 h-10 rounded-full"
                      />
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {user.username}
                        </div>
                        <div className="text-sm text-gray-500">ID: {user.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{user.registrationTime}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{user.lastLogin}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {user.apiUsage} / {user.apiLimit}
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${(user.apiUsage / user.apiLimit) * 100}%` }}
                      ></div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      ¥{user.rechargeAmount.toLocaleString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        user.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {user.status === 'active' ? '活跃' : '非活跃'}
                    </span>
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
              <span className="font-medium">{filteredUsers.length}</span> 条，
              共 <span className="font-medium">{filteredUsers.length}</span> 条
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

export default UserManagement;
