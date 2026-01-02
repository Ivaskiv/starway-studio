// packages/frontend/src/pages/dashboard/AIGeneratorPage.tsx

import AIGenerator from "@frontend/components/aIGenerator/AIGenerator";
import { AIGeneratorProvider } from "./AIGeneratorProvider";

// import AIGenerator from '@frontend/components/aiGenerator/AIGenerator';
// import { AIGeneratorProvider } from '@frontend/components/aiGenerator/AIGeneratorProvider';

export default function AIGeneratorPage() {
  return (
    <AIGeneratorProvider>
      <AIGenerator />
    </AIGeneratorProvider>
  );
}