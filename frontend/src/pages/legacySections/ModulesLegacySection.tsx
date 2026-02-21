import type { User } from '@/features/user/types/user.types';
import { ModuleCard } from '../sections/cards';

export function ModulesLegacySection({
  user,
  onWheel,
  onCycle,
  onAIMentor,
  onProgress,
}: {
  user: User;
  onWheel: () => void;
  onCycle: () => void;
  onAIMentor: () => void;
  onProgress: () => void;
}) {
  return (
    <section className="py-16 px-6 bg-gradient-to-b from-transparent to-slate-950/50">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">
            Ваші <span className="text-orange-500">модулі</span>
          </h2>
          <p className="text-slate-400">Почніть свій шлях до змін</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <ModuleCard
            icon="⚖️"
            title="Колесо балансу"
            description="Оцініть 6 сфер життя: гроші, реалізація, відносини, енергія/тіло, свобода/час, внутрішня опора."
            badge="Доступно"
            badgeColor="green"
            time="5-7 хвилин"
            frequency="1 раз на місяць"
            requiresPaid={false}
            user={user}
            onClick={onWheel}
          />

          <ModuleCard
            icon="📝"
            title="Щоденний цикл"
            description="Щоденна фіксація стану, зливів та виборів. Основа для відстеження вашого прогресу."
            badge="Щодня"
            badgeColor="blue"
            time="3-5 хвилин"
            frequency="Щодня"
            requiresPaid={false}
            user={user}
            onClick={onCycle}
          />

          <ModuleCard
            icon="🤖"
            title="AI Ментор"
            description="Інтелектуальний асистент, що веде вас по системі: СТАН → ЦІЛЬ → ВИБІР → РІШЕННЯ → ДІЯ"
            badge="Доступно"
            badgeColor="green"
            requiresPaid={false}
            user={user}
            onClick={onAIMentor}
          />

          <ModuleCard
            icon="🎯"
            title="Бачення життя + Головна ціль"
            description="Визначте як ви хочете жити, що більше не є нормою та ваша точка Б."
            badge="Paid"
            badgeColor="locked"
            requiresPaid={true}
            user={user}
            onClick={() => undefined}
          />

          <ModuleCard
            icon="🎬"
            title="Zoom-сесії"
            description="Щотижневі групові зустрічі з аналізом ваших запитів та колективним рішенням."
            badge="Paid"
            badgeColor="locked"
            requiresPaid={true}
            user={user}
            onClick={() => undefined}
          />

          <ModuleCard
            icon="📊"
            title="Аналітика"
            description="Детальна статистика вашого прогресу, графіки розвитку та історія досягнень."
            badge="Доступно"
            badgeColor="green"
            requiresPaid={false}
            user={user}
            onClick={onProgress}
          />
        </div>
      </div>
    </section>
  );
}
