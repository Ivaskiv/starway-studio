// src/components/Sidebar.tsx
import { Link, useLocation } from 'react-router-dom';
import {
  Home,
  Package,
  Users,
  Settings,
  Book,
  Gift,
  LogOut,
  Sun,
  Moon
} from 'lucide-react';
import { useAuthStore } from '@/store/auth';

const navigation = [
  { name: 'Dashboard', href: '/admin', icon: Home },
  { name: 'Продукти', href: '/admin/products', icon: Package },
  { name: 'Користувачі', href: '/admin/users', icon: Users },
  { name: 'Налаштування', href: '/admin/settings', icon: Settings },
  { name: 'Курси', href: '/admin/courses', icon: Book },
  { name: 'Практикуми', href: '/admin/practicums', icon: Gift },
] as const;

export default function Sidebar() {
  const location = useLocation();
  const { user, logout, theme, toggleTheme } = useAuthStore();

  if (!user) return null;

  return (
    <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 border-r border-gray-800 flex flex-col">
      {/* Логотип */}
      <div className="flex h-16 items-center justify-center border-b border-gray-800 px-6">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-orange-400 bg-clip-text text-transparent">
          Starway Admin
        </h1>
      </div>

      {/* Навігація */}
      <nav className="flex-1 p-4 space-y-1">
        {navigation.map(item => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.name}
              to={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-gradient-to-r from-indigo-600 to-orange-600 text-white shadow-lg shadow-indigo-500/20'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Підвал */}
      <div className="border-t border-gray-800 p-4 space-y-4">
        {/* Тема */}
        <button
          onClick={toggleTheme}
          className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm text-gray-300 hover:bg-gray-800 transition"
        >
          {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          <span>{theme === 'dark' ? 'Світла тема' : 'Темна тема'}</span>
        </button>

        {/* Профіль */}
        <div className="flex items-center gap-3 rounded-lg bg-gray-800/50 px-4 py-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-orange-500 font-bold text-white">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-white">{user.name}</p>
            <p className="text-xs text-orange-400">
              {user.role === 'super_admin' ? 'Super Admin' : 'Admin'}
            </p>
          </div>
        </div>

        {/* Вихід */}
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm text-red-400 hover:bg-red-900/30 transition"
        >
          <LogOut className="h-5 w-5" />
          <span>Вийти</span>
        </button>
      </div>
    </aside>
  );
}
