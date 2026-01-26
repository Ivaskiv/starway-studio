// frontend/src/constants/gamification.ts

// ============ BADGES ============
export const BADGES = {
  BEGINNER: {
    key: 'beginner',
    icon: '🎯',
    title: 'Початківець',
    description: 'Пройшов перше Колесо балансу',
    points: 10,
  },
  FIRST_VIDEO: {
    key: 'first_video',
    icon: '🎬',
    title: 'Перше відео',
    description: 'Переглянув перше відео',
    points: 5,
  },
  ALL_VIDEOS: {
    key: 'all_videos',
    icon: '🏆',
    title: '5 відео',
    description: 'Завершив всі 5 відео',
    points: 50,
  },
  WEEK_STREAK: {
    key: 'week_focus',
    icon: '🔥',
    title: '7-днів фокус',
    description: '7 днів без пропусків',
    points: 25,
  },
  CONSISTENT: {
    key: 'consistent',
    icon: '💎',
    title: 'Послідовний',
    description: '14 днів без пропусків',
    points: 40,
  },
  TRANSFORMER: {
    key: 'transformer',
    icon: '⭐',
    title: 'Перетворювач',
    description: '30 днів регулярності',
    points: 100,
  },
  AI_MASTER: {
    key: 'ai_power_user',
    icon: '🤖',
    title: 'AI Майстер',
    description: '50 AI взаємодій',
    points: 30,
  },
  WHEEL_GURU: {
    key: 'wheel_guru',
    icon: '🎡',
    title: 'Гуру балансу',
    description: 'Завершив Колесо балансу',
    points: 20,
  },
  WINNER: {
    key: 'winner',
    icon: '🏅',
    title: 'Переможець',
    description: '30%+ по річній цілі',
    points: 50,
  },
  ACHIEVER: {
    key: 'achiever',
    icon: '🎖️',
    title: 'Досягатор',
    description: '50% цілей виконано',
    points: 60,
  },
  MONTHLY_WARRIOR: {
    key: 'monthly_warrior',
    icon: '📊',
    title: 'Місячний воїн',
    description: '4 тижневі звіти поспіль',
    points: 75,
  },
} as const

// ============ PROGRESS LEVELS ============
export const PROGRESS_LEVELS = {
  NOVICE: { level: 1, name: 'Новачок', pointsRequired: 0, icon: '🌱', color: '#95a5a6' },
  APPRENTICE: { level: 2, name: 'Учень', pointsRequired: 50, icon: '📚', color: '#3498db' },
  PRACTITIONER: { level: 3, name: 'Практик', pointsRequired: 150, icon: '⚡', color: '#9b59b6' },
  EXPERT: { level: 4, name: 'Експерт', pointsRequired: 300, icon: '🔥', color: '#e67e22' },
  MASTER: { level: 5, name: 'Майстер', pointsRequired: 500, icon: '👑', color: '#f39c12' },
  LEGEND: { level: 6, name: 'Легенда', pointsRequired: 1000, icon: '💫', color: '#e74c3c' },
} as const

// ============ XP REWARDS ============
export const XP_REWARDS = {
  REGISTRATION: 10,
  VIDEO_COMPLETE: 5,
  AI_INTERACTION: 2,
  WHEEL_COMPLETE: 100,
  DAILY_SESSION: 50,
  TASK_COMPLETE: 10,
  GOAL_PROGRESS: 5,
  FUNNEL_COMPLETE: 50,
  STREAK_BONUS: 25,
} as const

// ============ LIFE SPHERES ============
export const LIFE_SPHERES = [
  { key: 'health', label: "Здоров'я та енергія", emoji: '❤️', color: 'from-red-500 to-pink-500' },
  { key: 'self_growth', label: 'Особистісний розвиток', emoji: '📚', color: 'from-blue-500 to-cyan-500' },
  { key: 'relationships', label: "Стосунки", emoji: '👥', color: 'from-pink-500 to-rose-500' },
  { key: 'career', label: "Кар'єра", emoji: '💼', color: 'from-amber-500 to-orange-500' },
  { key: 'finance', label: 'Фінанси', emoji: '💰', color: 'from-green-500 to-emerald-500' },
  { key: 'leisure', label: 'Дозвілля', emoji: '🎨', color: 'from-purple-500 to-violet-500' },
  { key: 'spirituality', label: 'Духовність', emoji: '🧘', color: 'from-indigo-500 to-purple-500' },
  { key: 'housing', label: 'Побут', emoji: '🏠', color: 'from-teal-500 to-cyan-500' },
] as const

// ============ SUBSCRIPTION PLANS ============
export const SUBSCRIPTION_PLANS = {
  TRIAL: { key: 'TRIAL', name: '🧪 Пробний період', price: 0, duration: 7, description: 'Повний доступ на 7 днів' },
  WEEK: { key: 'WEEK', name: 'Тиждень фокусу', price: 7, duration: 7, description: 'Для короткого фокусу' },
  MONTH: { key: 'MONTH', name: 'Місяць дії', price: 30, duration: 30, description: 'Глибинна робота' },
  YEAR: { key: 'YEAR', name: 'Рік трансформації', price: 300, duration: 365, description: 'Максимальна економія' },
} as const

// ============ HELPER FUNCTIONS ============
export const getLevelByXP = (xp: number) => {
  const levels = Object.values(PROGRESS_LEVELS).sort((a, b) => b.pointsRequired - a.pointsRequired)
  return levels.find(l => xp >= l.pointsRequired) || PROGRESS_LEVELS.NOVICE
}

export const getXPToNextLevel = (xp: number) => {
  const levels = Object.values(PROGRESS_LEVELS).sort((a, b) => a.pointsRequired - b.pointsRequired)
  const nextLevel = levels.find(l => l.pointsRequired > xp)
  return nextLevel ? nextLevel.pointsRequired - xp : 0
}