import { ZoomSlotStatus } from '@starway/db/prisma-client'
import type { Context } from 'telegraf'

import { prisma } from '../../../db/client.js'
import { coachBotContent } from '../../content/coachBot.content.js'

const HOURS = [9, 11, 13, 15, 17, 19] as const
const WEEK_DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'] as const
const KYIV_TZ = 'Europe/Kyiv'

type WeekSlotsMap = Map<string, Map<number, ZoomSlotStatus>>

function startOfWeekMonday(now = new Date()): Date {
  const date = new Date(now)
  const day = date.getDay()
  const diff = day === 0 ? -6 : 1 - day
  date.setDate(date.getDate() + diff)
  date.setHours(0, 0, 0, 0)
  return date
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setDate(date.getDate() + days)
  return next
}

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function parseDayKeyToDate(key: string): Date {
  return new Date(`${key}T00:00:00.000Z`)
}

function formatDateShort(date: Date): string {
  return date.toLocaleDateString('uk-UA', {
    day: '2-digit',
    month: '2-digit',
    timeZone: KYIV_TZ,
  })
}

function formatWeekRangeTitle(dates: Date[]): string {
  if (dates.length === 0) return ''
  const first = formatDateShort(dates[0])
  const last = formatDateShort(dates[dates.length - 1])
  return `${first}–${last}`
}

function slotLabel(status: ZoomSlotStatus): string {
  return status === ZoomSlotStatus.OPEN
    ? coachBotContent.schedule.slotOpen
    : coachBotContent.schedule.slotClosed
}

async function resolveCoachUserId(ctx: Context): Promise<string | null> {
  const telegramUserId = ctx.from?.id ? String(ctx.from.id) : ''
  if (!telegramUserId) return null

  const coach = await prisma.user.findUnique({
    where: { telegramUserId },
    select: { id: true, role: true },
  })

  if (!coach) return null
  if (coach.role !== 'EXPERT' && coach.role !== 'SUPERADMIN') return null
  return coach.id
}

async function ensureWeekSlots(coachId: string, weekStart: Date) {
  const weekDays = WEEK_DAYS.map((_, index) => addDays(weekStart, index))

  for (const day of weekDays) {
    for (const hour of HOURS) {
      await prisma.zoomSlot.upsert({
        where: {
          coachId_date_hour: {
            coachId,
            date: day,
            hour,
          },
        },
        update: {},
        create: {
          coachId,
          date: day,
          hour,
          status: ZoomSlotStatus.OPEN,
        },
      })
    }
  }

  const weekEnd = addDays(weekStart, 6)
  weekEnd.setHours(23, 59, 59, 999)

  return prisma.zoomSlot.findMany({
    where: {
      coachId,
      date: { gte: weekStart, lte: weekEnd },
      hour: { in: [...HOURS] },
    },
    orderBy: [{ date: 'asc' }, { hour: 'asc' }],
  })
}

function getNextWeekDates(now = new Date()): Date[] {
  const kyivNow = new Date(now.toLocaleString('en-US', { timeZone: KYIV_TZ }))
  const thisWeekMonday = startOfWeekMonday(kyivNow)
  const nextWeekMonday = addDays(thisWeekMonday, 7)
  return WEEK_DAYS.map((_, dayIndex) => addDays(nextWeekMonday, dayIndex))
}

async function ensureNextWeekSlots(coachId: string, dates: Date[]): Promise<void> {
  for (const date of dates) {
    for (const hour of HOURS) {
      await prisma.zoomSlot.upsert({
        where: {
          coachId_date_hour: {
            coachId,
            date,
            hour,
          },
        },
        update: {},
        create: {
          coachId,
          date,
          hour,
          status: ZoomSlotStatus.OPEN,
        },
      })
    }
  }
}

async function getWeekSlotsMap(coachId: string, dates: Date[]): Promise<WeekSlotsMap> {
  const from = new Date(dates[0])
  from.setHours(0, 0, 0, 0)
  const to = new Date(dates[dates.length - 1])
  to.setHours(23, 59, 59, 999)

  const slots = await prisma.zoomSlot.findMany({
    where: {
      coachId,
      date: { gte: from, lte: to },
      hour: { in: [...HOURS] },
    },
    select: {
      date: true,
      hour: true,
      status: true,
    },
    orderBy: [{ date: 'asc' }, { hour: 'asc' }],
  })

  const map: WeekSlotsMap = new Map()
  for (const date of dates) {
    map.set(dayKey(date), new Map())
  }

  for (const slot of slots) {
    const dateStr = dayKey(slot.date)
    const dayMap = map.get(dateStr) ?? new Map<number, ZoomSlotStatus>()
    dayMap.set(slot.hour, slot.status)
    map.set(dateStr, dayMap)
  }

  return map
}

