import { useResetPasswordMutation } from '@/features/auth/services/auth.api';
import { Button, Input } from '@/ui';
import { type FormEvent, useState } from 'react';
import toast from 'react-hot-toast';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [resetPassword, { isLoading }] = useResetPasswordMutation();

  const initialToken = searchParams.get('token') ?? '';
  const [token, setToken] = useState(initialToken);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!token.trim()) {
      toast.error('Вкажіть токен скидання');
      return;
    }
    if (password.length < 8) {
      toast.error('Пароль має бути мінімум 8 символів');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Паролі не співпадають');
      return;
    }

    try {
      await resetPassword({ token: token.trim(), password }).unwrap();
      toast.success('Пароль змінено. Увійдіть з новим паролем.');
      navigate('/', { replace: true });
    } catch (err: any) {
      const message =
        err?.data?.error === 'invalid_or_expired_reset_token'
          ? 'Токен недійсний або застарів'
          : err?.data?.message || 'Не вдалося змінити пароль';
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
