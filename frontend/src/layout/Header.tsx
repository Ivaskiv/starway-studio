import { AuthModal } from '@/features/auth/components/AuthModal';
import { User } from '@/shared/types/user.types';
import { Button, GlassCard } from '@/ui';
import { ChevronDown, Menu as MenuIcon, Sparkles } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

interface HeaderProps {
  user?: User;
  onMenuClick?: () => void;
}

// ✅ єдине джерело правди для меню
const HEADER_MENU = [
  { label: 'Dashboard', path: '/dashboard' },
  { label: 'Мої курси', path: '/dashboard/courses', ability: 'courses.view' },
  { label: 'AI Ментор', path: '/dashboard/ai-mentor', ability: 'ai.use' },
  { label: 'Прогрес', path: '/dashboard/progress', ability: 'progress.view' },
  { label: 'Профіль', path: '/dashboard/profile', ability: 'profile.view' },
  { label: 'Продукти', path: '/dashboard/products', ability: 'products.manage' },
  { label: 'Воронки', path: '/dashboard/funnels', ability: 'funnels.manage' },
  { label: 'Налаштування', path: '/dashboard/settings', ability: 'settings.manage' },
];

export default function Header({ user, onMenuClick }: HeaderProps) {
  const navigate = useNavigate();
  const [authOpen, setAuthOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const isLoggedIn = !!user;

  const handleLogout = () => {
    localStorage.removeItem('starway_auth_token');
    setMenuOpen(false);
    navigate('/');
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const menuItems = HEADER_MENU.filter(item => {
    if (!item.ability) return true;
    return user?.abilities?.includes(item.ability);
  });

  // ===== DASHBOARD HEADER =====
  if (isLoggedIn && user) {
    return (
      <header className="glass-card rounded-none border-b border-white/10 px-4 lg:px-6 py-4 sticky top-0 z-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {onMenuClick && (
              <Button
                onClick={onMenuClick}
                className="lg:hidden glass-card p-2 hover:bg-white/10 transition-colors"
                aria-label="Відкрити меню"
              >
                <MenuIcon className="w-6 h-6 text-slate-400" />
              </Button>
            )}

            <div>
              <h2 className="text-xl lg:text-2xl font-bold text-white">
                Вітаємо, {user.firstName}! 👋
              </h2>
              <p className="text-xs lg:text-sm text-slate-400 mt-1">{user.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 relative" ref={menuRef}>
            {/* Аватар та меню */}
            <Button
              onClick={() => setMenuOpen(v => !v)}
              className="flex items-center gap-2 glass-card p-2"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
                {user.firstName.charAt(0).toUpperCase()}
              </div>
              <ChevronDown className="w-4 h-4 text-white/70" />
            </Button>

            {menuOpen && (
              <GlassCard className="absolute right-0 mt-2 w-52 flex flex-col gap-1 p-2 z-50 border border-white/10">
                {menuItems.map(item => (
                  <Link key={item.path} to={item.path} onClick={() => setMenuOpen(false)}>
                    <Button className="w-full text-left py-2 px-3 hover:bg-white/5">
                      {item.label}
                    </Button>
                  </Link>
                ))}
                <Button
                  onClick={handleLogout}
                  className="w-full text-left text-red-400 py-2 px-3 hover:bg-red-500/10"
                >
                  Вийти
                </Button>
              </GlassCard>
            )}
          </div>
        </div>
      </header>
    );
  }

  // ===== PUBLIC HEADER =====
  return (
    <header className="sticky top-0 z-50 glass-card rounded-none border-b border-white/10">
      <div className="max-w-7xl mx-auto px-6 h-16 flex justify-between items-center">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-500 rounded-2xl flex items-center justify-center">
            <Sparkles className="text-white" />
          </div>
          <span className="text-xl font-bold text-white">Starway</span>
        </Link>

        <div className="flex gap-3">
          <Button onClick={() => setAuthOpen(true)}>Увійти</Button>
        </div>

        {authOpen && <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />}
      </div>
    </header>
  );
}
