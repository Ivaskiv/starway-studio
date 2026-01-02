// packages/shared/src/components/auth/ProtectedRoute.tsx

import { Navigate, useLocation } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ('user' | 'funnel_admin' | 'super_admin')[];
  redirectTo?: string;
  user?: { role: string } | null;
  isAuthenticated?: boolean;
}

export function ProtectedRoute({ 
  children, 
  allowedRoles,
  redirectTo = '/auth',
  user,
  isAuthenticated 
}: ProtectedRouteProps) {
  const location = useLocation();

  // Not authenticated
  if (!isAuthenticated) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // Check role permissions
  if (allowedRoles && user && !allowedRoles.includes(user.role as any)) {
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
          <button
            onClick={() => window.history.back()}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition"
          >
            Повернутись назад
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}