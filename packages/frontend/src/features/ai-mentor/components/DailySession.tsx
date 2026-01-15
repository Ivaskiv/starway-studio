// packages/frontend/src/features/ai-mentor/DailySession.tsx

import { Button, Input } from '@/ui';
import { AnimatePresence, motion } from 'framer-motion';
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
import { useAppDispatch, useAppSelector } from '../../../app/store/hooks';
import {
  useGenerateAffirmationMutation,
  useGenerateSmartActionsMutation,
  useSubmitEveningSessionMutation,
  useSubmitMorningSessionMutation,
} from '../services/aiMentor.api';
import {
  nextSessionStep,
  prevSessionStep,
  resetSession,
  selectCurrentSession,
  startSession,
  updateSessionAnswer,
} from '../services/aiMentorSlice';
import type { EveningSessionAnswers, MorningSessionAnswers, SessionType } from '../types/ai-mentor.types';

// ============ MORNING QUESTIONS ============
const MORNING_QUESTIONS = [
  {
    key: 'current_state',
    title: 'Як ти почуваєшся зараз?',
    subtitle: 'Опиши свій стан кількома словами',
    type: 'textarea',
    placeholder: 'Наприклад: Енергійно, готовий до дій...',
    icon: Heart,
  },
  {
    key: 'energy_level',
    title: 'Рівень енергії',
    subtitle: 'Оціни від 1 до 10',
    type: 'slider',
    min: 1,
    max: 10,
    icon: Zap,
  },
  {
    key: 'main_goal_today',
    title: 'Головна ціль на сьогодні',
    subtitle: 'Що найважливіше зробити?',
    type: 'textarea',
    placeholder: 'Одна конкретна ціль...',
    icon: Target,
  },
  {
    key: 'threeActions',
    title: '3 мікро-дії на сьогодні',
    subtitle: 'Конкретні кроки до цілі',
    type: 'list',
    count: 3,
    placeholder: ['Дія 1...', 'Дія 2...', 'Дія 3...'],
    icon: CheckCircle2,
  },
  {
    key: 'potential_blocks',
    title: 'Можливі перешкоди',
    subtitle: 'Що може завадити?',
    type: 'tags',
    suggestions: ['Час', 'Енергія', 'Мотивація', 'Зовнішні фактори', 'Страх', 'Невпевненість'],
    icon: AlertCircle,
  },
  {
    key: 'resources',
    title: 'Твої ресурси',
    subtitle: 'Що тобі допоможе сьогодні?',
    type: 'tags',
    suggestions: ['Підтримка', 'Знання', 'Досвід', 'Час', 'Мотивація', 'Здоров\'я'],
    icon: Sparkles,
  },
];

// ============ EVENING QUESTIONS ============
const EVENING_QUESTIONS = [
  {
    key: 'completed_actions',
    title: 'Що вдалося зробити?',
    subtitle: 'Відзнач виконані дії',
    type: 'checklist',
    icon: CheckCircle2,
  },
  {
    key: 'wins',
    title: 'Перемоги дня',
    subtitle: 'Навіть маленькі успіхи',
    type: 'list',
    count: 3,
    placeholder: ['Перемога 1...', 'Перемога 2...', 'Перемога 3...'],
    icon: Sparkles,
  },
  {
    key: 'blocks_encountered',
    title: 'Які блоки виникли?',
    subtitle: 'Що заважало?',
    type: 'tags',
    suggestions: ['Втома', 'Прокрастинація', 'Зовнішні обставини', 'Емоції', 'Час'],
    icon: AlertCircle,
  },
  {
    key: 'lessons',
    title: 'Головний урок дня',
    subtitle: 'Що ти зрозумів/ла?',
    type: 'textarea',
    placeholder: 'Сьогодні я зрозумів/ла, що...',
    icon: Target,
  },
  {
    key: 'gratitude',
    title: 'За що вдячний/вдячна?',
    subtitle: '3 речі',
    type: 'list',
    count: 3,
    placeholder: ['Вдячний/вдячна за...', '...', '...'],
    icon: Heart,
  },
  {
    key: 'tomorrowPriority',
    title: 'Пріоритет на завтра',
    subtitle: 'Головне завдання',
    type: 'textarea',
    placeholder: 'Завтра найважливіше...',
    icon: Sun,
  },
];

// ============ QUESTION COMPONENTS ============
type QuestionType = typeof MORNING_QUESTIONS[number] | typeof EVENING_QUESTIONS[number];

interface QuestionProps {
  question: QuestionType;
  value: unknown;
  onChange: (value: unknown) => void;
}

