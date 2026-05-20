// frontend/src/features/auth/components/ProtectedRoute.tsx
import LoadingFallback from '@/features/user/userMenu/LoadingFallback';
import { Button } from '@/ui';
import { useSessionOrchestrator } from '@/features/auth/context/SessionOrchestratorContext';
import { useSystemState } from '@/features/auth/hooks/useSystemState';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useAuthRestoreStatus } from '../context/AuthRestoreContext';
import { useAccess } from '../hooks/useAccess';
import { selectIsAuthenticated } from '../services/auth.slice';
import type { AccessKey } from '../types/auth.types';

const DEV_BYPASS = import.meta.env.DEV || import.meta.env.VITE_AUTH_BYPASS === 'true';

interface ProtectedRouteProps {
  children: ReactNode;
  ability: AccessKey; // що перевіряємо
  showDeniedScreen?: boolean; // показати екран чи просто редірект
}

const abilityLabelMap: Partial<Record<AccessKey, string>> = {
  'mentor.vision': 'WEB-Карти',
  'mentor.goals': 'цілей',
  'mentor.actions': 'дій',
}

function AccessDeniedScreen({ ability }: { ability: AccessKey }) {
  const navigate = useNavigate();
  const { trialEnd, plan } = useAccess();
  const { accessControl } = useSystemState();
  const trialEnded = !!trialEnd && new Date(trialEnd).getTime() <= Date.now() && plan === 'free';
  const isLeadLocked = accessControl?.currentFlow === 'lead-magnet';
  const isContactBlocked = accessControl?.accessLevel === 'CLIENT' && accessControl?.hasRequiredContacts === false;
  const abilityLabel = abilityLabelMap[ability] ?? 'цього модуля';
  const title = isLeadLocked ? 'Завершіть практикум' : isContactBlocked ? 'Додайте контакти' : 'Оформіть підписку';
  const description = isLeadLocked
    ? 'Зараз активний практикум. Завершіть його, щоб відкрити наступні модулі.'
    : isContactBlocked
      ? 'Щоб користуватись платними модулями, додайте email і Telegram у профілі.'
      : `Для доступу до ${abilityLabel} потрібна активна підписка.`;
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
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg-primary)] px-4 py-8">
      <div className="glass-card max-w-xl w-full rounded-[28px] border border-[rgba(92,136,255,0.18)] bg-[linear-gradient(180deg,rgba(42,77,155,0.32),rgba(11,19,37,0.96))] p-6 text-center shadow-[0_28px_80px_rgba(8,15,32,0.42)]">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-[rgba(92,136,255,0.22)] bg-[rgba(92,136,255,0.12)]">
          <AlertCircle className="h-8 w-8 text-[rgb(var(--accent-soft-rgb))]" />
        </div>
        <div className="mt-5 space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[rgb(var(--accent-soft-rgb))]">Доступ</p>
          <h2 className="text-3xl font-semibold text-[var(--text-primary)]">{title}</h2>
          <p className="mx-auto max-w-lg text-sm leading-6 text-white/70">{description}</p>
          {trialEnded && (
            <p className="text-sm text-[var(--text-secondary)]">
              Пробний період завершено. Ваші дані збережені. Оберіть тариф, щоб розблокувати функції.
            </p>
          )}
        </div>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button
            onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/dashboard'))}
            className="flex-1 border border-white/10 bg-white/6 text-[var(--text-primary)] hover:bg-white/10"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Назад
          </Button>
          <Button
            onClick={primaryAction}
            className="flex-1 border border-[rgba(92,136,255,0.24)] bg-[rgba(92,136,255,0.14)] text-[rgb(var(--accent-soft-rgb))] hover:bg-[rgba(92,136,255,0.2)]"
          >
            {primaryLabel}
          </Button>
        </div>
        <p className="mt-4 text-sm text-white/42">Або поверніться на головну сторінку дашборду</p>
      </div>
    </div>
  );
}

export function ProtectedRoute({
  children,
  ability,
  showDeniedScreen = false,
}: ProtectedRouteProps) {
  const {
    openAuthModal,
    openProtectedAccessModal,
    routeReady,
  } = useSessionOrchestrator()
  const authStatus = useAuthRestoreStatus();
  const isAuthReady = authStatus === 'ready';
  const isAuthPending = authStatus === 'idle' || authStatus === 'restoring';
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const { can, isLoading, isAccessReady } = useAccess({ enabled: isAuthReady });

  useEffect(() => {
    if (!import.meta.env.DEV) return
    console.info('[ProtectedRoute]', {
      ability,
      authStatus,
      isAuthenticated,
      isAuthPending,
      isAccessReady,
      isLoading,
    })
  }, [ability, authStatus, isAuthenticated, isAuthPending, isAccessReady, isLoading])

  useEffect(() => {
    if (DEV_BYPASS) return
    if (isAuthenticated) return
    if (isAuthPending) return

    openAuthModal({
      mode: 'login',
      reason: 'protected_route',
    })
  }, [isAuthenticated, isAuthPending, openAuthModal])

  useEffect(() => {
    if (DEV_BYPASS) return
    if (!isAuthenticated || isLoading || !isAccessReady) return
    if (can(ability)) return
    if (showDeniedScreen) return

    openProtectedAccessModal({
      title: 'Доступ ще не відкритий',
      message: 'Цей модуль стане доступним після активації підписки або завершення обовʼязкового кроку доступу.',
      ctaLabel: 'Перейти до доступу',
      ctaPath: '/dashboard/subscription',
    })
  }, [ability, can, isAccessReady, isAuthenticated, isLoading, openProtectedAccessModal, showDeniedScreen])

  if (DEV_BYPASS) {
    return <>{children}</>;
  }

  if (isAuthPending || !isAccessReady || isLoading || !routeReady) {
    return <LoadingFallback />;
  }

  if (!isAuthenticated) {
    return <LoadingFallback />;
  }

  if (!can(ability)) {
    return showDeniedScreen ? <AccessDeniedScreen ability={ability} /> : <LoadingFallback />;
  }
  return <>{children}</>;
}

export default ProtectedRoute;
