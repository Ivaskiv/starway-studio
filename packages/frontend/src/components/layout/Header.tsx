// packages/frontend/src/components/layout/Header.tsx

import { Link, useNavigate } from 'react-router-dom';
import { Bell, Settings, LogOut, Sparkles } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '@frontend/store/store';
import { selectIsLoggedIn, selectUser } from '@frontend/store/auth/authSelectors';
import { logOut } from '@frontend/store/auth/authOperations';

export default function Header() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const isLoggedIn = useAppSelector(selectIsLoggedIn);
  const user = useAppSelector(selectUser);

  const handleLogout = async () => {
    await dispatch(logOut());
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/10">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-starway-orange to-starway-pink rounded-2xl flex items-center justify-center rotate-6 hover:rotate-0 transition-transform">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold hidden sm:block">Starway</span>
          </Link>

          {/* Right side */}
          {isLoggedIn && user ? (
            <div className="flex items-center gap-3">
              
              {/* Notifications */}
              <button 
                className="p-2.5 hover:bg-white/10 rounded-xl transition relative text-gray-400 hover:text-white"
                aria-label="Сповіщення"
              >
                <Bell size={20} />
                <span className="absolute top-2 right-2 w-2 h-2 bg-starway-orange rounded-full animate-pulse" />
              </button>

              {/* Settings */}
              <Link 
                to="/admin/settings"
                className="p-2.5 hover:bg-white/10 rounded-xl transition text-gray-400 hover:text-white"
                aria-label="Налаштування"
              >
                <Settings size={20} />
              </Link>

              {/* User Menu */}
              <div className="flex items-center gap-3 pl-3 border-l border-white/10">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-semibold text-white">{user.name}</p>
                  <p className="text-xs text-gray-400">
                    {user.role === 'super_admin' ? '👑 Super Admin' : user.role === 'funnel_admin' ? 'Admin' : 'User'}
                  </p>
                </div>
                
                <div className="w-10 h-10 bg-gradient-to-br from-starway-purple to-starway-pink rounded-full flex items-center justify-center ring-2 ring-white/20">
                  <span className="text-white font-bold text-lg">
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                </div>

                <button
                  onClick={handleLogout}
                  className="p-2.5 hover:bg-red-500/10 text-gray-400 hover:text-red-400 rounded-xl transition"
                  aria-label="Вийти"
                >
                  <LogOut size={20} />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link to="/auth">
                <button className="px-4 py-2 text-gray-300 hover:text-white transition font-medium">
                  Увійти
                </button>
              </Link>
              <Link to="/auth">
                <button className="px-6 py-2.5 bg-gradient-to-r from-starway-orange to-starway-pink text-white rounded-xl font-semibold hover:scale-105 transition-transform shadow-lg shadow-starway-orange/20">
                  Почати
                </button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}