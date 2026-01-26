// frontend/src/components/auth/ProtectedRoute.tsx

import { AlertCircle, Loader } from 'lucide-react';
import { Navigate, useLocation } from 'react-router-dom';
import { Button, GlassCard } from '../../ui';
import { useAuth } from '../../features/auth/hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

// Локальний loading-screen 
function LoadingScreen() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <GlassCard className="p-12 flex flex-col items-center gap-4" data-blur="xl">
        <Loader className="w-12 h-12 animate-spin text-orange-500" />
        <p className="text-white/60">Перевіряємо доступ…</p>
      </GlassCard>
    </div>
  );
}

export default function ProtectedRoute({
  children,
  allowedRoles,
}: ProtectedRouteProps) {
  const { status, user } = useAuth();
  const location = useLocation();

  /**
   * 1️⃣ Поки йде перевірка (/me, localStorage, refresh)
   *    — НІЯКИХ редіректів
   */
  if (status === 'loading') {
    return <LoadingScreen />;
  }

  /**
   * 2️⃣ Якщо користувач не залогінений
   *    — шлемо на /auth
   */
  if (status === 'unauthenticated' || status === 'idle') {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  /**
   * 3️⃣ Якщо сторінка обмежена по ролях
   *    — перевіряємо доступ
   */
  if (allowedRoles && (!user?.role || !allowedRoles.includes(user.role))) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950 p-4">
        <div className="text-center space-y-4 max-w-md">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-2xl font-bold text-white">Доступ заборонено</h2>
          <p className="text-gray-400">
            У тебе немає прав для перегляду цієї сторінки
          </p>
          <Button
            onClick={() => window.history.back()}
            className="gradient-button"
          >
            Повернутись назад
          </Button>
        </div>
      </div>
    );
  }

  /**
   * 4️⃣ Усе ок — пускаємо далі
   */
  return <>{children}</>;
}
