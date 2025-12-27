// packages/ai-mentor/src/pages/AuthPage.tsx

import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LoginForm, RegisterForm } from '@starway-studio/shared';
import { Sparkles } from 'lucide-react';

export function AuthPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as any)?.from?.pathname || '/dashboard';

  const handleSuccess = () => {
    navigate(from, { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated gradient background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-primary/10 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute -bottom-1/2 -left-1/2 w-full h-full bg-accent/5 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }} />
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Sparkles className="w-10 h-10 text-primary animate-glow-pulse" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
              AI-Ментор
            </h1>
          </div>
          <p className="text-text-secondary">
            {mode === 'login' ? 'Увійди до екосистеми' : 'Створи свою AI-воронку'}
          </p>
        </div>

        {/* Forms */}
        {mode === 'login' ? (
          <LoginForm
            onSuccess={handleSuccess}
            onRegisterClick={() => setMode('register')}
          />
        ) : (
          <RegisterForm
            variant="funnel-admin"
            onSuccess={handleSuccess}
            onLoginClick={() => setMode('login')}
          />
        )}
      </div>
    </div>
  );
}