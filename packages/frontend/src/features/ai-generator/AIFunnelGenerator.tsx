// packages/frontend/src/components/aIGenerator/AIFunnelGenerator.tsx
import { useAIGenerator } from '@frontend/pages/dashboard/AIGeneratorProvider';
import React, { useState } from 'react';
import { StepEditor } from '../funnel/StepEditor';

export const AIFunnelGenerator: React.FC = () => {
  const {
    steps,
    currentStep,
    isGenerating,
    error,
    startGeneration,
    updateStepSelection,
    goToNextStep,
    goToPreviousStep,
    saveFunnel
  } = useAIGenerator();

  const [initialPrompt, setInitialPrompt] = useState('');
  const [showGenerator, setShowGenerator] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleStart = async () => {
    if (!initialPrompt.trim()) {
      alert('Будь ласка, опиши свій продукт або послугу');
      return;
    }

    try {
      await startGeneration(initialPrompt);
      setShowGenerator(true);
    } catch (err) {
      console.error('Start generation error:', err);
    }
  };

  const handleStepUpdate = (stepNumber: number, selectedVariant: string, customText?: string) => {
    updateStepSelection(stepNumber, selectedVariant, customText);
  };

  const handleNext = () => {
    if (currentStep === 11) {
      handleCompleteFunnel();
    } else {
      goToNextStep();
    }
  };

  const handleCompleteFunnel = async () => {
    setIsSaving(true);
    try {
      const funnelData = await saveFunnel();
      console.log('Funnel saved:', funnelData);
      alert('Воронка успішно збережена! Переходимо до інтеграцій...');
    } catch (err) {
      console.error('Save error:', err);
      alert('Помилка збереження воронки');
    } finally {
      setIsSaving(false);
    }
  };

  const currentStepData = steps.find(s => s.stepNumber === currentStep);
  const progress = (currentStep / 11) * 100;

  if (!showGenerator) {
    return (
      <div className="funnel-generator-start">
        <div className="start-container">
          <h1>AI Генератор Воронки</h1>
          <p className="subtitle">
            Опиши свій продукт, послугу або ідею, і AI створить для тебе повну маркетингову воронку
          </p>
          
          <textarea
            className="prompt-input"
            value={initialPrompt}
            onChange={(e) => setInitialPrompt(e.target.value)}
            placeholder="Наприклад: 8-тижневий онлайн курс з йоги для початківців з щоденними відео-уроками та підтримкою в Telegram..."
            rows={6}
          />

          <button
            className="btn-start"
            onClick={handleStart}
            disabled={isGenerating || !initialPrompt.trim()}
          >
            {isGenerating ? 'Генерую...' : 'Почати генерацію'}
          </button>

          {error && <div className="error-message">{error}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="funnel-generator">
      <div className="generator-header">
        <h2>Створення воронки</h2>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <p className="progress-text">Крок {currentStep} з 11</p>
      </div>

      {currentStepData && (
        <StepEditor
          step={currentStepData}
          onUpdate={handleStepUpdate}
          onNext={handleNext}
          onPrevious={goToPreviousStep}
          isFirst={currentStep === 1}
          isLast={currentStep === 11}
        />
      )}

      {isSaving && (
        <div className="saving-overlay">
          <div className="saving-spinner" />
          <p>Зберігаю воронку...</p>
        </div>
      )}
    </div>
  );
};