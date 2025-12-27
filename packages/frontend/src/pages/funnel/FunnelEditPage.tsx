// packages/frontend/src/pages/funnel/FunnelEditPage.tsx

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button, Card, CardContent, funnelService } from '@starway-studio/shared';
import type { Funnel, FunnelStep } from '@starway-studio/shared';

export function FunnelEditPage() {
  const { funnelId } = useParams<{ funnelId: string }>();
  const navigate = useNavigate();
  const [funnel, setFunnel] = useState<(Funnel & { steps: FunnelStep[] }) | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (funnelId) {
      fetchFunnel();
    }
  }, [funnelId]);

  const fetchFunnel = async () => {
    try {
      setIsLoading(true);
      const data = await funnelService.getFunnel(funnelId!);
      setFunnel(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка завантаження');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !funnel) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-danger mb-4">{error || 'Воронку не знайдено'}</p>
            <Button variant="primary" onClick={() => navigate('/dashboard')}>
              Повернутись
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Header */}
      <header className="border-b border-border bg-bg-secondary/50 backdrop-blur-glass">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="w-5 h-5 mr-2" />
              Назад
            </Button>
            <div>
              <h1 className="text-xl font-bold text-text-primary">{funnel.name}</h1>
              <p className="text-sm text-text-secondary">Редагування воронки</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <Card>
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-bold text-text-primary mb-4">
              Конструктор воронки
            </h2>
            <p className="text-text-secondary mb-6">
              Тут буде drag & drop конструктор модулів
            </p>
            <p className="text-sm text-text-muted">
              Кількість кроків: {funnel.steps.length}
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}