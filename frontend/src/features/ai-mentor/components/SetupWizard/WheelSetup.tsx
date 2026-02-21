// frontend/src/features/ai-mentor/components/SetupWizard/WheelSetup.tsx
/**
 * WheelSetup - Step 1 of Setup Wizard
 * Reuses existing WheelForm component
 */

import { WheelForm } from '@/features/wheel/components/WheelForm';
import { useSetupWheelMutation } from '../../services/setup.api';
import { toast } from 'react-hot-toast';

interface WheelSetupProps {
  onComplete: () => void;
}

export function WheelSetup({ onComplete }: WheelSetupProps) {
  const [setupWheel] = useSetupWheelMutation();

  const handleComplete = async (assessmentId: string) => {
    try {
      await setupWheel([]).unwrap(); // scores already saved by WheelForm
      toast.success('Колесо балансу збережено!');
      onComplete();
    } catch (error) {
      toast.error('Помилка збереження');
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-4">Крок 1: Колесо балансу</h2>
      <p className="text-white/70 mb-6">
        Оціни кожну сферу життя від 1 до 10. Це допоможе AI зрозуміти твій поточний стан.
      </p>
      <WheelForm onComplete={handleComplete} />
    </div>
  );
}