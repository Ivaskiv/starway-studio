// frontend/src/features/auth/components/AuthModal.tsx
import { Button } from '@/ui';
import { X } from 'lucide-react';
import { useCallback, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';
import { SocialAuthRow } from '../../social/components/SocialAuthRow';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: 'login' | 'register';
}

export function AuthModal({ isOpen, onClose, defaultMode = 'login' }: AuthModalProps) {
  const {
    mode,
    setMode,
    loginLoading,
    registerLoading,
    socialLoading,
    handleLogin,
    handleRegister,
    handleSocialAuth,
  } = useAuth(onClose);

  // Унікальний ключ для примусового перемонтування форм при зміні режиму
  const formResetTrigger = useRef(0);

  // Перемикання режиму + примусове очищення форм
  const switchMode = useCallback((newMode: 'login' | 'register') => {
    setMode(newMode);
    formResetTrigger.current += 1; // змінюємо ключ → форми перемонтуються і очищаються
  }, [setMode]);

  // Блокування скролу при відкритті модалки
  useEffect(() => {
    if (!isOpen) return;

    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999]">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className="relative w-full max-w-md rounded-3xl bg-gradient-to-br from-slate-900/95 to-slate-800/95 border border-white/10 shadow-2xl overflow-hidden">
          <Button
            onClick={onClose}
            variant="ghost"
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 z-20"
          >
            <X className="w-5 h-5 text-white" />
          </Button>

          <div className="p-5 sm:p-6 flex flex-col gap-5">
            {mode === 'login' ? (
              <LoginForm
                key={`login-${formResetTrigger.current}`} // ключ змушує React перестворити форму → всі поля очищаються
                onSubmit={handleLogin}
                onRegisterClick={() => switchMode('register')}
                isLoading={loginLoading}
              />
            ) : (
              <RegisterForm
                key={`register-${formResetTrigger.current}`} // ключ змушує React перестворити форму → всі поля очищаються
                onSubmit={handleRegister}
                onLoginClick={() => switchMode('login')}
                isLoading={registerLoading}
              />
            )}

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="px-2 bg-slate-900 text-white/20">або</span>
              </div>
            </div>

            <SocialAuthRow onAuth={handleSocialAuth} />

            <Button
              type="button"
              variant="ghost"
              fullWidth
              onClick={() => switchMode('register')}
              className="text-white hover:text-orange-400"
            >
              Нема акаунту? <span className="text-orange-400 ml-1">Зареєструватись</span>
            </Button>

            <p className="mt-5 text-xs text-center text-white/40">
              Продовжуючи, ви погоджуєтесь з умовами та політикою конфіденційності
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}