import { NotificationEvent } from '../../services/notifications/NotificationEvent.js'

type NotificationTemplateKey = NotificationEvent | 'MISSED_DAY_CATCHUP'

type NotificationContext = {
  userName?: string
  streakDays?: number
  tasksLeft?: number
  daysUntilExpiry?: number
  weakSphere?: string
  dayNumber?: number
  level?: number
  nextLevel?: string
  xpLeft?: number
  wheels?: number
  sessions?: number
  previousPlan?: string
}

export interface NotificationContent {
  title: string
  body: string
  ctaText?: string
  ctaUrl?: string
}

function pluralizeDays(value: number) {
  if (value === 1) return 'день'
  if (value >= 2 && value <= 4) return 'дні'
  return 'днів'
}

export function buildNotificationContent(
  type: NotificationTemplateKey,
  ctx: NotificationContext = {},
): NotificationContent {
  const userName = ctx.userName?.trim() || 'Привіт'

  switch (type) {
    case NotificationEvent.DAILY_MORNING_DUE:
      return {
        title: '🌅 Ранкова рефлексія',
        body: `${userName}, час зафіксувати стан і задати фокус на день. Обери, де зручно продовжити.`,
      }
    case NotificationEvent.DAILY_EVENING_DUE:
      return {
        title: '🌙 Вечірній підсумок',
        body: `${userName}, одна коротка сесія зараз збере день в систему і підтримає ритм. Обери, де зручно відповісти.`,
      }
    case NotificationEvent.STREAK_RISK:
      return {
        title: '⚡ Стрік під загрозою',
        body: `${userName}, стрік ${ctx.streakDays ?? 0} днів під загрозою. Зайди в Starway, щоб не втратити ритм.`,
      }
    case NotificationEvent.STREAK_BROKEN:
      return {
        title: '💔 Стрік перервався',
        body: 'Серія перервалася, але ритм можна повернути. Почни з однієї короткої дії сьогодні.',
      }
    case 'MISSED_DAY_CATCHUP':
      return {
        title: '⏰ Є ще час надолужити',
        body: `День ${ctx.dayNumber ?? 'вчора'} ще можна завершити. Вікно закриється о 23:59.`,
        ctaText: 'Відкрити вчорашній день',
        ctaUrl: '/dashboard/cycle?date=yesterday',
      }
    case NotificationEvent.WEEKLY_SUMMARY:
      return {
        title: '📚 Тижневий підсумок',
        body: `Стрік: ${ctx.streakDays ?? 0} · Колесо: ${ctx.wheels ?? 0} · Сесії: ${ctx.sessions ?? 0}. Подивись звіти, щоб зрозуміти динаміку за 7 днів і вирішити, який крок робити далі.`,
      }
    case NotificationEvent.SUBSCRIPTION_EXPIRING: {
      const daysLeft = ctx.daysUntilExpiry ?? 0
      return {
        title: '💎 Підписка',
        body: daysLeft > 0
          ? `До завершення підписки залишилось ${daysLeft} ${pluralizeDays(daysLeft)}. Перевір доступ зараз, щоб не втратити прогрес, історію і сесії.`
          : 'Перевір підписку зараз, щоб не втратити прогрес, історію і сесії.',
      }
    }
    case NotificationEvent.SUBSCRIPTION_EXPIRED: {
      const previousPlan = ctx.previousPlan ?? 'trial'
      return {
        title: previousPlan === 'trial' ? '💎 Тріал завершився' : '💎 Доступ завершився',
        body: previousPlan === 'trial'
          ? `${userName}, пробний період завершився. Історія збережена, а доступ можна відновити у будь-який момент.`
          : `${userName}, твій доступ завершився. Історія збережена, а доступ можна відновити у будь-який момент.`,
      }
    }
    case NotificationEvent.LEVEL_UP:
      return {
        title: '🌟 Новий рівень',
        body: ctx.level
          ? `Рівень ${ctx.level} відкрито. Твій прогрес зафіксований, відкрий кабінет і подивись що вже доступно.`
          : 'Твій новий рівень уже відкритий. Подивись що стало доступно.',
      }
    case NotificationEvent.NEAR_LEVEL_UP:
      return {
        title: '⚡ Майже новий рівень',
        body: `${userName}, до рівня ${ctx.nextLevel ?? ''} залишилось лише ${ctx.xpLeft ?? 0} XP. Одна дія — і ти там.`,
      }
    case NotificationEvent.AI_INACTIVE:
      return {
        title: '✦ Повернись в ABsystem',
        body: 'Ти давно не поверталась до ABsystem. Обери, де зручно продовжити далі.',
      }
    case NotificationEvent.POST_TRIAL_REPORTS:
      return {
        title: '📊 Твій рух за 7 днів',
        body: `Стрік: ${ctx.streakDays ?? 0} · Колесо: ${ctx.wheels ?? 0} · Сесії: ${ctx.sessions ?? 0}. У звітах ти побачиш що вже зібрано, що зараз на паузі і що повернеться після активації доступу.`,
      }
    default:
      return {
        title: 'Starway',
        body: 'У тебе нове повідомлення.',
      }
  }
}
