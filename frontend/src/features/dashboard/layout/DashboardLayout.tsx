// frontend/src/layout/DashboardLayout.tsx
import Header from '@/layout/Header';
import Sidebar from '@/layout/Sidebar';
import { useState } from 'react';
import { Outlet } from 'react-router-dom';

export default function DashboardLayout() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-[color:var(--bg)] text-[color:var(--text)]">
      {/* Header */}
      <Header
        collapsed={collapsed}
        onToggle={() => setCollapsed(c => !c)}
      />

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          collapsed={collapsed}
          onToggle={() => setCollapsed(c => !c)}
          // className="flex-shrink-0"
        />

        {/* Outlet */}
        <main className="flex-1 overflow-y-auto p-6 bg-[color:var(--bg)] text-[color:var(--text)]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
