// packages/frontend/src/components/aiGenerator/AIGenerator.tsx

import { useAIGenerator } from "@frontend/pages/dashboard/AIGeneratorProvider";
import { AIFunnelGenerator } from "./AIFunnelGenerator";
import { AIProductGenerator } from "./AIProductGenerator";
import { AIAnalyticsGenerator } from "./AIAnalyticsGenerator";


export default function AIGenerator() {
  const { stage } = useAIGenerator();

  // Orchestrator - тільки визначає який генератор показувати
  if (stage === 'funnel') return <AIFunnelGenerator />;
  if (stage === 'products') return <AIProductGenerator />;
  if (stage === 'analytics') return <AIAnalyticsGenerator />;

  return null;
}