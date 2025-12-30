// packages/frontend/src/components/aIGenerator/AIAnalyticsGenerator.tsx
import React, { useState, useEffect } from 'react';
import { useAIGenerator } from '@frontend/pages/dashboard/AIGeneratorProvider';
import { 
  TrendingUp, 
  Users, 
  DollarSign, 
  Target, 
  ArrowLeft, 
  Check,
  Loader,
  Sparkles
} from 'lucide-react';
import { Button } from '@starway/shared/ui';
import { useNavigate } from 'react-router-dom';

interface AnalyticsPrediction {
  metric: string;
  value: string;
  change: string;
  trend: 'up' | 'down' | 'stable';
  icon: any;
  color: string;
}

export const AIAnalyticsGenerator: React.FC = () => {
  const { setStage } = useAIGenerator();
  const navigate = useNavigate();
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [predictions, setPredictions] = useState<AnalyticsPrediction[]>([]);

  useEffect(() => {
    generatePredictions();
  }, []);

  const generatePredictions = async () => {
    setIsAnalyzing(true);
    
    // Mock AI analysis
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const mockPredictions: AnalyticsPrediction[] = [
      {
        metric: 'Очікувана конверсія',
        value: '18-25%',
        change: '+12% від середнього',
        trend: 'up',
        icon: Target,
        color: 'text-green-400'
      },
      {
        metric: 'Прогноз користувачів',
        value: '500-800',
        change: 'перші 30 днів',
        trend: 'up',
        icon: Users,
        color: 'text-blue-400'
      },
      {
        metric: 'Очікуваний дохід',
        value: '₴85,000+',
        change: 'перший місяць',
        trend: 'up',
        icon: DollarSign,
        color: 'text-orange-400'
      },
      {
        metric: 'ROI прогноз',
        value: '240%',
        change: 'через 3 місяці',
        trend: 'up',
        icon: TrendingUp,
        color: 'text-purple-400'
      }
    ];
    
    setPredictions(mockPredictions);
    setIsAnalyzing(false);
  };

  const handleFinish = async () => {
    setIsSaving(true);
    
    // Mock saving
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('Funnel completed and saved');
    navigate('/dashboard/funnels');
  };

  if (isAnalyzing) {
    return (
      <div className="min-h-[600px] flex items-center justify-center">
        <div className="text-center">
          <div className="icon-container-orange w-20 h-20 mx-auto mb-6 animate-pulse">
            <Sparkles className="w-10 h-10 text-orange-500" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-3">
            AI аналізує вашу воронку
          </h3>
          <p className="text-slate-400 mb-6">
            Генеруємо прогнози та рекомендації...
          </p>
          <div className="flex justify-center">
            <Loader className="w-8 h-8 text-orange-500 animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">AI Аналітика та Прогнози</h2>
          <p className="text-slate-400">
            Прогнози ефективності вашої воронки на основі AI аналізу
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setStage('products')}
          className="glass-button"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Назад до продуктів
        </Button>
      </div>

      {/* Success Message */}
      <div className="glass-card-gradient p-6">
        <div className="flex items-start gap-4">
          <div className="icon-container-orange w-12 h-12 flex-shrink-0">
            <Check className="w-6 h-6 text-orange-500" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white mb-2">
              Воронка успішно створена!
            </h3>
            <p className="text-slate-300 text-sm">
              AI проаналізував вашу воронку та згенерував прогнози ефективності. 
              Нижче ви можете побачити очікувані показники.
            </p>
          </div>
        </div>
      </div>

      {/* Predictions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {predictions.map((prediction, index) => {
          const Icon = prediction.icon;
          
          return (
            <div
              key={index}
              className="glass-card p-6 hover:bg-slate-800/50 transition"
            >
              <div className="flex items-start gap-4">
                <div className={`icon-container-orange w-12 h-12 flex-shrink-0`}>
                  <Icon className={`w-6 h-6 ${prediction.color}`} />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm text-slate-400 mb-2">
                    {prediction.metric}
                  </h4>
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-3xl font-bold text-white">
                      {prediction.value}
                    </span>
                  </div>
                  <p className={`text-sm ${prediction.color}`}>
                    {prediction.change}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recommendations */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-orange-500" />
          AI Рекомендації
        </h3>
        <div className="space-y-4">
          <div className="glass-card bg-slate-800/50 p-4">
            <h4 className="font-semibold text-white text-sm mb-2">
              🎯 Оптимізація конверсії
            </h4>
            <p className="text-slate-400 text-sm">
              Додайте привітальне відео на першому кроці - це збільшить engagement на 35%
            </p>
          </div>
          <div className="glass-card bg-slate-800/50 p-4">
            <h4 className="font-semibold text-white text-sm mb-2">
              ⚡ Швидкість відгуку
            </h4>
            <p className="text-slate-400 text-sm">
              Налаштуйте автоматичні відповіді в Telegram протягом 5 хвилин після реєстрації
            </p>
          </div>
          <div className="glass-card bg-slate-800/50 p-4">
            <h4 className="font-semibold text-white text-sm mb-2">
              💎 Покращення утримання
            </h4>
            <p className="text-slate-400 text-sm">
              Додайте геймифікацію з досягненнями - це знижує відтік на 40%
            </p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between glass-card p-6">
        <div>
          <p className="text-white font-semibold mb-1">
            Все готово до запуску!
          </p>
          <p className="text-slate-400 text-sm">
            Воронка збережена та готова до використання
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="ghost"
            size="lg"
            onClick={generatePredictions}
            className="glass-button"
          >
            <TrendingUp className="w-5 h-5 mr-2" />
            Оновити прогнози
          </Button>
          <Button
            variant="primary"
            size="lg"
            onClick={handleFinish}
            disabled={isSaving}
            className="gradient-button"
          >
            {isSaving ? (
              <>
                <Loader className="w-5 h-5 mr-2 animate-spin" />
                Збереження...
              </>
            ) : (
              <>
                <Check className="w-5 h-5 mr-2" />
                Завершити та перейти до воронок
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};