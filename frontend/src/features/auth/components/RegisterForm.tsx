// RegisterForm.tsx
import { useForm } from 'react-hook-form';
import { useAuth } from '@/features/auth/hooks/useAuth';

export default function RegisterForm({
  email,
  onSwitch,
  onSuccess,
}: {
  email?: string;
  onSwitch: () => void;
  onSuccess: () => void;
}) {
  const { registerWithCredentials } = useAuth();

  const form = useForm({
    defaultValues: {
      email: email ?? '',
      password: '',
      name: '',
    },
  });

  const onSubmit = async (data: any) => {
    await registerWithCredentials(data);
    onSuccess();
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <input {...form.register('email')} />
      <input {...form.register('password')} type="password" />
      <input {...form.register('name')} />

      <button type="submit">Register</button>
      <button type="button" onClick={onSwitch}>
        Login
      </button>
    </form>
  );
}
