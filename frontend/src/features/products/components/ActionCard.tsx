// frontend/src/components/ActionCard.tsx
import type { ReactNode } from 'react';
import { Lock } from 'lucide-react';
import { GlassCard } from '@/ui/GlassCard';
import { Button } from '@/ui';

interface ActionCardProps {
  title: string;
  description?: string;
  subtitle?: string;
  icon?: React.ComponentType<{ className?: string }> | ReactNode;
  
  locked?: boolean;
  isActive?: boolean;
  isDisabled?: boolean;
  
  progress?: number;
  daysRemaining?: number;
  status?: string;
  
  canCreate?: boolean;
  isLoading?: boolean;
  
  onClick?: () => void;
  onCreateClick?: () => void;
}

export function ActionCard({
  title,
  description,
  subtitle,
  icon,
  locked = false,
  isActive = false,
  isDisabled = false,
  progress,
  daysRemaining,
  status,
  canCreate = false,
  isLoading = false,
  onClick,
  onCreateClick,
}: ActionCardProps) {
  const isIconComponent = typeof icon === 'function';
  const Icon = isIconComponent ? icon as React.ComponentType<{ className?: string }> : null;

  return (
    <GlassCard
      className={`p-6 transition-all ${
        isDisabled || locked ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:scale-105 hover:border-orange-500/50'
      } ${isActive ? 'border-orange-500' : ''}`}
      onClick={!isDisabled && !locked ? onClick : undefined}
    >
      <div className="relative">
        {/* Lock Icon */}
        {locked && (
          <Lock className="absolute top-0 right-0 w-5 h-5 text-orange-400" />
        )}

        {/* Trial Badge */}
        {daysRemaining && (
          <div className="absolute top-0 right-0 px-2 py-1 rounded-full bg-amber-500/90 text-xs font-bold text-white">
            Trial: {daysRemaining} днів
          </div>
        )}

        {/* Icon */}
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center mb-4 shadow-lg shadow-orange-500/30">
          {Icon ? <Icon className="w-7 h-7 text-white" /> : icon}
        </div>

        {/* Title */}
        <h3 className="text-lg font-bold text-white mb-1">{title}</h3>

        {/* Description / Subtitle */}
        {(description || subtitle) && (
          <p className="text-sm text-white/60 mb-2">{description || subtitle}</p>
        )}

        {/* Status */}
        {status && (
          <p className="text-xs text-white/40">{status}</p>
        )}

        {/* Progress */}
        {progress !== undefined && (
          <div className="mt-3">
            <div className="flex justify-between text-xs text-white/60 mb-1">
              <span>Прогрес</span>
              <span>{progress}%</span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-orange-500 to-pink-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Create Button */}
        {canCreate && onCreateClick && (
          <Button
            onClick={e => {
              e.stopPropagation();
              onCreateClick();
            }}
            data-color="orange"
            data-size="sm"
            className="mt-4 w-full"
            disabled={isLoading}
          >
            {isLoading ? 'Створюємо...' : 'Створити продукт'}
          </Button>
        )}
      </div>
    </GlassCard>
  );
}