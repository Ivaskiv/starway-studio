// packages/frontend/src/components/DashboardLayout.tsx
import { useGetMeQuery } from '@/features/auth/services/auth.api';
import Header from '@/layout/Header';
import Sidebar from '@/layout/Sidebar';
import { useState } from 'react';
import { Outlet } from 'react-router-dom';


const DashboardLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { data: userData } = useGetMeQuery();
  const user = userData?.user;

  return (
    <div className="flex h-screen bg-slate-900 overflow-hidden">
      {/* Sidebar */}
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)}
        userRole={user?.role}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <Header onMenuClick={() => setSidebarOpen(true)} />

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;