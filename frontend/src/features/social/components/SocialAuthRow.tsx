import { ENABLED_SOCIAL_PLATFORMS, type EnabledSocialPlatform } from '../types/social.types';
import { SocialLoginButton } from './SocialLoginButton';

interface Props {
  onAuth: (provider: EnabledSocialPlatform) => void;
  isLoading?: boolean;
}

export function SocialAuthRow({ onAuth }: Props) {
  return (
    <div className="flex justify-center items-center py-2 px-1 flex gap-3 scrollbar-thin scroll-smooth">
      {ENABLED_SOCIAL_PLATFORMS.map(platformId => {
        return (
          <SocialLoginButton
            key={platformId}
            provider={platformId}
            size={56}
            className="flex-none"
            onClick={() => onAuth(platformId)}
          />
        );
      })}
    </div>
  );
}
