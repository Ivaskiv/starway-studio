import { absystemContent } from '@/products/absystem/config/absystem.content.js'
import { prisma } from '../../../db/client.js'
import { sendDedupedTelegramMessage } from '../../../lib/telegram.js'
import {
  getSettingsObject,
  readTimestamp,
  resolvePublicFrontendBaseUrl,
} from './abTest.progress.js'

export async function detectStateInstability(
  userId: string,
  db: typeof prisma = prisma
): Promise<boolean> {
  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - 7)
  weekStart.setHours(0, 0, 0, 0)

  const reportWindowStart = new Date()
  reportWindowStart.setDate(reportWindowStart.getDate() - 30)
  reportWindowStart.setHours(0, 0, 0, 0)

  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      lifecycleState: true,
      dailyEntries: {
        where: {
          date: { gte: weekStart },
        },
        orderBy: { date: 'desc' },
        take: 7,
        select: {
          content: true,
          date: true,
        },
      },
      microTasks: {
        where: {
          status: 'postponed',
          updatedAt: { gte: weekStart },
        },
        select: {
          title: true,
          updatedAt: true,
        },
      },
      weeklyReports: {
        where: {
          createdAt: { gte: reportWindowStart },
          summaryText: { not: null },
        },
        orderBy: { createdAt: 'desc' },
        take: 4,
        select: {
          summaryText: true,
        },
      },
    },
  })

  if (!user || user.lifecycleState !== 'platform_active') {
    return false
  }

  const negativeWords = [
    'виснажена',
    'напруга',
    'хаос',
    'тривога',
    'розсипана',
    'немає сил',
  ]
  const negativeMorningEntries = user.dailyEntries.filter((entry) => {
    const content = getSettingsObject(entry.content)
    const morning = getSettingsObject(content.morning)
    const morningText = Object.values(morning)
      .filter((value): value is string => typeof value === 'string')
      .join(' ')
      .toLowerCase()
    return negativeWords.some((word) => morningText.includes(word))
  }).length

  const postponedByTitle = new Map<string, number>()
  for (const task of user.microTasks) {
    const title = task.title.trim()
    if (!title) continue
    postponedByTitle.set(title, (postponedByTitle.get(title) ?? 0) + 1)
  }
  const repeatedPostponed = [...postponedByTitle.values()].some(
    (count) => count >= 3
  )

  const rollbackMentions = user.weeklyReports.reduce((acc, report) => {
    const text = report.summaryText ?? ''
    return acc + (text.match(/відкат/gi)?.length ?? 0)
  }, 0)

  return (
    negativeMorningEntries >= 3 || repeatedPostponed || rollbackMentions >= 2
  )
}

export async function sendStateCourseOffer(
  userId: string,
  db: typeof prisma = prisma
): Promise<void> {
  if (!(await detectStateInstability(userId, db))) {
    return
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      lifecycleState: true,
      settings: true,
      telegramChatId: true,
      telegramLinks: {
        where: { isActive: true, chatId: { not: null } },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { chatId: true },
      },
    },
  })

  if (!user || user.lifecycleState !== 'platform_active') {
    return
  }

  const settings = getSettingsObject(user.settings)
  const sentAt = readTimestamp(settings.stateCourseSentAt)
  if (sentAt && Date.now() - sentAt.getTime() < 30 * 24 * 60 * 60 * 1000) {
    return
  }

  const chatId = user.telegramChatId ?? user.telegramLinks[0]?.chatId ?? null
  if (!chatId) {
    return
  }

  const frontendUrl = resolvePublicFrontendBaseUrl()
  const text = absystemContent.UPGRADE_FLOWS.TO_STATE_COURSE
  await sendDedupedTelegramMessage(chatId, text, {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: absystemContent.UPGRADE_FLOWS.TO_STATE_COURSE_CTA,
            url: `${frontendUrl}/app/courses/state`,
          },
        ],
      ],
    },
  })

  await db.user
    .update({
      where: { id: userId },
      data: {
        settings: {
          ...settings,
          stateCourseSentAt: new Date().toISOString(),
        },
      },
    })
    .catch(() => undefined)
}
