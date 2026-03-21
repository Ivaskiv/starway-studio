// frontend/src/features/landing/sections/FeaturesSection.tsx
import { GlassCard } from '@/ui/GlassCard';
import type { LucideIcon } from 'lucide-react';
import { Bot, Calendar, Sparkles, Target, TrendingUp, Zap } from 'lucide-react';

interface Feature {
  icon:  LucideIcon;
  title: string;
  desc:  string;
  g:     string;       // tailwind gradient classes
}

const FEATURES: Feature[] = [
  { icon: Bot,        title: 'AI Ментор',         desc: 'Веде по системі: СТАН → ЦІЛЬ → ВИБІР → ДІЯ.', g: 'from-[var(--accent-soft)] to-[var(--accent)]' },
  { icon: Target,     title: 'Колесо балансу',    desc: 'Оцінка 6 сфер + персональний план дій від AI.', g: 'from-violet-500 to-purple-600'  },
  { icon: TrendingUp, title: 'Аналітика',          desc: 'Streak, стабільність, зливи — наочна картина.',  g: 'from-blue-500 to-cyan-500'      },
  { icon: Calendar,   title: 'Щоденний цикл',     desc: 'Фіксуй стан і вибори кожного дня за 3 хв.',     g: 'from-emerald-500 to-green-500'  },
  { icon: Sparkles,   title: 'AI Генератор',       desc: 'Автоматичні інсайти та звіти з твоїх даних.',   g: 'from-[rgba(var(--accent-rgb),0.35)] to-[rgba(var(--accent-rgb),0.08)]' },
  { icon: Zap,        title: 'Zoom-сесії',         desc: 'Щотижневі групові зустрічі з ментором.',         g: 'from-[rgba(var(--accent-rgb),0.3)] to-[var(--accent-strong)]' },
];

export function FeaturesSection() {
  return (
    <section className="py-8">
      <div className="mx-auto max-w-[1600px] px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-black mb-4 text-white">
            Все для {' '}
            <span className="text-[rgb(var(--accent-soft-rgb))]">трансформації</span>
          
          </h2>
          <p className="text-xl text-white/45">Потужні інструменти в одній екосистемі</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map(f => (
            <GlassCard
              key={f.title}
              className={`feature-card-compact group hover:scale-[1.03] hover:-translate-y-1 transition-all duration-300`}
            >
              <div className={`feature-icon bg-gradient-to-br ${f.g}`}>
                <f.icon className="w-7 h-7 text-white" />
              </div>
              <h3 className="feature-card-title text-white mb-2 group-hover:text-[var(--accent-soft)] transition-colors">
                {f.title}
              </h3>
              <p className="feature-card-desc text-sm">{f.desc}</p>
            </GlassCard>
          ))}
        </div>
      </div>
    </section>
  );
}
