// /Users/viravira/Documents/starway-studio/packages/frontend/src/pages/funnels/FunnelEditPage.tsx
// packages/frontend/src/pages/dashboard/funnels/FunnelEditPage.tsx

import AIStepGenerator from '@/components/aIGenerator/AIStepGenerator';
import StepList from '@/features/funnels/components/StepList';
import { Funnel, FunnelStep, StepType } from '@/types';
import { Button, Input, Textarea } from '@/ui';
import { ArrowLeft, Play, Plus, Save, Settings, Sparkles, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate, useParams } from 'react-router-dom';

const FunnelEditPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [funnel, setFunnel] = useState<Funnel | null>(null);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAIGenerator, setShowAIGenerator] = useState(false);

  // Fetch funnel
  useEffect(() => {
    const fetchFunnel = async () => {
      try {
        const token = localStorage.getItem('starway_auth_token');
        const response = await fetch(`http://localhost:3001/api/funnels/${id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Помилка завантаження воронки');

        const data = await response.json();
        setFunnel(data.funnel);
        
        // Auto-select first step
        if (data.funnel.steps.length > 0) {
          setSelectedStepId(data.funnel.steps[0].id);
        }
      } catch (err) {
        console.error('Error fetching funnel:', err);
        toast.error('Помилка завантаження воронки');
        navigate('/dashboard/funnels');
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchFunnel();
  }, [id, navigate]);

  const handleSave = async () => {
    if (!funnel) return;
    
    setSaving(true);
    try {
      const token = localStorage.getItem('starway_auth_token');
      const response = await fetch(`http://localhost:3001/api/funnels/${funnel.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: funnel.name,
          description: funnel.description,
          steps: funnel.steps,
          status: funnel.status
        })
      });

      if (!response.ok) throw new Error('Помилка збереження');

      toast.success('Воронку збережено! 🎉');
    } catch (err) {
      console.error('Error saving funnel:', err);
      toast.error('Помилка збереження');
    } finally {
      setSaving(false);
    }
  };

  const handleAddStep = (type: StepType) => {
    if (!funnel) return;

    const newStep: FunnelStep = {
      id: `step_${Date.now()}`,
      type,
      name: `Новий крок: ${type}`,
      title: '',
      description: '',
      order: funnel.steps.length,
      config: {},
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    setFunnel({
      ...funnel,
      steps: [...funnel.steps, newStep]
    });

    setSelectedStepId(newStep.id);
    toast.success('Крок додано!');
  };

  const handleUpdateStep = (stepId: string, updates: Partial<FunnelStep>) => {
    if (!funnel) return;

    setFunnel({
      ...funnel,
      steps: funnel.steps.map(step =>
        step.id === stepId ? { ...step, ...updates, updatedAt: new Date() } : step
      )
    });
  };

  const handleDeleteStep = (stepId: string) => {
    if (!funnel) return;
    if (!confirm('Видалити цей крок?')) return;

    setFunnel({
      ...funnel,
      steps: funnel.steps.filter(step => step.id !== stepId)
    });

    if (selectedStepId === stepId) {
      setSelectedStepId(funnel.steps[0]?.id || null);
    }

    toast.success('Крок видалено');
  };

  const handleReorderSteps = (dragIndex: number, hoverIndex: number) => {
    if (!funnel) return;

    const steps = [...funnel.steps];
    const [draggedStep] = steps.splice(dragIndex, 1);
    steps.splice(hoverIndex, 0, draggedStep);

    // Update order
    const reorderedSteps = steps.map((step, index) => ({
      ...step,
      order: index
    }));

    setFunnel({
      ...funnel,
      steps: reorderedSteps
    });
  };

  const selectedStep = funnel?.steps.find(s => s.id === selectedStepId);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (!funnel) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-slate-400">Воронку не знайдено</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="glass-card rounded-none border-b border-white/10 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/dashboard/funnels')}
              className="glass-button"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-white">{funnel.name}</h1>
              <p className="text-sm text-slate-400">
                {funnel.steps.length} кроків • {funnel.status}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="md"
              onClick={() => setShowAIGenerator(!showAIGenerator)}
              className={`glass-button ${showAIGenerator ? 'ring-2 ring-orange-500' : ''}`}
            >
              <Sparkles className="w-5 h-5 mr-2" />
              AI Помічник
            </Button>

            <Button
              variant="ghost"
              size="md"
              className="glass-button"
            >
              <Play className="w-5 h-5 mr-2" />
              Тест
            </Button>

            <Button
              variant="ghost"
              size="md"
              className="glass-button"
            >
              <Settings className="w-5 h-5" />
            </Button>

            <Button
              variant="primary"
              size="md"
              onClick={handleSave}
              disabled={saving}
              className="gradient-button"
            >
              <Save className="w-5 h-5 mr-2" />
              {saving ? 'Збереження...' : 'Зберегти'}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Steps List Sidebar */}
        <div className="w-80 glass-card rounded-none border-r border-white/10 overflow-y-auto">
          <div className="p-4 border-b border-white/10">
            <Button
              variant="primary"
              size="md"
              className="gradient-button w-full"
              onClick={() => handleAddStep(StepType.MESSAGE)}
            >
              <Plus className="w-5 h-5 mr-2" />
              Додати крок
            </Button>
          </div>

          <StepList
            steps={funnel.steps}
            onDelete={handleDeleteStep}
            onEdit={(step) => setSelectedStepId(step.id)}
          />
        </div>


        {/* Step Editor */}
        <div className="flex-1 overflow-y-auto bg-slate-950">
          {selectedStep ? (
            <div className="p-8">
              <div className="glass-card p-6 mb-6">
                <h2 className="text-xl font-bold text-white mb-4">Редагування кроку</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Назва кроку
                    </label>
                    <Input
                      type="text"
                      value={selectedStep.name}
                      onChange={(e) => handleUpdateStep(selectedStep.id, { name: e.target.value })}
                      className="glass-input w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Опис
                    </label>
                    <Textarea
                      value={selectedStep.description || ''}
                      onChange={(e) => handleUpdateStep(selectedStep.id, { description: e.target.value })}
                      className="glass-textarea w-full"
                      rows={3}
                    />
                  </div>

                  <div className="flex items-center gap-4 pt-4 border-t border-white/10">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteStep(selectedStep.id)}
                      className="glass-button text-red-400"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Видалити крок
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="icon-container-orange w-16 h-16 mx-auto mb-4">
                  <Plus className="w-8 h-8 text-orange-500" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  Немає кроків
                </h3>
                <p className="text-slate-400 mb-6">
                  Додайте перший крок для вашої воронки
                </p>
                <Button
                  variant="primary"
                  size="lg"
                  className="gradient-button"
                  onClick={() => handleAddStep(StepType.MESSAGE)}
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Додати крок
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* AI Generator Sidebar */}
        {showAIGenerator && (
          <div className="w-96 glass-card rounded-none border-l border-white/10 overflow-y-auto">
            <AIStepGenerator
              funnelName={funnel.name}
              funnelDescription={funnel.description}
              currentSteps={funnel.steps}
              onAddStep={handleAddStep}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default FunnelEditPage;