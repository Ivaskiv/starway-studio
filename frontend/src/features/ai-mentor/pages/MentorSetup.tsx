// frontend/src/features/ai-mentor/pages/MentorSetup.tsx
/**
 * MentorSetup Page
 * 2-step wizard for mentor initialization
 */

import { SetupWizard } from '../components/SetupWizard';

export default function MentorSetup() {
  return (
    <div className="min-h-screen">
      <SetupWizard />
    </div>
  );
}