const TextareaQuestion = ({ question, value, onChange }: QuestionProps) => (
  <textarea
    value={(value as string) || ''}
    onChange={(e) => onChange(e.target.value)}
    placeholder={question.placeholder as string}
    rows={4}
    className="w-full p-4 rounded-2xl bg-white/5 border border-white/10 
               text-white placeholder-white/30 resize-none
               focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent
               transition-all duration-200"
  />
);

const SliderQuestion = ({ question, value, onChange }: QuestionProps) => {
  const numValue = (value as number) || 5;
  const percentage = ((numValue - 1) / 9) * 100;
  
  return (
    <div className="space-y-4">
      <div className="text-center">
        <motion.span
          key={numValue}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-6xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent"
        >
          {numValue}
        </motion.span>
      </div>
      
      <div className="flex justify-between gap-2">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
          <Button
            key={num}
            onClick={() => onChange(num)}
            className={`
              w-10 h-10 rounded-xl font-semibold text-sm transition-all duration-200
              ${numValue === num 
                ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white scale-110 shadow-lg shadow-blue-500/30' 
                : 'bg-white/5 text-white/60 hover:bg-white/10 hover:scale-105'
              }
            `}
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

const ListQuestion = ({ question, value, onChange }: QuestionProps) => {
  const items = (value as string[]) || Array(question.count).fill('');
  const placeholders = question.placeholder as string[];
  
  const handleItemChange = (index: number, newValue: string) => {
    const newItems = [...items];
    newItems[index] = newValue;
    onChange(newItems);
  };
  
  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-3">
          <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 
                         flex items-center justify-center text-sm font-semibold text-white/60">
            {index + 1}
          </span>
          <Input
            type="text"
            value={item}
            onChange={(e) => handleItemChange(index, e.target.value)}
            placeholder={placeholders?.[index] || `Пункт ${index + 1}...`}
            className="flex-1 p-3 rounded-xl bg-white/5 border border-white/10 
                     text-white placeholder-white/30
                     focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent
                     transition-all duration-200"
          />
        </div>
      ))}
    </div>
  );
};

const TagsQuestion = ({ question, value, onChange }: QuestionProps) => {
  const selected = (value as string[]) || [];
  const suggestions = question.suggestions || [];
  
  const toggleTag = (tag: string) => {
    if (selected.includes(tag)) {
      onChange(selected.filter(t => t !== tag));
    } else {
      onChange([...selected, tag]);
    }
  };
  
  return (
    <div className="flex flex-wrap gap-2">
      {suggestions.map((tag) => (
        <Button
          key={tag}
          onClick={() => toggleTag(tag)}
          className={`
            px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200
            ${selected.includes(tag)
              ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/20'
              : 'bg-white/5 text-white/60 hover:bg-white/10 border border-white/10'
            }
          `}
        >
          {tag}
        </Button>
      ))}
    </div>
  );
};

// ============ MAIN COMPONENT ============
interface DailySessionProps {
  type: SessionType;
  user_id: string;
  onComplete?: () => void;
}

