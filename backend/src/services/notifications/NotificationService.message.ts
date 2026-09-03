import { NotificationEvent } from './NotificationEvent.js'
import type { DeliveryMessage, DeliveryUser } from './delivery/types.js'
import { LEVELS } from '../../modules/gamification/level.system.js'
import { buildTelegramDeepLink, generateDeepLink } from '../../modules/deeplinks/service.js'
import { buildNotificationContent, type AbTestFollowupTimerId } from '../../lib/notifications/templates.js'
import { absystemContent } from '@/products/absystem/config/content.js'
import type { AbTestResultKey, TestDriveContentVersion } from '@/products/ab-system/content/abTest.results.js'
import { FOCUS_DOJIM_TIMER_IDS } from '../../modules/subscriptions/payments/business/types.js'
import { resolveAbTestFollowupCopy } from '@/products/ab-system/content/abTest.followups.js'
import { AB_TEST_OPEN_FOCUS_BUTTON_TEXT, AB_TEST_SHOW_INSIDE_CTA_TEXT, type TelegramContentBlock, } from '@/products/ab-system/content/abTest.shared.js'
import type { EventPayload } from './NotificationService.foundation.js'
import { asString, STREAK_MILESTONE_REWARDS, TELEGRAM_SAFE_FRONTEND_URL, buildMiniAppStartUrl, buildTelegramSafeWebDeepLink, buildWebFlowUrl, buildMentorTelegramActions, buildWeeklySummaryPayload } from './NotificationService.foundation.js'
import { buildTelegramCard } from './NotificationService.telegram.js'

