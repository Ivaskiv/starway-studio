import { Button, GlassCard } from '@/ui';
import { ROUTES } from '@/config/routes';
import { ModuleIntro } from '@/shared/components/ModuleIntro';
import { ModuleUsageCounter } from '@/shared/components/ModuleUsageCounter';
import { useSystemState } from '@/shared/access/hooks/useSystemState';
import {
  useAttachFunnelProductMutation,
  useDetachFunnelProductMutation,
  useGetAttachableProductsQuery,
  useGetFunnelByIdQuery,
  useUpdateFunnelMutation,
} from '../services/funnels.api';
import { ArrowLeft, CheckCircle2, Link2, Save, Unlink } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate, useParams } from 'react-router-dom';

const STATUSES: Array<'draft' | 'active' | 'archived'> = ['draft', 'active', 'archived'];

export default function FunnelEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data, isLoading, isError } = useGetFunnelByIdQuery(id || '', { skip: !id });
  const { data: availableData, isLoading: isAvailableLoading } = useGetAttachableProductsQuery(id || '', {
    skip: !id,
  });
  const [updateFunnel, updateState] = useUpdateFunnelMutation();
  const [attachProduct, attachState] = useAttachFunnelProductMutation();
  const [detachProduct, detachState] = useDetachFunnelProductMutation();

  const [name, setName] = useState('');
  const [status, setStatus] = useState<'draft' | 'active' | 'archived'>('draft');

  useEffect(() => {
    if (!data?.funnel) return;
    setName(data.funnel.name || '');
    setStatus((data.funnel.status as 'draft' | 'active' | 'archived') || 'draft');
  }, [data?.funnel]);

  const canSave = useMemo(() => name.trim().length >= 3 && !updateState.isLoading, [name, updateState.isLoading]);

  const handleSave = async () => {
    if (!id) return;
    if (!canSave) {
      toast.error('Вкажіть назву воронки (мін. 3 символи)');
      return;
    }

    try {
      await updateFunnel({ id, name: name.trim(), status }).unwrap();
      toast.success('Воронку оновлено');
    } catch {
      toast.error('Не вдалося оновити воронку');
    }
  };

  const handleAttach = async (productId: string) => {
    if (!id) return;
    try {
      await attachProduct({ id, productId }).unwrap();
      toast.success('Продукт підключено до воронки');
    } catch {
      toast.error('Не вдалося підключити продукт');
    }
  };

  const handleDetach = async (productId: string) => {
    if (!id) return;
    try {
      await detachProduct({ id, productId }).unwrap();
      toast.success('Продукт відключено від воронки');
    } catch {
      toast.error('Не вдалося відключити продукт');
    }
  };

  const { state, counts, getModuleAccess } = useSystemState();
  const aiFunnelAccess = getModuleAccess('AI_FUNNEL');
  const sampleDataRequired =
    counts.ownedProducts === 0 && counts.subscribedProducts === 0 && (data?.funnel?.products?.length ?? 0) === 0;

  if (isLoading) {
    return <div className="p-6 text-white/70">Завантаження воронки...</div>;
  }

  if (!id || isError || !data?.funnel) {
    return (
      <div className="p-6">
        <GlassCard className="p-6">
          <p className="text-white">Воронку не знайдено</p>
          <div className="mt-4">
            <Button className="btn bg-white/10 border-white/20 rounded-xl" onClick={() => navigate(ROUTES.AI_GENERATOR)}>
              <ArrowLeft className="w-4 h-4" />
              Повернутись в AI Generator
            </Button>
          </div>
        </GlassCard>
      </div>
    );
  }

  const introSteps = [
    '1. Перевірте роль та доступ (SuperAdmin може бачити все, користувач — лише свої продукти).',
    '2. Підключіть/відключіть продукти з урахуванням підписок по expertId.',
    '3. Збережіть назву й статус, щоб активувати AI Funnel у потоках.',
  ];
  const moduleIntroSteps = [
    `Рівень доступу: ${aiFunnelAccess.accessLevel} (${aiFunnelAccess.isLocked ? '🔒 замкнено' : 'розблоковано'})`,
    `Поточна підписка: ${state?.subscription?.status ?? 'ТРІАЛ / Вільний доступ'}`,
    `Шаблонів / продуктів: ${counts.templates} / ${counts.ownedProducts} / ${counts.subscribedProducts}`,
  ];
  const sampleFallback = (
    <GlassCard className="p-4 border border-white/10 bg-white/[0.03]">
      <p className="text-xs text-white/60 mb-2">Поки нічого не привʼязано</p>
      <p className="text-sm text-white/70">Після створення продукту він зʼявиться у списку, а цей компонент стане репрезентативним.</p>
    </GlassCard>
  );

  return (
    <div className="space-y-6 p-4 md:p-6">
      <ModuleIntro
        title="AI Воронка"
        description="Модуль працює строго по expertId, синхронізує підписки й шаблони, щоб ви бачили лише свої потоки."
        steps={introSteps}
      />
      <ModuleIntro
        title="Стан модулю"
        description="Інформація береться з useSystemState: доступ, підписка, шаблони та лічильники генерується тут."
        steps={moduleIntroSteps}
      />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <ModuleUsageCounter
          label="Підключені продукти"
          used={data.funnel.products?.length ?? 0}
          total={Math.max(1, (data.funnel.products?.length ?? 0) + (availableData?.products?.length ?? 0))}
        />
        <ModuleUsageCounter
          label="Доступні продукти"
          used={availableData?.products?.length ?? 0}
          total={Math.max(1, (availableData?.products?.length ?? 0) + (data.funnel.products?.length ?? 0))}
        />
        <ModuleUsageCounter label="Шаблони" used={counts.templates} total={Math.max(1, counts.templates)} />
      </div>

      <GlassCard className="p-6 md:p-8 space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/45 mb-1">Funnel view/edit</p>
            <h1 className="text-2xl font-semibold text-white">Редактор воронки</h1>
            <p className="text-sm text-white/55 mt-2">
              {/* fix code_x: dedicated funnel editor page by funnelId after AI Producer save flow. */}
              Тут можна одразу перевірити та відредагувати назву, статус і склад продуктів у воронці.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white/75">
            <CheckCircle2 className="w-4 h-4 text-emerald-300" />
            Code: {data.funnel.code}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="flex flex-col gap-2 text-sm text-white/80">
            <span>Назва воронки</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="glass-field h-11 rounded-xl"
              placeholder="Назва воронки"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm text-white/80">
            <span>Статус</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as 'draft' | 'active' | 'archived')}
              className="glass-field h-11 rounded-xl"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white mb-3">Продукти у воронці</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {data.funnel.products?.length ? (
              data.funnel.products.map((product) => (
                <div key={product.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-sm font-semibold text-white">{product.name}</p>
                  <p className="text-xs text-white/55 mt-1">{product.code}</p>
                  <p className="text-xs text-white/55 mt-1">
                    {(product.priceCents || 0) / 100} EUR
                  </p>
                  <div className="mt-3">
                    <Button
                      className="btn rounded-xl bg-white/10 border-white/20"
                      onClick={() => void handleDetach(product.id)}
                      disabled={detachState.isLoading}
                    >
                      <Unlink className="w-4 h-4" />
                      Відключити
                    </Button>
                  </div>
                </div>
              ))
          ) : (
            (data.funnel.products?.length ?? 0) === 0 && sampleDataRequired
              ? sampleFallback
              : (
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/65">
                  Продукти поки не привʼязані.
                </div>
              )
          )}
        </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white mb-3">Доступні продукти для підключення</h2>
          {isAvailableLoading ? (
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/65">
              Завантаження доступних продуктів...
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {availableData?.products?.length ? (
                availableData.products.map((product) => (
                  <div key={product.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                    <p className="text-sm font-semibold text-white">{product.name}</p>
                    <p className="text-xs text-white/55 mt-1">{product.code}</p>
                    <p className="text-xs text-white/55 mt-1">{(product.priceCents || 0) / 100} EUR</p>
                    <div className="mt-3">
                      {/* fix code_x: attach/detach controls directly in FunnelEditorPage for product relation management. */}
                      <Button
                        className="btn rounded-xl bg-[color:rgba(var(--accent-rgb),0.72)] border-[color:rgba(var(--accent-rgb),0.9)]"
                        onClick={() => void handleAttach(product.id)}
                        disabled={attachState.isLoading}
                      >
                        <Link2 className="w-4 h-4" />
                        Підключити
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/65">
                  Немає доступних продуктів для підключення.
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button className="btn rounded-xl bg-white/10 border-white/20" onClick={() => navigate(ROUTES.AI_GENERATOR)}>
            <ArrowLeft className="w-4 h-4" />
            До генератора
          </Button>
          <Button
            className="btn rounded-xl bg-[color:rgba(var(--accent-rgb),0.78)] border-[color:rgba(var(--accent-rgb),0.95)]"
            onClick={() => void handleSave()}
            disabled={!canSave}
          >
            <Save className="w-4 h-4" />
            Зберегти зміни
          </Button>
        </div>
      </GlassCard>
    </div>
  );
}
