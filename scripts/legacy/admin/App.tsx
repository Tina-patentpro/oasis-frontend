import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AdminLayout from './components/AdminLayout';
import Dashboard from './pages/Dashboard';
import UserManagement from './pages/UserManagement';
import APIManagement from './pages/APIManagement';
import RechargeManagement from './pages/RechargeManagement';
import ConsumptionManagement from './pages/ConsumptionManagement';
import CMSManagement from './pages/CMSManagement';
import SystemSettings from './pages/SystemSettings';
import OperationLogs from './pages/OperationLogs';

function AdminApp() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<AdminLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="users" element={<UserManagement />} />
          <Route path="api" element={<APIManagement />} />
          <Route path="recharge" element={<RechargeManagement />} />
          <Route path="consumption" element={<ConsumptionManagement />} />
          <Route path="cms/*" element={<CMSManagement />} />
          <Route path="settings" element={<SystemSettings />} />
          <Route path="logs" element={<OperationLogs />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default AdminApp;
