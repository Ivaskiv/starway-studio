import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Heart,
  Loader2,
  Moon,
  Send,
  Sparkles,
  Sun,
  Target,
  Zap,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

// UI
import { Button } from '@/ui/Button';
import { Input } from '@/ui/Input';

// Store hooks
import { useAppDispatch, useAppSelector } from '@/app/store/hooks';

// API
import {
  useGenerateSmartActionsMutation,
  useSubmitEveningSessionMutation,
  useSubmitMorningSessionMutation,
} from '../services/aiMentor.api';

// Actions & Selectors
import {
  nextSessionStep,
  prevSessionStep,
  resetSession,
  selectCurrentSession,
  startSession,
  updateSessionAnswer,
} from '../services/aiMentorSlice';

// Types
import type { 
  EveningSessionAnswers, 
  MorningSessionAnswers, 
  SessionType,
  SmartAction,
  Affirmation
} from '../types/ai-mentor.types';

// === QUESTIONS ===
const MORNING_QUESTIONS = [/* ...як раніше */];
const EVENING_QUESTIONS = [/* ...як раніше */];

// === QUESTION COMPONENTS ===
const TextareaQuestion = ({ question, value, onChange }: any) => (
  <textarea
    value={(value as string) || ''}
    onChange={(e) => onChange(e.target.value)}
    placeholder={question.placeholder as string}
    rows={4}
    className="w-full p-4 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-white/30 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-200"
  />
);

const SliderQuestion = ({ question, value, onChange }: any) => {
  const numValue = (value as number) || 5;
  const percentage = ((numValue - 1) / 9) * 100;
  
  return (
    <div className="space-y-4">
      <div className="text-center">
        <span className="text-6xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
          {numValue}
        </span>
      </div>
      
      <div className="flex justify-between gap-2">
        {[1,2,3,4,5,6,7,8,9,10].map(num => (
          <Button
            key={num}
            onClick={() => onChange(num)}
            className={`w-10 h-10 rounded-xl font-semibold text-sm transition-all duration-200
              ${numValue === num 
                ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white scale-110 shadow-lg shadow-blue-500/30' 
                : 'bg-white/5 text-white/60 hover:bg-white/10 hover:scale-105'
              }`}
          >
            {num}
          </Button>
        ))}
      </div>
      
      <Input
        type="range"
        min={1}
        max={10}
        value={numValue}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 rounded-full appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(to right, #3B82F6 0%, #8B5CF6 ${percentage}%, rgba(255,255,255,0.1) ${percentage}%, rgba(255,255,255,0.1) 100%)`,
        }}
      />
      
      <div className="flex justify-between text-xs text-white/40">
        <span>Дуже низький</span>
        <span>Максимальний</span>
      </div>
    </div>
  );
};

const ListQuestion = ({ question, value, onChange }: any) => { /* як раніше */ };
const TagsQuestion = ({ question, value, onChange }: any) => { /* як раніше */ };

