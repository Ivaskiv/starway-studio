// LoginForm.tsx
import { useForm } from 'react-hook-form';
import { useAuth } from '@/features/auth/hooks/useAuth';

export default function LoginForm({
  onSwitch,
  onSocial,
  onSuccess,
}: {
  onSwitch: () => void;
  onSocial: (p: 'google' | 'telegram') => void;
  onSuccess: () => void;
}) {
  const { loginWithCredentials } = useAuth();

  const form = useForm({
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: any) => {
    await loginWithCredentials(data);
    onSuccess();
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <input {...form.register('email')} />
      <input {...form.register('password')} type="password" />

      <button type="submit">Login</button>

      <button type="button" onClick={() => onSocial('google')}>
        Google
      </button>
      <button type="button" onClick={() => onSocial('telegram')}>
        Telegram
      </button>

      <button type="button" onClick={onSwitch}>
        Register
      </button>
    </form>
  );
}
