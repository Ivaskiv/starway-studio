import { Button } from '@/ui';
import { GlassCard } from '@/ui/GlassCard';
import { Calendar, Play, Star } from 'lucide-react';

export function HeroLegacySection({
  isAuthed,
  onStartAI,
  onCycle,
}: {
  isAuthed: boolean;
  onStartAI: () => void;
  onCycle: () => void;
}) {
  return (
    <section className="pt-24 pb-16 px-6 text-center relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <div className="max-w-3xl mx-auto space-y-6 relative z-10">
        <GlassCard className="inline-flex items-center px-4 py-2 rounded-full">
          <Star className="w-4 h-4 text-orange-400 mr-2" />
          <span className="text-sm font-medium">Нова ера онлайн-освіти</span>
        </GlassCard>

        <h1 className="text-5xl font-bold">
          Вітаємо в{' '}
          <span className="bg-gradient-to-r from-orange-500 to-pink-500 bg-clip-text text-transparent">AI-Ментор</span>
        </h1>

        <p className="text-lg text-slate-400">
          Автоматизована екосистема для досягнення ваших цілей через ясність, рішучість та дії
        </p>

        <div className="flex gap-4 justify-center pt-4 flex-wrap">
          <Button onClick={onStartAI} data-color="orange" data-size="lg">
            <Play className="w-5 h-5 mr-2" /> Почати з AI
          </Button>
          <Button data-size="lg" className="glass-card" onClick={onCycle}>
            <Calendar className="w-5 h-5 mr-2" /> Заповнити щоденний цикл
          </Button>
        </div>

        {!isAuthed ? <p className="text-xs text-white/45">Для персонального режиму увійдіть в акаунт.</p> : null}
      </div>
    </section>
  );
}
