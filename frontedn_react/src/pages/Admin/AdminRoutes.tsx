import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './Dashboard';
import EmployeeManagement from './EmployeeManagement';
import TaskManagement from './TaskManagement';
import Notifications from './Notifications';
import TaskDetailPage from './TaskDetailPage';
import MyProfile from './MyProfile';
import MyTasks from './MyTasks';

const AdminRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="" element={<Navigate to="/admin/dashboard" replace />} />
      <Route path="dashboard" element={<Dashboard />} />
      <Route path="my-profile" element={<MyProfile />} />
      <Route path="my-tasks" element={<MyTasks />} />
      <Route path="employee-management" element={<EmployeeManagement />} />
      <Route path="task-management" element={<TaskManagement />} />
      <Route path="task-management/:taskId" element={<TaskDetailPage />} />
      <Route path="notifications" element={<Notifications />} />
      <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
    </Routes>
  );
};

export default AdminRoutes;