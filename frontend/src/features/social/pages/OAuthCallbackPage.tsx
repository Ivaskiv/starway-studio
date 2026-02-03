// frontend/src/features/social/pages/OAuthCallbackPage.tsx
import { useAppDispatch } from '@/app/store/hooks';
import { setCredentials } from '@/features/auth/services/auth.slice'; // ← правильний імпорт
import { normalizeSingleUser } from '@/features/user/types/user.types';
import { saveToken } from '@/services/api';
import { GlassCard } from '@/ui';
import { Loader } from 'lucide-react';
import { useEffect } from 'react';
import toast from 'react-hot-toast';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSocialCallbackMutation } from '../services/social.api';
import { parseSocialFlow } from '../utils/social.utils';

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

        const response = await socialCallback({ code }).unwrap();

        // Зберігаємо токен
        saveToken(response.token);

        // Оновлюємо Redux через setCredentials (саме той редюсер, який є)
        dispatch(
          setCredentials({
            user: normalizeSingleUser(response.user),
            accessToken: response.token,
          }),
        );

        toast.success('Авторизація успішна!', { id: 'oauth' });

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
