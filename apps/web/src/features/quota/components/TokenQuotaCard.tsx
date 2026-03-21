import { GlassCard } from '@/ui';
import { Button } from '@/ui/Button';
import { ArrowLeftRight } from 'lucide-react';
import { useGenerationQuota } from '../hooks/useGenerationQuota';

interface TokenQuotaCardProps {
  onPurchase?: () => void;
  className?: string;
}

export const TokenQuotaCard: React.FC<TokenQuotaCardProps> = ({
  onPurchase,
  className = '',
}) => {
  const { quota, isLoading } = useGenerationQuota();

  const baseLimit = quota?.baseLimit ?? 33;
  const purchased = quota?.purchased ?? 0;
  const available = quota?.available ?? 0;

  const total = baseLimit + purchased;
  const used = total - available;

  const progress =
    total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;

  return (
    <GlassCard className={`p-5 border-[var(--border-primary)] ${className}`}>
      <div className="flex items-center justify-between gap-3 mb-3">
        {/* <div>
          <p className="text-xs uppercase tracking-[0.3em] text-[var(--text-muted)]">
            Генерації
          </p>

          <p className="text-2xl font-semibold text-[var(--text-primary)]">
            {isLoading ? '...' : available}
          </p>
        </div> */}

        <div className="rounded-full bg-gradient-to-r from-orange-400 to-pink-500 p-1">
          <div className="flex items-center gap-1 text-xs text-white/90">
            <ArrowLeftRight className="w-6 h-6 text-blue-500" />
            <span>
              {baseLimit} + {purchased}
            </span>
          </div>
        </div>
      </div>

{/* progress bar */}
<div className="h-2 w-full rounded-full bg-white/10 overflow-hidden mb-3">
  <div
    className={`h-full bg-[var(--accent)] transition-all duration-500 w-[${progress}%]`}
  />
  </div>
      <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
        <span>
          {total ? `${used}/${total} використано` : 'План за замовчуванням: 33/gen'}
        </span>

        <Button
          variant="ghost"
          size="sm"
          onClick={onPurchase}
          disabled={isLoading}
        >
          {available > 0 ? 'Докупити' : 'Купити генерації'}
        </Button>
      </div>
    </GlassCard>
  );
};