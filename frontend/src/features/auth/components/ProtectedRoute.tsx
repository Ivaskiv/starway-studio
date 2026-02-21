// frontend/src/features/auth/components/ProtectedRoute.tsx
import { AlertCircle, ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import LoadingFallback from '@/components/LoadingFallback';
import { Button } from '@/ui';
import { useAccess } from '../hooks/useAccess';
import type { AccessKey } from '../types/auth.types';

const DEV_BYPASS = import.meta.env.VITE_AUTH_BYPASS === 'true';

interface ProtectedRouteProps {
  children: ReactNode;
  ability: AccessKey; // що перевіряємо
  redirectTo?: string; // куди редіректити без доступу
  showDeniedScreen?: boolean; // показати екран чи просто редірект
}

function AccessDeniedScreen({ ability }: { ability: AccessKey }) {
  const navigate = useNavigate();
  const { trialEnd, plan } = useAccess();
  const trialEnded = !!trialEnd && new Date(trialEnd).getTime() <= Date.now() && plan === 'free';

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
      <div className="max-w-md w-full space-y-6 text-center">
        <div className="w-20 h-20 rounded-full bg-red-500/10 backdrop-blur-sm border border-red-500/20 flex items-center justify-center mx-auto">
          <AlertCircle className="w-10 h-10 text-red-400" />
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl font-bold text-white">Доступ заборонено</h2>
          <p className="text-white/60">
            Для доступу до <span className="text-orange-400 font-semibold">{ability}</span> потрібна
            активна підписка
          </p>
          {trialEnded && (
            <p className="text-amber-300/90 text-sm">
              Пробний період завершено. Ваші дані збережені. Оберіть тариф, щоб розблокувати функції.
            </p>
          )}
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/dashboard'))}
            className="flex-1 bg-white/10 hover:bg-white/20 text-white border border-white/10"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Назад
          </Button>
          <Button
            onClick={() => navigate('/dashboard/subscription')}
            className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:shadow-lg hover:shadow-orange-500/30"
          >
            Обрати тариф
          </Button>
        </div>
        <p className="text-sm text-white/40">Або поверніться на головну сторінку дашборду</p>
      </div>
    </div>
  );
}

export function ProtectedRoute({
  children,
  ability,
  redirectTo = '/dashboard',
  showDeniedScreen = false,
}: ProtectedRouteProps) {
  const { can, isLoading } = useAccess();

 // DEV MODE — бачиш ВСЕ
  if (DEV_BYPASS) {
    return <>{children}</>;
  }

  if (isLoading) return <LoadingFallback />;

  if (!can(ability)) {
    // fix code_x: prevent redirect loop when fallback redirect equals current protected route.
    const sameTarget = typeof window !== 'undefined' && window.location.pathname === redirectTo;
    if (sameTarget) {
      return showDeniedScreen ? <AccessDeniedScreen ability={ability} /> : <Navigate to="/" replace />;
    }

    return showDeniedScreen ? (
      <AccessDeniedScreen ability={ability} />
    ) : (
      <Navigate to={redirectTo} replace />
    );
  }
  return <>{children}</>;
}

export default ProtectedRoute;
