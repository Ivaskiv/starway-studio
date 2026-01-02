// packages/frontend/src/components/aIGenerator/AIFunnelGeneratorSidebar.tsx
import React, { useState } from 'react';
import { Sparkles, Loader, Wand2 } from 'lucide-react';
import { Button, Textarea } from '@starway/shared/ui';

interface AIFunnelGeneratorSidebarProps {
  activeInput: 'name' | 'description' | null;
  currentName: string;
  currentDescription: string;
  onApply: (field: 'name' | 'description', value: string) => void;
}

export default function AIFunnelGeneratorSidebar({
  activeInput,
  currentName,
  currentDescription,
  onApply
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [userPrompt, setUserPrompt] = useState('');
  const [suggestions, setSuggestions] = useState<{
    name: string[];
    description: string[];
  }>({
    name: [],
    description: []
  });

  const generateSmartSuggestions = (prompt: string) => {
    // Аналізуємо ключові слова з промпту
    const lowerPrompt = prompt.toLowerCase();
    
    // Визначаємо тематику
    let theme = '';
    let duration = '';
    let format = '';
    
    if (lowerPrompt.includes('йог')) theme = 'йоги';
    else if (lowerPrompt.includes('коуч') || lowerPrompt.includes('ментор')) theme = 'коучингу';
    else if (lowerPrompt.includes('трансформац') || lowerPrompt.includes('зміни')) theme = 'трансформації';
    else if (lowerPrompt.includes('бізнес')) theme = 'бізнесу';
    else if (lowerPrompt.includes('здоров')) theme = 'здоров\'я';
    else theme = 'розвитку';
    
    if (lowerPrompt.includes('90') || lowerPrompt.includes('дев\'яносто')) duration = '90 днів';
    else if (lowerPrompt.includes('30') || lowerPrompt.includes('місяць')) duration = '30 днів';
    else if (lowerPrompt.includes('14') || lowerPrompt.includes('тижд')) duration = '14 днів';
    else duration = '8 тижнів';
    
    if (lowerPrompt.includes('telegram') || lowerPrompt.includes('бот')) format = 'з Telegram-ботом';
    else if (lowerPrompt.includes('web') || lowerPrompt.includes('сайт')) format = 'з веб-платформою';
    else if (lowerPrompt.includes('email')) format = 'з email-підтримкою';
    else format = 'з AI-асистентом';
    
    const names = [
      `Трансформація за ${duration}: Шлях до нового Я`,
      `AI-Ментор ${theme.charAt(0).toUpperCase() + theme.slice(1)}: ${duration} змін`,
      `Практикум особистого ${theme} ${format}`
    ];
    
    const descriptions = [
      `Повна програма ${theme} на ${duration} ${format}. Щоденна підтримка, персоналізований фідбек та геймифікація для максимальної мотивації.`,
      `Автоматизована воронка ${theme} ${format}, яка включає: щоденні практики, AI-коуч для персонального супроводу, трекінг прогресу та спільноту однодумців.`,
      `${duration} інтенсивної роботи над собою ${format}. Комплексний підхід: теорія + практика + підтримка 24/7. Гарантований результат або повернення коштів.`
    ];
    
    return { names, descriptions };
  };

  const handleGenerate = async () => {
    if (!userPrompt.trim()) {
      alert('Будь ласка, опиши свій продукт або послугу');
      return;
    }

    setIsGenerating(true);
    
    try {
      // Імітація AI-генерації
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Генеруємо розумні варіанти на основі промпту
      const smartSuggestions = generateSmartSuggestions(userPrompt);
      
      setSuggestions({
        name: smartSuggestions.names,
        description: smartSuggestions.descriptions
      });
      
    } catch (error) {
      console.error('Generation error:', error);
      alert('Помилка генерації');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApplySuggestion = (field: 'name' | 'description', value: string) => {
    onApply(field, value);
    // Можна закрити suggestions після застосування
    // setSuggestions({ name: [], description: [] });
  };

  return (
    <div className="glass-card p-6 space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="icon-container-orange w-10 h-10">
          <Sparkles className="w-5 h-5 text-orange-500" />
        </div>
        <div>
          <h3 className="font-semibold text-white">AI Помічник</h3>
          <p className="text-xs text-slate-400">Генерація контенту</p>
        </div>
      </div>

      {activeInput && (
        <div className="glass-card bg-blue-500/10 border border-blue-500/20 p-3 rounded-lg">
          <p className="text-xs text-blue-300">
            💡 Редагуєте: <strong>{activeInput === 'name' ? 'Назву' : 'Опис'}</strong>
          </p>
        </div>
      )}

      {/* User Prompt Input */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Опишіть свій продукт:
        </label>
        <Textarea
          placeholder="Наприклад: 90-денна програма трансформації життя з AI-ментором, щоденними практиками через Telegram бота, веб-платформою для трекінгу прогресу та спільнотою..."
          value={userPrompt}
          onChange={(e) => setUserPrompt(e.target.value)}
          rows={5}
          className="glass-textarea text-sm"
        />
        <p className="text-xs text-slate-500 mt-2">
          ⚡ Вкажіть: тривалість, формат, платформу, цільову аудиторію
        </p>
      </div>

      <Button
        variant="primary"
        size="md"
        className="gradient-button w-full"
        onClick={handleGenerate}
        disabled={isGenerating || !userPrompt.trim()}
      >
        {isGenerating ? (
          <>
            <Loader className="w-5 h-5 mr-2 animate-spin" />
            AI аналізує та генерує...
          </>
        ) : (
          <>
            <Wand2 className="w-5 h-5 mr-2" />
            Згенерувати варіанти
          </>
        )}
      </Button>

      {/* Suggestions for Name */}
      {suggestions.name.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-slate-700">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-orange-500" />
              Назви воронки
            </h4>
            <span className="text-xs text-slate-500">{suggestions.name.length} варіанти</span>
          </div>
          {suggestions.name.map((suggestion, index) => (
            <div
              key={index}
              className="glass-card bg-slate-800/50 p-4 hover:bg-slate-800/70 transition group relative"
            >
              <div className="flex items-start gap-3 mb-3">
                <div className="w-6 h-6 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0 text-orange-400 text-xs font-bold">
                  {index + 1}
                </div>
                <p className="text-sm text-white leading-relaxed flex-1">{suggestion}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="glass-button w-full opacity-0 group-hover:opacity-100 transition text-xs"
                onClick={() => handleApplySuggestion('name', suggestion)}
              >
                <Sparkles className="w-3 h-3 mr-1" />
                Застосувати назву
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Suggestions for Description */}
      {suggestions.description.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-slate-700">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-orange-500" />
              Описи воронки
            </h4>
            <span className="text-xs text-slate-500">{suggestions.description.length} варіанти</span>
          </div>
          {suggestions.description.map((suggestion, index) => (
            <div
              key={index}
              className="glass-card bg-slate-800/50 p-4 hover:bg-slate-800/70 transition group relative"
            >
              <div className="flex items-start gap-3 mb-3">
                <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 text-blue-400 text-xs font-bold">
                  {index + 1}
                </div>
                <p className="text-sm text-slate-300 leading-relaxed flex-1">{suggestion}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="glass-button w-full opacity-0 group-hover:opacity-100 transition text-xs"
                onClick={() => handleApplySuggestion('description', suggestion)}
              >
                <Sparkles className="w-3 h-3 mr-1" />
                Застосувати опис
              </Button>
            </div>
          ))}
        </div>
      )}

      {suggestions.name.length === 0 && suggestions.description.length === 0 && !isGenerating && (
        <div className="text-center py-8 glass-card bg-slate-800/30">
          <div className="icon-container-orange w-14 h-14 mx-auto mb-3">
            <Wand2 className="w-7 h-7 text-orange-500" />
          </div>
          <h4 className="text-sm font-semibold text-white mb-2">
            Готовий до генерації
          </h4>
          <p className="text-xs text-slate-400 mb-1">
            Опишіть ваш продукт детально
          </p>
          <p className="text-xs text-slate-500">
            AI створить 3 варіанти назви та опису
          </p>
        </div>
      )}

      <div className="glass-card-gradient p-4 mt-4">
        <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          💡 Підказки для кращих результатів
        </h4>
        <ul className="text-xs text-slate-400 space-y-2">
          <li className="flex items-start gap-2">
            <span className="text-orange-400">•</span>
            <span>Вкажіть тривалість програми (14, 30, 90 днів)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-orange-400">•</span>
            <span>Опишіть формат (Telegram, web, email)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-orange-400">•</span>
            <span>Згадайте цільову аудиторію</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-orange-400">•</span>
            <span>Додайте унікальні особливості</span>
          </li>
        </ul>
      </div>
    </div>
  );
};