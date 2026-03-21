import { ROUTES } from '@/config/routes';
import { DEMO_TEMPLATES } from '@/features/ai-generator/utils/templates';
import { useAccess } from '@/features/auth/hooks/useAccess';
import { useSystemState } from '@/features/auth/hooks/useSystemState';
import { useGetMyProductsQuery } from '@/features/products/services/products.api';
import { ModuleIntro } from '@/shared/components/ModuleIntro';
import { ModuleUsageCounter } from '@/shared/components/ModuleUsageCounter';
import { GlassCard } from '@/ui';
import { ArrowRight, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ProductsPage() {
  const navigate = useNavigate();
  const { can, plan } = useAccess();
  const { data: myProducts = [] } = useGetMyProductsQuery();
  const { counts } = useSystemState();

  const createdProducts = myProducts;
  const subscribedProducts = myProducts.filter((p) => p.status === 'published');

  return (
    <div className="space-y-6">
      <ModuleIntro
        title="Кабінет продуктів"
        description="Керуйте створеними продуктами, підписками та шаблонами з єдиного джерела стану."
        steps={[
          '1. Перевірте ваші створені продукти.',
          '2. Відкрийте активні підписки або продовжіть прострочені.',
          '3. Запустіть створення через шаблон або форму продукту.',
        ]}
      />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <ModuleUsageCounter label="Мої продукти" used={counts.ownedProducts} total={Math.max(1, counts.ownedProducts || 1)} />
        <ModuleUsageCounter label="Підписки" used={counts.subscribedProducts} total={Math.max(1, counts.subscribedProducts || 1)} />
        <ModuleUsageCounter label="Шаблони" used={counts.templates} total={Math.max(1, counts.templates || 1)} />
      </div>
      <div>
        <button
          type="button"
          onClick={() => navigate(ROUTES.PRODUCT_CREATION)}
          className="rounded-lg px-4 py-2 text-sm font-medium bg-[color:rgba(var(--accent-rgb),0.22)] border border-[color:rgba(var(--accent-rgb),0.5)] text-white hover:bg-[color:rgba(var(--accent-rgb),0.3)]"
        >
          Create Product
        </button>
      </div>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-white">Мої продукти</h2>
        {createdProducts.length === 0 ? (
          <GlassCard className="p-5 text-white/70">Поки немає створених продуктів.</GlassCard>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {createdProducts.map((product) => {
              const status = plan === 'paid' ? 'paid' : plan === 'trial' ? 'trial' : 'locked';
              const isLocked = status === 'locked';
              return (
                <GlassCard key={product.id} className="p-6 border border-white/10">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        {product.title || product.name}
                        {isLocked && <Lock className="w-4 h-4 text-amber-300" />}
                      </h3>
                      <p className="text-white/60 mt-1">Тип: {product.type}</p>
                      <p className="text-white/60">Статус: {status}</p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <button
                      type="button"
                      disabled={isLocked}
                      onClick={() => navigate(ROUTES.AI_GENERATOR)}
                      className={`rounded-lg px-4 py-2 text-sm font-medium inline-flex items-center gap-2 ${
                        isLocked
                          ? 'bg-white/10 text-white/60 cursor-not-allowed'
                          : 'bg-orange-500 text-white hover:bg-orange-400'
                      }`}
                    >
                      {isLocked ? 'Оформити підписку' : 'Відкрити'}
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </GlassCard>
              );
            })}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-white">Мої підписки</h2>
        {subscribedProducts.length === 0 ? (
          <GlassCard className="p-5 text-white/70">Активних підписок немає.</GlassCard>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {subscribedProducts.map((product) => {
              const isExpired = plan === 'free';
              return (
                <GlassCard key={`sub-${product.id}`} className="p-6 border border-white/10">
                  <h3 className="text-lg font-semibold text-white">{product.title || product.name}</h3>
                  <p className="text-white/60 mt-1">Статус підписки: {isExpired ? 'expired' : 'active'}</p>
                  <p className="text-white/60">Дата завершення: {isExpired ? '—' : 'активна'}</p>
                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      disabled={isExpired}
                      className={`rounded-lg px-4 py-2 text-sm font-medium ${
                        isExpired ? 'bg-white/10 text-white/60 cursor-not-allowed' : 'bg-orange-500 text-white'
                      }`}
                    >
                      Дія
                    </button>
                    {isExpired && (
                      <button
                        type="button"
                        onClick={() => navigate(ROUTES.SUBSCRIPTION)}
                        className="rounded-lg px-4 py-2 text-sm font-medium bg-white/10 text-white hover:bg-white/20"
                      >
                        Продовжити підписку
                      </button>
                    )}
                  </div>
                </GlassCard>
              );
            })}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-white">Шаблони продуктів</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {DEMO_TEMPLATES.map((tpl) => {
            const createLocked = !(can('ai.basic' as any) || can('products.manage' as any));
            return (
              <GlassCard key={tpl.id} className="p-6 border border-white/10">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                      {tpl.name}
                      {createLocked && <Lock className="w-4 h-4 text-amber-300" />}
                    </h3>
                    <p className="text-white/65 mt-2">RESULT: {tpl.quickWin}</p>
                    <p className="text-white/60 mt-1">Модулі: A–G</p>
                    <p className="text-white/60 mt-1">Фінальний стан: {tpl.steps.upsell}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => navigate(createLocked ? ROUTES.SUBSCRIPTION : ROUTES.AI_GENERATOR)}
                  className={`mt-4 rounded-lg px-4 py-2 text-sm font-medium inline-flex items-center gap-2 ${
                    createLocked ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-orange-500 text-white'
                  }`}
                >
                  {createLocked ? 'Спробувати 7 днів' : 'Створити'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </GlassCard>
            );
          })}
        </div>
      </section>
    </div>
  );
}
