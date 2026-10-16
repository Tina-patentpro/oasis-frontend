import { CreditCard, DollarSign, Users, BarChart3 } from 'lucide-react';

interface TimeRangeData {
  '24h': string | number;
  '7d': string | number;
  '30d': string | number;
}

interface StatCardWithTimeProps {
  title: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  data: TimeRangeData;
}

function StatCardWithTime({ title, icon, iconBg, iconColor, data }: StatCardWithTimeProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-base font-medium text-gray-700">{title}</h3>
        <div className={`p-2 rounded-lg ${iconBg} ${iconColor}`}>
          {icon}
        </div>
      </div>
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">过去24小时</span>
          <span className="text-lg font-semibold text-gray-800">{data['24h']}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">过去7天</span>
          <span className="text-lg font-semibold text-gray-800">{data['7d']}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">过去30天</span>
          <span className="text-lg font-semibold text-gray-800">{data['30d']}</span>
        </div>
      </div>
    </div>
  );
}

interface WorkflowCardProps {
  name: string;
  consumption: TimeRangeData;
  successRate: TimeRangeData;
}

function WorkflowCard({ name, consumption, successRate }: WorkflowCardProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
      <h3 className="text-base font-medium text-gray-800 mb-4">{name}</h3>
      
      {/* 表格形式展示:时间/消费金额/成功率 */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left text-xs font-medium text-gray-500 pb-2">时间</th>
              <th className="text-right text-xs font-medium text-gray-500 pb-2">消费金额</th>
              <th className="text-right text-xs font-medium text-gray-500 pb-2">成功率</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-gray-100">
              <td className="py-2 text-**###** text-gray-600">过去24小时</td>
              <td className="py-2 text-right text-**###** font-medium text-gray-800">{consumption['24h']}</td>
              <td className="py-2 text-right text-**###** font-medium text-green-600">{successRate['24h']}</td>
            </tr>
            <tr className="border-b border-gray-100">
              <td className="py-2 text-**###** text-gray-600">过去7天</td>
              <td className="py-2 text-right text-**###** font-medium text-gray-800">{consumption['7d']}</td>
              <td className="py-2 text-right text-**###** font-medium text-green-600">{successRate['7d']}</td>
            </tr>
            <tr>
              <td className="py-2 text-**###** text-gray-600">过去30天</td>
              <td className="py-2 text-right text-**###** font-medium text-gray-800">{consumption['30d']}</td>
              <td className="py-2 text-right text-**###** font-medium text-green-600">{successRate['30d']}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Dashboard() {
  // 模拟工作流数据
  const workflows = [
    {
      name: '说明书A1检测-Basic1',
      consumption: { '24h': '¥125.50', '7d': '¥890.00', '30d': '¥3,245.80' },
      successRate: { '24h': '98.5%', '7d': '97.8%', '30d': '98.2%' }
    },
    {
      name: '获利要求书生成-Basic3.2',
      consumption: { '24h': '¥89.20', '7d': '¥654.30', '30d': '¥2,890.50' },
      successRate: { '24h': '99.1%', '7d': '98.9%', '30d': '99.0%' }
    },
    {
      name: '说明书生成-Basic3.1',
      consumption: { '24h': '¥156.80', '7d': '¥1,023.40', '30d': '¥4,567.20' },
      successRate: { '24h': '97.2%', '7d': '97.5%', '30d': '97.8%' }
    },
    {
      name: '技术交底书生成-Basic2',
      consumption: { '24h': '¥78.90', '7d': '¥543.20', '30d': '¥2,345.60' },
      successRate: { '24h': '98.8%', '7d': '98.3%', '30d': '98.6%' }
    },
    {
      name: 'IPC分类-Basic4',
      consumption: { '24h': '¥45.30', '7d': '¥321.50', '30d': '¥1,456.70' },
      successRate: { '24h': '99.5%', '7d': '99.2%', '30d': '99.3%' }
    },
    {
      name: '专利检索-Advanced1',
      consumption: { '24h': '¥234.60', '7d': '¥1,678.90', '30d': '¥7,234.50' },
      successRate: { '24h': '96.8%', '7d': '97.1%', '30d': '97.3%' }
    }
  ];

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h2 className="text-2xl font-bold text-gray-800">首页</h2>
        <p className="text-gray-600 mt-1">系统概览与统计数据</p>
      </div>

      {/* 顶部统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCardWithTime
          title="充值统计"
          icon={<CreditCard className="w-5 h-5" />}
          iconBg="bg-blue-100"
          iconColor="text-blue-600"
          data={{
            '24h': '¥1,234.56',
            '7d': '¥8,765.43',
            '30d': '¥35,432.10'
          }}
        />
        <StatCardWithTime
          title="消费总额"
          icon={<DollarSign className="w-5 h-5" />}
          iconBg="bg-yellow-100"
          iconColor="text-yellow-600"
          data={{
            '24h': '¥856.40',
            '7d': '¥6,234.80',
            '30d': '¥28,967.30'
          }}
        />
        <StatCardWithTime
          title="活跃用户"
          icon={<Users className="w-5 h-5" />}
          iconBg="bg-purple-100"
          iconColor="text-purple-600"
          data={{
            '24h': '156',
            '7d': '892',
            '30d': '2,345'
          }}
        />
        <StatCardWithTime
          title="任务成功率"
          icon={<BarChart3 className="w-5 h-5" />}
          iconBg="bg-gradient-to-br from-blue-100 to-purple-100"
          iconColor="text-blue-600"
          data={{
            '24h': '98.2%',
            '7d': '97.8%',
            '30d': '98.1%'
          }}
        />
      </div>

      {/* 工作流统计 */}
      <div>
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-800">工作流统计</h3>
          <p className="text-sm text-gray-600 mt-1">各工作流的消费金额和成功率统计</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {workflows.map((workflow, index) => (
            <WorkflowCard
              key={index}
              name={workflow.name}
              consumption={workflow.consumption}
              successRate={workflow.successRate}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
