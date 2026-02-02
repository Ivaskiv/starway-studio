// /features/dashboard/pages/DashboardPage.tsx
import MentorStats from '@/features/questionsScheduler/components/MentorStats';
import { SchedulerAdminPanel } from '@/features/questionsScheduler/components/SchedulerAdminPanel';
import WheelBlock from '@/features/wheel/components/WheelBlock';
import Recommendations from '@/features/mentor/components/Recommendations';
import UserProgress from '@/features/dashboard/blocks/user/UserProgress';
import AllProductsList from '@/features/products/components/AllProductsList';
import { useAuth } from '@/features/auth/hooks/useAuth';

export default function DashboardPage() {
  const { user } = useAuth();

  if (!user) return null;

  if (user.role === 'admin' || user.role === 'super_admin') {
    return (
      <div className="space-y-6">
        <MentorStats />
        <SchedulerAdminPanel userId={user.id} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2" />
          <div className="space-y-6">
            <WheelBlock />
            <Recommendations />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <UserProgress />
      <AllProductsList />
    </div>
  );
}
