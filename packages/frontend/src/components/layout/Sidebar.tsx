// packages/frontend/src/components/layout/Sidebar.tsx

import { useGetMeQuery } from '@/services';
import { UserRole } from '@/types/user';
import { Button } from '@/ui';
import {
  BarChart3,
  Boxes,
  LayoutDashboard,
  Settings,
  Sparkles,
  Users,
  X,
  Zap
} from 'lucide-react';
import { NavLink } from 'react-router-dom';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  UserRole?: UserRole;
}

const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
// RTK Query для отримання користувача
const {data} = useGetMeQuery();
const user = data?.user;

  const navigation = [
    { name: 'Огляд', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Воронки', href: '/dashboard/funnels', icon: Zap },
    { name: 'AI Генератор', href: '/dashboard/ai-generator', icon: Sparkles },
    { name: 'Продукти', href: '/dashboard/products', icon: Boxes },
    { name: 'Аналітика', href: '/dashboard/analytics', icon: BarChart3 },
    { name: 'Користувачі', href: '/dashboard/users', icon: Users },
    { name: 'Налаштування', href: '/dashboard/settings', icon: Settings },
  ];

  return (
    <>
      {/* Overlay для мобільних */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static top-0 left-0 z-50 h-screen w-64
        bg-slate-950/50 backdrop-blur-xl border-r border-white/10
        transition-transform duration-300 ease-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/10">
            <NavLink to="/dashboard" className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-orange rounded-2xl flex items-center justify-center shadow-lg">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-white">Starway Studio</span>
            </NavLink>

            {/* Close button (mobile only) */}
            <Button
              onClick={onClose}
              className="lg:hidden p-2 hover:bg-white/10 rounded-xl transition"
              aria-label="Закрити меню"
            >
              <X className="w-5 h-5 text-slate-400" />
            </Button>
          </div>

          {/* User Info */}
          {user && (
            <div className="px-6 py-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center text-xl font-bold text-white">
                  {user.firstName?.charAt(0).toUpperCase() || 'N'}
                </div>
                <div>
                  <p className="font-semibold text-white">{user.firstName}</p>
                  <p className="text-xs text-slate-400">
                    {user.role === 'super_admin' ? '👑 Super Admin' : 
                     user.role === 'funnel_admin' ? '🎯 Funnel Admin' : 'User'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {navigation.map((item) => {
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  end={item.href === '/dashboard'}
                  onClick={onClose} // Close sidebar on mobile when clicking link
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                      isActive
                        ? 'bg-gradient-orange text-white shadow-lg'
                        : 'text-slate-400 hover:bg-white/5 hover:text-white'
                    }`
                  }
                >
                  <Icon className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  <span className="font-medium">{item.name}</span>
                </NavLink>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="p-6 border-t border-white/10">
            <div className="text-xs text-slate-500 text-center space-y-1">
              <p className="font-semibold text-white">Starway Studio</p>
              <p>v1.0.0 • Beta</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;