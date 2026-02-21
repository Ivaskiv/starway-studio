import { ROUTES } from '@/config/routes';
import { useAccess } from '@/features/auth/hooks/useAccess';
import { GlassCard } from '@/ui';
import { ArrowRight, Lock, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

type ProductCard = {
  id: string;
  title: string;
  description: string;
  ability?: string;
  route: string;
  info: string;
};

const PRODUCTS: ProductCard[] = [
  {
    id: 'core',
    title: 'AI Ментор',
    description: 'Персональний щоденний супровід і розбір рішень.',
    ability: 'mentor.core',
    route: ROUTES.AI_MENTOR,
    info: 'Доступ включає чат, щоденні практики та рекомендації.',
  },
  {
    id: 'goals',
    title: 'Цілі та дії',
    description: 'Постановка цілей, план дій та аналітика виконання.',
    ability: 'mentor.goals',
    route: ROUTES.GOALS,
    info: 'Premium модуль для детального планування та контролю прогресу.',
  },
  {
    id: 'courses',
    title: 'Міні-курси',
    description: 'Структуровані програми навчання та практичні завдання.',
    ability: 'products.manage',
    route: ROUTES.COURSES,
    info: 'Після підписки відкривається весь каталог курсів.',
  },
  {
    id: 'zoom',
    title: 'Zoom-сесії',
    description: 'Живі сесії та поглиблена робота з ментором.',
    ability: 'mentor.zoom',
    route: ROUTES.ZOOM,
    info: 'Модуль доступний за активною підпискою.',
  },
];

export default function ProductsPage() {
  const navigate = useNavigate();
  const { can } = useAccess();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Продукти</h1>
        <p className="text-white/60 mt-2">
          Активні модулі відкриваються одразу. Заблоковані доступні для перегляду опису та підписки.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {PRODUCTS.map((product) => {
          const isLocked = product.ability ? !can(product.ability as any) : false;
          return (
            <GlassCard
              key={product.id}
              className={`p-6 border transition-all ${
                isLocked ? 'border-white/10 opacity-75' : 'border-[color:rgba(var(--accent-rgb),0.35)]'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                    {product.title}
                    {isLocked && <Lock className="w-4 h-4 text-amber-300" />}
                  </h2>
                  <p className="text-white/65 mt-2">{product.description}</p>
                </div>
                {!isLocked && <Sparkles className="w-5 h-5 text-orange-400" />}
              </div>

              <p className="text-sm text-white/45 mt-4">{product.info}</p>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() =>
                    navigate(isLocked ? `${ROUTES.SUBSCRIPTION}?from=${encodeURIComponent(product.route)}` : product.route)
                  }
                  className={`rounded-lg px-4 py-2 text-sm font-medium inline-flex items-center gap-2 ${
                    isLocked
                      ? 'bg-white/10 text-white hover:bg-white/20'
                      : 'bg-orange-500 text-white hover:bg-orange-400'
                  }`}
                >
                  {isLocked ? 'Оформити підписку' : 'Відкрити модуль'}
                  <ArrowRight className="w-4 h-4" />
                </button>

                {isLocked && (
                  <button
                    type="button"
                    onClick={() => navigate(product.route)}
                    className="rounded-lg border border-white/20 bg-transparent px-4 py-2 text-sm font-medium text-white/80 hover:bg-white/5"
                  >
                    Детальніше
                  </button>
                )}
              </div>
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
}
