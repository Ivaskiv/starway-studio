// packages/frontend/src/components/DashboardLayout.tsx
import Header from '@/components/layout/Header.tsx';
import Sidebar from '@/components/layout/Sidebar.tsx';
import { useGetMeQuery } from '@/services/auth.api.ts';
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
        UserRole={user?.role}
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