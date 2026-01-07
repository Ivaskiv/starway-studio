// /Users/viravira/Documents/starway-studio/packages/frontend/src/pages/funnels/FunnelCreatePage.tsx
// packages/frontend/src/pages/dashboard/funnels/FunnelCreatePage.tsx
import { ArrowLeft, Save, Sparkles } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { FunnelTheme } from '../../features/funnels/types/funnelsTypes';
import { Button, Input, Textarea } from '../../ui';

const FunnelCreatePage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    theme: 'orange' as FunnelTheme,
  });
  const [loading, setLoading] = useState(false);
  const [showAIGenerator, setShowAIGenerator] = useState(false);
  const [activeInput, setActiveInput] = useState<'name' | 'description' | null>(null);

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);

  try {
    // MOCK для тесту
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const mockFunnel = {
      id: `funnel_${Date.now()}`,
      name: formData.name,
      description: formData.description,
      theme: formData.theme
    };

    console.log('Mock funnel created:', mockFunnel);
    toast.success('Воронку створено! 🎉 (mock)');
    navigate(`/dashboard/funnels/${mockFunnel.id}/edit`);
    
    /* РЕАЛЬНИЙ API - закоментований поки не працює
    const token = localStorage.getItem('starway_auth_token');
    const response = await fetch('http://localhost:3001/api/funnels', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(formData)
    });

    if (!response.ok) throw new Error('Помилка створення воронки');
    const data = await response.json();
    toast.success('Воронку створено! 🎉');
    navigate(`/dashboard/funnels/${data.funnel.id}/edit`);
    */

  } catch (err: any) {
    console.error('Error creating funnel:', err);
    toast.error(err.message || 'Помилка створення воронки');
  } finally {
    setLoading(false);
  }
};

  const handleAIApply = (field: 'name' | 'description', value: string) => {
    setFormData({ ...formData, [field]: value });
    toast.success('Застосовано! ✨');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            size="sm"
            onClick={() => navigate('/dashboard/funnels')}
            className="glass-button"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-white">Нова воронка</h1>
            <p className="text-slate-400 mt-1">
              Створіть нову AI-воронку для автоматизації
            </p>
          </div>
        </div>

        <Button
          size="md"
          onClick={() => setShowAIGenerator(!showAIGenerator)}
          className={`glass-button ${showAIGenerator ? 'ring-2 ring-orange-500' : ''}`}
        >
          <Sparkles className="w-5 h-5 mr-2" />
          AI Асистент
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2">
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold text-white mb-6">Основна інформація</h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Назва воронки
                </label>
                <Input
                  type="text"
                  placeholder="Наприклад: AI-Ментор - Trial 14 днів"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  onFocus={() => setActiveInput('name')}
                  onBlur={() => setTimeout(() => setActiveInput(null), 200)}
                  className="glass-input"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Опис (необов'язково)
                </label>
                <Textarea
                  placeholder="Короткий опис вашої воронки..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  onFocus={() => setActiveInput('description')}
                  onBlur={() => setTimeout(() => setActiveInput(null), 200)}
                  rows={4}
                  className="glass-textarea"
                />
              </div>

              {/* Theme Selector */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Колірна тема
                </label>
                <div className="grid grid-cols-6 gap-3">
                  {(['orange', 'green', 'blue', 'red', 'purple', 'yellow'] as FunnelTheme[]).map((theme) => (
                    <Button
                      key={theme}
                      type="button"
                      onClick={() => setFormData({ ...formData, theme })}
                      className={`w-12 h-12 rounded-xl transition-all ${
                        formData.theme === theme 
                          ? 'ring-2 ring-white scale-110' 
                          : 'opacity-70 hover:opacity-100'
                      }`}
                      style={{
                        background: {
                          orange: 'linear-gradient(135deg, rgb(249, 115, 22), rgb(234, 88, 12))',
                          green: 'linear-gradient(135deg, rgb(34, 197, 94), rgb(22, 163, 74))',
                          blue: 'linear-gradient(135deg, rgb(59, 130, 246), rgb(37, 99, 235))',
                          red: 'linear-gradient(135deg, rgb(239, 68, 68), rgb(220, 38, 38))',
                          purple: 'linear-gradient(135deg, rgb(168, 85, 247), rgb(126, 34, 206))',
                          yellow: 'linear-gradient(135deg, rgb(234, 179, 8), rgb(202, 138, 4))',
                        }[theme]
                      }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex space-x-4">
                <Button
                  type="submit"
                  size="lg"
                  disabled={loading || !formData.name}
                  className="gradient-button"
                >
                  <Save className="w-5 h-5 mr-2" />
                  Створити воронку
                </Button>
                <Button
                  type="button"
                  size="lg"
                  onClick={() => navigate('/dashboard/funnels')}
                  className="glass-button"
                >
                  Скасувати
                </Button>
              </div>
            </form>
          </div>
        </div>

        {/* AI Generator Sidebar */}
        <div className="lg:col-span-1">
          {showAIGenerator ? (
            <AIFunnelGeneratorSidebar
              activeInput={activeInput}
              currentName={formData.name}
              currentDescription={formData.description}
              onApply={handleAIApply}
            />
          ) : (
            <>
              <div className="glass-card-gradient p-6">
                <div className="text-center">
                  <div className="icon-container-orange w-12 h-12 mx-auto mb-4">
                    <Sparkles className="w-6 h-6 text-orange-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    Згенерувати з AI
                  </h3>
                  <p className="text-sm text-slate-400 mb-4">
                    Дозвольте AI створити воронку автоматично на основі вашої ніші та цілей
                  </p>
                  <Button
                    size="md"
                    className="gradient-button w-full"
                    onClick={() => setShowAIGenerator(true)}
                  >
                    <Sparkles className="w-5 h-5 mr-2" />
                    Відкрити AI
                  </Button>
                </div>
              </div>

              <div className="glass-card mt-6 p-6">
                <h3 className="text-sm font-semibold text-white mb-4">💡 Підказки</h3>
                <div className="text-sm text-slate-400 space-y-2">
                  <p>• Оберіть зрозумілу назву для воронки</p>
                  <p>• Додайте опис для легшої навігації</p>
                  <p>• Після створення ви зможете додати кроки</p>
                  <p>• Використайте AI для швидкого старту</p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default FunnelCreatePage;