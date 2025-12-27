// packages/frontend/src/components/layout/Sidebar.tsx

import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Zap, BarChart3, Settings, X, Sparkles } from 'lucide-react';
import { useAppSelector } from '@frontend/store/store';

const navigation = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'Воронки', href: '/admin/funnels', icon: Zap },
  { name: 'Аналітика', href: '/admin/analytics', icon: BarChart3 },
  { name: 'Налаштування', href: '/admin/settings', icon: Settings },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const user = useAppSelector((state) => state.auth.user);

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
        fixed top-0 left-0 z-50 h-screen w-72
        bg-black/95 backdrop-blur-xl border-r border-white/10
        transition-transform duration-300 ease-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}>
        
        {/* Header */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-starway-orange to-starway-pink rounded-2xl flex items-center justify-center rotate-6">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold">Starway</span>
          </div>
          
          <button
            onClick={onClose}
            className="lg:hidden p-2 hover:bg-white/10 rounded-xl transition"
            aria-label="Закрити меню"
          >
            <X size={20} />
          </button>
        </div>

        {/* User Info */}
        {user && (
          <div className="px-6 py-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-starway-purple to-starway-pink rounded-2xl flex items-center justify-center text-xl font-bold">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-white">{user.name}</p>
                <p className="text-xs text-gray-400">
                  {user.role === 'super_admin' ? '👑 Super Admin' : 'Admin'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="p-4 space-y-1">
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              end={item.href === '/admin'}
              className={({ isActive }) => `
                flex items-center gap-3 px-4 py-3 rounded-xl
                transition-all duration-200 group
                ${isActive 
                  ? 'bg-gradient-to-r from-starway-orange to-starway-pink text-white shadow-lg shadow-starway-orange/20' 
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }
              `}
            >
              <item.icon size={20} className="group-hover:scale-110 transition-transform" />
              <span className="font-semibold">{item.name}</span>
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-white/10">
          <div className="text-xs text-gray-500 text-center space-y-1">
            <p className="font-semibold">Starway Studio</p>
            <p>v1.0.0</p>
          </div>
        </div>
      </aside>
    </>
  );
}