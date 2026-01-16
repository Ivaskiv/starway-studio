// packages/frontend/src/features/admin/components/TemplateSelector.tsx

import React from 'react';
import { Brain, Calendar, ClipboardList, ArrowRight } from 'lucide-react';
import { GlassCard } from '@/ui/GlassCard';
import { Button } from '@/ui/Button';
import { useGetTemplatesQuery } from '../services/admin.api';

interface TemplateSelectorProps {
  onSelectTemplate: (templateId: string) => void;
}

export const TemplateSelector: React.FC<TemplateSelectorProps> = ({ onSelectTemplate }) => {
  const { data: templates, isLoading } = useGetTemplatesQuery();

  const TEMPLATE_ICONS = {
    'ai-mentor': Brain,
    'marathon-21': Calendar,
    'ai-tests': ClipboardList
  };

  const TEMPLATE_GRADIENTS = {
    'ai-mentor': 'from-purple-500 to-pink-500',
    'marathon-21': 'from-orange-500 to-red-500',
    'ai-tests': 'from-cyan-500 to-blue-500'
  };

  if (isLoading) {
    return <div className="text-white">Завантаження темплейтів...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8 text-center">
        <h2 className="text-3xl font-bold text-white mb-2">
          Оберіть темплейт
        </h2>
        <p className="text-gray-400">
          Виберіть базовий шаблон для вашого продукту
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {templates?.map((template) => {
          const Icon = TEMPLATE_ICONS[template.id as keyof typeof TEMPLATE_ICONS] || Brain;
          const gradient = TEMPLATE_GRADIENTS[template.id as keyof typeof TEMPLATE_GRADIENTS] || 'from-purple-500 to-pink-500';

          return (
            <GlassCard 
              key={template.id}
              className="p-6 cursor-pointer hover:scale-105 transition-all group"
              onClick={() => onSelectTemplate(template.id)}
            >
              {/* Icon */}
              <div className={`w-16 h-16 mx-auto mb-4 bg-gradient-to-br ${gradient} rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                <Icon className="w-8 h-8 text-white" />
              </div>

              {/* Title */}
              <h3 className="text-xl font-semibold text-white text-center mb-2">
                {template.name}
              </h3>

              {/* Description */}
              <p className="text-gray-400 text-sm text-center mb-4 min-h-[60px]">
                {template.description}
              </p>

              {/* Modules */}
              <div className="mb-4">
                <p className="text-xs text-gray-500 mb-2">Модулі:</p>
                <div className="flex flex-wrap gap-1">
                  {template.modules.slice(0, 3).map((module: any) => (
                    <span 
                      key={module.id}
                      className="px-2 py-1 bg-white/5 rounded text-xs text-gray-400"
                    >
                      {module.name}
                    </span>
                  ))}
                  {template.modules.length > 3 && (
                    <span className="px-2 py-1 bg-white/5 rounded text-xs text-gray-400">
                      +{template.modules.length - 3}
                    </span>
                  )}
                </div>
              </div>

              {/* Pricing */}
              <div className="pt-4 border-t border-white/10 mb-4">
                <p className="text-xs text-gray-500 mb-1">Стандартна ціна:</p>
                <p className="text-lg font-semibold text-white">
                  {template.pricing.defaults.monthly}€ 
                  <span className="text-sm text-gray-400">/міс</span>
                </p>
              </div>

              {/* Button */}
              <Button 
                className={`w-full bg-gradient-to-r ${gradient} hover:opacity-90`}
              >
                Обрати
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
};