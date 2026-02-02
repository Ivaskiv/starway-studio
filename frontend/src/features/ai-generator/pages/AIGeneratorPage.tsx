// features/ai-generator/pages/AIGeneratorPage.tsx

import { Button, GlassCard, Textarea } from '@/ui';
import { ArrowLeft, ArrowRight, Check, Lightbulb, RefreshCw, Sparkles, Zap } from 'lucide-react';
import { GenerationAttempt, STEP_DEFINITIONS } from '../../products/types/generator.types';
import { AIGeneratorProvider, useAIGenerator } from '../components/AIGeneratorProvider';

function AIGeneratorContent() {
  const {
    currentStep,
    stepsData,
    totalRemainingAttempts,
    isGenerating,
    generatedBlueprint,
    handleUserInput,
    handleGenerate,
    handleSelectVariant,
    handleNextStep,
    handlePreviousStep,
    handleSaveFunnel,
    resetGenerator,
  } = useAIGenerator();

  const stepData = stepsData[currentStep - 1];
  const stepDef = STEP_DEFINITIONS[currentStep - 1];
  const completedSteps = stepsData.filter(s => s.selectedAttemptId).map(s => s.number);
  const progress = Math.round((completedSteps.length / stepsData.length) * 100);

  // Blueprint Preview
  if (generatedBlueprint) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <GlassCard className="p-8 text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-green-500/25">
            <Check className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">Воронку згенеровано! 🎉</h2>
          <p className="text-slate-400 mb-6">{generatedBlueprint.name}</p>

          <div className="flex gap-4 justify-center">
            <Button onClick={handleSaveFunnel} className="gradient-button">
              <Sparkles className="w-5 h-5 mr-2" />
              Зберегти та редагувати
            </Button>
            <Button onClick={resetGenerator} className="glass-button">
              Створити нову
            </Button>
          </div>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">AI Генератор Воронок</h1>
          <p className="text-slate-400 mt-1">
            Крок {currentStep} з {stepsData.length}
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 backdrop-blur-sm">
          <Zap className="w-5 h-5 text-purple-400" />
          <span className="text-lg font-bold text-purple-300">{totalRemainingAttempts}</span>
          <span className="text-sm text-purple-400">спроб</span>
        </div>
      </div>

      {/* Progress Bar */}
      <GlassCard className="p-4">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-slate-400">Прогрес воронки</span>
          <span className="text-white font-medium">
            {completedSteps.length}/{stepsData.length}
          </span>
        </div>
        <div className="h-2 bg-slate-800/50 rounded-full overflow-hidden mb-4">
          <div
            className="h-full bg-gradient-to-r from-orange-500 to-pink-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="grid grid-cols-11 gap-1">
          {stepsData.map(s => {
            const isCompleted = completedSteps.includes(s.number);
            const isCurrent = currentStep === s.number;

            return (
              <button
                key={s.number}
                type="button"
                disabled={s.number > currentStep}
                className={`h-8 rounded-lg flex items-center justify-center text-xs font-bold transition-all ${
                  isCompleted
                    ? 'bg-gradient-to-br from-green-500 to-emerald-500 text-white shadow-lg shadow-green-500/25'
                    : isCurrent
                      ? 'bg-gradient-to-br from-orange-500 to-pink-500 text-white ring-2 ring-orange-400/50 shadow-lg shadow-orange-500/25'
                      : 'bg-slate-800/50 text-slate-500'
                }`}
              >
                {isCompleted ? <Check className="w-3 h-3" /> : s.number}
              </button>
            );
          })}
        </div>
      </GlassCard>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Step Card */}
        <div className="lg:col-span-2">
          <GlassCard className="p-6 md:p-8">
            {/* Step Header */}
            <div className="flex items-start gap-4 mb-6">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center shrink-0 shadow-lg shadow-orange-500/25">
                <span className="text-2xl font-bold text-white">{currentStep}</span>
              </div>
              <div className="flex-1">
                <h2 className="text-xl md:text-2xl font-bold text-white mb-1">{stepDef?.title}</h2>
                <p className="text-slate-400">{stepDef?.description}</p>
              </div>
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/20 border border-orange-500/30">
                <Sparkles className="w-4 h-4 text-orange-400" />
                <span className="text-sm font-semibold text-orange-300">
                  {stepData.remainingAttempts}
                </span>
              </div>
            </div>

            {/* Input */}
            <div className="space-y-4 mb-6">
              <label className="block text-sm font-medium text-slate-300">Твоя відповідь:</label>

              {stepDef?.options ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {stepDef.options.map(opt => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => handleUserInput(currentStep, opt)}
                      className={`glass-card p-4 text-left transition-all rounded-xl ${
                        stepData.userInput === opt
                          ? 'ring-2 ring-orange-500 bg-orange-500/10'
                          : 'hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                            stepData.userInput === opt
                              ? 'border-orange-500 bg-orange-500'
                              : 'border-slate-600'
                          }`}
                        >
                          {stepData.userInput === opt && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <span className="text-white text-sm">{opt}</span>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <Textarea
                  value={stepData.userInput}
                  onChange={e => handleUserInput(currentStep, e.target.value)}
                  placeholder={stepDef?.placeholder || 'Введи відповідь...'}
                  rows={4}
                  className="w-full glass-field"
                />
              )}

              {/* Generate Button */}
              <Button
                type="button"
                onClick={() => handleGenerate(currentStep)}
                disabled={
                  !stepData.userInput.trim() || stepData.remainingAttempts <= 0 || isGenerating
                }
                className="w-full gradient-button"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                    AI генерує варіанти...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-2" />
                    Згенерувати варіанти ({stepData.remainingAttempts} спроб)
                  </>
                )}
              </Button>
            </div>

            {/* Generated Variants */}
            {stepData.attempts.length > 0 && (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-semibold text-white">AI-варіанти</h3>
                  <span className="text-xs text-slate-400">
                    {stepData.attempts.length} згенеровано
                  </span>
                </div>

                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                  {stepData.attempts.map((attempt: GenerationAttempt) => (
                    <button
                      key={attempt.id}
                      type="button"
                      onClick={() => handleSelectVariant(currentStep, attempt.id)}
                      className={`w-full text-left glass-card p-4 rounded-xl transition-all ${
                        attempt.isSelected
                          ? 'ring-2 ring-green-500 bg-green-500/10'
                          : 'hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                            attempt.isSelected
                              ? 'border-green-500 bg-green-500'
                              : 'border-slate-600'
                          }`}
                        >
                          {attempt.isSelected && <Check className="w-4 h-4 text-white" />}
                        </div>
                        <p className="text-sm text-white leading-relaxed whitespace-pre-wrap">
                          {attempt.content}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </GlassCard>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Tips */}
          <GlassCard className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Lightbulb className="w-5 h-5 text-yellow-400" />
              <h3 className="font-semibold text-white">Підказки</h3>
            </div>
            <ul className="space-y-3 text-sm text-slate-400">
              <li className="flex gap-2">
                <span className="text-orange-400">•</span>
                Будь конкретним - AI краще працює з деталями
              </li>
              <li className="flex gap-2">
                <span className="text-orange-400">•</span>
                Обирай найкращий варіант - він впливає на фінальну воронку
              </li>
              <li className="flex gap-2">
                <span className="text-orange-400">•</span>
                Невикористані спроби не згорають - вони переходять далі
              </li>
              <li className="flex gap-2">
                <span className="text-orange-400">•</span>
                AI аналізує всі попередні відповіді для кращого результату
              </li>
            </ul>
          </GlassCard>

          {/* Navigation */}
          <GlassCard className="p-6">
            <h3 className="font-semibold text-white mb-4">Навігація</h3>
            <div className="space-y-2 mb-6">
              {STEP_DEFINITIONS.slice(0, 5).map((def, idx) => {
                const stepNum = idx + 1;
                const isComplete = completedSteps.includes(stepNum);
                const isCurrent = currentStep === stepNum;

                return (
                  <div
                    key={stepNum}
                    className={`flex items-center gap-3 p-2 rounded-lg text-sm transition-all ${
                      isCurrent
                        ? 'bg-orange-500/20 text-orange-400'
                        : isComplete
                          ? 'text-green-400'
                          : 'text-slate-500'
                    }`}
                  >
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        isComplete
                          ? 'bg-green-500/20'
                          : isCurrent
                            ? 'bg-orange-500/20'
                            : 'bg-slate-800'
                      }`}
                    >
                      {isComplete ? <Check className="w-3 h-3" /> : stepNum}
                    </span>
                    <span className="truncate">{def.title}</span>
                  </div>
                );
              })}
              {STEP_DEFINITIONS.length > 5 && (
                <p className="text-xs text-slate-500 pl-9">+{STEP_DEFINITIONS.length - 5} кроків</p>
              )}
            </div>

            {/* Navigation Buttons */}
            <div className="flex gap-3">
              <Button
                type="button"
                onClick={handlePreviousStep}
                disabled={currentStep === 1}
                className="flex-1 glass-button"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Назад
              </Button>

              <Button
                type="button"
                onClick={handleNextStep}
                disabled={!stepData.selectedAttemptId}
                className="flex-1 gradient-button"
              >
                {currentStep === stepsData.length ? 'Готово' : 'Далі'}
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}

export default function AIGeneratorPage() {
  return (
    <AIGeneratorProvider>
      <AIGeneratorContent />
    </AIGeneratorProvider>
  );
}
