// frontend/src/ui/TryButton.tsx
// fix style $100k — premium try button with modal fallback
import { ReactNode, useState } from 'react';
import { useAppSelector } from '@/app/hooks';
import AuthModal from '@/features/auth/components/AuthModal';
import { Button } from '@/ui';
import { useNavigate } from 'react-router-dom';

interface TryButtonProps {
  children: ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  color?: 'accent' | 'muted' | 'white';
}

export function TryButton({ children, className, size = 'lg', color = 'accent' }: TryButtonProps) {
  const navigate = useNavigate();
  const user = useAppSelector((state) => state.auth.user);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const handleClick = () => {
    if (!user) {
      setAuthModalOpen(true);
      return;
    }
    navigate('/dashboard');
  };

  return (
    <>
      <Button
        onClick={handleClick}
        color={color}
        size={size}
        className={className}
        variant="glass"
      >
        {children}
      </Button>
      {authModalOpen && (
        <AuthModal
          isOpen={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
        />
      )}
    </>
  );
}

TryButton.displayName = 'TryButton';