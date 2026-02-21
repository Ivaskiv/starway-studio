// frontend/src/layout/Header.tsx
import { getMenuForLocation } from '@/config/menu';
import AuthModal from '@/features/auth/components/AuthModal';
import { useSmartNavigation } from '@/hooks/useSmartNavigation';
import { UserMenu } from '@/components/UserMenu';
import { Bell, Menu, Sparkles, X } from 'lucide-react';
import { useEffect, useState } from 'react';

// ─────────────────────────────────────────────────────────────────────────────

export default function Header() {
  // ✅ Один виклик хука — не два!
  const { user, navigateTo, isActive, authModalOpen, openAuthModal, closeAuthModal } =
    useSmartNavigation();

  const headerItems = getMenuForLocation('header');
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  // Blur on scroll
  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 16);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  // Close mobile on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [authModalOpen]);

  return (
    <>
      <header
        className={`
          fixed inset-x-0 top-0 z-50 transition-all duration-300
          ${
            scrolled
              ? 'bg-black/70 backdrop-blur-2xl border-b border-white/8 shadow-[0_1px_40px_rgba(0,0,0,.5)]'
              : 'bg-transparent'
          }
        `}
      >
        <div className="max-w-7xl mx-auto px-5 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* ── Logo ─────────────────────────────────────────── */}
          <button
            onClick={() => navigateTo('/')}
            className="flex items-center gap-2.5 shrink-0 group select-none"
          >
            <div
              className="
              w-9 h-9 rounded-xl
              bg-gradient-to-br from-orange-500 to-rose-600
              flex items-center justify-center
              shadow-lg shadow-orange-500/30
              group-hover:scale-110 transition-transform duration-200
            "
            >
              <Sparkles className="w-[18px] h-[18px] text-white" />
            </div>
            <span className="text-[17px] font-bold tracking-tight text-white">Starway</span>
          </button>

          {/* ── Desktop nav ───────────────────────────────────── */}
          <nav className="hidden md:flex items-center gap-0.5 flex-1 justify-center">
            {headerItems.map(item => {
              const active = isActive(item.path);
              return (
                <button
                  key={item.path}
                  onClick={() => navigateTo(item.path)}
                  className={`
                    relative px-4 py-2 rounded-xl text-sm font-medium
                    transition-all duration-150
                    ${
                      active
                        ? 'text-white bg-white/8'
                        : 'text-white/55 hover:text-white hover:bg-white/5'
                    }
                  `}
                >
                  {item.label}
                  {item.badge && (
                    <span className="ml-1.5 px-1.5 py-0.5 text-[10px] font-bold bg-orange-500/20 text-orange-400 rounded-md">
                      {item.badge}
                    </span>
                  )}
                  {active && (
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-orange-500" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* ── Right ────────────────────────────────────────── */}
          <div className="flex items-center gap-2 shrink-0">
            {!user ? (
              <>
                <button
                  onClick={() => {
                    setAuthMode('login');
                    openAuthModal();
                  }}
                  className="hidden sm:block px-4 py-2 text-sm font-medium text-white/65 hover:text-white transition-colors"
                >
                  Увійти
                </button>
                <button
                  onClick={() => {
                    setAuthMode('register');
                    openAuthModal();
                  }}
                  className="
                    px-4 py-2 rounded-xl text-sm font-semibold
                    bg-gradient-to-r from-orange-500 to-rose-500
                    hover:from-orange-400 hover:to-rose-400
                    text-white
                    shadow-lg shadow-orange-500/20
                    hover:scale-105 transition-all duration-150
                  "
                >
                  Реєстрація
                </button>
              </>
            ) : (
              <>
                {/* Notifications */}
                <button className="relative p-2 rounded-xl hover:bg-white/8 transition-colors">
                  {/* Glassmorphism кружечок з цифрою */}
                  <div
                    className="
                    absolute -top-1.5 -right-1.5
                    min-w-[20px] h-5 px-1.5
                    rounded-full
                    bg-orange-500/20 backdrop-blur-md
                    border border-orange-500/40
                    flex items-center justify-center
                    shadow-[0_0_8px_rgba(249,115,22,0.4)]
                    z-10
                  "
                  >
                    <span className="text-[10px] font-bold text-orange-400 leading-none">3</span>
                  </div>
                  <Bell className="w-5 h-5 text-white/70" />
                </button>
                {/* User menu */}
                <UserMenu variant="header" />
              </>
            )}

            {/* Mobile burger */}
            <button
              onClick={() => setMobileOpen(v => !v)}
              className="md:hidden p-2 rounded-xl hover:bg-white/8 transition-colors"
              aria-label="Menu"
            >
              {mobileOpen ? (
                <X className="w-5 h-5 text-white" />
              ) : (
                <Menu className="w-5 h-5 text-white" />
              )}
            </button>
          </div>
        </div>

        {/* ── Mobile menu ───────────────────────────────────── */}
        {mobileOpen && (
          <div className="md:hidden bg-black/95 backdrop-blur-2xl border-t border-white/8 px-5 pb-6">
            <nav className="pt-4 space-y-1">
              {headerItems.map(item => (
                <button
                  key={item.path}
                  onClick={() => {
                    navigateTo(item.path);
                    setMobileOpen(false);
                  }}
                  className={`
                    w-full text-left px-4 py-3 rounded-xl text-sm font-medium
                    transition-all
                    ${
                      isActive(item.path)
                        ? 'bg-orange-500/10 text-orange-400'
                        : 'text-white/65 hover:text-white hover:bg-white/5'
                    }
                  `}
                >
                  {item.label}
                </button>
              ))}
            </nav>
            {!user && (
              <button
                onClick={() => {
                  openAuthModal();
                  setMobileOpen(false);
                }}
                className="
                  mt-4 w-full py-3.5 rounded-xl
                  bg-gradient-to-r from-orange-500 to-rose-500
                  text-white font-semibold text-sm
                "
              >
                Спробувати безкоштовно
              </button>
            )}
          </div>
        )}
      </header>

      {/* Auth modal — рендеримо ПОЗА хедером щоб не було z-index конфлікту */}
      <AuthModal isOpen={authModalOpen} onClose={closeAuthModal} defaultMode={authMode} />
    </>
  );
}
