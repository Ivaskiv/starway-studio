import { useAuth } from '@/features/auth/hooks/useAuth';
import UserDeliveryChannelsCard from '@/features/user/components/UserDeliveryChannelsCard';
import UserProductRolesPanel from '@/features/user/components/UserProductRolesPanel';
import UserProgress from '@/features/user/components/UserProgress';
import UserSettingsCard from '@/features/user/components/UserSettingsCard';
import UserStats from '@/features/user/components/UserStats';
import { GlassCard } from '@/ui';
import { Crown, LogOut, UserRound } from 'lucide-react';

function PlanBadge({ plan }: { plan: string }) {
  const style =
    plan === 'paid'
      ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
      : plan === 'trial'
        ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
        : 'bg-white/5 text-white/40 border-white/10';

  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${style}`}>
      <Crown className="w-3.5 h-3.5" />
      {plan === 'paid' ? 'Premium' : plan === 'trial' ? 'Trial' : 'Free'}
    </span>
  );
}

export default function UserProfilePage() {
  const { user, logout } = useAuth();

  if (!user) {
    return (
      <div className="flex items-center justify-center h-48 text-white/30 text-sm">
        Завантаження...
      </div>
    );
  }

  const displayName = user.firstName || user.name || user.email;

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-4">
      <GlassCard className="p-6 border-white/10 bg-white/4 backdrop-blur-2xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center">
              <UserRound className="w-6 h-6 text-white/80" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">{displayName}</h1>
              <p className="text-sm text-white/50">{user.email}</p>
            </div>
          </div>
          <PlanBadge plan={user.access?.plan || 'free'} />
        </div>
      </GlassCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <UserStats userId={user.id} />
        <UserProgress />
      </div>

      <UserProductRolesPanel />
      <UserDeliveryChannelsCard />
      <UserSettingsCard />

      <button
        onClick={logout}
        className="w-full inline-flex items-center justify-center gap-2 whitespace-nowrap py-3 rounded-2xl text-sm text-white/30 hover:text-red-400 hover:bg-red-500/6 border border-white/6 hover:border-red-500/20 transition-all"
      >
        <LogOut className="w-4 h-4" />
        <span className="whitespace-nowrap">Вийти з акаунту</span>
      </button>
    </div>
  );
}
