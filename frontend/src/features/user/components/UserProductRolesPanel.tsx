import { useAuth } from '@/features/auth/hooks/useAuth';
import { useGetMyProductsQuery, useGetAllProductsQuery } from '@/features/products/services/products.api';
import { useGetProgressQuery } from '@/features/progress/services/progress.api';
import { GlassCard } from '@/ui';
import { Crown, Rocket, ShieldCheck, UserCheck } from 'lucide-react';

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
      <p className="text-[11px] uppercase tracking-wide text-white/45">{label}</p>
      <p className="text-sm font-semibold text-white mt-1">{value}</p>
    </div>
  );
}

export default function UserProductRolesPanel() {
  const { user } = useAuth();
  const userId = user?.id;

  const { data: myProducts = [], isLoading: myLoading } = useGetMyProductsQuery();
  const { data: allProducts = [], isLoading: allLoading } = useGetAllProductsQuery({
    includeAll: Boolean(user?.isSuperAdmin),
  });
  const { data: progress } = useGetProgressQuery(userId || '', { skip: !userId });

  if (!userId) return null;

  const ownedProducts = allProducts.filter((p) => p.creatorId === userId);
  const ownedIds = new Set(ownedProducts.map((p) => p.id));
  const memberProducts = myProducts.filter((p) => !ownedIds.has(p.id));

  const streak = progress?.streakDays ?? 0;
  const xp = progress?.totalXp ?? user.stats?.totalPoints ?? 0;
  const level = progress?.level ?? user.stats?.level ?? 1;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      {/* fix code_x: clear split between owner products and member products with role-aware stats. */}
      <GlassCard className="p-6 border-[color:rgba(var(--accent-rgb),0.30)]">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Crown className="w-5 h-5 text-amber-300" />
          Власні продукти (роль: owner)
        </h3>
        <p className="text-sm text-white/55 mt-1">
          Тут продукти, які ви створили як власник. Ви можете бути owner і паралельно учасником інших програм.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Metric label="Створено" value={ownedProducts.length} />
          <Metric label="Рівень" value={level} />
          <Metric label="XP" value={xp} />
          <Metric label="Streak" value={streak} />
        </div>

        <div className="mt-4 space-y-2 max-h-52 overflow-auto scrollbar-thin pr-1">
          {allLoading ? (
            <p className="text-sm text-white/50">Завантаження...</p>
          ) : ownedProducts.length === 0 ? (
            <p className="text-sm text-white/50">Ще немає власних продуктів.</p>
          ) : (
            ownedProducts.map((product) => (
              <div key={product.id} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                <p className="text-sm font-medium text-white">{product.title || product.name}</p>
                <p className="text-xs text-white/45 mt-0.5">
                  {product.status} · {product.price} {product.currency}
                </p>
              </div>
            ))
          )}
        </div>
      </GlassCard>

      <GlassCard className="p-6 border-white/10">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <UserCheck className="w-5 h-5 text-cyan-300" />
          Продукти, де ви користувач
        </h3>
        <p className="text-sm text-white/55 mt-1">
          Курси/практикуми, які ви проходите як учасник. Гейміфікація, прогрес і нагадування працюють тут так само.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Metric label="Участь" value={memberProducts.length} />
          <Metric label="Сесій" value={progress?.totalSessions ?? 0} />
          <Metric label="Цілей" value={progress?.completedGoals ?? user.stats?.completedBlocks ?? 0} />
          <Metric label="Рівень" value={level} />
        </div>

        <div className="mt-4 space-y-2 max-h-52 overflow-auto scrollbar-thin pr-1">
          {myLoading ? (
            <p className="text-sm text-white/50">Завантаження...</p>
          ) : memberProducts.length === 0 ? (
            <p className="text-sm text-white/50">Наразі немає продуктів у ролі користувача.</p>
          ) : (
            memberProducts.map((product) => (
              <div key={product.id} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                <p className="text-sm font-medium text-white">{product.title || product.name}</p>
                <p className="text-xs text-white/45 mt-0.5">
                  {product.status} · {product.price} {product.currency}
                </p>
              </div>
            ))
          )}
        </div>
      </GlassCard>

      <GlassCard className="p-4 xl:col-span-2 border-white/10">
        <p className="text-xs text-white/55 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-300" />
          Профіль підтримує змішаний сценарій: ви можете одночасно бути owner своїх продуктів і користувачем
          інших продуктів, без втрати прогресу та гейміфікації.
        </p>
        <p className="text-xs text-white/50 mt-2 flex items-center gap-2">
          <Rocket className="w-4 h-4 text-blue-300" />
          Метрики XP/Streak синхронізовані між ролями й відображають загальний розвиток акаунту.
        </p>
      </GlassCard>
    </div>
  );
}
