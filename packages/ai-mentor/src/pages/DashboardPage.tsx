// packages/ai-mentor/src/pages/DashboardPage.tsx

import { useAuth, Button, Card, CardContent, CardHeader } from '@starway-studio/shared';
import { LogOut, Sparkles, User as UserIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTelegramWebApp } from '../hooks/useTelegramWebApp';

export function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const {  isInTelegram } = useTelegramWebApp();

  const handleLogout = async () => {
    await logout();
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-bg-primary p-6">
       {isInTelegram && user && (
        <p>Привіт, {user.first_name}! 👋</p>
      )}
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold text-text-primary">
              AI-Ментор Dashboard
            </h1>
          </div>

          <Button variant="ghost" onClick={handleLogout}>
            <LogOut className="w-5 h-5 mr-2" />
            Вийти
          </Button>
        </div>

        {/* User info card */}
        <Card hover glow className="animate-scale-in">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <UserIcon className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-text-primary">{user?.name}</h2>
                <p className="text-text-secondary">{user?.email}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 rounded-lg bg-bg-tertiary/40">
                <span className="text-text-secondary">Роль:</span>
                <span className="text-text-primary font-medium">{user?.role}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-bg-tertiary/40">
                <span className="text-text-secondary">ID:</span>
                <span className="text-text-primary font-mono text-sm">{user?.id}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Coming soon */}
        <Card className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <CardContent className="text-center py-12">
            <Sparkles className="w-16 h-16 text-primary mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-text-primary mb-2">
              Скоро тут буде воронка
            </h3>
            <p className="text-text-secondary">
              Ми працюємо над створенням твоєї AI-екосистеми
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}