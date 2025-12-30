// packages/frontend/src/components/layout/TelegramMenu.tsx

import { useNavigate } from 'react-router-dom';
import { Home, Zap, BarChart3, User } from 'lucide-react';
import { useAppSelector } from '@frontend/store/store';
import { selectIsLoggedIn } from '@frontend/store/auth/authSelectors';
import { Button } from '@starway-studio/shared';

interface TelegramMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TelegramMenu({ isOpen, onClose }: TelegramMenuProps) {
  const navigate = useNavigate();
  const isLoggedIn = useAppSelector(selectIsLoggedIn);

  const handleClick = (path: string) => {
    if (!isLoggedIn && path !== '/') {
      navigate('/auth');
    } else {
      navigate(path);
    }
    onClose();
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-xl border-t border-white/10 lg:hidden">
      <div className="grid grid-cols-4 gap-1 p-2">
        
        <Button 
          className="flex flex-col items-center gap-1 p-3 rounded-xl hover:bg-white/5 transition group"
          onClick={() => handleClick('/')}
        >
          <Home className="w-6 h-6 text-gray-400 group-hover:text-white transition" />
          <span className="text-xs text-gray-400 group-hover:text-white transition">Головна</span>
        </Button>

        <Button 
          className="flex flex-col items-center gap-1 p-3 rounded-xl hover:bg-white/5 transition group"
          onClick={() => handleClick('/admin/funnels')}
        >
          <Zap className="w-6 h-6 text-gray-400 group-hover:text-starway-orange transition" />
          <span className="text-xs text-gray-400 group-hover:text-white transition">Воронки</span>
        </Button>

        <Button 
          className="flex flex-col items-center gap-1 p-3 rounded-xl hover:bg-white/5 transition group"
          onClick={() => handleClick('/admin/analytics')}
        >
          <BarChart3 className="w-6 h-6 text-gray-400 group-hover:text-starway-purple transition" />
          <span className="text-xs text-gray-400 group-hover:text-white transition">Аналітика</span>
        </Button>

        <Button 
          className="flex flex-col items-center gap-1 p-3 rounded-xl hover:bg-white/5 transition group"
          onClick={() => handleClick('/profile')}
        >
          <User className="w-6 h-6 text-gray-400 group-hover:text-starway-pink transition" />
          <span className="text-xs text-gray-400 group-hover:text-white transition">Профіль</span>
        </Button>
      </div>
    </nav>
  );
}