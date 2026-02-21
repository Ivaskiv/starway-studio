import { useAuth } from '@/features/auth/hooks/useAuth';
import { useForgotPasswordMutation } from '@/features/auth/services/auth.api';
import { Button, Checkbox, Input } from '@/ui';
import { useForm, type AnyFieldApi } from '@tanstack/react-form';
import { type FormEvent, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

interface Props {
  onSuccess: () => void;
  onSwitch: () => void;
}

type Mode = 'login' | 'forgot';

function FieldInfo({ field }: { field: AnyFieldApi }) {
  if (field.state.meta.isValidating) return <span>Перевірка...</span>;
  if (field.state.meta.isTouched && !field.state.meta.isValid) {
    return <p className="text-red-400 text-sm">{field.state.meta.errors.join(', ')}</p>;
  }
  return null;
}

export function LoginForm({ onSuccess, onSwitch }: Props) {
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState<Mode>('login');
  const [isLoading, setIsLoading] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const navigate = useNavigate();

  const { loginWithCredentials } = useAuth();
  const [forgotPassword, { isLoading: isForgotLoading }] = useForgotPasswordMutation();
  const anyLoading = isLoading || isForgotLoading;

  const forgotHint = useMemo(
    () =>
      'Введіть email. Якщо акаунт існує, буде створено токен для скидання пароля.',
    [],
  );

  const form = useForm({
    defaultValues: {
      email: '',
      password: '',
      remember: true,
    },
    onSubmit: async ({ value }) => {
      try {
        setIsLoading(true);
        await loginWithCredentials({
          email: value.email,
          password: value.password,
        });
        toast.success('Успішний вхід!');
        onSuccess();
      } catch (err: any) {
        const message =
          err?.data?.error === 'invalid_credentials'
            ? 'Невірний email або пароль'
            : err?.data?.message || 'Не вдалося увійти';
        toast.error(message);
        throw new Error(message);
      } finally {
        setIsLoading(false);
      }
    },
  });

  const handleForgotSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!resetEmail || !resetEmail.includes('@')) {
      toast.error('Вкажіть коректний email');
      return;
    }

    try {
      const response = await forgotPassword({ email: resetEmail }).unwrap();
      if (response.emailSent) {
        toast.success('Лист відправлено. Перевірте пошту.');
      } else if (response.resetUrl) {
        // fix code_x: dev fallback when mail transport is not configured — no token field in UI.
        toast.success('Поштова інтеграція не налаштована. Відкриваю сторінку скидання.');
        navigate(response.resetUrl.replace(window.location.origin, ''), { replace: true });
      } else {
        toast('Якщо акаунт існує, лист для відновлення буде надіслано.');
      }
    } catch (err: any) {
      toast.error(err?.data?.message || 'Не вдалося створити запит на відновлення');
    }
  };

  if (mode === 'forgot') {
    return (
      <form onSubmit={handleForgotSubmit} className="flex flex-col gap-4">
        <p className="text-sm text-white/70">{forgotHint}</p>
        <Input
          label="Email"
          type="email"
          value={resetEmail}
          onChange={e => setResetEmail(e.target.value)}
          placeholder="your@email.com"
          disabled={anyLoading}
        />

        <Button type="submit" disabled={anyLoading}>
          {anyLoading ? 'Завантаження...' : 'Надіслати запит'}
        </Button>

        <Button
          type="button"
          onClick={() => setMode('login')}
          disabled={anyLoading}
          className="bg-transparent border border-white/20 text-white hover:bg-white/10"
        >
          Назад до входу
        </Button>
      </form>
    );
  }

  return (
    <form
      onSubmit={e => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
      className="flex flex-col gap-4"
    >
      <form.Field
        name="email"
        validators={{
          onChange: ({ value }) =>
            !value
              ? 'Email обовʼязковий'
              : !value.includes('@')
                ? 'Невірний формат email'
                : undefined,
        }}
      >
        {field => (
          <>
            <label>Email</label>
            <Input
              value={field.state.value}
              onChange={e => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
              placeholder="your@email.com"
              disabled={anyLoading || form.state.isSubmitting}
            />
            <FieldInfo field={field} />
          </>
        )}
      </form.Field>

      <form.Field
        name="password"
        validators={{
          onChange: ({ value }) => (!value ? 'Пароль обовʼязковий' : undefined),
        }}
      >
        {field => (
          <>
            <label>Пароль</label>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                value={field.state.value}
                onChange={e => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                placeholder="••••••••"
                disabled={anyLoading || form.state.isSubmitting}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? '👁️' : '🙈'}
              </button>
            </div>
            <FieldInfo field={field} />
          </>
        )}
      </form.Field>

      <form.Field name="remember">
        {field => (
          <Checkbox
            label="Запам'ятати мене"
            checked={field.state.value}
            onChange={e => field.handleChange(e.target.checked)}
            onBlur={field.handleBlur}
            disabled={anyLoading || form.state.isSubmitting}
          />
        )}
      </form.Field>

      <button
        type="button"
        className="text-left text-sm text-white/70 hover:text-white underline underline-offset-4"
        onClick={() => setMode('forgot')}
        disabled={anyLoading}
      >
        Забули пароль?
      </button>

      <form.Subscribe
        selector={s => [s.canSubmit, s.isSubmitting] as const}
        children={([canSubmit, isSubmitting]) => (
          <>
            <Button
              type="submit"
              disabled={!canSubmit || isSubmitting || anyLoading}
              className="bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600"
            >
              {isSubmitting || anyLoading ? 'Завантаження...' : 'Увійти'}
            </Button>

            <Button
              type="button"
              onClick={onSwitch}
              disabled={isSubmitting || anyLoading}
              className="bg-transparent border border-white text-white hover:bg-white/10"
            >
              Реєстрація
            </Button>
          </>
        )}
      />
    </form>
  );
}
