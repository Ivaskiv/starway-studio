// frontend/src/features/social/components/SocialLoginButton.tsx
import { Button } from '@/ui';
import { SOCIAL_PLATFORMS_METADATA } from '../constants/social.constants';
import type { SocialPlatform } from '../types/social.types';
import { useSocialAuth } from '../hooks/useSocialAuth';

interface Props {
  provider: SocialPlatform;
  size?: number;
  className?: string;
}

export const SocialLoginButton: React.FC<Props> = ({
  provider,
  size = 48,
  className = '',
}) => {
  const { login, isLoading } = useSocialAuth();

  const metadata = SOCIAL_PLATFORMS_METADATA[provider];
  if (!metadata) return null;

  const handleClick = () => {
    login(provider);
  };

  return (
    <Button
      type="button"
      disabled={isLoading}
      onClick={handleClick}
      className={`flex items-center justify-center rounded-full transition-all hover:scale-105 active:scale-95 ${className}`}
      style={{
        width: size,
        height: size,
        background: metadata.gradient || metadata.color,
      }}
    >
      <img
        src={metadata.iconPath}
        alt={`${metadata.name} icon`}
        className="w-3/4 h-3/4 object-contain"
      />
    </Button>
  );
};