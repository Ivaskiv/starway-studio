// src/pages/funnels/FunnelOnboarding.tsx
import React, { useState } from 'react';
import { Plus, Sparkles, Mail, MessageCircle, Layout, Edit2, Trash2, ChevronRight } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Textarea';

// Типи
interface Step {
  id: string;
  order: number;
  delay: number;
  content: {
    text: string;
    media?: string;
    buttons?: Array<{ text: string; action: string }>;
    aiModule?: string;
  };
}

interface Funnel {
  id: string;
  name: string;
  type: 'telegram' | 'email' | 'mixed';
  steps: Step[];
}

// GPT генератор
const generateFunnelSteps = async (niche: string): Promise<Step[]> => {
  return [
    {
      id: '1',
      order: 1,
      delay: 0,
      content: {
        text: `Привіт! 👋 Вітаю в програмі "${niche}"`,
        buttons: [{ text: 'Почати', action: 'next' }]
      }
    },
    {
      id: '2',
      order: 2,
      delay: 86400,
      content: {
        text: 'День 1: Перше цінне завдання',
        aiModule: 'reflection'
      }
    },
    {
      id: '3',
      order: 3,
      delay: 172800,
      content: {
        text: 'День 2: Поглиблення практики'
      }
    }
  ];
};

export default function FunnelOnboarding() {
  const [stage, setStage] = useState<'empty' | 'create' | 'builder'>('empty');
  const [funnel, setFunnel] = useState<Funnel | null>(null);
  const [formData, setFormData] = useState({ name: '', type: 'telegram' as const, niche: '' });
  const [selectedStep, setSelectedStep] = useState<Step | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGPTCreate = async () => {
    setLoading(true);
    const steps = await generateFunnelSteps(formData.niche);
    const newFunnel: Funnel = {
      id: Date.now().toString(),
      name: formData.name,
      type: formData.type,
      steps
    };
    setFunnel(newFunnel);
    setSelectedStep(steps[0]);
    setStage('builder');
    setLoading(false);
  };

  const handleEmptyCreate = () => {
    const newFunnel: Funnel = {
      id: Date.now().toString(),
      name: formData.name,
      type: formData.type,
      steps: []
    };
    setFunnel(newFunnel);
    setStage('builder');
  };

  const addStep = () => {
    const newStep: Step = {
      id: Date.now().toString(),
      order: (funnel?.steps.length || 0) + 1,
      delay: 0,
      content: { text: '' }
    };
    setFunnel(f => f ? { ...f, steps: [...f.steps, newStep] } : null);
    setSelectedStep(newStep);
  };

  const updateStep = (id: string, content: Partial<Step['content']>) => {
    setFunnel(f => f ? {
      ...f,
      steps: f.steps.map(s => s.id === id ? { ...s, content: { ...s.content, ...content } } : s)
    } : null);
  };

  const deleteStep = (id: string) => {
    setFunnel(f => f ? { ...f, steps: f.steps.filter(s => s.id !== id) } : null);
    setSelectedStep(null);
  };

  // ЕТАП 1: Порожня панель
  if (stage === 'empty') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl mx-auto mb-6 flex items-center justify-center">
            <Layout className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Немає воронок</h1>
          <p className="text-gray-400 mb-8">Створіть свою першу воронку за хвилину</p>
          <Button onClick={() => setStage('create')} className="mx-auto">
            <Plus className="w-5 h-5" />
            Створити воронку
          </Button>
        </div>
      </div>
    );
  }

  // ЕТАП 2: Діалог створення
  if (stage === 'create') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="bg-zinc-900 rounded-2xl p-8 max-w-md w-full border border-zinc-800">
          <h2 className="text-2xl font-bold text-white mb-6">Нова воронка</h2>
          
          <div className="space-y-4">
            <Input
              label="Назва"
              placeholder="Моя воронка"
              value={formData.name}
              onChange={(e) => setFormData(f => ({ ...f, name: e.target.value }))}
            />

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Тип</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'telegram', icon: MessageCircle, label: 'Telegram' },
                  { value: 'email', icon: Mail, label: 'Email' },
                  { value: 'mixed', icon: Layout, label: 'Міксований' }
                ].map(({ value, icon: Icon, label }) => (
                  <button
                    key={value}
                    onClick={() => setFormData(f => ({ ...f, type: value as any }))}
                    className={`p-3 rounded-lg border transition-all ${
                      formData.type === value
                        ? 'bg-purple-600 border-purple-500 text-white'
                        : 'bg-black border-zinc-700 text-gray-400 hover:border-zinc-600'
                    }`}
                  >
                    <Icon className="w-5 h-5 mx-auto mb-1" />
                    <div className="text-xs">{label}</div>
                  </button>
                ))}
              </div>
            </div>

            <Input
              label="Швидкий старт"
              placeholder="Опишіть вашу нішу для AI (опціонально)"
              value={formData.niche}
              onChange={(e) => setFormData(f => ({ ...f, niche: e.target.value }))}
            />
              
            <Button
              onClick={handleGPTCreate}
              disabled={!formData.name || !formData.niche || loading}
              isLoading={loading}
              className="w-full"
            >
              <Sparkles className="w-5 h-5" />
              {loading ? 'Генерація...' : 'Згенерувати з AI'}
            </Button>
            
            <Button
              onClick={handleEmptyCreate}
              disabled={!formData.name}
              variant="secondary"
              className="w-full"
            >
              Почати з нуля
            </Button>
          </div>

          <button
            onClick={() => setStage('empty')}
            className="mt-4 text-gray-400 hover:text-white text-sm transition-colors"
          >
            ← Назад
          </button>
        </div>
      </div>
    );
  }

  // ЕТАП 3-4: Конструктор
  return (
    <div className="min-h-screen bg-black flex">
      {/* Ліва панель */}
      <div className="w-80 bg-zinc-900 border-r border-zinc-800 p-4 overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">{funnel?.name}</h2>
          <Button onClick={addStep} variant="primary" className="!p-2">
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        <div className="space-y-2">
          {funnel?.steps.map((step, idx) => (
            <div
              key={step.id}
              onClick={() => setSelectedStep(step)}
              className={`p-3 rounded-lg cursor-pointer transition-all ${
                selectedStep?.id === step.id
                  ? 'bg-purple-600 text-white'
                  : 'bg-zinc-800 text-gray-300 hover:bg-zinc-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs opacity-60">#{idx + 1}</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
                <Button
                  onClick={(e) => { e.stopPropagation(); deleteStep(step.id); }}
                  className="opacity-0 hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              <div className="text-sm mt-1 truncate">{step.content.text || 'Пустий крок'}</div>
              {step.delay > 0 && (
                <div className="text-xs opacity-60 mt-1">
                  Затримка: {Math.floor(step.delay / 86400)} днів
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Права панель */}
      <div className="flex-1 p-8">
        {selectedStep ? (
          <div className="max-w-2xl">
            <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <Edit2 className="w-6 h-6" />
              Редагування кроку
            </h3>

            <div className="space-y-4">
              <Textarea
                label="Текст повідомлення"
                placeholder="Введіть текст..."
                rows={6}
                value={selectedStep.content.text}
                onChange={(e) => updateStep(selectedStep.id, { text: e.target.value })}
              />

              <Input
                label="Затримка (секунди)"
                type="number"
                value={selectedStep.delay.toString()}
                onChange={(e) => {
                  const delay = parseInt(e.target.value) || 0;
                  setFunnel(f => f ? {
                    ...f,
                    steps: f.steps.map(s => s.id === selectedStep.id ? { ...s, delay } : s)
                  } : null);
                }}
              />
              <p className="text-xs text-gray-500 -mt-2">
                {Math.floor(selectedStep.delay / 86400)} днів, {Math.floor((selectedStep.delay % 86400) / 3600)} годин
              </p>

              <Select
                label="AI модуль"
                value={selectedStep.content.aiModule || ''}
                onChange={(e) => updateStep(selectedStep.id, { aiModule: e.target.value || undefined })}
                options={[
                  { value: '', label: 'Без AI' },
                  { value: 'reflection', label: 'Рефлексія' },
                  { value: 'wheel', label: 'Колесо балансу' },
                  { value: 'chat', label: 'AI-чат' }
                ]}
              />

              <Button className="w-full">
                <Sparkles className="w-5 h-5" />
                Покращити текст з AI
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            Оберіть крок для редагування
          </div>
        )}
      </div>
    </div>
  );
}