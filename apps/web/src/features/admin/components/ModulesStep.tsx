// frontend/src/features/admin/components/ModulesStep.tsx

import { Check } from 'lucide-react';
import React from 'react';
import { GlassCard } from '../../../ui';

interface ModulesStepProps {
  data: any;
  onChange: (data: any) => void;
  template: any;
}

export const ModulesStep: React.FC<ModulesStepProps> = ({ data, onChange, template }) => {
  const toggleModule = (moduleId: string) => {
    const isEnabled = data.enabled_modules.includes(moduleId);
    
    onChange({
      ...data,
      enabled_modules: isEnabled
        ? data.enabled_modules.filter((id: string) => id !== moduleId)
        : [...data.enabled_modules, moduleId]
    });
  };

  const isModuleEnabled = (moduleId: string) => {
    return data.enabled_modules.includes(moduleId);
  };

  return (
    <div className="space-y-6">
      <p className="text-gray-400">
        Оберіть модулі, які будуть доступні в вашому продукті
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {template.modules.map((module: any) => {
          const enabled = isModuleEnabled(module.id);
          const isRequired = module.required;

          return (
            <GlassCard
              key={module.id}
              className={`p-4 cursor-pointer transition-all ${
                enabled 
                  ? 'border-2 border-purple-500 bg-purple-500/10' 
                  : 'border border-white/10 hover:border-white/20'
              } ${isRequired ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={() => !isRequired && toggleModule(module.id)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="text-white font-semibold mb-1">
                    {module.name}
                    {isRequired && (
                      <span className="ml-2 text-xs text-purple-400">
                        (обов'язковий)
                      </span>
                    )}
                  </h3>
                  <p className="text-sm text-gray-400">
                    {module.description}
                  </p>
                </div>

                {/* Checkbox */}
                <div className={`w-6 h-6 rounded-md flex items-center justify-center transition-all ${
                  enabled 
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600' 
                    : 'bg-white/10'
                }`}>
                  {enabled && <Check className="w-4 h-4 text-white" />}
                </div>
              </div>

              {/* Available In */}
              <div className="flex items-center gap-2 mt-2">
                {module.availableIn?.includes('trial') && (
                  <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded">
                    Trial
                  </span>
                )}
                {module.availableIn?.includes('paid') && (
                  <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded">
                    Paid
                  </span>
                )}
                {module.customizable && (
                  <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded">
                    Кастомізується
                  </span>
                )}
              </div>
            </GlassCard>
          );
        })}
      </div>

      {/* Summary */}
      <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
        <p className="text-sm text-gray-400">
          Обрано модулів: <span className="text-white font-semibold">{data.enabled_modules.length}</span> / {template.modules.length}
        </p>
      </div>
    </div>
  );
};