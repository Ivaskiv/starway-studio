/* ======================================================
  FUNNEL BLOCK TYPES
====================================================== */

export const BLOCK_TYPES = [
  {
    id: 'awareness',
    type: 'awareness',
    label: 'Обізнаність',
    icon: 'Users',
    color: 'from-blue-500 to-cyan-500',
    description: 'Перше знайомство з аудиторією',
  },
  {
    id: 'interest',
    type: 'interest',
    label: 'Інтерес',
    icon: 'Target',
    color: 'from-purple-500 to-pink-500',
    description: 'Виховування зацікавлення',
  },
  {
    id: 'decision',
    type: 'decision',
    label: 'Рішення',
    icon: 'TrendingUp',
    color: 'from-green-500 to-emerald-500',
    description: 'Підштовхування до покупки',
  },
  {
    id: 'action',
    type: 'action',
    label: 'Дія',
    icon: 'DollarSign',
    color: 'from-orange-500 to-red-500',
    description: 'Здійснення покупки',
  },
  {
    id: 'retention',
    type: 'retention',
    label: 'Утримання',
    icon: 'Gift',
    color: 'from-pink-500 to-rose-500',
    description: 'Повторні продажі',
  },
] as const;

export type BlockTypeId = (typeof BLOCK_TYPES)[number]['id'];

/* ======================================================
  CHANNELS
====================================================== */

export const CHANNELS = [
  { id: 'landing', label: '🌐 Landing Page', color: 'blue' },
  { id: 'telegram', label: '✈️ Telegram', color: 'cyan' },
  { id: 'email', label: '📧 Email', color: 'purple' },
  { id: 'payment', label: '💳 Payment', color: 'green' },
  { id: 'ai-mentor', label: '🤖 AI-ментор', color: 'orange' },
] as const;

export type ChannelId = (typeof CHANNELS)[number]['id'];
export type Channel = (typeof CHANNELS)[number];