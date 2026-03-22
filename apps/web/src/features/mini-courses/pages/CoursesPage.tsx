import { ROUTES } from '@/config/routes';
import { useAccess } from '@/features/auth/hooks/useAccess';
import type { CourseProduct } from '@/features/mini-courses/types/courses.types';
import { GlassCard } from '@/ui';
import { ArrowRight, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PRODUCTS: CourseProduct[] = [
  {
    id: 'leadmagnet',
    title: '5 точок опори',
    description: 'Безкоштовний практикум для знайомства з системою',
    price: 0,
    duration: null,
    tag: 'free',
    icon: '🎁',
    path: '/dashboard/leadmagnet',
  },
  {
    id: 'system-21',
    title: 'Система 21',
    description: 'Для подолання прокрастинації та відкладання',
    price: 33,
    duration: 21,
    tag: 'trial',
    icon: '🔥',
    path: '/dashboard/courses/system-21',
  },
  {
    id: 'fears',
    title: 'Страхи',
    description: 'Робота з блоками та внутрішніми страхами',
    price: 33,
    duration: 30,
    tag: 'paid',
    icon: '🛡️',
    path: '/dashboard/courses/fears',
  },
  {
    id: 'code-of-change',
    title: 'Код змін',
    description: 'Стратегія цілепокладання та планування',
    price: 33,
    duration: 30,
    tag: 'paid',
    icon: '🎯',
    path: '/dashboard/courses/code-of-change',
  },
  {
    id: 'state-mastery',
    title: 'Стан — ключ до успіху',
    description: 'Управління станом та енергією',
    price: 10,
    duration: 14,
    tag: 'paid',
    icon: '⚡',
    path: '/dashboard/courses/state-mastery',
  },
  {
    id: 'consultation',
    title: 'Консультація з Надею',
    description: 'Глибинний аналіз блоків + персональна стратегія',
    price: 150,
    duration: null,
    tag: 'paid',
    icon: '👥',
    path: null,
    cta: 'Записатись',
    ctaLink: 'https://t.me/Nadya2316',
  },
];

const getTagLabel = (product: CourseProduct) => {
  if (product.tag === 'free') return 'Безкоштовно';
  if (product.tag === 'trial') return 'Тріал';
  return `🔒 від ${product.price}€`;
};

const getTagClassName = (tag: CourseProduct['tag']) => {
  if (tag === 'free') {
    return 'border border-[color:rgba(34,197,94,0.35)] bg-[color:rgba(34,197,94,0.14)] text-[color:rgb(134,239,172)]';
  }

  if (tag === 'trial') {
    return 'border border-[color:rgba(var(--accent-rgb),0.35)] bg-[color:rgba(var(--accent-rgb),0.14)] text-[var(--accent)]';
  }

  return 'border border-[var(--border)] bg-[var(--bg-tertiary)] text-[var(--text-muted)]';
};

const formatDuration = (duration: number | null) => {
  if (!duration) return null;
  return `${duration} ${duration === 1 ? 'день' : duration < 5 ? 'дні' : 'днів'}`;
};

export default function CoursesPage() {
  const navigate = useNavigate();
  const { isPaid, isTrial } = useAccess();

  const isAccessible = (tag: CourseProduct['tag']) => {
    if (tag === 'free') return true;
    if (tag === 'trial') return isTrial || isPaid;
    return isPaid;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[var(--text-primary)]">Міні-курси</h1>
        <p className="mt-2 text-[var(--text-muted)]">
          Практичні програми з фокусом на стабільні результати та контроль прогресу.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {PRODUCTS.map(product => {
          const accessible = isAccessible(product.tag);
          const isExternal = Boolean(product.ctaLink);
          const durationLabel = formatDuration(product.duration);
          const primaryCta = product.tag === 'free'
            ? 'Розпочати безкоштовно'
            : product.tag === 'trial'
              ? (accessible ? 'Спробувати' : 'Відкрити доступ 🔒')
              : (accessible ? product.cta ?? 'Відкрити' : 'Відкрити доступ 🔒');

          const handleClick = () => {
            if (!accessible) {
              navigate(`${ROUTES.SUBSCRIPTION}?from=${encodeURIComponent(ROUTES.COURSES)}`);
              return;
            }

            if (product.path) {
              navigate(product.path);
            }
          };

          return (
            <GlassCard
              key={product.id}
              className={`border border-[var(--border)] p-5 ${accessible ? '' : 'opacity-80'}`}
            >
              <div className="flex items-start justify-between gap-3">
                <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${getTagClassName(product.tag)}`}>
                  {getTagLabel(product)}
                </span>
                {!accessible && <Lock className="mt-0.5 h-4 w-4 text-[var(--text-muted)]" />}
              </div>

              <div className="mt-4 flex items-start gap-3">
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-[var(--bg-tertiary)] text-xl">
                  {product.icon}
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold text-[var(--text-primary)]">{product.title}</h2>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">{product.description}</p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-[var(--text-muted)]">
                {durationLabel && (
                  <span className="rounded-lg bg-[var(--bg-tertiary)] px-2.5 py-1">
                    {durationLabel}
                  </span>
                )}
                {product.price > 0 && (
                  <span className="rounded-lg bg-[var(--bg-tertiary)] px-2.5 py-1">
                    {product.price}€
                  </span>
                )}
              </div>

              {isExternal && accessible && product.ctaLink ? (
                <a
                  href={product.ctaLink}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-medium text-white transition-all hover:brightness-110"
                >
                  {primaryCta}
                  <ArrowRight className="h-4 w-4" />
                </a>
              ) : (
                <button
                  type="button"
                  onClick={handleClick}
                  className={`mt-5 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                    accessible
                      ? 'bg-[var(--accent)] text-white hover:brightness-110'
                      : 'bg-[var(--bg-tertiary)] text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'
                  }`}
                >
                  {primaryCta}
                  <ArrowRight className="h-4 w-4" />
                </button>
              )}
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
}
