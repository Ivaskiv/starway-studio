// frontend/src/features/landing/sections/FeaturesSection.tsx
import type { LucideIcon } from 'lucide-react';
import { Bot, Calendar, Sparkles, Target, TrendingUp, Zap } from 'lucide-react';
import { GlassCard } from '@/ui/GlassCard';

interface Feature {
  icon:  LucideIcon;
  title: string;
  desc:  string;
  g:     string;       // tailwind gradient classes
}

const FEATURES: Feature[] = [
  { icon: Bot,        title: 'AI Ментор',         desc: 'Веде по системі: СТАН → ЦІЛЬ → ВИБІР → ДІЯ.', g: 'from-orange-500 to-rose-500'   },
  { icon: Target,     title: 'Колесо балансу',    desc: 'Оцінка 6 сфер + персональний план дій від AI.', g: 'from-violet-500 to-purple-600'  },
  { icon: TrendingUp, title: 'Аналітика',          desc: 'Streak, стабільність, зливи — наочна картина.',  g: 'from-blue-500 to-cyan-500'      },
  { icon: Calendar,   title: 'Щоденний цикл',     desc: 'Фіксуй стан і вибори кожного дня за 3 хв.',     g: 'from-emerald-500 to-green-500'  },
  { icon: Sparkles,   title: 'AI Генератор',       desc: 'Автоматичні інсайти та звіти з твоїх даних.',   g: 'from-amber-500 to-orange-500'   },
  { icon: Zap,        title: 'Zoom-сесії',         desc: 'Щотижневі групові зустрічі з ментором.',         g: 'from-pink-500 to-rose-500'      },
];

export function FeaturesSection() {
  return (
    <section className="py-24 px-5 sm:px-8 bg-gradient-to-b from-transparent via-slate-950/20 to-transparent">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-black mb-4 text-white">
            Все для <span className="text-orange-500">трансформації</span>
          </h2>
          <p className="text-xl text-white/45">Потужні інструменти в одній екосистемі</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map(f => (
            <GlassCard
              key={f.title}
              className="p-7 group hover:scale-[1.03] hover:-translate-y-1 transition-all duration-300"
            >
              <div className={`
                w-14 h-14 rounded-2xl bg-gradient-to-br ${f.g}
                flex items-center justify-center mb-5
                group-hover:scale-110 transition-transform duration-300
                shadow-lg
              `}>
                <f.icon className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2 group-hover:text-orange-400 transition-colors">
                {f.title}
              </h3>
              <p className="text-white/50 text-sm leading-relaxed">{f.desc}</p>
            </GlassCard>
          ))}
        </div>
      </div>
    </section>
  );
}