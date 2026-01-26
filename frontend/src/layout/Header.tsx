import { AuthModal } from '@/features/auth/components/AuthModal';
import { ChevronDown, Sparkles } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User } from '../shared/types/user.types';
import { Button, GlassCard } from '../ui';

interface HeaderProps {
  user?: User;
  onMenuClick?: () => void;
}

export default function Header({ user, onMenuClick }: HeaderProps) {
  const navigate = useNavigate();
  const [authOpen, setAuthOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const isLoggedIn = !!user;

  const handleAuthOpen = () => {
    console.log('🔘 Login button clicked');
    setAuthOpen(true);
  };

  const handleLogout = () => {
    console.log('🚪 Logout clicked');
    localStorage.removeItem('starway_auth_token');
    setMenuOpen(false);
    navigate('/');
  };

  // Закриття меню при кліку поза ним
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Динамічне меню по ролях
  const menuItems =
    user?.role === 'admin' || user?.role === 'super_admin'
      ? [
          { label: 'Dashboard', path: '/dashboard' },
          { label: 'AI Ментор', path: '/dashboard/ai-mentor' },
          { label: 'Прогрес', path: '/dashboard/progress' },
          { label: 'Профіль', path: '/dashboard/profile' },
          { label: 'Продукти', path: '/dashboard/products' },
          { label: 'Воронки', path: '/dashboard/funnels' },
          { label: 'Налаштування', path: '/dashboard/settings' },
        ]
      : [
          { label: 'Dashboard', path: '/dashboard' },
          { label: 'AI Ментор', path: '/dashboard/ai-mentor' },
          { label: 'Прогрес', path: '/dashboard/progress' },
          { label: 'Профіль', path: '/dashboard/profile' },
        ];

  return (
    <header className="sticky top-0 z-50 glass-card border-b border-white/10">
      <div className="max-w-7xl mx-auto px-6 h-16 flex justify-between items-center">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-500 rounded-2xl flex items-center justify-center">
            <Sparkles className="text-white" />
          </div>
          <span className="text-xl font-bold text-white">Starway</span>
        </Link>

        {!isLoggedIn ? (
          <div className="flex gap-3">
            <Button onClick={handleAuthOpen}>Увійти</Button>
            <Button data-color="orange" onClick={handleAuthOpen}>
              Почати
            </Button>
          </div>
        ) : (
          <div className="relative" ref={menuRef}>
            <Button onClick={() => setMenuOpen(!menuOpen)} className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
                {user.firstName.charAt(0).toUpperCase()}
              </div>
              <ChevronDown className="w-4 h-4 text-white/70" />
            </Button>

            {menuOpen && (
              <GlassCard className="absolute right-0 mt-2 w-48 flex flex-col gap-1 p-2 shadow-lg z-50 border border-white/10">
                {menuItems.map(item => (
                  <Link key={item.label} to={item.path} onClick={() => setMenuOpen(false)}>
                    <Button className="w-full text-left text-white/90 py-2 px-3 hover:bg-white/5">
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
        )}
      </div>

      {authOpen && <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />}
    </header>
  );
}
