// frontend/src/features/admin/components/TemplateSelector.tsx
import React from 'react';
import { Brain, Calendar, ClipboardList, ArrowRight } from 'lucide-react';
import { Button, GlassCard } from '../../ui';
import { useGetTemplatesQuery } from '../../services/settings.api';

interface TemplateSelectorProps {
  onSelectTemplate: (templateId: string) => void;
}

const TEMPLATE_ICONS: Record<string, React.ElementType> = {
  'ai-mentor': Brain,
  'marathon-21': Calendar,
  'ai-tests': ClipboardList,
};

const TEMPLATE_GRADIENTS: Record<string, string> = {
  'ai-mentor': 'from-purple-500 to-pink-500',
  'marathon-21': 'from-orange-500 to-red-500',
  'ai-tests': 'from-cyan-500 to-blue-500',
};

export const TemplateSelector: React.FC<TemplateSelectorProps> = ({ onSelectTemplate }) => {
  // ✅ Передаємо пустий об'єкт як аргумент
  const { data: templates, isLoading } = useGetTemplatesQuery({});

  if (isLoading) {
    return <div className="text-white">Завантаження темплейтів...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8 text-center">
        <h2 className="text-3xl font-bold text-white mb-2">
          Оберіть темплейт
        </h2>
        <p className="text-white/60">
          Виберіть готовий шаблон для вашої воронки
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates?.map((template) => {
          const Icon = TEMPLATE_ICONS[template.id] || Brain;
          const gradient = TEMPLATE_GRADIENTS[template.id] || 'from-gray-500 to-gray-600';

          return (
            <GlassCard key={template.id} hover className="p-6">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-4`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">{template.name}</h3>
              <p className="text-white/60 text-sm mb-4">{template.description}</p>
              <Button
                color="orange"
                size="sm"
                rightIcon={ArrowRight}
                onClick={() => onSelectTemplate(template.id)}
              >
                Обрати
              </Button>
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
};

export default TemplateSelector;