export const DailySession = ({ type, user_id, onComplete }: DailySessionProps) => {
  const dispatch = useAppDispatch();
  const { step, answers, isSubmitting } = useAppSelector(selectCurrentSession);
  
  const [submitMorning, { isLoading: isMorningLoading }] = useSubmitMorningSessionMutation();
  const [submitEvening, { isLoading: isEveningLoading }] = useSubmitEveningSessionMutation();
  const [generateActions, { isLoading: isGenerating }] = useGenerateSmartActionsMutation();
  const [generateAffirmation] = useGenerateAffirmationMutation();
  
  const [aiResponse, setAiResponse] = useState<{ actions: string[]; affirmation: string } | null>(null);
  
  const questions = type === 'morning' ? MORNING_QUESTIONS : EVENING_QUESTIONS;
  const currentQuestion = questions[step];
  const isLastStep = step === questions.length - 1;
  const progress = ((step + 1) / questions.length) * 100;
  const isLoading = isMorningLoading || isEveningLoading || isGenerating;

  // Initialize session
  useEffect(() => {
    dispatch(startSession(type));
    return () => {
      dispatch(resetSession());
    };
  }, [dispatch, type]);

  const handleAnswerChange = useCallback((value: unknown) => {
    if (!currentQuestion) return;
    dispatch(updateSessionAnswer({ key: currentQuestion.key, value }));
  }, [dispatch, currentQuestion]);

  const handleNext = useCallback(async () => {
    if (isLastStep) {
      // Submit session
      try {
        if (type === 'morning') {
          await submitMorning({ user_id, answers: answers as MorningSessionAnswers }).unwrap();
          
          // Generate AI actions
          const result = await generateActions({
            user_id,
            context: {
              wheel_scores: [],
              goals: [],
              recentSessions: [],
              focus_area: (answers as MorningSessionAnswers).focus_area || '',
            },
          }).unwrap();
          
          setAiResponse(result);
        } else {
          await submitEvening({ user_id, answers: answers as EveningSessionAnswers }).unwrap();
        }
        
        onComplete?.();
      } catch (error) {
        console.error('Session submit error:', error);
      }
    } else {
      dispatch(nextSessionStep());
    }
  }, [dispatch, isLastStep, type, user_id, answers, submitMorning, submitEvening, generateActions, onComplete]);

  const handlePrev = useCallback(() => {
    dispatch(prevSessionStep());
  }, [dispatch]);

  const Icon = currentQuestion?.icon || Sun;

  // Render question input based on type
  const renderQuestionInput = () => {
    if (!currentQuestion) return null;
    
    const value = answers[currentQuestion.key as keyof typeof answers];
    
    switch (currentQuestion.type) {
      case 'textarea':
        return <TextareaQuestion question={currentQuestion} value={value} onChange={handleAnswerChange} />;
      case 'slider':
        return <SliderQuestion question={currentQuestion} value={value} onChange={handleAnswerChange} />;
      case 'list':
        return <ListQuestion question={currentQuestion} value={value} onChange={handleAnswerChange} />;
      case 'tags':
        return <TagsQuestion question={currentQuestion} value={value} onChange={handleAnswerChange} />;
      default:
        return null;
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className={`
            w-12 h-12 rounded-2xl flex items-center justify-center
            ${type === 'morning' 
              ? 'bg-gradient-to-br from-amber-500/20 to-orange-500/20' 
              : 'bg-gradient-to-br from-indigo-500/20 to-purple-500/20'
            }
          `}>
            {type === 'morning' ? (
              <Sun className="w-6 h-6 text-amber-400" />
            ) : (
              <Moon className="w-6 h-6 text-indigo-400" />
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">
              {type === 'morning' ? 'Ранкова сесія' : 'Вечірня сесія'}
            </h1>
            <p className="text-sm text-white/60">
              Крок {step + 1} з {questions.length}
            </p>
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${
              type === 'morning'
                ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                : 'bg-gradient-to-r from-indigo-500 to-purple-500'
            }`}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Question */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          className="rounded-3xl p-6 mb-6"
          style={{
            background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 41, 59, 0.8) 100%)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          {currentQuestion && (
            <>
              <div className="flex items-start gap-4 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 
                              flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white mb-1">
                    {currentQuestion.title}
                  </h2>
                  <p className="text-sm text-white/60">
                    {currentQuestion.subtitle}
                  </p>
                </div>
              </div>
              
              {renderQuestionInput()}
            </>
          )}
        </motion.div>
      </AnimatePresence>

      {/* AI Response */}
      {aiResponse && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl p-6 mb-6 bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20"
        >
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-purple-400" />
            <span className="font-semibold text-white">AI рекомендації</span>
          </div>
          
          <p className="text-white/80 mb-4 italic">"{aiResponse.affirmation}"</p>
          
          <div className="space-y-2">
            {aiResponse.actions.map((action, i) => (
              <div key={i} className="flex items-center gap-2 text-white/70">
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                <span>{action}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          onClick={handlePrev}
          disabled={step === 0}
          className={`
            flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium
            transition-all duration-200
            ${step === 0 
              ? 'opacity-30 cursor-not-allowed' 
              : 'bg-white/5 hover:bg-white/10 text-white'
            }
          `}
        >
          <ChevronLeft className="w-5 h-5" />
          Назад
        </Button>
        
        <Button
          onClick={handleNext}
          disabled={isLoading}
          className={`
            flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-white 
            transition-all duration-200 hover:scale-105
            ${type === 'morning'
              ? 'bg-gradient-to-r from-amber-500 to-orange-500 shadow-lg shadow-amber-500/30'
              : 'bg-gradient-to-r from-indigo-500 to-purple-500 shadow-lg shadow-indigo-500/30'
            }
          `}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Обробка...
            </>
          ) : isLastStep ? (
            <>
              <Send className="w-5 h-5" />
              Завершити
            </>
          ) : (
            <>
              Далі
              <ChevronRight className="w-5 h-5" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default DailySession;