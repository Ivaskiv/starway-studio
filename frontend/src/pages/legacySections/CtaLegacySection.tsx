import { ArrowRight } from 'lucide-react';
import { Button } from '@/ui';
import { GlassCard } from '@/ui/GlassCard';

export function CtaLegacySection({ onGetStarted }: { onGetStarted: () => void }) {
  return (
    <section className="py-16 px-6">
      <div className="max-w-4xl mx-auto">
        <GlassCard className="p-12 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 via-transparent to-pink-500/10" />

          <div className="relative z-10">
            <h2 className="text-3xl font-bold mb-4">Готовий почати навчання?</h2>
            <p className="text-slate-400 mb-8">Приєднуйся до спільноти та почни свій шлях до змін вже сьогодні</p>
            <Button onClick={onGetStarted} data-color="orange" data-size="lg">
              Почати безкоштовно <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </GlassCard>
      </div>
    </section>
  );
}
