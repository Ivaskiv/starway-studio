import { Star, Target, TrendingUp, Users } from 'lucide-react';
import { StatsCard } from '../sections/cards';

export function StatsLegacySection() {
  return (
    <section className="py-16 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">
            Платформа, якій <span className="text-orange-500">довіряють</span>
          </h2>
          <p className="text-slate-400">Наша спільнота росте щодня</p>
        </div>

        <div className="grid md:grid-cols-4 gap-6">
          <StatsCard value="1,247" label="Активних користувачів" icon={Users} />
          <StatsCard value="89%" label="Рівень задоволення" icon={Star} />
          <StatsCard value="247+" label="Створених курсів" icon={Target} />
          <StatsCard value="12.5K" label="Годин навчання" icon={TrendingUp} />
        </div>
      </div>
    </section>
  );
}
