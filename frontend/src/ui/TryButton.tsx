// frontend/src/ui/TryButton.tsx
// frontend/src/features/home/components/TryButton.tsx
import { useAppSelector } from '@/app/hooks';
import AuthModal from '@/features/auth/components/AuthModal';
import { Button } from '@/ui';
import { ReactNode, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface TryButtonProps {
  children: ReactNode; // будь-який контент всередині кнопки
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  color?: 'orange' | 'purple' | 'green' | 'blue' | 'red' | 'white' | 'gray';
}

export default function TryButton({
  children,
  className,
  size = 'lg',
  color = 'orange',
}: TryButtonProps) {
  const navigate = useNavigate();
  const user = useAppSelector(state => state.auth.user);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const handleClick = () => {
    if (!user) {
      setAuthModalOpen(true); // відкриває модалку авторизації
      return;
    }
    navigate('/dashboard'); // редірект у кабінет користувача, якщо залогінений
  };

  return (
    <>
      <Button onClick={handleClick} data-color={color} data-size={size} className={className}>
        {children}
      </Button>

      {authModalOpen && (
        <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
      )}
    </>
  );
}