function buildNextWeekKeyboard(dates: Date[], slotsMap: WeekSlotsMap) {
  const keyboard: Array<Array<{ text: string; callback_data: string }>> = []
  for (let dayIndex = 0; dayIndex < dates.length; dayIndex += 1) {
    const date = dates[dayIndex]
    const dateStr = dayKey(date)
    const dayMap = slotsMap.get(dateStr) ?? new Map<number, ZoomSlotStatus>()
    const hasClosed = HOURS.some((hour) => (dayMap.get(hour) ?? ZoomSlotStatus.OPEN) === ZoomSlotStatus.CLOSED)
    const template = hasClosed ? coachBotContent.nextWeek.dayClosed : coachBotContent.nextWeek.dayOpen
    const text = template
      .replace('{day}', WEEK_DAYS[dayIndex] ?? '')
      .replace('{date}', formatDateShort(date))

    keyboard.push([{ text, callback_data: `coach:nw:day:${dateStr}` }])
  }

  keyboard.push([{ text: coachBotContent.nextWeek.btnHours, callback_data: 'coach:nw:hours' }])
  keyboard.push([{ text: coachBotContent.nextWeek.btnDone, callback_data: 'coach:nw:done' }])
  return keyboard
}

function buildHoursKeyboard(dates: Date[], slotsMap: WeekSlotsMap) {
  const keyboard: Array<Array<{ text: string; callback_data: string }>> = []

  for (let dayIndex = 0; dayIndex < dates.length; dayIndex += 1) {
    const date = dates[dayIndex]
    const dateStr = dayKey(date)
    const dayLabel = `${WEEK_DAYS[dayIndex]} ${formatDateShort(date)}`
    keyboard.push([{ text: `— ${dayLabel} —`, callback_data: `coach:nw:label:${dateStr}` }])

    const dayMap = slotsMap.get(dateStr) ?? new Map<number, ZoomSlotStatus>()
    const hourButtons = HOURS.map((hour) => {
      const status = dayMap.get(hour) ?? ZoomSlotStatus.OPEN
      const template = status === ZoomSlotStatus.OPEN
        ? coachBotContent.nextWeek.hourOpen
        : coachBotContent.nextWeek.hourClosed

      return {
        text: template.replace('{h}', `${hour}:00`),
        callback_data: `coach:nw:hour:${dateStr}:${hour}`,
      }
    })

    keyboard.push(hourButtons.slice(0, 3))
    keyboard.push(hourButtons.slice(3))
  }

  keyboard.push([{ text: coachBotContent.nextWeek.btnDone, callback_data: 'coach:nw:done' }])
  return keyboard
}

async function renderNextWeekMenu(ctx: Context, coachId: string, useEditMarkup = false): Promise<void> {
  const dates = getNextWeekDates()
  await ensureNextWeekSlots(coachId, dates)
  const slotsMap = await getWeekSlotsMap(coachId, dates)

  const title = coachBotContent.nextWeek.title.replace('{dates}', formatWeekRangeTitle(dates))
  const text = `${title}\n\n${coachBotContent.nextWeek.intro}`
  const inlineKeyboard = buildNextWeekKeyboard(dates, slotsMap)

  if (useEditMarkup && 'callbackQuery' in ctx && ctx.callbackQuery && 'message' in ctx.callbackQuery) {
    await ctx.editMessageReplyMarkup({ inline_keyboard: inlineKeyboard }).catch(() => undefined)
    return
  }

  await ctx.reply(text, {
    reply_markup: {
      inline_keyboard: inlineKeyboard,
    },
  })
}

async function renderHoursMenu(ctx: Context, coachId: string, useEditMarkup = false): Promise<void> {
  const dates = getNextWeekDates()
  await ensureNextWeekSlots(coachId, dates)
  const slotsMap = await getWeekSlotsMap(coachId, dates)
  const inlineKeyboard = buildHoursKeyboard(dates, slotsMap)

  const title = coachBotContent.nextWeek.title.replace('{dates}', formatWeekRangeTitle(dates))
  const text = `${title}\n\n${coachBotContent.nextWeek.intro}`

  if (useEditMarkup && 'callbackQuery' in ctx && ctx.callbackQuery && 'message' in ctx.callbackQuery) {
    await ctx.editMessageReplyMarkup({ inline_keyboard: inlineKeyboard }).catch(() => undefined)
    return
  }

  await ctx.reply(text, {
    reply_markup: {
      inline_keyboard: inlineKeyboard,
    },
  })
}

export async function scheduleMenuHandler(ctx: Context): Promise<void> {
  const coachId = await resolveCoachUserId(ctx)
  if (!coachId) return

  const weekStart = startOfWeekMonday()
  const slots = await ensureWeekSlots(coachId, weekStart)

  const byDay = new Map<string, { id: string; hour: number; status: ZoomSlotStatus }[]>()
  for (const slot of slots) {
    const key = dayKey(slot.date)
    const list = byDay.get(key) ?? []
    list.push({ id: slot.id, hour: slot.hour, status: slot.status })
    byDay.set(key, list)
  }

  const inlineKeyboard: Array<Array<{ text: string; callback_data: string }>> = []
  const lines: string[] = [coachBotContent.schedule.title, '']

  WEEK_DAYS.forEach((weekday, dayIndex) => {
    const date = addDays(weekStart, dayIndex)
    const key = dayKey(date)
    const daySlots = (byDay.get(key) ?? []).sort((a, b) => a.hour - b.hour)

    lines.push(`${weekday} ${date.toLocaleDateString('uk-UA')}`)

    const row: Array<{ text: string; callback_data: string }> = []
    for (const slot of daySlots) {
      const statusIcon = slotLabel(slot.status)
      row.push({
        text: `${slot.hour}:00 ${statusIcon}`,
        callback_data: `coach:slot:${slot.id}`,
      })
    }

    if (row.length > 0) {
      inlineKeyboard.push(row)
    }
  })

  await ctx.reply(lines.join('\n'), {
    reply_markup: {
      inline_keyboard: inlineKeyboard,
    },
  })
}

