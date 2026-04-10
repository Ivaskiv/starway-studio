import { ROUTES } from '@/config/routes';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useSmartNavigation } from '@/hooks/useSmartNavigation';
import { useMemo, useState } from 'react';

export type Audience = 'user' | 'owner';

type AudienceModeSectionProps = {
  onAuthRequired: () => void;
};

const USER_POINTS = [
  'Проходиш практикум 5 днів з чіткими щоденними кроками',
  'Отримуєш аналіз, прогрес, PDF-звіти та Telegram-нагадування',
  'Працюєш у miniapp без зайвих налаштувань і складних сценаріїв',
] as const;

const OWNER_POINTS = [
  'Створюєш і публікуєш свої продукти в єдиному каталозі',
  'Керуєш аналітикою, гейміфікацією та навчальним контентом',
  'Підключаєш Telegram bot-flow і miniapp для своїх клієнтів',
] as const;

export default function AudienceModeSection({ onAuthRequired }: AudienceModeSectionProps) {
  const { user } = useAuth();
  const { navigateTo } = useSmartNavigation();
  const [audience, setAudience] = useState<Audience>('user');

  const isOwner = user?.isAdmin || user?.isSuperAdmin || user?.role === 'EXPERT';
  const isSuperAdmin = user?.isSuperAdmin === true;

  const headline = useMemo(() => {
    if (audience === 'owner') return 'Створи свій продукт і масштабуй через систему Starway';
    return '5 днів, щоб змінити основу щоденних рішень';
  }, [audience]);

  const onStart = (target: Audience) => {
    if (!user) {
      onAuthRequired();
      return;
    }

    if (target === 'owner') {
      navigateTo(ROUTES.PRODUCTS, { requiresAuth: true });
      return;
    }

    navigateTo(ROUTES.PRODUCTS, { requiresAuth: true });
  };

  return (
    <section className="max-w-6xl mx-auto px-4 pb-14 md:pb-20">
      <div className="glass-card rounded-3xl p-6 md:p-10 border border-white/15">
        <p className="text-xs uppercase tracking-[0.22em] text-white/55 mb-4">Starway Studio</p>
        <h2 className="text-3xl md:text-5xl font-semibold leading-tight max-w-4xl">{headline}</h2>
        <p className="text-white/70 mt-4 max-w-2xl text-base md:text-lg">
          Обери свій режим роботи. Інтерфейс і сценарії далі будуть адаптовані під роль.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setAudience('user')}
            className={`btn px-5 py-2.5 rounded-xl ${
              audience === 'user'
                ? 'bg-[color:rgba(var(--accent-rgb),0.72)] border-[color:rgba(var(--accent-rgb),0.9)]'
                : 'bg-white/5 border-white/15'
            }`}
          >
            Я користувач продукту
          </button>
          <button
            type="button"
            onClick={() => setAudience('owner')}
            className={`btn px-5 py-2.5 rounded-xl ${
              audience === 'owner'
                ? 'bg-[color:rgba(var(--accent-rgb),0.72)] border-[color:rgba(var(--accent-rgb),0.9)]'
                : 'bg-white/5 border-white/15'
            }`}
          >
            Я власник продукту
          </button>
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-5">
          <article className="glass-card rounded-3xl p-6 border border-white/15">
            <h3 className="text-xl md:text-2xl font-semibold mb-3">Сценарій користувача</h3>
            <ul className="space-y-2 text-white/75">
              {USER_POINTS.map((item) => (
                <li key={item} className="leading-relaxed">
                  {item}
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => onStart('user')}
              className="btn mt-6 w-full justify-center rounded-xl bg-[color:rgba(var(--accent-rgb),0.72)] border-[color:rgba(var(--accent-rgb),0.9)]"
            >
              Почати як користувач
            </button>
          </article>

          <article className="glass-card rounded-3xl p-6 border border-white/15">
            <h3 className="text-xl md:text-2xl font-semibold mb-3">Сценарій власника</h3>
            <ul className="space-y-2 text-white/75">
              {OWNER_POINTS.map((item) => (
                <li key={item} className="leading-relaxed">
                  {item}
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => onStart('owner')}
              className="btn mt-6 w-full justify-center rounded-xl bg-white/10 border-white/20"
            >
              Почати як власник
            </button>
          </article>
        </div>

        {audience === 'owner' && (
          <div className="mt-6 glass-card rounded-3xl p-6 border border-white/15">
            <h4 className="text-xl font-semibold mb-3">11 кроків створення системи</h4>
            <p className="text-white/70 leading-relaxed">
              Продукт → контент → колесо балансу → аналіз стану → звіти → Telegram → miniapp →
              гейміфікація. Вся основна робота зібрана навколо core-модулів платформи.
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => onStart('owner')}
                className="btn rounded-xl bg-[color:rgba(var(--accent-rgb),0.72)] border-[color:rgba(var(--accent-rgb),0.9)]"
              >
                Відкрити продукти
              </button>
              <button
                type="button"
                onClick={() => navigateTo(ROUTES.SUBSCRIPTION, { requiresAuth: true })}
                className="btn rounded-xl bg-white/10 border-white/20"
              >
                Переглянути тарифи
              </button>
            </div>

            {!isOwner && (
              <p className="text-xs text-amber-300/80 mt-4">
                Доступ власника відкривається після авторизації і активації відповідного плану.
              </p>
            )}
            {isSuperAdmin && (
              <p className="text-xs text-emerald-300/80 mt-4">
                Superadmin mode: повний доступ до всіх модулів і сценаріїв.
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