export async function buildNotificationMessage(event: NotificationEvent, user: DeliveryUser, payload?: EventPayload): Promise<DeliveryMessage> {
    const firstName = user.firstName ?? 'Привіт'

    switch (event) {
      case NotificationEvent.DAILY_MORNING_DUE:
      {
        const sessionPath = '/dashboard?from=tg&step=cycle'
        let webUrl = `${TELEGRAM_SAFE_FRONTEND_URL}${sessionPath}`
        try {
          const webLink = await generateDeepLink({
            userId: user.id,
            action: 'continue_flow',
            source: 'telegram',
            target: 'web',
            path: sessionPath,
            payload: {
              session: 'morning',
              step: 0,
              date: new Date().toISOString(),
            },
          })
          webUrl = buildTelegramSafeWebDeepLink(webLink.token, sessionPath)
        } catch {
          // fall back to direct dashboard path
        }

        return {
          title: '🌅 Твій фокус',
          body: `${firstName}, твій фокус уже визначений. Один короткий крок зараз збере день у систему.`,
          telegramHtml: buildTelegramCard({
            title: '🌅 Твій фокус',
            intro: `${firstName}, один короткий крок зараз збере день у систему.`,
            facts: [
              'Почни там, де тобі зараз зручніше',
              'Mini App, сайт і Telegram ведуть в одну дію',
            ],
            note: 'Telegram тут не для нагадування, а для продовження дії.',
          }),
          ctaActions: buildMentorTelegramActions({
            miniAppUrl: buildMiniAppStartUrl('ai_morning'),
            webUrl,
            telegramCallback: 'resume_morning_session',
          }),
        }
      }
      case NotificationEvent.DAILY_EVENING_DUE:
      {
        const sessionPath = '/dashboard?from=tg&step=cycle'
        let webUrl = `${TELEGRAM_SAFE_FRONTEND_URL}${sessionPath}`
        try {
          const webLink = await generateDeepLink({
            userId: user.id,
            action: 'continue_flow',
            source: 'telegram',
            target: 'web',
            path: sessionPath,
            payload: {
              session: 'evening',
              step: 0,
              date: new Date().toISOString(),
            },
          })
          webUrl = buildTelegramSafeWebDeepLink(webLink.token, sessionPath)
        } catch {
          // fall back to direct dashboard path
        }

        return {
          title: '🌙 Що було найцінніше сьогодні?',
          body: `${firstName}, один короткий підсумок зараз закриє день у систему і підтримає ритм.`,
          telegramHtml: buildTelegramCard({
            title: '🌙 Що було найцінніше сьогодні?',
            intro: `${firstName}, один короткий підсумок зараз закриє день у систему і підтримає ритм.`,
            facts: [
              'Підсумок дня закриває цикл',
              'Завтрашній старт стає чистішим після короткої вечірньої фіксації',
            ],
            note: 'Обери Mini App, сайт або Telegram і продовжуй без розриву.',
          }),
          ctaActions: buildMentorTelegramActions({
            miniAppUrl: buildMiniAppStartUrl('ai_evening'),
            webUrl,
            telegramCallback: 'resume_evening_session',
          }),
        }
      }
      case NotificationEvent.STREAK_RISK: {
        const current = Number(payload?.current ?? 0)
        const content = buildNotificationContent(NotificationEvent.STREAK_RISK, {
          userName: firstName,
          streakDays: current,
        })
        return {
          title: content.title,
          body: content.body,
          telegramHtml: buildTelegramCard({
            title: '⚡ Стрік під загрозою',
            intro: `${firstName}, сьогодні ще можна втримати серію.`,
            facts: [
              `Поточний стрік: ${current} днів`,
              'Одна коротка дія збереже ритм',
            ],
            note: 'Не треба робити все. Треба зробити один крок сьогодні.',
          }),
          ctaText: '🔥 Зберегти стрік',
          ctaUrl: buildMiniAppStartUrl('tracker'),
        }
      }
      case NotificationEvent.STREAK_MILESTONE: {
        const current = Number(payload?.current ?? 0)
        const reward = STREAK_MILESTONE_REWARDS[current]
        const streakMessages: Record<number, string> = {
          3: 'Ти вже формуєш звичку. Перші три дні були найскладніші — ти їх пройшла.',
          7: 'Тиждень без зупинки. Звичка вже починає закріплюватися.',
          14: 'Два тижні системної роботи. Ти вже не стартуєш — ти продовжуєш.',
          30: 'Місяць безперервної роботи. Це вже архітектура звички, не випадковий ривок.',
          100: 'Сто днів. Це легендарна стабільність і реальний системний стиль.',
        }
        const rewardLine = reward
          ? ` Нагорода: +${reward.neuroGems} NEUROGEMS${reward.bitMind ? ` · +${reward.bitMind} BITMIND` : ''}.`
          : ''
        return {
          title: `🔥 Стрік ${current} днів`,
          body: `${firstName}, ${streakMessages[current] ?? 'Ти зафіксувала важливу серію днів.'}${rewardLine}`,
          ctaText: current >= 30 ? '🏅 Відкрити нагороду' : '📊 Мій прогрес',
          ctaUrl: buildMiniAppStartUrl(current >= 30 ? 'level_up' : 'tracker'),
        }
      }
      case NotificationEvent.STREAK_BROKEN:
      {
        const content = buildNotificationContent(NotificationEvent.STREAK_BROKEN, {
          userName: firstName,
        })
        return {
          title: content.title,
          body: content.body,
          ctaText: '💎 Відкрити трекер',
          ctaUrl: buildMiniAppStartUrl('tracker'),
        }
      }
      case NotificationEvent.LEVEL_UP:
      {
        const nextLevel = LEVELS.find(level => level.level === Number(payload?.level ?? 1))
        const rewardMap: Record<string, number> = {
          Explorer: 20,
          Thinker: 30,
          Builder: 50,
          Strategist: 100,
          Visionary: 120,
          Architect: 160,
          Mentor: 200,
          Mastermind: 240,
          Oracle: 300,
        }
        return {
          title: '🌟 Новий рівень',
          body: nextLevel
            ? `${firstName} → ${nextLevel.title}. +${rewardMap[nextLevel.title] ?? 0} NEUROGEMS нараховано. Нові можливості вже відкриті.`
            : `Рівень ${Number(payload?.level ?? 1)} відкрито. Твій прогрес зафіксований, відкрий кабінет і подивись що вже відкрито.`,
          ctaText: '🌟 Відкрити нові можливості',
          ctaUrl: buildMiniAppStartUrl('level_up'),
        }
      }
      case NotificationEvent.NEAR_LEVEL_UP:
        return {
          title: '⚡ Майже новий рівень',
          body: `${firstName}, до рівня ${String(payload?.nextLevel ?? '')} залишилось лише ${Number(payload?.xpLeft ?? 0)} XP. Одна дія — і ти там.`,
          ctaText: '🎯 Відкрити практику',
          ctaUrl: buildMiniAppStartUrl('tracker'),
        }
      case NotificationEvent.WEEKLY_SUMMARY: {
        const reportsWebUrl = await buildWebFlowUrl({
          userId: user.id,
          path: '/dashboard/ai-mentor?section=reports',
          payload: {
            source: 'weekly_summary',
            date: new Date().toISOString(),
          },
        })
        const summary = buildWeeklySummaryPayload(payload)
        const content = buildNotificationContent(NotificationEvent.WEEKLY_SUMMARY, {
          userName: firstName,
          streakDays: summary.streak,
          wheels: summary.wheels,
          sessions: summary.sessions,
        })
        return {
          title: content.title,
          body: content.body,
          telegramHtml: buildTelegramCard({
            title: '📚 Тижневий підсумок',
            intro: `${firstName}, твій тижневий зріз уже сформований.`,
            facts: [
              `Стрік: ${summary.streak}`,
              `Колесо: ${summary.wheels}`,
              `Сесії: ${summary.sessions}`,
            ],
            note: 'Подивись звіти, щоб зрозуміти динаміку за 7 днів і вирішити, який крок робити далі.',
          }),
          ctaActions: [
            {
              text: 'Відкрити в мініап',
              url: buildMiniAppStartUrl('tracker'),
              mode: 'web_app',
            },
            {
              text: 'Відкрити всі звіти на сайті',
              url: reportsWebUrl,
              mode: 'url',
            },
          ],
        }
      }
      case NotificationEvent.AI_INACTIVE:
      {
        const sessionPath = '/miniapp?startapp=ai'
        let webUrl = `${TELEGRAM_SAFE_FRONTEND_URL}/dashboard/chat`
        try {
          const webLink = await generateDeepLink({
            userId: user.id,
            action: 'continue_flow',
            source: 'telegram',
            target: 'web',
            path: '/dashboard/chat',
            payload: {
              source: 'ai_inactive',
              date: new Date().toISOString(),
            },
          })
          webUrl = buildTelegramSafeWebDeepLink(webLink.token, '/dashboard/chat')
        } catch {
          // fall back to direct dashboard path
        }

        return {
          title: '✦ Повернись в ABsystem',
          body: 'Ти давно не поверталась до ABsystem. Обери, де зручно продовжити далі: у мініапі, на сайті або прямо тут у Telegram.',
          telegramHtml: buildTelegramCard({
            title: '✦ Повернись в ABsystem',
            intro: `${firstName}, твій ритм зараз стоїть без руху.`,
            facts: [
              'Продовжити можна в мініапі',
              'Або на сайті',
              'Або прямо тут у Telegram',
            ],
            note: 'Повернись до одного наступного кроку, а не до хаосу.',
          }),
          ctaActions: buildMentorTelegramActions({
            miniAppUrl: buildMiniAppStartUrl('ai'),
            webUrl,
            telegramCallback: 'continue_ai_mentor_chat',
          }),
        }
      }
      case NotificationEvent.ABSYSTEM_COMEBACK:
      {
        const comebackKey = asString(payload?.comeback_key ?? payload?.comebackKey) ?? 'GAP_1_3'
        const content = buildNotificationContent(NotificationEvent.ABSYSTEM_COMEBACK, {
          userName: firstName,
          comebackKey,
          lastAction: asString(payload?.last_action ?? payload?.lastAction),
          dailyCycles: Number(payload?.dailyCycles ?? payload?.daily_cycles ?? 0),
          decisions: Number(payload?.decisions ?? payload?.decision_count ?? 0),
          referralUrl: asString(payload?.referral_url ?? payload?.referralUrl),
          renewalUrl: asString(payload?.renewal_url ?? payload?.renewalUrl),
          paymentUrl: asString(payload?.payment_url ?? payload?.paymentUrl),
        })
        return {
          title: content.title,
          body: content.body,
          telegramHtml: buildTelegramCard({
            title: content.title,
            intro: content.body,
            note: 'Повернись до одного наступного кроку.',
          }),
          ctaText: content.ctaText,
          ctaActions: content.ctaUrl
            ? [{ text: content.ctaText ?? 'Відкрити', url: content.ctaUrl, mode: 'url' }]
            : undefined,
        }
      }
      case NotificationEvent.SUBSCRIPTION_EXPIRING:
      {
        const renewalUrl = asString(payload?.renewal_url ?? payload?.renewalUrl ?? payload?.payment_url ?? payload?.paymentUrl) ?? null
        const trialLifecycleMode = asString(payload?.trial_lifecycle_mode ?? payload?.trialLifecycleMode)
        if (trialLifecycleMode === 'legacy_gift_pre_expiry' || trialLifecycleMode === 'regular_pre_expiry') {
          const focusExpiresAt = asString(payload?.focus_expires_at ?? payload?.focusExpiresAt)
          const daysRemaining = Number(payload?.days_remaining ?? payload?.daysRemaining ?? 0)
          const copy = trialLifecycleMode === 'legacy_gift_pre_expiry'
            ? absystemContent.TRIAL_LIFECYCLE.legacyGiftPreExpiry({
                daysRemaining,
                focusExpiresAt: focusExpiresAt ?? '',
              })
            : absystemContent.TRIAL_LIFECYCLE.regularPreExpiry({
                daysRemaining,
              })

          const introLines = [
            ...(copy.quote ? [`ЦИТАТА: ${copy.quote}`] : []),
            ...copy.lines,
          ].join('\n')

          return {
            title: copy.title,
            body: [...copy.lines, copy.nextStep].filter(Boolean).join('\n'),
            telegramHtml: buildTelegramCard({
              title: copy.title,
              intro: introLines,
              note: copy.nextStep,
            }),
            ctaText: copy.cta ?? undefined,
            ctaActions: renewalUrl && copy.cta
              ? [{ text: copy.cta, url: renewalUrl, mode: 'url' }]
              : undefined,
          }
        }
        const content = buildNotificationContent(NotificationEvent.SUBSCRIPTION_EXPIRING, {
          userName: firstName,
          renewalUrl,
          paymentUrl: renewalUrl,
        })
        return {
          title: content.title,
          body: content.body,
          telegramHtml: buildTelegramCard({
            title: content.title,
            intro: content.body,
          }),
          ctaText: content.ctaText,
          ctaActions: content.ctaUrl
            ? [{ text: content.ctaText ?? 'Відкрити', url: content.ctaUrl, mode: 'url' }]
            : undefined,
        }
      }
      case NotificationEvent.SUBSCRIPTION_EXPIRED:
      {
        const renewalUrl = asString(payload?.renewal_url ?? payload?.renewalUrl ?? payload?.payment_url ?? payload?.paymentUrl) ?? null
        const trialLifecycleMode = asString(payload?.trial_lifecycle_mode ?? payload?.trialLifecycleMode)
        if (trialLifecycleMode === 'trial_expired') {
          const focusExpiresAt = asString(payload?.focus_expires_at ?? payload?.focusExpiresAt)
          const legacyGift = Boolean(payload?.legacy_gift ?? payload?.legacyGift)
          const copy = absystemContent.TRIAL_LIFECYCLE.trialExpired({
            focusExpiresAt,
            legacyGift,
          })

          const introLines = [
            ...(copy.quote ? [`ЦИТАТА: ${copy.quote}`] : []),
            ...copy.lines,
          ].join('\n')

          return {
            title: copy.title,
            body: [...copy.lines, copy.nextStep].filter(Boolean).join('\n'),
            telegramHtml: buildTelegramCard({
              title: copy.title,
              intro: introLines,
              note: copy.nextStep,
            }),
            ctaText: copy.cta ?? undefined,
            ctaActions: renewalUrl && copy.cta
              ? [{ text: copy.cta, url: renewalUrl, mode: 'url' }]
              : undefined,
          }
        }
        const content = buildNotificationContent(NotificationEvent.SUBSCRIPTION_EXPIRED, {
          userName: firstName,
          renewalUrl,
          paymentUrl: renewalUrl,
        })

        return {
          title: content.title,
          body: content.body,
          telegramHtml: buildTelegramCard({
            title: content.title,
            intro: content.body,
          }),
          ctaText: content.ctaText,
          ctaActions: content.ctaUrl
            ? [{ text: content.ctaText ?? 'Відкрити', url: content.ctaUrl, mode: 'url' }]
            : undefined,
        }
      }
      case NotificationEvent.POST_TRIAL_REPORTS:
      {
        const trialLifecycleMode = asString(payload?.trial_lifecycle_mode ?? payload?.trialLifecycleMode)
        if (trialLifecycleMode === 'legacy_gift_day8' || trialLifecycleMode === 'regular_day8') {
          const weeklyReportSummary = asString(payload?.weekly_report_summary ?? payload?.weeklyReportSummary)
          const daysRemaining = Number(payload?.days_remaining ?? payload?.daysRemaining ?? 0)
          const focusExpiresAt = asString(payload?.focus_expires_at ?? payload?.focusExpiresAt)
          const renewalUrl = asString(payload?.renewal_url ?? payload?.renewalUrl ?? payload?.payment_url ?? payload?.paymentUrl) ?? null
          const copy = trialLifecycleMode === 'legacy_gift_day8'
            ? absystemContent.TRIAL_LIFECYCLE.legacyGiftDay8({
                weeklyReportSummary,
                daysRemaining,
                focusExpiresAt: focusExpiresAt ?? '',
              })
            : absystemContent.TRIAL_LIFECYCLE.regularDay8({
                weeklyReportSummary,
                daysRemaining,
              })

          const introLines = [
            ...(copy.quote ? [`ЦИТАТА: ${copy.quote}`] : []),
            ...copy.lines,
          ].join('\n')

          return {
            title: copy.title,
            body: [...copy.lines, copy.nextStep].filter(Boolean).join('\n'),
            telegramHtml: buildTelegramCard({
              title: copy.title,
              intro: introLines,
              note: copy.nextStep,
            }),
            ctaText: copy.cta ?? undefined,
            ctaActions: renewalUrl && copy.cta
              ? [{ text: copy.cta, url: renewalUrl, mode: 'url' }]
              : undefined,
          }
        }
        const reportsWebUrl = await buildWebFlowUrl({
          userId: user.id,
          path: '/dashboard/ai-mentor?section=reports',
          payload: {
            source: 'post_trial_reports',
            date: new Date().toISOString(),
          },
        })
        const summary = buildWeeklySummaryPayload(payload)
        const content = buildNotificationContent(NotificationEvent.POST_TRIAL_REPORTS, {
          userName: firstName,
          streakDays: summary.streak,
          wheels: summary.wheels,
          sessions: summary.sessions,
        })
        return {
          title: content.title,
          body: content.body,
          telegramHtml: buildTelegramCard({
            title: '📊 Твій рух за 7 днів',
            intro: `${firstName}, після завершення trial у тебе вже є готовий зріз за 7 днів.`,
            facts: [
              `Стрік: ${summary.streak}`,
              `Колесо: ${summary.wheels}`,
              `Сесії: ${summary.sessions}`,
            ],
            note: 'У звітах ти побачиш: що вже зібрано, що зараз на паузі без підписки і що повернеться одразу після активації Premium.',
          }),
          ctaActions: [
            {
              text: 'Відкрити в мініап',
              url: buildMiniAppStartUrl('tracker'),
              mode: 'web_app',
            },
            {
              text: 'Відкрити всі звіти на сайті',
              url: reportsWebUrl,
              mode: 'url',
            },
            {
              text: 'Обрати підписку',
              url: buildMiniAppStartUrl('subscription'),
              mode: 'web_app',
            },
          ],
        }
      }
      case NotificationEvent.AB_TEST_FOLLOWUP:
      {
        const flowTimerId = (asString(payload?.flow_timer_id ?? payload?.flowTimerId) ?? 'RESULT_FOLLOWUP_24H') as AbTestFollowupTimerId
        const contentVersion = (asString(payload?.content_version ?? payload?.contentVersion) ?? 'legacy') as TestDriveContentVersion
        const customBody = asString(payload?.message_body ?? payload?.messageBody)
        const customCtaText = asString(payload?.cta_text ?? payload?.ctaText)
        const followupName = firstName === 'Привіт' ? null : firstName
        const copy = resolveAbTestFollowupCopy(
          flowTimerId,
          asString(payload?.result_key ?? payload?.resultKey) as AbTestResultKey | null,
          contentVersion,
          { firstName: followupName },
        )
        const content = buildNotificationContent(flowTimerId, {
          userName: firstName,
          resultKey: asString(payload?.result_key ?? payload?.resultKey) as AbTestResultKey | null,
          contentVersion,
        })
        const resolvedCtaText = customCtaText ?? content.ctaText ?? 'Відкрити'
        const isPlainBridge = flowTimerId === 'ZOOM_REMINDER_24H'
          || flowTimerId === 'ZOOM_REMINDER_2H'
          || flowTimerId === 'ZOOM_REMINDER_5M'
          || flowTimerId === 'PLATFORM_INVITE_AFTER_ZOOM_1'
          || flowTimerId === 'PLATFORM_INVITE_AFTER_ZOOM_2'
        const bridgeUrl = asString(
          payload?.payment_url
          ?? payload?.paymentUrl
          ?? payload?.cta_url
          ?? payload?.ctaUrl,
        )
        ?? null
        const resultKey = asString(payload?.result_key ?? payload?.resultKey) as AbTestResultKey | null
        const focusDojimActions =
          FOCUS_DOJIM_TIMER_IDS.includes(flowTimerId as (typeof FOCUS_DOJIM_TIMER_IDS)[number]) && resultKey
            ? [
                {
                  text: AB_TEST_SHOW_INSIDE_CTA_TEXT,
                  url: `show_inside_${resultKey.toUpperCase()}`,
                  mode: 'callback' as const,
                },
                {
                  text: AB_TEST_OPEN_FOCUS_BUTTON_TEXT,
                  url: 'open_focus_payment',
                  mode: 'callback' as const,
                },
              ]
            : undefined
        return {
          title: content.title,
          body: customBody ?? content.body,
          telegramHtml: buildTelegramCard({
            title: content.title,
            intro: isPlainBridge || customBody
              ? (customBody ?? content.body)
              : FOCUS_DOJIM_TIMER_IDS.includes(flowTimerId as (typeof FOCUS_DOJIM_TIMER_IDS)[number])
              ? (copy.blocks?.find((block): block is Extract<TelegramContentBlock, { type: 'text' }> => block.type === 'text')?.text ?? `${firstName}, ${content.body}`)
              : `${firstName}, ${content.body}`,
          }),
          ctaText: resolvedCtaText,
          ctaActions: focusDojimActions
            ?? (isPlainBridge && bridgeUrl && content.ctaText
            ? [{ text: resolvedCtaText, url: bridgeUrl, mode: 'url' }]
            : bridgeUrl && (customCtaText ?? content.ctaText)
            ? [{ text: resolvedCtaText, url: bridgeUrl, mode: 'url' }]
            : content.ctaUrl
            ? [{ text: resolvedCtaText, url: content.ctaUrl, mode: 'url' }]
            : undefined),
        }
      }
    }
  }
