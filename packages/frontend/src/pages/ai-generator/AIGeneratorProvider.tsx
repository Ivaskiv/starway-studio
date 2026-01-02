// packages/frontend/src/pages/dashboard/AIGeneratorProvider.tsx

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { analyzeUserPrompt, generateStepVariants, type AnalyzedPrompt } from '@frontend/services/api';

export interface AIGeneratorStep {
  stepNumber: number;
  title: string;
  description: string;
  variants: string[];
  selectedVariant: string;
  customText?: string;
}

interface FunnelData {
  id: string;
  name: string;
  userPrompt: string;
  steps: {
    stepNumber: number;
    title: string;
    selectedText: string;
  }[];
  createdAt: string;
  status: 'draft' | 'published';
}

interface AIGeneratorContextType {
  steps: AIGeneratorStep[];
  currentStep: number;
  isGenerating: boolean;
  error: string | null;
  stage: 'funnel' | 'products' | 'analytics';
  startGeneration: (prompt: string) => Promise<void>;
  updateStepSelection: (stepNumber: number, selectedVariant: string, customText?: string) => void;
  goToNextStep: () => void;
  goToPreviousStep: () => void;
  saveFunnel: () => Promise<FunnelData>;
  setStage: (stage: 'funnel' | 'products' | 'analytics') => void;
}

const AIGeneratorContext = createContext<AIGeneratorContextType | undefined>(undefined);

const STEP_DEFINITIONS = [
  {
    stepNumber: 1,
    title: 'Цільова аудиторія',
    description: 'Хто твої ідеальні клієнти? Опиши їх детально.',
    prompt: 'Визнач цільову аудиторію для продукту'
  },
  {
    stepNumber: 2,
    title: 'Проблема аудиторії',
    description: 'Яку головну проблему ти вирішуєш для своїх клієнтів?',
    prompt: 'Опиши головну проблему цільової аудиторії'
  },
  {
    stepNumber: 3,
    title: 'Рішення (Продукт)',
    description: 'Як саме твій продукт вирішує цю проблему?',
    prompt: 'Опиши продукт як рішення проблеми'
  },
  {
    stepNumber: 4,
    title: 'Унікальна пропозиція',
    description: 'Чим твій продукт відрізняється від конкурентів?',
    prompt: 'Сформулюй унікальну торгову пропозицію'
  },
  {
    stepNumber: 5,
    title: 'Назва воронки',
    description: 'Яка приваблива назва для твоєї маркетингової воронки?',
    prompt: 'Придумай назву для воронки'
  },
  {
    stepNumber: 6,
    title: 'Лід-магніт',
    description: 'Що ти пропонуєш безкоштовно, щоб залучити клієнтів?',
    prompt: 'Створи ідею лід-магніта'
  },
  {
    stepNumber: 7,
    title: 'Заголовок лендінгу',
    description: 'Який заголовок одразу зацікавить відвідувачів?',
    prompt: 'Напиши продаючий заголовок'
  },
  {
    stepNumber: 8,
    title: 'Опис пропозиції',
    description: 'Опиши свою пропозицію детально та переконливо',
    prompt: 'Створи опис пропозиції'
  },
  {
    stepNumber: 9,
    title: 'Call-to-Action',
    description: 'Яка дія має спонукати відвідувача до покупки?',
    prompt: 'Створи сильний заклик до дії'
  },
  {
    stepNumber: 10,
    title: 'Структура контенту',
    description: 'Як структурований твій навчальний/продуктовий контент?',
    prompt: 'Опиши структуру курсу/продукту'
  },
  {
    stepNumber: 11,
    title: 'Ціноутворення',
    description: 'Які тарифні плани та ціни ти пропонуєш?',
    prompt: 'Створи структуру ціноутворення'
  }
];

