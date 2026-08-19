import { NotificationEvent } from '../../services/notifications/NotificationEvent.js'
import { absystemContent } from '@/products/absystem/config/content.js'
export type { AbTestFollowupTimerId } from '@/products/ab-system/content/abTest.followups.js'
import { resolveAbTestFollowupCopy, type AbTestFollowupTimerId } from '@/products/ab-system/content/abTest.followups.js'
import type { AbTestResultKey, TestDriveContentVersion } from '@/products/ab-system/content/abTest.results.js'

type NotificationTemplateKey = NotificationEvent | 'MISSED_DAY_CATCHUP' | AbTestFollowupTimerId

type NotificationContext = {
  userName?: string
  resultKey?: AbTestResultKey | null
  contentVersion?: TestDriveContentVersion
  streakDays?: number
  tasksLeft?: number
  daysUntilExpiry?: number
  paymentUrl?: string | null
  renewalUrl?: string | null
  weakSphere?: string
  dayNumber?: number
  level?: number
  nextLevel?: string
  xpLeft?: number
  wheels?: number
  sessions?: number
  previousPlan?: string
  comebackKey?: string | null
  lastAction?: string | null
  dailyCycles?: number
  decisions?: number
  referralUrl?: string | null
}

export interface NotificationContent {
  title: string
  body: string
  ctaText?: string
  ctaUrl?: string
}

export function buildNotificationContent(
  type: NotificationTemplateKey,
  ctx: NotificationContext = {},
): NotificationContent {
  const userName = ctx.userName?.trim() || 'Привіт'

  switch (type) {
    case NotificationEvent.DAILY_MORNING_DUE:
      return {
        title: '🌅 Твій фокус',
        body: `${userName}, твій фокус на зараз — один короткий крок, який займе близько 2 хвилин. Продовж у Telegram або повернись у систему.`,
        ctaText: 'Відкрити систему',
        ctaUrl: '/dashboard?from=tg&step=cycle',
      }
    case NotificationEvent.DAILY_EVENING_DUE:
      return {
        title: '🌙 Що було найцінніше сьогодні?',
        body: `${userName}, коротка вечірня відповідь зараз збере день в систему і підтримає твій ритм без хаосу.`,
        ctaText: 'Завершити день',
        ctaUrl: '/dashboard?from=tg&step=cycle',
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
      const billing = absystemContent.BILLING.SUB_EXPIRING
      return {
        title: '💎 Підписка',
        body: billing.text,
        ctaText: billing.cta,
        ctaUrl: ctx.renewalUrl ?? ctx.paymentUrl ?? undefined,
      }
    }
    case NotificationEvent.SUBSCRIPTION_EXPIRED: {
      const billing = absystemContent.BILLING.SUB_EXPIRED
      return {
        title: '💎 Доступ завершився',
        body: billing.text,
        ctaText: billing.cta,
        ctaUrl: ctx.renewalUrl ?? ctx.paymentUrl ?? undefined,
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
        body: 'Ти давно не поверталась до ABsystem. Повернись у ритм там, де зручно продовжити далі.',
      }
    case NotificationEvent.ABSYSTEM_COMEBACK: {
      const comebackKey = ctx.comebackKey ?? 'GAP_1_3'
      if (typeof comebackKey === 'string' && comebackKey.startsWith('WINBACK_')) {
        const flow = absystemContent.WINBACK[comebackKey as keyof typeof absystemContent.WINBACK]
        const resolved = typeof flow === 'function'
          ? flow(Number(ctx.dailyCycles ?? 0), Number(ctx.decisions ?? 0))
          : flow

        return {
          title: resolved.title,
          body: resolved.text,
          ctaText: resolved.cta,
          ctaUrl: ctx.renewalUrl ?? ctx.paymentUrl ?? undefined,
        }
      }

      if (comebackKey === 'REFERRAL') {
        const referral = absystemContent.REFERRAL
        return {
          title: referral.title,
          body: referral.text,
          ctaText: referral.cta,
          ctaUrl: ctx.referralUrl ?? undefined,
        }
      }

      const flow = absystemContent.COMEBACK_FLOWS[comebackKey as keyof typeof absystemContent.COMEBACK_FLOWS]
      const resolved = typeof flow === 'function'
        ? flow(ctx.lastAction ?? 'твій наступний крок')
        : flow

      return {
        title: comebackKey === 'GAP_30_NO_SUB' ? 'Повернення після паузи' : 'Повернення в рух',
        body: resolved.text,
        ctaText: resolved.cta,
        ctaUrl: resolved.ctaUrl ?? undefined,
      }
    }
    case NotificationEvent.POST_TRIAL_REPORTS:
      return {
        title: '📊 Твій рух за 7 днів',
        body: `Стрік: ${ctx.streakDays ?? 0} · Колесо: ${ctx.wheels ?? 0} · Сесії: ${ctx.sessions ?? 0}. У звітах ти побачиш що вже зібрано, що зараз на паузі і що повернеться після активації доступу.`,
      }
    case 'RESULT_FOLLOWUP_24H':
    case 'RESULT_FOLLOWUP_48H':
    case 'RESULT_FOLLOWUP_72H':
    case 'RESULT_DOJIM_24H':
    case 'RESULT_DOJIM_48H':
    case 'RESULT_DOJIM_72H':
    case 'RESULT_DOJIM_5D':
    case 'RESULT_DOJIM_7D':
    case 'PAYMENT_REMINDER_24H':
    case 'PAYMENT_REMINDER_48H':
    case 'PAYMENT_REMINDER_72H':
    case 'PAYMENT_REMINDER_5D':
    case 'PAYMENT_REMINDER_7D':
    case 'ZOOM_REMINDER_24H':
    case 'ZOOM_REMINDER_2H':
    case 'PLATFORM_INVITE_AFTER_ZOOM_1':
    case 'PLATFORM_INVITE_AFTER_ZOOM_2': {
      const followupName = userName === 'Привіт' ? null : userName
      const copy = resolveAbTestFollowupCopy(
        type as AbTestFollowupTimerId,
        ctx.resultKey ?? null,
        ctx.contentVersion ?? 'legacy',
        { firstName: followupName },
      )
      return {
        title: copy.title,
        body: copy.body,
        ctaText: copy.cta,
      }
    }
    default:
      return {
        title: 'Starway',
        body: 'У тебе нове повідомлення.',
      }
  }
}
