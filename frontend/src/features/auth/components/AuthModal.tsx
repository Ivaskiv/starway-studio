// features/auth/components/AuthModal.tsx
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useEffect, useRef, useState } from 'react';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';

type Mode = 'login' | 'register';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: Mode;
}

export default function AuthModal({ isOpen, onClose, defaultMode = 'login' }: Props) {
  const { loginWithSocial } = useAuth();

  const [mode, setMode] = useState<Mode>(defaultMode);
  const [autoFillEmail, setAutoFillEmail] = useState<string | undefined>();

  // ключ — гарантія, що форма реально помре
  const formKey = useRef(0);

  // 🔥 повне очищення при закритті
  useEffect(() => {
    if (!isOpen) {
      setMode(defaultMode);
      setAutoFillEmail(undefined);
      formKey.current += 1;
    }
  }, [isOpen, defaultMode]);

  const handleSocial = async (provider: 'google' | 'telegram') => {
    const res = await loginWithSocial(provider);

    if (res.isNewUser) {
      setAutoFillEmail(res.email);
      setMode('register');
      formKey.current += 1;
    } else {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div>
      {mode === 'login' && (
        <LoginForm
          key={`login-${formKey.current}`}
          onSwitch={() => {
            setMode('register');
            formKey.current += 1;
          }}
          onSocial={handleSocial}
          onSuccess={onClose}
        />
      )}

      {mode === 'register' && (
        <RegisterForm
          key={`register-${formKey.current}`}
          email={autoFillEmail}
          onSwitch={() => {
            setMode('login');
            setAutoFillEmail(undefined);
            formKey.current += 1;
          }}
          onSuccess={onClose}
        />
      )}
    </div>
  );
}
