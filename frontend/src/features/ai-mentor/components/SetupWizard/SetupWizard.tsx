// frontend/src/features/ai-aIMentor/components/SetupWizard/SetupWizard.tsx
/**
 * Setup Wizard
 * 2-step aIMentor configuration
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGetSetupProgressQuery } from '../../services/setup.api';
import { WheelSetup } from './WheelSetup';
import { QuestionsSetup } from './QuestionsSetup';
import { GlassCard } from '@/ui';

interface SetupWizardProps {
  embedded?: boolean;
}

export function SetupWizard({ embedded = false }: SetupWizardProps) {
  const navigate = useNavigate();
  const { data: progress, isLoading } = useGetSetupProgressQuery();
  
  const [currentStep, setCurrentStep] = useState<'wheel' | 'questions'>(
    progress?.currentStep === 'complete' 
      ? 'wheel' 
      : progress?.currentStep || 'wheel'
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-white">Завантаження...</div>
      </div>
    );
  }

  const handleWheelComplete = () => {
    setCurrentStep('questions');
  };

  const handleQuestionsComplete = () => {
    navigate('/dashboard/aIMentor/workspace');
  };

  return (
    <div className={embedded ? '' : 'min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 p-6'}>
      <div className={embedded ? 'w-full' : 'max-w-4xl mx-auto'}>
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <StepIndicator
              number={1}
              label="Колесо балансу"
              active={currentStep === 'wheel'}
              completed={progress?.wheelCompleted}
            />
            <div className="flex-1 h-0.5 bg-white/20 mx-4">
              <div 
                className={`h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500 ${
                  progress?.wheelCompleted ? 'w-full' : 'w-0'
                }`}
              />
            </div>
            <StepIndicator
              number={2}
              label="Питання"
              active={currentStep === 'questions'}
              completed={progress?.questionsConfigured}
            />
          </div>
        </div>

        {/* Step Content */}
        <GlassCard className={embedded ? 'p-6' : 'p-8'}>
          {currentStep === 'wheel' && (
            <WheelSetup onComplete={handleWheelComplete} />
          )}
          
          {currentStep === 'questions' && (
            <QuestionsSetup onComplete={handleQuestionsComplete} />
          )}
        </GlassCard>
      </div>
    </div>
  );
}

// Step Indicator Component
function StepIndicator({ 
  number, 
  label, 
  active, 
  completed 
}: { 
  number: number; 
  label: string; 
  active: boolean; 
  completed?: boolean;
}) {
  return (
    <div className="flex flex-col items-center">
      <div 
        className={`w-12 h-12 rounded-full flex items-center justify-center font-bold transition-all ${
          completed 
            ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white' 
            : active 
              ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' 
              : 'bg-white/10 text-white/50'
        }`}
      >
        {completed ? '✓' : number}
      </div>
      <span className={`mt-2 text-sm ${active ? 'text-white font-medium' : 'text-white/60'}`}>
        {label}
      </span>
    </div>
  );
}