export const AIGeneratorProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [steps, setSteps] = useState<AIGeneratorStep[]>([]);
  const [currentStep, setCurrentStep] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userPrompt, setUserPrompt] = useState('');
  const [analyzedData, setAnalyzedData] = useState<AnalyzedPrompt | null>(null);
  const [stage, setStage] = useState<'funnel' | 'products' | 'analytics'>('funnel');

  const startGeneration = async (prompt: string) => {
    setIsGenerating(true);
    setError(null);
    setUserPrompt(prompt);
    
    try {
      // КРОК 1: Аналізуємо промпт через OpenAI
      console.log('🤖 Step 1: Analyzing prompt with OpenAI...');
      const analysis = await analyzeUserPrompt(prompt);
      setAnalyzedData(analysis);
      console.log('✅ Analysis complete:', analysis);
      
      // КРОК 2: Генеруємо 11 кроків через OpenAI
      console.log('🤖 Step 2: Generating 11 funnel steps...');
      const generatedSteps: AIGeneratorStep[] = [];
      
      for (const stepDef of STEP_DEFINITIONS) {
        console.log(`  → Generating step ${stepDef.stepNumber}: ${stepDef.title}`);
        
        const variants = await generateStepVariants(
          stepDef.stepNumber,
          stepDef.title,
          stepDef.description,
          analysis
        );
        
        generatedSteps.push({
          stepNumber: stepDef.stepNumber,
          title: stepDef.title,
          description: stepDef.description,
          variants,
          selectedVariant: variants[0],
          customText: ''
        });
        
        // Невелика затримка між запитами до OpenAI
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      
      console.log('✅ All 11 steps generated!');
      setSteps(generatedSteps);
      setCurrentStep(1);
      
    } catch (err: any) {
      setError(err.message || 'Помилка при генерації воронки');
      console.error('❌ Generation error:', err);
      throw err;
    } finally {
      setIsGenerating(false);
    }
  };

  const updateStepSelection = (stepNumber: number, selectedVariant: string, customText?: string) => {
    setSteps(prev => prev.map(step => 
      step.stepNumber === stepNumber
        ? { ...step, selectedVariant, customText: customText || '' }
        : step
    ));
  };

  const goToNextStep = () => {
    if (currentStep < 11) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const goToPreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const saveFunnel = async (): Promise<FunnelData> => {
    setIsGenerating(true);
    setError(null);

    try {
      const funnelData = {
        name: steps.find(s => s.stepNumber === 5)?.customText || 
              steps.find(s => s.stepNumber === 5)?.selectedVariant || 
              'Нова AI воронка',
        description: steps.find(s => s.stepNumber === 8)?.customText || 
                     steps.find(s => s.stepNumber === 8)?.selectedVariant || 
                     '',
        theme: 'orange',
        type: 'mixed',
        user_prompt: userPrompt,
        ai_generated_data: {
          analysis: analyzedData,
          steps: steps.map(step => ({
            step_number: step.stepNumber,
            title: step.title,
            description: step.description,
            selected_text: step.customText || step.selectedVariant,
            variants: step.variants
          }))
        }
      };

      console.log('💾 Saving funnel to backend...', funnelData);

      const token = localStorage.getItem('starway_auth_token');
      if (!token) {
        throw new Error('Не авторизовано');
      }

      const response = await fetch('http://localhost:3001/api/funnels', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(funnelData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Помилка збереження воронки');
      }

      const savedData = await response.json();
      console.log('✅ Funnel saved to Neon DB:', savedData);

      return {
        id: savedData.funnel.id,
        name: savedData.funnel.name,
        userPrompt,
        steps: steps.map(step => ({
          stepNumber: step.stepNumber,
          title: step.title,
          selectedText: step.customText || step.selectedVariant
        })),
        createdAt: savedData.funnel.created_at,
        status: 'draft'
      };
    } catch (err: any) {
      setError('Помилка при збереженні воронки');
      console.error('❌ Save funnel error:', err);
      throw err;
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <AIGeneratorContext.Provider
      value={{
        steps,
        currentStep,
        isGenerating,
        error,
        stage,
        startGeneration,
        updateStepSelection,
        goToNextStep,
        goToPreviousStep,
        saveFunnel,
        setStage
      }}
    >
      {children}
    </AIGeneratorContext.Provider>
  );
};

export const useAIGenerator = () => {
  const context = useContext(AIGeneratorContext);
  if (!context) {
    throw new Error('useAIGenerator must be used inside AIGeneratorProvider');
  }
  return context;
};