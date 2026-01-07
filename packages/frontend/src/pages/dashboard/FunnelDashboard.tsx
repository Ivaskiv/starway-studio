import { useState } from 'react';
import { FunnelOptimizer } from './FunnelOptimizer';
import { FunnelStepBuilder } from './FunnelStepBuilder';
import { FunnelAchievements } from './FunnelAchievements';
import { ABTesting } from './ABTesting';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';

type Tab = 'builder' | 'optimizer' | 'testing' | 'achievements';

interface FunnelDashboardProps {
  funnelId: string;
}

export const FunnelDashboard = ({ funnelId }: FunnelDashboardProps) => {
  const [activeTab, setActiveTab] = useState<Tab>('builder');

  const tabs = [
    { id: 'builder' as Tab, label: '🏗️ Конструктор', icon: '🏗️' },
    { id: 'optimizer' as Tab, label: '🤖 AI Оптимізація', icon: '🤖' },
    { id: 'testing' as Tab, label: '🧪 A/B Тести', icon: '🧪' },
    { id: 'achievements' as Tab, label: '🏆 Досягнення', icon: '🏆' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 p-6">
      <div className="max-w-7xl mx-auto">
        <GlassCard data-blur="lg" className="mb-6">
          <div className="p-6">
            <h1 className="text-4xl font-bold text-white mb-2">
              Starway Studio
            </h1>
            <p className="text-white/60">
              AI-powered конструктор продажових воронок
            </p>
          </div>
        </GlassCard>

        <GlassCard data-blur="md" className="mb-6">
          <div className="p-2">
            <div className="flex gap-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 px-6 py-3 rounded-lg font-medium transition-all ${
                    activeTab === tab.id
                      ? 'bg-white/20 text-white shadow-lg'
                      : 'text-white/60 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </GlassCard>

        <div className="transition-all duration-300">
          {activeTab === 'builder' && <FunnelStepBuilder />}
          {activeTab === 'optimizer' && <FunnelOptimizer funnelId={funnelId} />}
          {activeTab === 'testing' && <ABTesting funnelId={funnelId} />}
          {activeTab === 'achievements' && <FunnelAchievements />}
        </div>
      </div>
    </div>
  );
};