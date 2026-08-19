import { ZoomSlotStatus } from '@starway/db/prisma-client'
import { Router } from 'express'

import { prisma } from '../../../db/client.js'
import { telegramWebAppAuth } from '../../auth/middleware/auth.js'

const router = Router()
router.use(telegramWebAppAuth(['EXPERT', 'SUPERADMIN']))

const HOURS = [9, 11, 13, 15, 17, 19] as const
const WEEK_DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'] as const
const KYIV_TZ = 'Europe/Kyiv'

function addDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function formatDateShort(date: Date): string {
  return date.toLocaleDateString('uk-UA', {
    day: '2-digit',
    month: '2-digit',
    timeZone: KYIV_TZ,
  })
}

function startOfWeekMonday(now = new Date()): Date {
  const date = new Date(now)
  const day = date.getUTCDay()
  const diff = day === 0 ? -6 : 1 - day
  date.setUTCDate(date.getUTCDate() + diff)
  date.setUTCHours(0, 0, 0, 0)
  return date
}

function getNextWeekDates(now = new Date()): Date[] {
  const kyivNow = new Date(now.toLocaleString('en-US', { timeZone: KYIV_TZ }))
  const thisWeekMonday = startOfWeekMonday(kyivNow)
  const nextWeekMonday = addDays(thisWeekMonday, 7)
  return WEEK_DAYS.map((_, dayIndex) => addDays(nextWeekMonday, dayIndex))
}

async function resolveCoachUserIdByTelegramId(telegramUserId: string): Promise<string | null> {
  const coach = await prisma.user.findFirst({
    where: {
      OR: [
        { telegramUserId },
        { telegramChatId: telegramUserId },
      ],
      role: { in: ['EXPERT', 'SUPERADMIN'] },
    },
    select: { id: true },
  })

  return coach?.id ?? null
}

async function ensureNextWeekSlots(coachId: string, dates: Date[]): Promise<void> {
  for (const date of dates) {
    for (const hour of HOURS) {
      await prisma.zoomSlot.upsert({
        where: { coachId_date_hour: { coachId, date, hour } },
        update: {},
        create: { coachId, date, hour, status: ZoomSlotStatus.OPEN },
      })
    }
  }
}

router.get('/schedule', async (req, res) => {
  try {
    const week = String(req.query.week ?? 'next')
    if (week !== 'next') {
      return res.status(400).json({ error: 'Only week=next is supported' })
    }

    const telegramUser = (req as any).tgUser as { id: string; telegramUserId?: string | null } | undefined
    const coachId = telegramUser?.id
      ?? await resolveCoachUserIdByTelegramId(String(telegramUser?.telegramUserId ?? ''))
    if (!coachId) return res.status(403).json({ error: 'Coach access required' })

    const dates = getNextWeekDates()
    await ensureNextWeekSlots(coachId, dates)

    const from = new Date(dates[0])
    from.setUTCHours(0, 0, 0, 0)
    const to = new Date(dates[dates.length - 1])
    to.setUTCHours(23, 59, 59, 999)

    const slots = await prisma.zoomSlot.findMany({
      where: {
        coachId,
        date: { gte: from, lte: to },
        hour: { in: [...HOURS] },
      },
      orderBy: [{ date: 'asc' }, { hour: 'asc' }],
      select: { id: true, date: true, hour: true, status: true },
    })

    return res.json({
      week: 'next',
      timezone: KYIV_TZ,
      days: dates.map((date, index) => ({
        date: dayKey(date),
        label: `${WEEK_DAYS[index]} ${formatDateShort(date)}`,
        dayName: WEEK_DAYS[index],
      })),
      hours: [...HOURS],
      slots: slots.map((slot) => ({
        id: slot.id,
        date: dayKey(slot.date),
        hour: slot.hour,
        status: slot.status,
      })),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return res.status(500).json({ error: message })
  }
})

router.patch('/schedule/slot', async (req, res) => {
  try {
    const telegramUser = (req as any).tgUser as { id: string; telegramUserId?: string | null } | undefined
    const coachId = telegramUser?.id
      ?? await resolveCoachUserIdByTelegramId(String(telegramUser?.telegramUserId ?? ''))
    if (!coachId) return res.status(403).json({ error: 'Coach access required' })

    const slotId = String(req.body?.slotId ?? '').trim()
    const statusRaw = String(req.body?.status ?? '').trim().toUpperCase()
    if (!slotId) return res.status(400).json({ error: 'slotId is required' })
    if (statusRaw !== ZoomSlotStatus.OPEN && statusRaw !== ZoomSlotStatus.CLOSED) {
      return res.status(400).json({ error: 'status must be OPEN or CLOSED' })
    }

    const slot = await prisma.zoomSlot.findUnique({
      where: { id: slotId },
      select: { id: true, coachId: true, date: true, hour: true },
    })
    if (!slot || slot.coachId !== coachId) {
      return res.status(404).json({ error: 'Slot not found' })
    }

    const nextStatus = statusRaw as ZoomSlotStatus
    const updated = await prisma.zoomSlot.update({
      where: { id: slot.id },
      data: { status: nextStatus },
      select: { id: true, status: true },
    })

    return res.json({ ok: true, slot: updated })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return res.status(500).json({ error: message })
  }
})

export default router
