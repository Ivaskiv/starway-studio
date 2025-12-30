// packages/frontend/src/components/layout/Header.tsx

import { Link, useNavigate } from 'react-router-dom';
import { Bell, Settings, LogOut, Sparkles, Menu, Wallet, Clock } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '@frontend/store/hooks';
import { selectIsLoggedIn, selectUser } from '@frontend/store/auth/authSelectors';
import { logOut } from '@frontend/store/auth/authOperations';
import { Button } from '@starway/shared/ui';

interface HeaderProps {
  onMenuClick?: () => void; // Optional для HomePage
}

export default function Header({ onMenuClick }: HeaderProps = {}) {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const isLoggedIn = useAppSelector(selectIsLoggedIn);
  const user = useAppSelector(selectUser);

  const handleLogout = async () => {
    await dispatch(logOut());
    navigate('/');
  };

  // Форматуємо дату українською (тільки для Dashboard)
  const currentDate = onMenuClick ? new Date().toLocaleDateString('uk-UA', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }) : null;

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('uk-UA', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const currentTime = onMenuClick ? new Date().toLocaleTimeString('uk-UA', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }) : null;

  // Dashboard Header (з burger menu)
  if (onMenuClick && isLoggedIn && user) {
    return (
      <header className="glass-card rounded-none border-b border-white/10 px-4 lg:px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Left: Burger + Greeting */}
          <div className="flex items-center gap-4">
            {/* Burger Menu (mobile only) */}
            <Button
              variant="ghost"
              size="sm"
              onClick={onMenuClick}
              className="lg:hidden glass-button p-2"
              aria-label="Відкрити меню"
            >
              <Menu className="w-6 h-6 text-slate-400" />
            </Button>

            <div>
              <h2 className="text-xl lg:text-2xl font-bold text-white">
                Вітаємо, {user.firstName}! 👋
              </h2>
              <p className="text-xs lg:text-sm text-slate-400 mt-1">
                {currentDate} • {currentTime}
              </p>
              <div className="flex items-center gap-2">
              <Clock size={16} />
              <span className="text-sm font-mono">{formatTime(currentTime)}</span>
            </div>
            </div>
          </div>

          {/* Right: Balance + Notifications */}
          <div className="flex items-center gap-2 lg:gap-4">
            {/* Balance */}
            <div className="glass-card px-3 lg:px-4 py-2 flex items-center gap-2">
              <Wallet className="w-4 lg:w-5 h-4 lg:h-5 text-green-400" />
              <span className="font-semibold text-white text-sm lg:text-base">0 ₴</span>
            </div>

            {/* Notifications */}
            <Button className="relative glass-button p-2">
              <Bell className="w-4 lg:w-5 h-4 lg:h-5 text-slate-400" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </Button>

            {/* Logout */}
            <Button
              onClick={handleLogout}
              className="hidden lg:flex glass-button p-2 text-red-400 hover:text-red-300"
              aria-label="Вийти"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>
    );
  }

  // Public Header (Homepage, Auth pages)
  return (
    <header className="sticky top-0 z-50 glass-card rounded-none border-b border-white/10">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-orange rounded-2xl flex items-center justify-center rotate-6 hover:rotate-0 transition-transform shadow-lg">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold hidden sm:block text-white">Starway</span>
          </Link>

          {/* Right side */}
          {isLoggedIn && user ? (
            <div className="flex items-center gap-3">
              
              {/* Notifications */}
              <Button 
                className="glass-button p-2.5 relative"
                aria-label="Сповіщення"
              >
                <Bell size={20} />
                <span className="absolute top-2 right-2 w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
              </Button>

              {/* Settings */}
              <Link to="/dashboard/settings">
                <Button variant="ghost" className="glass-button p-2.5">
                  <Settings size={20} />
                </Button>
              </Link>

              {/* User Menu */}
              <div className="flex items-center gap-3 pl-3 border-l border-white/10">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-semibold text-white">
                    {user.firstName} {user.lastName}
                  </p>
                  <p className="text-xs text-slate-400">
                    {user.email}
                  </p>
                </div>
                
                <div className="w-10 h-10 bg-gradient-orange rounded-full flex items-center justify-center ring-2 ring-white/20 shadow-lg">
                  <span className="text-white font-bold text-lg">
                    {user.firstName?.charAt(0).toUpperCase()}
                  </span>
                </div>

                <Button
                  onClick={handleLogout}
                  className="glass-button p-2.5 text-red-400 hover:text-red-300"
                  aria-label="Війти"
                >
                  <LogOut size={20} />
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link to="/auth">
                <Button variant="ghost" className="glass-button">
                  Увійти
                </Button>
              </Link>
              <Link to="/auth">
                <Button variant="primary" className="gradient-button">
                  Почати
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}