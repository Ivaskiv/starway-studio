// frontend/src/features/social/pages/OAuthCallbackPage.tsx
import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Loader } from 'lucide-react';
import { GlassCard } from '@/ui';
import { parseSocialFlow } from '../utils/social.utils';
import { useSocialCallbackMutation } from '../services/social.api';
import { useAppDispatch } from '@/app/store/hooks';
import { hydrateAuth } from '@/features/auth/services/auth.slice';
import { normalizeSingleUser } from '@/shared/types/user.types';
import { saveToken } from '@/services/api';

export default function OAuthCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const dispatch = useAppDispatch();
  const [socialCallback] = useSocialCallbackMutation();

  useEffect(() => {
    const processCallback = async () => {
      const { mode } = parseSocialFlow(searchParams);
      const code = searchParams.get('code');
      const error = searchParams.get('error');

      if (error) {
        toast.error(`Помилка авторизації: ${error}`);
        navigate(mode === 'connect' ? '/settings/connections' : '/login', { replace: true });
        return;
      }

      if (!code) {
        toast.error('Неправильні параметри авторизації');
        navigate(mode === 'connect' ? '/settings/connections' : '/login', { replace: true });
        return;
      }

      try {
        toast.loading('Завершення авторизації...', { id: 'oauth' });

        // Викликаємо бекенд для завершення OAuth (отримуємо токен + користувача)
        const response = await socialCallback({ code }).unwrap();

        // Зберігаємо токен
        saveToken(response.token);

        // Хідратимо користувача в Redux
        dispatch(hydrateAuth(normalizeSingleUser(response.user)));

        toast.success('Авторизація успішна!', { id: 'oauth' });

        // Редірект після логіну
        navigate(mode === 'connect' ? '/settings/connections' : '/dashboard', { replace: true });
      } catch (err: any) {
        console.error('OAuth callback error:', err);
        toast.error(err?.data?.message || 'Помилка авторизації', { id: 'oauth' });
        navigate(mode === 'connect' ? '/settings/connections' : '/login', { replace: true });
      }
    };

    processCallback();
  }, [searchParams, navigate, socialCallback, dispatch]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 to-black">
      <GlassCard className="p-12 flex flex-col items-center gap-6">
        <Loader className="w-12 h-12 animate-spin text-orange-500" />
        <h2 className="text-2xl font-bold text-white">Обробка авторизації...</h2>
        <p className="text-white/60">Будь ласка, зачекайте</p>
      </GlassCard>
    </div>
  );
}
