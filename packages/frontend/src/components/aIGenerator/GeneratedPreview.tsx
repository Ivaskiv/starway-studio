// packages/frontend/src/components/aiGenerator/GeneratedPreview.tsx

import { CheckCircle, Settings, Rocket } from 'lucide-react';
import { Button } from '@starway/shared/ui';
import { Funnel, getFunnelThemeConfig } from '@starway/shared';

interface GeneratedPreviewProps {
  funnel: Funnel;
  onSave: () => void;
  onEdit: () => void;
}

export default function GeneratedPreview({ funnel, onSave, onEdit }: GeneratedPreviewProps) {
  const themeConfig = getFunnelThemeConfig(funnel.theme);

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <div className="glass-card-gradient p-8">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-16 h-16 bg-gradient-orange rounded-2xl flex items-center justify-center shadow-lg">
            <CheckCircle size={32} className="text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">{funnel.name}</h2>
            <p className="text-slate-300">{funnel.description}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-slate-400 mb-1">Кроків</p>
            <p className="text-3xl font-bold text-white">
              {funnel.steps?.length || 0}
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-400 mb-1">Прогноз конверсії</p>
            <p className="text-3xl font-bold text-green-400">
              {funnel.analytics?.conversionRate || 18}%
            </p>
          </div>
        </div>
      </div>

      {/* Steps Preview */}
      <div className="glass-card p-6">
        <h3 className="text-xl font-bold text-white mb-6">Кроки воронки</h3>
        
        <div className="space-y-4">
          {funnel.steps?.map((step, idx) => (
            <div key={step.id} className="glass-card bg-slate-800/50 p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h4 className="font-bold text-white text-lg mb-1">{step.name}</h4>
                  <p className="text-sm text-slate-400">{step.description}</p>
                </div>
                <span className="badge-orange">
                  Крок {idx + 1}
                </span>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <span className={`px-3 py-1 rounded-lg ${themeConfig.bg} ${themeConfig.text}`}>
                  {step.type}
                </span>
                {step.isActive && (
                  <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-lg">
                    Активний
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-4">
        <Button 
          variant="ghost" 
          size="lg" 
          className="glass-button flex-1"
          onClick={onEdit}
        >
          <Settings size={20} className="mr-2" />
          Редагувати
        </Button>
        
        <Button 
          variant="primary" 
          size="lg" 
          className="gradient-button flex-1"
          onClick={onSave}
        >
          <Rocket size={20} className="mr-2" />
          Зберегти і запустити
        </Button>
      </div>
    </div>
  );
}
