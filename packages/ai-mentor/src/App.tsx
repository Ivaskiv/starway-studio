// packages/ai-mentor/src/App.tsx

import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '@starway-studio/shared';
import { UserRole } from '@starway-studio/shared';
import { AuthPage } from './pages/AuthPage';
import { DashboardPage } from './pages/DashboardPage';
import { useEffect, useState } from 'react';

export function App() {
  const [isTelegramMiniApp, setIsTelegramMiniApp] = useState(false);

  useEffect(() => {
    // Перевіряємо чи це Telegram Mini App
    const tg = window.Telegram?.WebApp;
    
    if (tg) {
      setIsTelegramMiniApp(true);
      
      // Ініціалізація
      tg.ready();
      tg.expand();
      
      // Встановлюємо кольори (тільки якщо методи існують)
      if (typeof tg.setHeaderColor === 'function') {
        tg.setHeaderColor('#0f172a');
      }
      if (typeof tg.setBackgroundColor === 'function') {
        tg.setBackgroundColor('#0f172a');
      }

      // Логуємо інформацію для дебагу
      console.log('Telegram WebApp initialized:', {
        version: tg.version,
        platform: tg.platform,
        colorScheme: tg.colorScheme,
        user: tg.initDataUnsafe.user,
      });
    }
  }, []);

  return (
    <div className={`min-h-screen ${isTelegramMiniApp ? 'pb-safe' : ''}`}>
      <Routes>
        <Route path="auth" element={<AuthPage />} />

        <Route
          path="dashboard"
          element={
            <ProtectedRoute allowedRoles={[UserRole.FUNNEL_ADMIN, UserRole.SUPER_ADMIN]}>
              <DashboardPage />
            </ProtectedRoute>
          }
        />

        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="*" element={<Navigate to="dashboard" replace />} />
      </Routes>
    </div>
  );
}