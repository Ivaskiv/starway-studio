// frontend/src/features/landing/sections/FeaturesSection.tsx
import { GlassCard } from '@/ui/GlassCard';
import type { LucideIcon } from 'lucide-react';
import { Bot, Calendar, Sparkles, Target, TrendingUp, Zap } from 'lucide-react';

interface Feature {
  icon:  LucideIcon;
  title: string;
  desc:  string;
}

const FEATURES: Feature[] = [
  { icon: Bot,        title: 'ABsystem',      desc: 'Веде по системі: СТАН → ЦІЛЬ → ВИБІР → ДІЯ.' },
  { icon: Target,     title: 'Колесо балансу', desc: 'Оцінка 8 сфер + персональний план дій.' },
  { icon: TrendingUp, title: 'Аналітика',      desc: 'Streak, стабільність, зливи — наочна картина.' },
  { icon: Calendar,   title: 'Щоденний цикл',  desc: 'Фіксуй стан і вибори кожного дня за 3 хв.' },
  { icon: Sparkles,   title: 'Персональний аналіз',   desc: 'Інсайти та звіти, сформовані на основі твоїх даних.' },
  { icon: Zap,        title: 'Zoom-сесії',     desc: 'Щотижневі групові зустрічі з ментором.' },
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
              className="landing-auth-surface feature-card-compact group transition-all duration-300 hover:-translate-y-1 hover:scale-[1.03]"
            >
              <div className="feature-icon">
                <f.icon className="h-7 w-7" />
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
