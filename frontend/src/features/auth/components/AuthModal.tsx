// frontend/src/features/auth/components/AuthModal.tsx
import { useAppDispatch } from '@/app/hooks';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { saveToken } from '@/features/auth/services/token';
import type { SocialPlatform } from '@/features/social/types/social.types';
import { hasSavedAccentColor } from '@/shared/utils/accent.utils';
import { Button } from '@/ui';
import { X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useLoginMutation } from '../services/auth.api';
import { setCredentials } from '../services/auth.slice';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';

type Mode = 'login' | 'register';

interface SocialData {
  provider: SocialPlatform;
  name?: string;
  email?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: Mode;
}

export default function AuthModal({ isOpen, onClose, defaultMode = 'login' }: Props) {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { loginWithSocial } = useAuth();
  const [loginMutation] = useLoginMutation();

  const [mode, setMode] = useState<Mode>(defaultMode);
  const [socialData, setSocialData] = useState<SocialData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [autoLoginData, setAutoLoginData] = useState<{ email: string; password: string } | null>(
    null,
  );

  const formKey = useRef(0);

  // Reset при закритті модалки
  useEffect(() => {
    if (!isOpen) {
      setMode(defaultMode);
      setSocialData(null);
      setIsProcessing(false);
      setAutoLoginData(null);
      formKey.current += 1;
    }
  }, [isOpen, defaultMode]);

  // Автологін після успішної реєстрації
  useEffect(() => {
    if (autoLoginData) {
      performAutoLogin();
    }
  }, [autoLoginData]);

  const performAutoLogin = async () => {
    if (!autoLoginData) return;

    try {
      const response = await loginMutation(autoLoginData).unwrap();

      saveToken(response.accessToken);
      dispatch(
        setCredentials({
          user: response.user,
          accessToken: response.accessToken,
        }),
      );

      toast.success('Автоматичний вхід виконано!');
      onClose();
      navigate('/dashboard', { replace: true });
    } catch (err) {
      console.error('Auto-login error:', err);
      toast.error('Автоматичний вхід не вдався. Увійдіть вручну.');
      setMode('login');
    } finally {
      setAutoLoginData(null);
    }
  };

  const handleSocial = async (provider: SocialPlatform) => {
    setIsProcessing(true);

    try {
      await loginWithSocial(provider);
      toast.success('Авторизація успішна!');
      onClose();
      navigate('/dashboard', { replace: true });
    } catch (err) {
      console.error('Social auth error:', err);
      toast.error('Помилка соціальної авторизації');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRegisterSuccess = (credentials?: { email: string; password: string }) => {
    toast.success('Реєстрація успішна!');

    if (credentials) {
      // Якщо бекенд повернув дані для автологіну — запускаємо
      setAutoLoginData(credentials);
    } else {
      // Просто перемикаємо на логін
      setMode('login');
      formKey.current += 1;
    }
  };

  const handleLoginSuccess = () => {
    onClose();
    // fix_code_x: after first successful auth, prompt accent setup in Settings if user has no saved accent yet.
    navigate(hasSavedAccentColor() ? '/dashboard' : '/dashboard/settings?accent=1', { replace: true });
  };

  const switchMode = () => {
    setMode(prev => (prev === 'login' ? 'register' : 'login'));
    setSocialData(null);
    formKey.current += 1;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div onClick={onClose} className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="glass-card relative w-full max-w-md p-8 rounded-3xl z-10 animate-modal-in shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Close Button */}
        <Button
          onClick={onClose}
          disabled={isProcessing}
          className="absolute top-5 right-5 p-2 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-all disabled:opacity-50"
        >
          <X className="w-6 h-6" />
        </Button>

        {/* Content */}
        <div className="space-y-8">
          {mode === 'login' ? (
            <LoginForm
              key={`login-${formKey.current}`}
              onSwitch={switchMode}
              onSuccess={handleLoginSuccess}
            />
          ) : (
            <RegisterForm
              key={`register-${formKey.current}`}
              email={socialData?.email}
              name={socialData?.name}
              onSwitch={switchMode}
              onSuccess={handleRegisterSuccess}
            />
          )}

          {/* Social Auth (тільки для логіну) */}
          {mode === 'login' && (
            <>
              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-6 py-1 bg-black/40 backdrop-blur-sm text-white/60 rounded-full">
                    або продовжити з
                  </span>
                </div>
              </div>

              {/* Social Buttons */}
              <div className="grid grid-cols-2 gap-4">
                <Button
                  variant="outline"
                  onClick={() => handleSocial('google')}
                  disabled={isProcessing}
                  className="border-white/20 hover:bg-white/10"
                >
                  Google
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleSocial('telegram')}
                  disabled={isProcessing}
                  className="border-white/20 hover:bg-white/10"
                >
                  Telegram
                </Button>
              </div>
            </>
          )}
        </div>

        {/* Processing Overlay */}
        {isProcessing && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center rounded-3xl">
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-white/80 text-sm">Обробка...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
