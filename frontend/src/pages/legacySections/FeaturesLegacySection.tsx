import { Bot, TrendingUp, Zap } from 'lucide-react';
import { FeatureCard } from '../sections/cards';

export function FeaturesLegacySection() {
  return (
    <section className="py-16 px-6">
      <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-6">
        <FeatureCard
          icon={Zap}
          title="Швидке створення"
          description="Створюйте AI-курси за лічені хвилини"
          gradient="from-orange-500 to-red-500"
        />
        <FeatureCard
          icon={Bot}
          title="AI-асистент"
          description="Розумний помічник для вашого навчання"
          gradient="from-orange-500 to-red-500"
        />
        <FeatureCard
          icon={TrendingUp}
          title="Аналітика"
          description="Відстежуйте свій прогрес у реальному часі"
          gradient="from-green-500 to-emerald-500"
        />
      </div>
    </section>
  );
}
