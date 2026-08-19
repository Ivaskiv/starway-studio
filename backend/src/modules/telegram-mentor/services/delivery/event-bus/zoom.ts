import { abTestZoomContent } from '@/products/ab-system/content/abTest.zoom.js'
import { ZoomSlotStatus } from '@starway/db/prisma-client'
import type { Context } from 'telegraf'
import { prisma } from '../../../../../db/client.js'
import { acceptSwapRequest,bookPrivateSlot,cancelPrivateBooking,declineSwapRequest,getCoachWeekSlots,getUpcomingGroupSessions,toggleCoachSlotStatus } from '../../../../zoom/service.js'
import { planAck,planMessage } from '../../../conversation/delivery/planDelivery.js'

export async function handleZoomCallback(ctx: Context, action: string, userId: string | null): Promise<boolean> {
  if (action === 'coach:my_schedule') {
    const coachId = userId
    if (!coachId) {
      await planAck(ctx, 'ctx.answerCbQuery', 'coach_schedule_no_user', 'Не знайдено коуча').catch(() => undefined)
      return true
    }
    const slots = await getCoachWeekSlots(coachId)
    await planAck(ctx, 'ctx.answerCbQuery', 'coach_schedule_ok').catch(() => undefined)

    if (!slots.length) {
      await planMessage(
        ctx,
        'ctx.reply',
        'coach_schedule_empty',
        `${abTestZoomContent.coachSchedule.title}\n\n${abTestZoomContent.coachSchedule.empty}`,
      ).catch(() => undefined)
      return true
    }

    const weekdayNames = ['Нд', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']
    const lines = slots.map((slot) => {
      const weekday = weekdayNames[slot.date.getDay()] ?? 'День'
      return `${weekday} ${slot.date.toLocaleDateString('uk-UA')} ${String(slot.hour).padStart(2, '0')}:00 — ${slot.status}`
    })

    const buttons = slots.map((slot) => {
      const nextStatus = slot.status === ZoomSlotStatus.OPEN ? ZoomSlotStatus.CLOSED : ZoomSlotStatus.OPEN
      const label = slot.status === ZoomSlotStatus.OPEN
        ? abTestZoomContent.coachSchedule.closeLabel
        : abTestZoomContent.coachSchedule.openLabel
      return [{ text: `${label} ${String(slot.hour).padStart(2, '0')}:00`, callback_data: `coach:slot_toggle:${slot.id}:${nextStatus}` }]
    })

    await planMessage(
      ctx,
      'ctx.reply',
      'coach_schedule_panel',
      `${abTestZoomContent.coachSchedule.title}\n\n${lines.join('\n')}`,
      { inline_keyboard: buttons },
    ).catch(() => undefined)
    return true
  }

  if (action.startsWith('coach:slot_toggle:')) {
    const [, , , slotId, statusRaw] = action.split(':')
    if (!slotId || !statusRaw) return true
    const coachId = userId
    if (!coachId) {
      await planAck(ctx, 'ctx.answerCbQuery', 'coach_slot_toggle_no_user', 'Не знайдено коуча').catch(() => undefined)
      return true
    }
    const status = statusRaw === 'OPEN' ? ZoomSlotStatus.OPEN : ZoomSlotStatus.CLOSED
    const slot = await prisma.zoomSlot.findUnique({ where: { id: slotId }, select: { coachId: true } })
    if (!slot || slot.coachId !== coachId) {
      await planAck(ctx, 'ctx.answerCbQuery', 'coach_slot_toggle_forbidden', 'Немає доступу').catch(() => undefined)
      return true
    }
    await toggleCoachSlotStatus({ slotId, coachId, status })
    await planAck(ctx, 'ctx.answerCbQuery', 'coach_slot_toggle_ok', abTestZoomContent.coachSchedule.updated).catch(() => undefined)
    return handleZoomCallback(ctx, 'coach:my_schedule', coachId)
  }

  if (!action.startsWith('zoom:')) return false

  if (action === 'zoom:next_sessions') {
    const sessions = await getUpcomingGroupSessions(3)
    await planAck(ctx, 'ctx.answerCbQuery', 'zoom_next_sessions_ack').catch(() => undefined)
    if (!sessions.length) {
      await planMessage(
        ctx,
        'ctx.reply',
        'zoom_next_sessions_empty',
        'Розклад практик публікується щонеділі.\nНаступна сесія зʼявиться тут автоматично.',
      ).catch(() => undefined)
      return true
    }
    const lines = sessions.map((session) => {
      const dt = session.scheduledAt.toLocaleString('uk-UA', {
        weekday: 'short',
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
      return `${dt} — ${session.topic}`
    })
    await planMessage(
      ctx,
      'ctx.reply',
      'zoom_next_sessions_list',
      `Найближчі Zoom-практики ФОКУС:\n\n${lines.join('\n')}\n\nПосилання на підключення надходить за 2 години до початку.`,
    ).catch(() => undefined)
    return true
  }

  const telegramUserId = String(ctx.from?.id ?? '').trim()
  const effectiveUserId = userId ?? (
    telegramUserId
      ? (await prisma.user.findUnique({ where: { telegramUserId }, select: { id: true } }))?.id ?? null
      : null
  )
  if (!effectiveUserId) {
    await planAck(ctx, 'ctx.answerCbQuery', 'zoom_callback_no_user', 'Не знайдено користувача').catch(() => undefined)
    return true
  }

  if (action.startsWith('zoom:swap:accept:')) {
    const [, , , swapId, sessionIdTo] = action.split(':')
    if (!swapId || !sessionIdTo) return true
    await acceptSwapRequest(swapId, effectiveUserId, sessionIdTo)
    await planAck(ctx, 'ctx.answerCbQuery', 'zoom_swap_accept_ok', '✅ Обмін підтверджено!').catch(() => undefined)
    await ctx.editMessageText('✅ Обмін підтверджено. Дані сесій оновлено.').catch(() => undefined)
    return true
  }

  if (action.startsWith('zoom:swap:decline:')) {
    const [, , , swapId] = action.split(':')
    if (!swapId) return true
    await declineSwapRequest(swapId, effectiveUserId)
    await planAck(ctx, 'ctx.answerCbQuery', 'zoom_swap_decline_ok', 'Відхилено').catch(() => undefined)
    await ctx.editMessageText('Ви відхилили запит на обмін').catch(() => undefined)
    return true
  }

  if (action.startsWith('zoom:book:')) {
    const [, , sessionId] = action.split(':')
    if (!sessionId) return true
    await bookPrivateSlot(effectiveUserId, sessionId)
    await planAck(ctx, 'ctx.answerCbQuery', 'zoom_book_ok', '📅 Записано!').catch(() => undefined)
    await planMessage(ctx, 'ctx.reply', 'zoom_book_confirm', '📅 Записано! Перевір Zoom-календар.').catch(() => undefined)
    return true
  }

  if (action.startsWith('zoom:cancel:')) {
    const [, , sessionId] = action.split(':')
    if (!sessionId) return true
    await cancelPrivateBooking(effectiveUserId, sessionId)
    await planAck(ctx, 'ctx.answerCbQuery', 'zoom_cancel_ok', 'Запис скасовано').catch(() => undefined)
    return true
  }

  return false
}
