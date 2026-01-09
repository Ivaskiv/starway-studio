// packages/frontend/src/components/TelegramMenu.tsx

import { useGetMeQuery } from '@/features/auth/services/auth.api';
import { GlassCard } from '@/ui';
import { BarChart3, Home, Sparkles, User, Zap } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

interface TelegramMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TelegramMenu({ isOpen, onClose }: TelegramMenuProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { data: userData } = useGetMeQuery();
  const isLoggedIn = !!userData?.user;

  const handleClick = (path: string) => {
    if (!isLoggedIn && path !== '/') {
      navigate('/auth');
    } else {
      navigate(path);
    }
    onClose();
  };

  const isActive = (path: string) => location.pathname === path;

  const menuItems = [
    {
      id: 'home',
      path: '/',
      icon: Home,
      label: 'Головна',
      color: 'text-blue-400',
    },
    {
      id: 'ai-generator',
      path: isLoggedIn ? '/dashboard/ai-generator' : '/auth',
      icon: Sparkles,
      label: 'AI Studio',
      color: 'text-orange-400',
    },
    {
      id: 'funnels',
      path: isLoggedIn ? '/dashboard/funnels' : '/auth',
      icon: Zap,
      label: 'Воронки',
      color: 'text-green-400',
    },
    {
      id: 'analytics',
      path: isLoggedIn ? '/dashboard/analytics' : '/auth',
      icon: BarChart3,
      label: 'Аналітика',
      color: 'text-purple-400',
    },
    {
      id: 'profile',
      path: isLoggedIn ? '/dashboard/users' : '/auth',
      icon: User,
      label: 'Профіль',
      color: 'text-pink-400',
    },
  ];

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => onClose()}
        className={`
          fixed bottom-6 right-6 z-50 lg:hidden
          w-14 h-14 rounded-full glass-card 
          flex items-center justify-center
          transition-all duration-300
          ${isOpen ? 'rotate-90 scale-110' : 'rotate-0 scale-100'}
        `}
        data-hover="lift"
      >
        {isOpen ? (
          <span className="text-2xl">✕</span>
        ) : (
          <span className="text-2xl">☰</span>
        )}
      </button>

      {/* Menu Panel */}
      <div
        className={`
          fixed bottom-0 left-0 right-0 z-40 lg:hidden
          transition-transform duration-300 ease-out
          ${isOpen ? 'translate-y-0' : 'translate-y-full'}
        `}
      >
        <GlassCard className="rounded-t-3xl border-t border-white/10 p-4" data-blur="xl">
          <div className="grid grid-cols-5 gap-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              
              return (
                <button
                  key={item.id}
                  onClick={() => handleClick(item.path)}
                  className={`
                    flex flex-col items-center gap-2 p-3 rounded-2xl transition-all
                    ${active ? 'bg-white/10 scale-105' : 'hover:bg-white/5'}
                  `}
                >
                  <Icon className={`w-6 h-6 transition-colors ${active ? item.color : 'text-gray-400'}`} />
                  <span className={`text-xs transition-colors ${active ? 'text-white font-medium' : 'text-gray-400'}`}>
                    {item.label}
                  </span>
                  {active && (
                    <div className="w-8 h-1 rounded-full bg-gradient-to-r from-orange-500 to-pink-500 mt-1" />
                  )}
                </button>
              );
            })}
          </div>
        </GlassCard>
      </div>

      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-30 lg:hidden"
          onClick={onClose}
        />
      )}
    </>
  );
}