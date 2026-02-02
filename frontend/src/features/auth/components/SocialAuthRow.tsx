// frontend/src/features/auth/components/SocialAuthRow.tsx
import { SOCIAL_PLATFORMS_METADATA } from '@/features/social/constants/social.constants';
import type { SocialPlatform } from '@/features/social/types/social.types';
import { Button, Icon } from '@/ui';
import toast from 'react-hot-toast';

interface Props {
  onAuth?: (platform: SocialPlatform) => void;
}

// Масив платформ (можна розширити)
const SOCIAL_PLATFORMS: SocialPlatform[] = ['telegram', 'google'];

export function SocialAuthRow({ onAuth }: Props) {
  const handleClick = (platform: SocialPlatform) => {
    onAuth?.(platform);
    toast(`Реєстрація через ${platform} — скоро`);
  };

  return (
    <div className="relative mt-2">
      {/* fade left */}
      <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-slate-900 to-transparent z-10" />
      {/* fade right */}
      <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-slate-900 to-transparent z-10" />

      <div className="flex justify-center">
        <div className="flex gap-4 px-3 py-2 overflow-x-auto scrollbar-none">
          {SOCIAL_PLATFORMS.map(key => {
            const platform = SOCIAL_PLATFORMS_METADATA[key]; // тип точно SocialPlatformMetadata

            // Перевірка на існування (хоча з as const це не потрібно, але для безпеки)
            if (!platform) return null;

            return (
              <Button
                key={platform.id}
                type="button"
                onClick={() => handleClick(key)}
                className="
                  group relative shrink-0
                  w-14 h-14
                  rounded-full
                  flex items-center justify-center
                  bg-white/5
                  backdrop-blur-xs
                  border border-white/10
                  transition-all duration-300
                  hover:scale-110
                  hover:border-white/20
                  hover:shadow-glow
                  animate-scale-in
                "
                style={{
                  // gradient — завжди string або undefined
                  background: platform.gradient || undefined,
                }}
              >
                {/* glow halo */}
                <span
                  className="
                    absolute inset-0 rounded-full
                    opacity-0 group-hover:opacity-100
                    transition-opacity duration-300
                    animate-glow
                  "
                />

                <Icon
                  name={platform.iconName}
                  className="relative w-7 h-7 text-white drop-shadow"
                />
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
}