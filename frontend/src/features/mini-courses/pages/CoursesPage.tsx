import { ROUTES } from '@/config/routes';
import { useAccess } from '@/features/auth/hooks/useAccess';
import { GlassCard } from '@/ui';
import { ArrowRight, BookOpen, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const COURSES = [
  { id: 'state-key', title: 'State Key', lessons: 12, premium: true },
  { id: 'five-points', title: 'Five Points', lessons: 18, premium: true },
  { id: 'system-21', title: 'System 21', lessons: 21, premium: true },
];

export default function CoursesPage() {
  const navigate = useNavigate();
  const { can } = useAccess();
  const hasCoursesAccess = can('products.manage');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Міні-курси</h1>
        <p className="text-white/60 mt-2">
          Практичні програми з фокусом на стабільні результати та контроль прогресу.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {COURSES.map((course) => {
          const locked = course.premium && !hasCoursesAccess;
          return (
            <GlassCard key={course.id} className={`p-5 ${locked ? 'opacity-70 border-white/10' : ''}`}>
              <div className="flex items-center justify-between">
                <BookOpen className="w-5 h-5 text-orange-400" />
                {locked && <Lock className="w-4 h-4 text-amber-300" />}
              </div>
              <h2 className="text-lg font-semibold text-white mt-3">{course.title}</h2>
              <p className="text-sm text-white/55 mt-1">{course.lessons} уроків</p>
              <button
                type="button"
                onClick={() =>
                  navigate(locked ? `${ROUTES.SUBSCRIPTION}?from=${encodeURIComponent(ROUTES.COURSES)}` : ROUTES.PRODUCTS)
                }
                className={`mt-4 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${
                  locked ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-orange-500 text-white hover:bg-orange-400'
                }`}
              >
                {locked ? 'Відкрити доступ' : 'Переглянути'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
}
