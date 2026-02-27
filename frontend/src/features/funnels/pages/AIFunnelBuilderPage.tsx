import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

import AIGeneratorPage from '@/features/ai-generator/pages/AIGeneratorPage';

export default function AIFunnelBuilderPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get('tab') === 'funnel') return;
    const next = new URLSearchParams(searchParams);
    next.set('tab', 'funnel');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  return <AIGeneratorPage />;
}