// === MAIN COMPONENT ===
export const DailySession = ({ type, user_id, onComplete }: any) => {
  const dispatch = useAppDispatch();
  const { step, answers, isSubmitting } = useAppSelector(selectCurrentSession);
  
  const [submitMorning, { isLoading: isMorningLoading }] = useSubmitMorningSessionMutation();
  const [submitEvening, { isLoading: isEveningLoading }] = useSubmitEveningSessionMutation();
  const [generateActions, { isLoading: isGenerating }] = useGenerateSmartActionsMutation();
  
  const [aiResponse, setAiResponse] = useState<{ actions: SmartAction[], affirmation: Affirmation } | null>(null);
  
  const questions = type === 'morning' ? MORNING_QUESTIONS : EVENING_QUESTIONS;
  const currentQuestion = questions[step];
  const isLastStep = step === questions.length - 1;
  const progress = ((step + 1) / questions.length) * 100;
  const isLoading = isMorningLoading || isEveningLoading || isGenerating;

  useEffect(() => {
    dispatch(startSession(type));
    return () => dispatch(resetSession());
  }, [dispatch, type]);

  const handleAnswerChange = useCallback((value: unknown) => {
    if (!currentQuestion) return;
    dispatch(updateSessionAnswer({ key: currentQuestion.key, value }));
  }, [dispatch, currentQuestion]);

  const handleNext = useCallback(async () => {
    if (isLastStep) {
      try {
        if (type === 'morning') {
          await submitMorning({ user_id, answers }).unwrap();
          const result = await generateActions({ user_id, context: { wheel_scores: [], goals: [], recentSessions: [], focus_area: (answers as any).focus_area || '' } }).unwrap();
          setAiResponse(result);
        } else {
          await submitEvening({ user_id, answers }).unwrap();
        }
        onComplete?.();
      } catch (error) { console.error(error); }
    } else {
      dispatch(nextSessionStep());
    }
  }, [dispatch, isLastStep, type, user_id, answers, submitMorning, submitEvening, generateActions, onComplete]);

  const handlePrev = useCallback(() => dispatch(prevSessionStep()), [dispatch]);

  const Icon = currentQuestion?.icon || Sun;

  const renderQuestionInput = () => {
    if (!currentQuestion) return null;
    const value = answers[currentQuestion.key as keyof typeof answers];
    switch(currentQuestion.type) {
      case 'textarea': return <TextareaQuestion question={currentQuestion} value={value} onChange={handleAnswerChange} />;
      case 'slider': return <SliderQuestion question={currentQuestion} value={value} onChange={handleAnswerChange} />;
      case 'list': return <ListQuestion question={currentQuestion} value={value} onChange={handleAnswerChange} />;
      case 'tags': return <TagsQuestion question={currentQuestion} value={value} onChange={handleAnswerChange} />;
      default: return null;
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${type === 'morning' ? 'bg-gradient-to-br from-amber-500/20 to-orange-500/20' : 'bg-gradient-to-br from-indigo-500/20 to-purple-500/20'}`}>
            {type === 'morning' ? <Sun className="w-6 h-6 text-amber-400"/> : <Moon className="w-6 h-6 text-indigo-400"/>}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">{type === 'morning' ? 'Ранкова сесія' : 'Вечірня сесія'}</h1>
            <p className="text-sm text-white/60">Крок {step + 1} з {questions.length}</p>
          </div>
        </div>
        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${type === 'morning' ? 'bg-gradient-to-r from-amber-500 to-orange-500' : 'bg-gradient-to-r from-indigo-500 to-purple-500'}`} style={{ width: `${progress}%` }}/>
        </div>
      </div>

      {/* Question */}
      <div className="rounded-3xl p-6 mb-6 bg-gradient-to-br from-gray-900/80 to-gray-800/80 backdrop-blur-xl border border-white/10 shadow-2xl">
        {currentQuestion && (
          <>
            <div className="flex items-start gap-4 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center flex-shrink-0">
                <Icon className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white mb-1">{currentQuestion.title}</h2>
                <p className="text-sm text-white/60">{currentQuestion.subtitle}</p>
              </div>
            </div>
            {renderQuestionInput()}
          </>
        )}
      </div>

      {/* AI Response */}
      {aiResponse && (
        <div className="rounded-3xl p-6 mb-6 bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-purple-400" />
            <span className="font-semibold text-white">AI рекомендації</span>
          </div>
          <p className="text-white/80 mb-4 italic">"{aiResponse.affirmation.text}"</p>
          <div className="space-y-2">
            {aiResponse.actions.map((action, i) => (
              <div key={i} className="flex items-center gap-2 text-white/70">
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                <span>{action.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <Button onClick={handlePrev} disabled={step === 0} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all duration-200 ${step === 0 ? 'opacity-30 cursor-not-allowed' : 'bg-white/5 hover:bg-white/10 text-white'}`}>
          <ChevronLeft className="w-5 h-5"/> Назад
        </Button>
        <Button onClick={handleNext} disabled={isLoading} className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-white transition-all duration-200 hover:scale-105 ${type === 'morning' ? 'bg-gradient-to-r from-amber-500 to-orange-500 shadow-lg shadow-amber-500/30' : 'bg-gradient-to-r from-indigo-500 to-purple-500 shadow-lg shadow-indigo-500/30'}`}>
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin"/> Обробка...
            </>
          ) : isLastStep ? (
            <>
              <Send className="w-5 h-5"/> Завершити
            </>
          ) : (
            <>
              Далі <ChevronRight className="w-5 h-5"/>
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default DailySession;
