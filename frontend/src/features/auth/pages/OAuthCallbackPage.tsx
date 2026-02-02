// src/pages/auth/OAuthCallbackPage.tsx
import { useEffect } from 'react';
import toast from 'react-hot-toast';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { useSocialLoginMutation } from '@/features/social/services/social.api';
import { GlassCard } from '@/ui';
import { Loader } from 'lucide-react';
import type { SocialPlatform } from '@/features/social/types/social.types';

const ALLOWED_PROVIDERS: SocialPlatform[] = ['google', 'telegram', 'instagram'];

export default function OAuthCallbackPage() {
  const navigate = useNavigate();
  const { provider } = useParams<{ provider: SocialPlatform }>();
  const [searchParams] = useSearchParams();
  const [socialLogin, { isLoading }] = useSocialLoginMutation();

  useEffect(() => {
    const run = async () => {
      if (!provider || !ALLOWED_PROVIDERS.includes(provider)) {
        toast.error('Невідомий провайдер авторизації');
        navigate('/');
        return;
      }

      const error = searchParams.get('error');
      if (error) {
        toast.error(`Помилка авторизації: ${error}`);
        navigate('/');
        return;
      }

      const code = searchParams.get('code');
      if (!code) {
        toast.error('Відсутній код авторизації');
        navigate('/');
        return;
      }

      try {
        toast.loading(`Завершення входу через ${provider}...`, { id: 'oauth' });

        const response = await socialLogin({
          provider,
          code,
        }).unwrap();

        // Токен після нормалізації завжди в response.tokens.accessToken
        localStorage.setItem('auth_token', response.token);

        toast.success(`Вхід через ${provider} успішний!`, { id: 'oauth' });
        navigate('/dashboard');
      } catch (err: any) {
        console.error('Social login error:', err);
        toast.error(err?.data?.message || 'Помилка авторизації', { id: 'oauth' });
        navigate('/');
      }
    };

    run();
  }, [provider, searchParams, navigate, socialLogin]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 to-black">
      <GlassCard className="p-12 flex flex-col items-center gap-6">
        <Loader className={`w-12 h-12 animate-spin ${isLoading ? 'text-orange-500' : 'text-gray-500'}`} />
        <h2 className="text-2xl font-bold text-white">Обробка авторизації...</h2>
        <p className="text-white/60">
          {isLoading ? `Завершуємо вхід через ${provider}...` : 'Будь ласка, зачекайте'}
        </p>
      </GlassCard>
    </div>
  );
}