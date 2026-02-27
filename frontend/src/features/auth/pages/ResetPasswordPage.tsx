import { useResetPasswordMutation } from '@/features/auth/services/auth.api';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { getToastMessage } from '@/shared/i18n/toast';
import { Button, Input } from '@/ui';
import { type FormEvent, useState } from 'react';
import toast from 'react-hot-toast';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [resetPassword, { isLoading }] = useResetPasswordMutation();
  const { user } = useAuth();
  const lang = user?.settings?.language ?? 'uk';

  const initialToken = searchParams.get('token') ?? '';
  const [token, setToken] = useState(initialToken);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!token.trim()) {
      toast.error(getToastMessage('auth.resetNeedToken', lang));
      return;
    }
    if (password.length < 8) {
      toast.error(getToastMessage('auth.resetPasswordMinLen', lang));
      return;
    }
    if (password !== confirmPassword) {
      toast.error(getToastMessage('auth.resetPasswordsMismatch', lang));
      return;
    }

    try {
      await resetPassword({ token: token.trim(), password }).unwrap();
      toast.success(getToastMessage('auth.resetSuccess', lang));
      navigate('/?auth=login', { replace: true });
    } catch (err: any) {
      const message =
        err?.data?.error === 'invalid_or_expired_reset_token'
          ? getToastMessage('auth.resetTokenInvalid', lang)
          : err?.data?.message || getToastMessage('auth.resetFailed', lang);
      toast.error(message);
    }
  };

  return (
    <section className="min-h-[70vh] flex items-center justify-center px-4 py-10">
      <div className="glass-card w-full max-w-md p-6 md:p-8">
        <h1 className="text-2xl font-semibold text-white mb-2">Скидання пароля</h1>
        <p className="text-white/70 text-sm mb-6">
          {initialToken
            ? 'Задайте новий пароль для вашого акаунту.'
            : 'Вставте токен з листа та задайте новий пароль.'}
        </p>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          {!initialToken && (
            <Input
              label="Токен"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="reset-token"
              disabled={isLoading}
            />
          )}
          <Input
            label="Новий пароль"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            disabled={isLoading}
          />
          <Input
            label="Підтвердіть пароль"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            disabled={isLoading}
          />

          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Збереження...' : 'Зберегти новий пароль'}
          </Button>
        </form>

        <Link
          to="/"
          className="inline-block mt-5 text-sm text-white/70 hover:text-white underline underline-offset-4"
        >
          Повернутись на вхід
        </Link>
      </div>
    </section>
  );
}
