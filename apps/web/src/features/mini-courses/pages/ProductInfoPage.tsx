import { ROUTES } from '@/config/routes'
import { ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'

type ProductInfo = {
  slug: string
  icon: string
  title: string
  subtitle: string
  description: string
  includes: string[]
  result: string
  primaryLabel: string
  primaryHref: string
  secondaryLabel?: string
  secondaryHref?: string
}

const PRODUCT_INFO: Record<string, ProductInfo> = {
  'ai-mentor': {
    slug: 'ai-mentor',
    icon: '🤖',
    title: 'AI Ментор',
    subtitle: 'Персональна система щоденної підтримки',
    description:
      'Щоденні сесії, AI аналіз, мікрозавдання, колесо балансу і структура, яка веде від стану до конкретного результату.',
    includes: [
      'Ранкові питання і вечірня рефлексія',
      'AI аналіз поточного стану',
      'Мікрозавдання на день',
      'Колесо балансу і короткі звіти',
    ],
    result: 'Ти не просто “розумієш себе”, а рухаєшся по системі і бачиш зміну в дії.',
    primaryLabel: 'Спробувати 7 днів',
    primaryHref: ROUTES.AI_MENTOR,
    secondaryLabel: 'Переглянути підписку',
    secondaryHref: ROUTES.SUBSCRIPTION,
  },
  'five-points': {
    slug: 'five-points',
    icon: '🎁',
    title: '5 точок опори',
    subtitle: 'Безкоштовний практикум-знайомство',
    description:
      'Короткий вхід у систему Starway: зрозуміти свій стан, знайти точку опори і побачити, де саме зараз розрив.',
    includes: [
      'Стартова діагностика',
      'Практичні кроки без перевантаження',
      'Фокус на реальному стані, а не теорії',
      'Підготовка до глибшої роботи з AI Ментором',
    ],
    result: 'Після проходження є ясність, з чим саме працювати далі.',
    primaryLabel: 'Відкрити практикум',
    primaryHref: ROUTES.COURSES,
    secondaryLabel: 'До каталогу продуктів',
    secondaryHref: ROUTES.COURSES,
  },
  'system-21': {
    slug: 'system-21',
    icon: '🔥',
    title: 'Система 21',
    subtitle: '21 день для виходу з відкладання',
    description:
      'Програма для тих, хто застряг у прокрастинації, втрачає темп або постійно відкладає важливі рішення.',
    includes: [
      'Послідовний маршрут на 21 день',
      'Робота з внутрішнім опором',
      'Ритм дій без хаосу',
      'Фокус на відновленні стабільності',
    ],
    result: 'Менше відкладання, більше руху і відчуття контролю над своїм днем.',
    primaryLabel: 'Відкрити продукт',
    primaryHref: ROUTES.COURSES,
    secondaryLabel: 'Підписка',
    secondaryHref: ROUTES.SUBSCRIPTION,
  },
  'fears': {
    slug: 'fears',
    icon: '🛡️',
    title: 'Страхи',
    subtitle: 'Робота з блоками і внутрішніми реакціями',
    description:
      'Продукт для роботи зі страхом помилки, відмови, сорому, сумнівів і внутрішнім стопом перед дією.',
    includes: [
      'Розбір тригерів і реакцій',
      'Переупаковка обмежуючих програм',
      'Практики для повернення в силу',
      'Рух від страху до ясного рішення',
    ],
    result: 'Страх перестає керувати вибором, і з’являється внутрішня опора.',
    primaryLabel: 'Відкрити продукт',
    primaryHref: ROUTES.COURSES,
    secondaryLabel: 'Підписка',
    secondaryHref: ROUTES.SUBSCRIPTION,
  },
  'code-of-change': {
    slug: 'code-of-change',
    icon: '🎯',
    title: 'Код змін',
    subtitle: 'Стратегія переходу в нову точку',
    description:
      'Програма для тих, хто хоче не просто хотіти змін, а зафіксувати нову траєкторію і пройти її системно.',
    includes: [
      'Структура цілі і точки Б',
      'Рішення без розмиття',
      'Робота з внутрішнім саботажем',
      'План переходу в новий стан',
    ],
    result: 'Зміни стають не “ідеєю”, а керованим маршрутом.',
    primaryLabel: 'Відкрити продукт',
    primaryHref: ROUTES.COURSES,
    secondaryLabel: 'Підписка',
    secondaryHref: ROUTES.SUBSCRIPTION,
  },
  'state-mastery': {
    slug: 'state-mastery',
    icon: '⚡',
    title: 'Стан — ключ до успіху',
    subtitle: 'Керування енергією та внутрішнім ресурсом',
    description:
      'Продукт про те, як не жити на зливі енергії, а навчитися входити в ресурсний стан і утримувати його.',
    includes: [
      'Практики на відновлення енергії',
      'Робота зі станом до дії',
      'Повернення в опору після просідання',
      'Фокус на стабільності, а не ривках',
    ],
    result: 'Більше стійкості, ясності і дій з сили, а не з виснаження.',
    primaryLabel: 'Відкрити продукт',
    primaryHref: ROUTES.COURSES,
    secondaryLabel: 'Підписка',
    secondaryHref: ROUTES.SUBSCRIPTION,
  },
  'consultation': {
    slug: 'consultation',
    icon: '👥',
    title: 'Консультація з Надею',
    subtitle: 'Персональний розбір і стратегія',
    description:
      'Формат для тих, кому потрібен індивідуальний розбір, виявлення вузького місця і наступний точний крок.',
    includes: [
      'Персональний аналіз запиту',
      'Виявлення головного блоку',
      'Стратегія руху далі',
      'Пряма взаємодія з Надею',
    ],
    result: 'Замість розпорошення ти отримуєш точний пріоритет і план наступної дії.',
    primaryLabel: 'Написати в Telegram',
    primaryHref: 'https://t.me/Nadya2316',
    secondaryLabel: 'Підписка',
    secondaryHref: ROUTES.SUBSCRIPTION,
  },
}

export default function ProductInfoPage() {
  const { slug } = useParams<{ slug: string }>()
  const product = slug ? PRODUCT_INFO[slug] : null

  if (!product) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--bg-secondary)] p-8 text-center">
          <p className="text-sm text-[var(--text-muted)]">Продукт не знайдено</p>
          <Link
            to={ROUTES.COURSES}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-white transition-all hover:brightness-110"
          >
            До каталогу
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    )
  }

  const isExternal = product.primaryHref.startsWith('http')

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-4">
        <Link
          to={ROUTES.HOME}
          className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Назад
        </Link>
      </div>

      <div className="overflow-hidden rounded-[28px] border border-[var(--border)] bg-[linear-gradient(180deg,rgba(var(--accent-rgb),0.10),rgba(255,255,255,0.02))] shadow-[0_18px_50px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.08)]">
        <div className="border-b border-[rgba(255,255,255,0.06)] p-7">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[rgba(255,255,255,0.05)] text-3xl shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
              {product.icon}
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--accent)]">
                Продукт Starway
              </p>
              <h1 className="mt-1 text-3xl font-bold text-[var(--text-primary)]">
                {product.title}
              </h1>
              <p className="mt-2 text-base text-[var(--text-secondary)]">
                {product.subtitle}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 p-7 md:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent)]">
                Для чого
              </p>
              <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">
                {product.description}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent)]">
                Що всередині
              </p>
              <div className="mt-3 space-y-2">
                {product.includes.map(item => (
                  <div
                    key={item}
                    className="flex items-start gap-2 rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-3"
                  >
                    <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--accent)]" />
                    <p className="text-sm text-[var(--text-primary)]">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-3xl border border-[rgba(var(--accent-rgb),0.18)] bg-[rgba(var(--accent-rgb),0.08)] p-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent)]">
                Який результат
              </p>
              <p className="mt-2 text-sm leading-relaxed text-[var(--text-primary)]">
                {product.result}
              </p>
            </div>

            <div className="rounded-3xl border border-[var(--border)] bg-[var(--bg-secondary)] p-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent)]">
                Наступний крок
              </p>
              <div className="mt-4 space-y-3">
                {isExternal ? (
                  <a
                    href={product.primaryHref}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-medium text-white transition-all hover:brightness-110"
                  >
                    {product.primaryLabel}
                    <ArrowRight className="h-4 w-4" />
                  </a>
                ) : (
                  <Link
                    to={product.primaryHref}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-medium text-white transition-all hover:brightness-110"
                  >
                    {product.primaryLabel}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                )}

                {product.secondaryHref && product.secondaryLabel && (
                  <Link
                    to={product.secondaryHref}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-3 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--glass-bg-hover)]"
                  >
                    {product.secondaryLabel}
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
