// frontend/src/layout/LandingHeader.tsx

import { useEffect, useState } from 'react';
import { Bell, Menu, X } from 'lucide-react';
import AuthModal from '@/features/auth/components/AuthModal';
import { useSmartNavigation } from '@/hooks/useSmartNavigation';
import { UserMenu } from '@/components/UserMenu';
import { Button } from '@/ui';

export default function LandingHeader() {
  const { user, navigateTo, authModalOpen, openAuthModal, closeAuthModal } = useSmartNavigation();
  const [scrolled,   setScrolled]   = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [authMode,   setAuthMode]   = useState<'login' | 'register'>('login');

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 16);
    window.addEventListener('scroll', h, { passive: true });
    return () => window.removeEventListener('scroll', h);
  }, []);

  useEffect(() => { setMobileOpen(false); }, [authModalOpen]);

  return (
    <>
      <header className={[
        'fixed inset-x-0 top-0 z-50 transition-all duration-300',
        scrolled
          ? 'bg-[#111318]/85 backdrop-blur-2xl border-b border-white/[0.07] shadow-[0_1px_40px_rgba(0,0,0,0.5)]'
          : 'bg-transparent border-b border-transparent',
      ].join(' ')}>

        <div className="max-w-7xl mx-auto px-5 sm:px-6 h-14 flex items-center justify-between gap-4">

          {/* logo */}
          <button onClick={() => navigateTo('/')}
            className="flex items-center gap-2.5 flex-shrink-0 group bg-transparent border-none cursor-pointer"
          >
            <div className="w-[30px] h-[30px] rounded-[8px] bg-gradient-to-br from-orange-500 to-orange-400 flex items-center justify-center text-sm shadow-[0_3px_10px_rgba(249,115,22,0.4)] group-hover:scale-105 transition-transform duration-200">
              ✦
            </div>
            <span className="text-[15px] font-extrabold tracking-[-0.3px] text-white">Starway</span>
          </button>

          {/* right */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {!user ? (
              <>
                <button onClick={() => { setAuthMode('login'); openAuthModal(); }}
                  className="hidden sm:block px-4 py-2 text-[13px] font-medium text-white/38 hover:text-white transition-colors bg-transparent border-none cursor-pointer"
                >Увійти</button>
                <button onClick={() => { setAuthMode('register'); openAuthModal(); }}
                  className="px-4 py-2 rounded-[10px] text-[13px] font-bold text-white bg-gradient-to-br from-orange-500 to-orange-400 shadow-[0_3px_14px_rgba(249,115,22,0.35)] hover:brightness-110 hover:scale-105 transition-all duration-150 border-none cursor-pointer"
                >Реєстрація</button>
              </>
            ) : (
              <>
                <Button className="relative w-[34px] h-[34px] rounded-[9px] border border-white/[0.07] bg-white/[0.04] hover:bg-white/[0.07] flex items-center justify-center text-white/38 hover:text-white/70 transition-colors">
                  <Bell className="w-4 h-4" />
                  <div className="absolute top-[5px] right-[5px] w-[7px] h-[7px] rounded-full bg-red-500 border-[1.5px] border-[#111318]" />
                </Button>
                <UserMenu variant="header" />
              </>
            )}

            <button onClick={() => setMobileOpen(v => !v)}
              className="md:hidden w-[34px] h-[34px] rounded-[9px] border border-white/[0.07] bg-white/[0.04] hover:bg-white/[0.07] flex items-center justify-center text-white/38 hover:text-white transition-colors"
            >
              {mobileOpen
                ? <X    className="w-4 h-4 text-white" />
                : <Menu className="w-4 h-4" />
              }
            </button>
          </div>
        </div>

        {/* mobile menu */}
        {mobileOpen && (
          <div className="md:hidden bg-[#111318]/95 backdrop-blur-2xl border-t border-white/[0.07] px-5 pb-5 pt-4">
            <p className="text-[13px] text-white/38 leading-relaxed">Навігація доступна у боковій панелі.</p>
            {!user && (
              <button onClick={() => { openAuthModal(); setMobileOpen(false); }}
                className="mt-3 w-full py-3 rounded-[10px] text-[13px] font-bold text-white bg-gradient-to-br from-orange-500 to-orange-400 border-none cursor-pointer"
              >Спробувати безкоштовно</button>
            )}
          </div>
        )}
      </header>

      <AuthModal isOpen={authModalOpen} onClose={closeAuthModal} defaultMode={authMode} />
    </>
  );
}