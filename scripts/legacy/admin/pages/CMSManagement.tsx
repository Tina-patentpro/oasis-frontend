import { Routes, Route, Navigate } from 'react-router-dom';

function CMSHeader() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">顶部导航栏管理</h2>
        <p className="text-gray-600 mt-1">管理网站顶部导航栏内容</p>
      </div>
      <div className="bg-white rounded-lg shadow p-8 border border-gray-200">
        <div className="text-center text-gray-500">
          <p className="text-lg">顶部导航栏管理页面开发中...</p>
        </div>
      </div>
    </div>
  );
}

function CMSLeftSidebar() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">左侧边栏管理</h2>
        <p className="text-gray-600 mt-1">管理网站左侧边栏内容</p>
      </div>
      <div className="bg-white rounded-lg shadow p-8 border border-gray-200">
        <div className="text-center text-gray-500">
          <p className="text-lg">左侧边栏管理页面开发中...</p>
        </div>
      </div>
    </div>
  );
}

function CMSCenter() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">中心区域管理</h2>
        <p className="text-gray-600 mt-1">管理网站中心区域内容</p>
      </div>
      <div className="bg-white rounded-lg shadow p-8 border border-gray-200">
        <div className="text-center text-gray-500">
          <p className="text-lg">中心区域管理页面开发中...</p>
        </div>
      </div>
    </div>
  );
}

function CMSRightSidebar() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">右侧边栏管理</h2>
        <p className="text-gray-600 mt-1">管理网站右侧边栏内容</p>
      </div>
      <div className="bg-white rounded-lg shadow p-8 border border-gray-200">
        <div className="text-center text-gray-500">
          <p className="text-lg">右侧边栏管理页面开发中...</p>
        </div>
      </div>
    </div>
  );
}

function CMSHomepage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">首页管理</h2>
        <p className="text-gray-600 mt-1">管理网站首页内容</p>
      </div>
      <div className="bg-white rounded-lg shadow p-8 border border-gray-200">
        <div className="text-center text-gray-500">
          <p className="text-lg">首页管理页面开发中...</p>
        </div>
      </div>
    </div>
  );
}

function CMSManagement() {
  return (
    <Routes>
      <Route index element={<Navigate to="header" replace />} />
      <Route path="header" element={<CMSHeader />} />
      <Route path="left-sidebar" element={<CMSLeftSidebar />} />
      <Route path="center" element={<CMSCenter />} />
      <Route path="right-sidebar" element={<CMSRightSidebar />} />
      <Route path="homepage" element={<CMSHomepage />} />
    </Routes>
  );
}

export default CMSManagement;
