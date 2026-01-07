// packages/frontend/src/components/Header.tsx
import { useGetMeQuery, useLogOutMutation } from '@/services/auth.api';
import { Button, GlassCard } from '@/ui';
import { Bell, LogOut, Menu, Settings, Sparkles, Wallet } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

interface HeaderProps {
  onMenuClick?: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const { data: userData } = useGetMeQuery(undefined, {
    skip: !onMenuClick,
  });
  const [logOut, { isLoading: isLoggingOut }] = useLogOutMutation();

  const user = userData?.user;
  const isLoggedIn = !!user;

  useEffect(() => {
    if (onMenuClick) {
      const interval = setInterval(() => setCurrentTime(new Date()), 1000);
      return () => clearInterval(interval);
    }
  }, [onMenuClick]);

  const handleLogout = async () => {
    try {
      await logOut().unwrap();
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const currentDate = onMenuClick
    ? currentTime.toLocaleDateString('uk-UA', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })
    : null;

  const formatTime = (date: Date) =>
    date.toLocaleTimeString('uk-UA', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });

  // ============ DASHBOARD HEADER ============
  if (onMenuClick && isLoggedIn && user) {
    return (
      <header className="glass-card rounded-none border-b border-white/10 px-4 lg:px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              onClick={onMenuClick}
              className="lg:hidden glass-card p-2 hover:bg-white/10 transition-colors"
              aria-label="Відкрити меню"
            >
              <Menu className="w-6 h-6 text-slate-400" />
            </Button>

            <div>
              <h2 className="text-xl lg:text-2xl font-bold text-white">
                Вітаємо, {user.firstName}! 👋
              </h2>
              {currentDate && (
                <p className="text-xs lg:text-sm text-slate-400 mt-1">
                  {currentDate} • {formatTime(currentTime)}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 lg:gap-4">
            <GlassCard className="px-3 lg:px-4 py-2 flex items-center gap-2">
              <Wallet className="w-4 lg:w-5 h-4 lg:h-5 text-green-400" />
              <span className="font-semibold text-white text-sm lg:text-base">0 ₴</span>
            </GlassCard>

            <Button className="relative glass-card p-2 hover:bg-white/10 transition-colors">
              <Bell className="w-4 lg:w-5 h-4 lg:h-5 text-slate-400" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
            </Button>

            <Button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="hidden lg:flex glass-card p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors disabled:opacity-50"
              aria-label="Вийти"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>
    );
  }

  // ============ PUBLIC HEADER ============
  return (
    <header className="sticky top-0 z-50 glass-card rounded-none border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl flex items-center justify-center rotate-6 group-hover:rotate-0 transition-transform shadow-lg">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl md:text-2xl font-bold hidden sm:block text-white">Starway</span>
          </Link>

          {isLoggedIn && user ? (
            <div className="flex items-center gap-3">
              <Button className="glass-card p-2.5 relative hover:bg-white/10 transition-colors" aria-label="Сповіщення">
                <Bell size={20} className="text-slate-400" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-orange-500 rounded-full" data-glow />
              </Button>

              <Link to="/dashboard/settings">
                <Button className="glass-card p-2.5 hover:bg-white/10 transition-colors">
                  <Settings size={20} className="text-slate-400" />
                </Button>
              </Link>

              <div className="flex items-center gap-3 pl-3 border-l border-white/10">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-semibold text-white">
                    {user.firstName} {user.lastName}
                  </p>
                  <p className="text-xs text-slate-400">{user.email}</p>
                </div>

                <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center ring-2 ring-white/20 shadow-lg">
                  <span className="text-white font-bold text-lg">
                    {user.firstName?.charAt(0).toUpperCase()}
                  </span>
                </div>

                <Button
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="glass-card p-2.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                  aria-label="Вийти"
                >
                  <LogOut size={20} />
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link to="/auth">
                <Button className="glass-card px-4 py-2 hover:bg-white/10 text-sm md:text-base">
                  Увійти
                </Button>
              </Link>
              <Link to="/auth">
                <Button data-color="orange" data-size="md" className="text-sm md:text-base">
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