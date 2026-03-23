// frontend/src/features/auth/components/ProtectedRoute.tsx
import LoadingFallback from '@/features/user/userMenu/LoadingFallback';
import { Button } from '@/ui';
import { useGetMySystemStateQuery } from '@/features/auth/services/accessApi';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import { useSelector } from 'react-redux';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuthRestoreStatus } from '../context/AuthRestoreContext';
import { useAccess } from '../hooks/useAccess';
import { selectIsAuthenticated } from '../services/auth.slice';
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
  const { data: systemState } = useGetMySystemStateQuery();
  const trialEnded = !!trialEnd && new Date(trialEnd).getTime() <= Date.now() && plan === 'free';
  const accessControl = systemState?.accessControl;
  const isLeadLocked = accessControl?.currentFlow === 'lead-magnet';
  const isContactBlocked = accessControl?.accessLevel === 'CLIENT' && accessControl?.hasRequiredContacts === false;
  const title = isLeadLocked ? 'Завершіть практикум' : isContactBlocked ? 'Додайте контакти' : 'Оформіть підписку';
  const description = isLeadLocked
    ? 'Зараз активний lead magnet. Завершіть практикум, щоб відкрити наступні модулі.'
    : isContactBlocked
      ? 'Щоб користуватись платними модулями, додайте email і Telegram у профілі.'
      : `Для доступу до ${ability} потрібна активна підписка`;
  const primaryLabel = isLeadLocked ? 'Продовжити практикум' : isContactBlocked ? 'Відкрити налаштування' : 'Оформити підписку';
  const primaryAction = () => {
    if (isLeadLocked) {
      navigate('/dashboard/courses')
      return
    }
    if (isContactBlocked) {
      navigate('/dashboard/settings')
      return
    }
    navigate('/dashboard/subscription')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg-primary)] p-4">
      <div className="max-w-md w-full space-y-6 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg-secondary)]">
          <AlertCircle className="h-10 w-10 text-[var(--accent)]" />
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl font-bold text-[var(--text-primary)]">{title}</h2>
          <p className="text-[var(--text-muted)]">{description}</p>
          {trialEnded && (
            <p className="text-sm text-[var(--text-secondary)]">
              Пробний період завершено. Ваші дані збережені. Оберіть тариф, щоб розблокувати функції.
            </p>
          )}
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/dashboard'))}
            className="flex-1 border border-[var(--border)] bg-[var(--glass-bg)] text-[var(--text-primary)] hover:bg-[var(--glass-bg-hover)]"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Назад
          </Button>
          <Button
            onClick={primaryAction}
            className="flex-1 bg-[var(--accent)] text-white hover:brightness-110"
          >
            {primaryLabel}
          </Button>
        </div>
        <p className="text-sm text-[var(--text-muted-light)]">Або поверніться на головну сторінку дашборду</p>
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
  const authStatus = useAuthRestoreStatus();
  const isAuthReady = authStatus === 'ready';
  const isAuthPending = authStatus === 'idle' || authStatus === 'restoring';
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const { can, isLoading, isAccessReady } = useAccess({ enabled: isAuthReady });

 // DEV MODE — бачиш ВСЕ
  if (DEV_BYPASS) {
    return <>{children}</>;
  }

  if (isAuthPending || !isAccessReady || isLoading) {
    // Wait until auth + access resolve before making ability decisions
    return <LoadingFallback />;
  }

  if (!isAuthenticated) {
    // Guests should not reach protected routes
    return <Navigate to="/" replace />;
  }

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
