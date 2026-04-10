export interface SubscriptionPlan {
  id: string
  name: string
  price: number
  period: string
  originalPrice?: number
  features: string[]
  badge?: string
  badgeColor?: 'blue' | 'purple' | 'amber'
  highlighted?: boolean
  description?: string
}

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'monthly',
    name: 'Місячна',
    price: 299,
    period: 'міс',
    badge: 'Популярний',
    badgeColor: 'blue',
    description: 'Для тих, хто хоче продовжити ABsystem без довгого зобовʼязання.',
    features: [
      'ABsystem без обмежень',
      'Всі курси та матеріали',
      'Щоденні сесії',
      'Telegram нагадування',
      'Статистика та аналітика',
    ],
  },
  {
    id: 'yearly',
    name: 'Річна',
    price: 199,
    period: 'міс',
    originalPrice: 299,
    highlighted: true,
    badge: 'Економія 33%',
    badgeColor: 'purple',
    description: 'Оптимальний варіант для системного ритму й стабільного росту весь рік.',
    features: [
      'Все з місячної підписки',
      'Пріоритетна підтримка',
      'Ранній доступ до нових курсів',
      'Ексклюзивні матеріали',
      'Знижка на наставництво',
    ],
  },
  {
    id: 'yearly_plus',
    name: 'Річна + Наставник',
    price: 499,
    period: 'міс',
    badge: 'Преміум',
    badgeColor: 'amber',
    description: 'Для тих, кому потрібен не тільки ABsystem, а й персональний супровід.',
    features: [
      'Все з річної підписки',
      'Особистий наставник',
      '4 Zoom-сесії на місяць',
      'Персональний план розвитку',
      'Прямий контакт у Telegram',
      'VIP чат спільноти',
    ],
  },
]

export const SUBSCRIPTION_BADGE_CLASS: Record<NonNullable<SubscriptionPlan['badgeColor']>, string> = {
  blue: 'border border-[rgba(var(--accent-rgb),0.16)] bg-[rgba(var(--accent-rgb),0.14)] text-[rgb(var(--accent-soft-rgb))]',
  purple: 'border border-[rgba(181,120,255,0.2)] bg-[rgba(181,120,255,0.14)] text-[#d9c3ff]',
  amber: 'border border-[rgba(255,188,102,0.2)] bg-[rgba(255,188,102,0.14)] text-[#ffd8a6]',
}
