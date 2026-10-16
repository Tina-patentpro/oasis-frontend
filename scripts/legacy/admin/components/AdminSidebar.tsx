import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Key,
  CreditCard,
  ShoppingCart,
  FileText,
  Settings,
  ScrollText,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { useState } from 'react';

interface MenuItemProps {
  to?: string;
  icon: React.ReactNode;
  label: string;
  children?: Array<{ to: string; label: string }>;
}

function MenuItem({ to, icon, label, children }: MenuItemProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (children) {
    return (
      <div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors rounded-lg"
        >
          <div className="flex items-center gap-3">
            {icon}
            <span className="font-medium">{label}</span>
          </div>
          {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
        {isOpen && (
          <div className="ml-4 mt-1 space-y-1">
            {children.map((child) => (
              <NavLink
                key={child.to}
                to={child.to}
                className={({ isActive }) =>
                  `block px-4 py-2 text-sm rounded-lg transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-600 font-medium'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`
                }
              >
                {child.label}
              </NavLink>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <NavLink
      to={to!}
      className={({ isActive }) =>
        `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
          isActive
            ? 'bg-blue-50 text-blue-600 font-medium'
            : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600'
        }`
      }
    >
      {icon}
      <span className="font-medium">{label}</span>
    </NavLink>
  );
}

function AdminSidebar() {
  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-xl font-bold text-blue-600">绿洲慧写管理后台</h2>
        <p className="text-xs text-gray-500 mt-1">Oasis Admin</p>
      </div>

      {/* 导航菜单 */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {/* 主要功能 */}
        <div className="mb-6">
          <h3 className="px-4 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            主要功能
          </h3>
          <MenuItem
            to="/dashboard"
            icon={<LayoutDashboard className="w-5 h-5" />}
            label="首页"
          />
          <MenuItem
            to="/api"
            icon={<Key className="w-5 h-5" />}
            label="API管理"
          />
          <MenuItem
            to="/users"
            icon={<Users className="w-5 h-5" />}
            label="用户管理"
          />
          <MenuItem
            to="/recharge"
            icon={<CreditCard className="w-5 h-5" />}
            label="充值管理"
          />
          <MenuItem
            to="/consumption"
            icon={<ShoppingCart className="w-5 h-5" />}
            label="消费管理"
          />
        </div>

        {/* 内容管理 */}
        <div className="mb-6">
          <h3 className="px-4 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            内容管理
          </h3>
          <MenuItem
            icon={<FileText className="w-5 h-5" />}
            label="CMS管理"
            children={[
              { to: '/cms/header', label: '顶部导航栏' },
              { to: '/cms/left-sidebar', label: '左侧边栏' },
              { to: '/cms/center', label: '中心区域' },
              { to: '/cms/right-sidebar', label: '右侧边栏' },
              { to: '/cms/homepage', label: '首页' }
            ]}
          />
        </div>

        {/* 系统设置 */}
        <div>
          <h3 className="px-4 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            系统设置
          </h3>
          <MenuItem
            to="/settings"
            icon={<Settings className="w-5 h-5" />}
            label="系统配置"
          />
          <MenuItem
            to="/logs"
            icon={<ScrollText className="w-5 h-5" />}
            label="操作日志"
          />
        </div>
      </nav>

      {/* 底部信息 */}
      <div className="p-4 border-t border-gray-200">
        <div className="text-xs text-gray-500 text-center">
          <p>版本 v1.0.0</p>
          <p className="mt-1">© 2025 绿洲慧写</p>
        </div>
      </div>
    </aside>
  );
}

export default AdminSidebar;
