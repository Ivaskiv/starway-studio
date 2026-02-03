// /features/dashboard/pages/DashboardPage.tsx
import { useAuth } from '@/features/auth/hooks/useAuth';
import Recommendations from '@/features/mentor/components/Recommendations';
import AllProductsList from '@/features/products/components/AllProductsList';
import MentorStats from '@/features/questionsScheduler/components/MentorStats';
import { SchedulerAdminPanel } from '@/features/questionsScheduler/components/SchedulerAdminPanel';
import UserProgress from '@/features/user/components/UserProgress';
import WheelBlock from '@/features/wheel/components/WheelBlock';

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