export async function scheduleToggleHandler(ctx: Context): Promise<void> {
  if (!('callbackQuery' in ctx) || !ctx.callbackQuery || !('data' in ctx.callbackQuery)) return

  const coachId = await resolveCoachUserId(ctx)
  if (!coachId) return

  const action = String(ctx.callbackQuery.data ?? '')
  const [, , slotId] = action.split(':')
  if (!slotId) return

  const slot = await prisma.zoomSlot.findUnique({
    where: { id: slotId },
    select: { id: true, coachId: true, status: true },
  })
  if (!slot || slot.coachId !== coachId) return

  const nextStatus = slot.status === ZoomSlotStatus.OPEN ? ZoomSlotStatus.CLOSED : ZoomSlotStatus.OPEN
  await prisma.zoomSlot.update({
    where: { id: slot.id },
    data: { status: nextStatus },
  })

  await ctx.answerCbQuery(coachBotContent.schedule.saved).catch(() => undefined)
  await scheduleMenuHandler(ctx)
}

export async function nextWeekMenuHandler(ctx: Context): Promise<void> {
  const coachId = await resolveCoachUserId(ctx)
  if (!coachId) return
  await renderNextWeekMenu(ctx, coachId)
}

export async function toggleDayHandler(ctx: Context): Promise<void> {
  if (!('callbackQuery' in ctx) || !ctx.callbackQuery || !('data' in ctx.callbackQuery)) return
  const coachId = await resolveCoachUserId(ctx)
  if (!coachId) return

  const action = String(ctx.callbackQuery.data ?? '')
  const [, , , dateKeyValue] = action.split(':')
  if (!dateKeyValue) return

  const dates = getNextWeekDates()
  await ensureNextWeekSlots(coachId, dates)
  const slotsMap = await getWeekSlotsMap(coachId, dates)
  const dayMap = slotsMap.get(dateKeyValue) ?? new Map<number, ZoomSlotStatus>()

  const allOpen = HOURS.every((hour) => (dayMap.get(hour) ?? ZoomSlotStatus.OPEN) === ZoomSlotStatus.OPEN)
  const nextStatus = allOpen ? ZoomSlotStatus.CLOSED : ZoomSlotStatus.OPEN

  const date = parseDayKeyToDate(dateKeyValue)
  await prisma.zoomSlot.updateMany({
    where: {
      coachId,
      date,
      hour: { in: [...HOURS] },
    },
    data: { status: nextStatus },
  })

  await ctx.answerCbQuery(coachBotContent.nextWeek.saved).catch(() => undefined)
  await renderNextWeekMenu(ctx, coachId, true)
}

export async function hoursMenuHandler(ctx: Context): Promise<void> {
  const coachId = await resolveCoachUserId(ctx)
  if (!coachId) return
  await renderHoursMenu(ctx, coachId)
}

export async function toggleHourHandler(ctx: Context): Promise<void> {
  if (!('callbackQuery' in ctx) || !ctx.callbackQuery || !('data' in ctx.callbackQuery)) return
  const coachId = await resolveCoachUserId(ctx)
  if (!coachId) return

  const action = String(ctx.callbackQuery.data ?? '')
  const [, , , dateKeyValue, hourRaw] = action.split(':')
  const hour = Number(hourRaw)
  if (!dateKeyValue || !Number.isFinite(hour)) return

  const date = parseDayKeyToDate(dateKeyValue)
  const slot = await prisma.zoomSlot.findUnique({
    where: { coachId_date_hour: { coachId, date, hour } },
    select: { status: true },
  })
  const current = slot?.status ?? ZoomSlotStatus.OPEN
  const nextStatus = current === ZoomSlotStatus.OPEN ? ZoomSlotStatus.CLOSED : ZoomSlotStatus.OPEN

  await prisma.zoomSlot.upsert({
    where: { coachId_date_hour: { coachId, date, hour } },
    update: { status: nextStatus },
    create: { coachId, date, hour, status: nextStatus },
  })

  await ctx.answerCbQuery(coachBotContent.nextWeek.saved).catch(() => undefined)
  await renderHoursMenu(ctx, coachId, true)
}

export async function nextWeekDoneHandler(ctx: Context): Promise<void> {
  const coachId = await resolveCoachUserId(ctx)
  if (!coachId) return
  await ctx.answerCbQuery(coachBotContent.nextWeek.saved).catch(() => undefined)
}

export async function nextWeekNoopHandler(ctx: Context): Promise<void> {
  await ctx.answerCbQuery().catch(() => undefined)
}
