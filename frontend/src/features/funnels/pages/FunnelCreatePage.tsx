// features/funnels/pages/FunnelCreatePage.tsx

import { Button } from '@/ui';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { FunnelProgressBar } from '../components/FunnelProgressBar';
import { FunnelStepCard } from '../components/FunnelStepCard';
import { useFunnelWizard } from '../hooks/useFunnelWizard';
import { useCreateFunnelMutation } from '../services/funnels.api';

export default function FunnelCreatePage() {
  const navigate = useNavigate();
  const [createFunnel, { isLoading: isCreating }] = useCreateFunnelMutation();

  const {
    currentStep,
    stepDefinition,
    stepState,
    completedSteps,
    totalSteps,
    isGenerating,
    handleInputChange,
    handleGenerate,
    handleSelectVariant,
    goToStep,
    nextStep,
    prevStep,
    getFunnelData,
    canProceed,
  } = useFunnelWizard();

  const isLastStep = currentStep === totalSteps;
  const progress = Math.round((completedSteps.length / totalSteps) * 100);

  const handleFinish = async () => {
    try {
      const data = getFunnelData();
      const funnel = await createFunnel({
        name: data['Назва воронки'] || 'Нова воронка',
        description: data['Головна біль'],
        theme: 'orange',
        status: 'draft',
      }).unwrap();

      toast.success('Воронку створено! 🎉');
      navigate(`/dashboard/funnels/${funnel.id}/edit`);
    } catch {
      toast.error('Помилка створення');
    }
  };

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button onClick={() => navigate('/dashboard/funnels')} data-color="ghost">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">Створення AI-воронки</h1>
          <p className="text-slate-400">
            Крок {currentStep} з {totalSteps}
          </p>
        </div>
        <div className="text-right">
          <span className="text-2xl font-bold text-orange-400">{progress}%</span>
          <p className="text-sm text-slate-400">завершено</p>
        </div>
      </div>

      {/* Progress */}
      <FunnelProgressBar
        currentStep={currentStep}
        completedSteps={completedSteps}
        totalSteps={totalSteps}
        onStepClick={goToStep}
      />

      {/* Step Card */}
      <div className="max-w-3xl mx-auto mt-8">
        <FunnelStepCard
          step={stepDefinition}
          userInput={stepState.userInput}
          onInputChange={handleInputChange}
          onGenerate={handleGenerate}
          attempts={stepState.attempts}
          remainingAttempts={stepState.remainingAttempts}
          onSelectVariant={handleSelectVariant}
          isGenerating={isGenerating}
        />
      </div>

      {/* Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-950/90 backdrop-blur border-t border-white/10 p-4">
        <div className="max-w-3xl mx-auto flex justify-between items-center">
          <Button onClick={prevStep} disabled={currentStep === 1} data-color="ghost">
            <ArrowLeft className="w-5 h-5 mr-2" />
            Назад
          </Button>

          <div className="flex gap-2">
            {completedSteps.map(step => (
              <Button
                key={step}
                onClick={() => goToStep(step)}
                className="w-3 h-3 rounded-full bg-green-500"
              />
            ))}
          </div>

          {isLastStep ? (
            <Button onClick={handleFinish} disabled={!canProceed || isCreating} data-color="orange">
              {isCreating ? (
                'Створення...'
              ) : (
                <>
                  <Check className="w-5 h-5 mr-2" />
                  Завершити
                </>
              )}
            </Button>
          ) : (
            <Button onClick={nextStep} disabled={!canProceed} data-color="orange">
              Далі
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
