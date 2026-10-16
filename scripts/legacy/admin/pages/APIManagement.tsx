import { useState } from 'react';
import { Key, Activity, DollarSign, TrendingUp, Plus, Edit, Trash2, Copy, Eye, EyeOff } from 'lucide-react';

interface APIRecord {
  id: string;
  name: string;
  key: string;
  syncMethod: string;
  avgTokenUsage: number;
  avgTokenCost: number;
  status: 'active' | 'inactive';
  createdTime: string;
}

// 模拟API数据
const mockAPIs: APIRecord[] = [
  {
    id: '1',
    name: '说明书生成-Basic1',
    key: 'sk-1234567890abcdef****',
    syncMethod: '同步',
    avgTokenUsage: 1200,
    avgTokenCost: 3500,
    status: 'active',
    createdTime: '2025-09-01'
  },
  {
    id: '2',
    name: '技术要求提炼-Basic2',
    key: 'sk-abcdef1234567890****',
    syncMethod: '同步',
    avgTokenUsage: 2150,
    avgTokenCost: 8200,
    status: 'active',
    createdTime: '2025-08-12'
  },
  {
    id: '3',
    name: '校对审核-Pro',
    key: 'sk-fedcba0987654321****',
    syncMethod: '异步',
    avgTokenUsage: 890,
    avgTokenCost: 2100,
    status: 'active',
    createdTime: '2025-09-15'
  },
  {
    id: '4',
    name: '翻译生成-Standard',
    key: 'sk-1122334455667788****',
    syncMethod: '同步',
    avgTokenUsage: 1580,
    avgTokenCost: 7000,
    status: 'inactive',
    createdTime: '2025-08-05'
  },
  {
    id: '5',
    name: '图像识别-Pro',
    key: 'sk-8877665544332211****',
    syncMethod: '异步',
    avgTokenUsage: 3200,
    avgTokenCost: 12000,
    status: 'active',
    createdTime: '2025-09-20'
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

function APIManagement() {
  const [showKeys, setShowKeys] = useState<{ [key: string]: boolean }>({});

  const toggleKeyVisibility = (id: string) => {
    setShowKeys(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('API密钥已复制到剪贴板');
  };

  const handleEdit = (id: string) => {
    alert(`编辑API: ${id}`);
  };

  const handleDelete = (id: string) => {
    if (confirm('确定要删除这个API吗?')) {
      alert(`删除API: ${id}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">API管理</h2>
          <p className="text-gray-600 mt-1">管理API密钥和调用记录</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <Plus className="w-5 h-5" />
          新增API
        </button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="API总数"
          value={mockAPIs.length}
          change="2个新增"
          icon={<Key className="w-6 h-6" />}
          trend="up"
        />
        <StatCard
          title="总调用次数"
          value="45.2K"
          change="8.3%"
          icon={<Activity className="w-6 h-6" />}
          trend="up"
        />
        <StatCard
          title="平均Token消耗"
          value="1,604"
          change="12.5%"
          icon={<TrendingUp className="w-6 h-6" />}
          trend="up"
        />
        <StatCard
          title="总消费金额"
          value="¥32,800"
          change="15.2%"
          icon={<DollarSign className="w-6 h-6" />}
          trend="up"
        />
      </div>

      {/* API列表 */}
      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  API名称
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  密钥
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  同步方式
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  平均Token消耗
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  平均Token消费
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
              {mockAPIs.map((api) => (
                <tr key={api.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                        <Key className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="text-sm font-medium text-gray-900">
                        {api.name}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <code className="text-sm text-gray-900 font-mono">
                        {showKeys[api.id] ? api.key : api.key.replace(/./g, '*')}
                      </code>
                      <button
                        onClick={() => toggleKeyVisibility(api.id)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        {showKeys[api.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => copyToClipboard(api.key)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      api.syncMethod === '同步' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {api.syncMethod}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {api.avgTokenUsage.toLocaleString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      ¥{api.avgTokenCost.toLocaleString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        api.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {api.status === 'active' ? '可用' : '禁用'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{api.createdTime}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(api.id)}
                        className="text-blue-600 hover:text-blue-900 transition-colors"
                        title="编辑"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(api.id)}
                        className="text-red-600 hover:text-red-900 transition-colors"
                        title="删除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
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
              <span className="font-medium">{mockAPIs.length}</span> 条，
              共 <span className="font-medium">{mockAPIs.length}</span> 条
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

export default APIManagement;
