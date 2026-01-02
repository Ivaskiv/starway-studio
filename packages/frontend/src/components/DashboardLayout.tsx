// packages/frontend/src/components/layout/DashboardLayout.tsx

import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@frontend/store/hooks';
import { selectUser } from '@frontend/store/auth/authSelectors';
import Sidebar from './Sidebar';
import { Menu, Bell, Wallet, LogOut } from 'lucide-react';
import { Button } from '@starway/shared/ui';
import { logOut } from '@frontend/store/auth/authOperations';

const DashboardLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const user = useAppSelector(selectUser);

  const handleLogout = async () => {
    try {
      await dispatch(logOut()).unwrap();
      navigate('/auth');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <div className="flex h-screen bg-slate-900 overflow-hidden">
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="glass-card border-b border-white/10 p-4 lg:p-6">
          <div className="flex items-center justify-between">
            <Button
              onClick={() => setSidebarOpen(true)}
              variant="ghost"
              className="lg:hidden glass-button p-2"
              aria-label="Відкрити меню"
            >
              <Menu size={24} />
            </Button>
            
            <div className="flex-1 lg:block hidden">
              <h2 className="text-2xl font-bold text-white">
                Вітаємо! 👋
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                {new Date().toLocaleDateString('uk-UA', { 
                  weekday: 'long', 
                  day: 'numeric', 
                  month: 'long', 
                  year: 'numeric' 
                })}
              </p>
            </div>

            <div className="flex items-center gap-4">
              <div className="glass-card px-4 py-2 flex items-center gap-2">
                <Wallet className="w-5 h-5 text-green-400" />
                <span className="font-semibold text-white">0 ₴</span>
              </div>

              <Button variant="ghost" className="relative glass-button p-2">
                <Bell className="w-5 h-5 text-slate-400" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </Button>

              <div className="flex items-center gap-3 pl-3 border-l border-white/10">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-semibold text-white">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-xs text-slate-400">
                    {user?.email}
                  </p>
                </div>
                
                <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-pink-600 rounded-full flex items-center justify-center ring-2 ring-white/20 shadow-lg">
                  <span className="text-white font-bold text-lg">
                    {user?.firstName?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>

                <Button
                  onClick={handleLogout}
                  variant="ghost"
                  className="glass-button p-2 text-red-400 hover:text-red-300"
                  aria-label="Вийти"
                >
                  <LogOut size={20} />
                </Button>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;