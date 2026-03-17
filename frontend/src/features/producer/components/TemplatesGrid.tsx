// fix style $100k — premium templates grid using liquid-glass system
import { type FC } from 'react';
import { AI_PRODUCER_TEMPLATES, ProducerTemplate } from '@/features/ai-generator/utils/templates';
import { Button } from '@/ui';
import { cn } from '@/lib/utils';

interface TemplatesGridProps {
  onSelect: (template: ProducerTemplate) => void;
}

const TemplateCard: FC<{
  template: ProducerTemplate;
  onSelect: (template: ProducerTemplate) => void;
}> = ({ template, onSelect }) => {
  return (
    <div
      className={cn(
        'template-card surface glass-noise group relative overflow-hidden rounded-[24px] border-[1px] border-[var(--border-accent)] p-6 shadow-[0_30px_80px_rgba(var(--accent-rgb),0.2)] transition-all duration-300',
        'hover:-translate-y-1 hover:shadow-[0_35px_90px_rgba(var(--accent-rgb),0.28)]',
        template.className
      )}
    >

      <div className="relative space-y-4">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'w-12 h-12 rounded-[18px] flex items-center justify-center text-xl font-semibold',
              'text-[var(--text-primary)] border-[1px] border-[var(--border-accent)] bg-[rgba(255,255,255,0.05)]'
            )}
          >
            {template.icon}
          </div>
          <div className="space-y-1">
            <span
              className={cn(
                'text-[10px] font-bold uppercase tracking-[0.3em] px-3 py-0.5 rounded-full border',
                'border-[var(--border-accent)] text-[var(--text-primary)]'
              )}
            >
              {template.badge}
            </span>
            <p className="text-base font-semibold text-[var(--text-primary)] leading-tight">{template.title}</p>
          </div>
        </div>

        <div className="surface-2 rounded-[16px] border border-[var(--border-primary)] bg-[rgba(0,0,0,0.15)] p-3 text-xs text-[var(--text-muted)] leading-relaxed">
          {template.result}
        </div>

        <p className="text-xs uppercase tracking-[0.2em] text-[var(--accent-soft)]">Модулі: {template.modules}</p>

        <div className="surface-3 rounded-[18px] border-l-4 border-[var(--border-accent)] bg-[rgba(0,0,0,0.2)] p-3 text-xs text-[var(--text-muted)] italic leading-snug">
          «{template.finalState}»
        </div>

        <Button
          variant="glass"
          color="accent"
          className="glass-button w-full justify-center border-[var(--border-accent)] bg-gradient-to-r from-[var(--accent-soft)] to-[var(--accent)] text-[var(--text-primary)] shadow-[0_15px_40px_rgba(var(--accent-rgb),0.35)]"
          onClick={() => onSelect(template)}
        >
          ✦ Створити
        </Button>
      </div>
    </div>
  );
};

export const TemplatesGrid: FC<TemplatesGridProps> = ({ onSelect }) => (
  <div className="space-y-5">
    <div className="space-y-1">
      <p className="text-xs tracking-[0.4em] uppercase text-[var(--accent-soft)]">
        🎨 Шаблони продуктів
      </p>
      <p className="text-sm text-[var(--text-muted)] leading-relaxed">
        Вибери готовий шаблон → налаштуй під себе → AI згенерує повний план за 30 секунд
      </p>
    </div>

    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {AI_PRODUCER_TEMPLATES.map((template) => (
        <TemplateCard key={template.id} template={template} onSelect={onSelect} />
      ))}
    </div>

    <div className="liquid-glass surface glass-noise rounded-[24px] border-dashed border-[var(--border-accent)] border-[2px] p-8 text-center space-y-3">
      <p className="text-3xl font-bold text-[var(--accent)]">✦</p>
      <p className="font-semibold text-base text-[var(--text-primary)]">Свій продукт з нуля</p>
      <p className="text-xs text-[var(--text-secondary)]">
        Заповни 5 полів — AI побудує повну структуру під твою нішу
      </p>
      <Button
        variant="ghost"
        color="accent"
        className="glass-button mx-auto rounded-[18px] px-6 py-2.5 font-semibold text-sm transition-all duration-200"
        onClick={() =>
          onSelect({
            id: 'custom',
            icon: '✦',
            badge: 'ВЛАСНИЙ',
            color: '#d4af37',
            glow: 'rgba(212,175,55,0.13)',
            title: 'Мій продукт',
            result: '',
            modules: 'A–G',
            finalState: '',
            prefill: { name: '', audience: '', transformation: '', format: '', uniqueness: '' },
          })
        }
      >
        + Створити власний
      </Button>
    </div>
  </div>
);
