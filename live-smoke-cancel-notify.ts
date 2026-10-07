import { config } from 'dotenv'
import { resolve } from 'node:path'

config({ path: resolve(process.cwd(), 'backend/.env') })
config({ path: resolve(process.cwd(), '.env') })

const marker = 'LIVE_SMOKE_TEST_CANCEL_NOTIFY'
const userId = 'e8262934-9454-4926-b734-65d03bca699e'

async function main() {
  const [{ prisma }, { createFullSession, cancelSession }, { createRequest: createZoomCommerceRequest, resolveZoomIndividualPaymentTerms }, { collectCancellationAffectedUserIds }, { bot, resolveOpsChatId }] = await Promise.all([
    import('./backend/src/db/client.js'),
    import('./backend/src/modules/zoom/core/zoom.session.service.js'),
    import('./backend/src/modules/zoom/commerce/zoom.commerce-request.service.js'),
    import('./backend/src/modules/zoom/core/zoom.operations.service.js'),
    import('./backend/src/lib/telegram.js'),
  ])

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, telegramChatId: true, telegramLinks: { where: { isActive: true, chatId: { not: null } }, orderBy: { createdAt: 'desc' }, take: 1, select: { chatId: true } } },
  })
  const userChatId = user?.telegramChatId ?? user?.telegramLinks[0]?.chatId ?? null
  if (!user || !userChatId) throw new Error('LIVE_SMOKE_USER_OR_CHAT_NOT_FOUND')

  const latest = await prisma.zoomCommerceRequest.findFirst({
    where: { kind: 'INDIVIDUAL', expertId: { not: '' } },
    orderBy: { createdAt: 'desc' },
    select: { expertId: true, id: true, zoomSessionId: true },
  })
  if (!latest?.expertId) throw new Error('LIVE_SMOKE_EXPERT_NOT_FOUND')

  const topic = `${marker} — Individual cancellation notification smoke`
  let session = await prisma.zoomSession.findFirst({
    where: { topic, status: 'SCHEDULED', commerceRequests: { none: {} } },
    orderBy: { createdAt: 'desc' },
  })
  if (!session) {
    const scheduledAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
    scheduledAt.setUTCMinutes(0, 0, 0)
    session = await createFullSession({
      expertId: latest.expertId,
      scheduledAt,
      topic,
      requests: {
        type: 'individual',
        maxAttendees: 1,
        participantUserId: userId,
        smokeTest: marker,
        metadata: { marker, purpose: 'cancel_notification_live_smoke' },
      },
    }, { suppressAutomation: true, suppressSessionNotification: true })
  }

  const paymentTerms = resolveZoomIndividualPaymentTerms()
  const request = await createZoomCommerceRequest({
    kind: 'INDIVIDUAL',
    requesterUserId: userId,
    expertId: latest.expertId,
    zoomSessionId: session.id,
    scheduledAt: session.scheduledAt,
    amount: paymentTerms.amount,
    currency: paymentTerms.currency,
  })
  await prisma.event.upsert({
    where: { id: `zoom-context:${request.id}` },
    update: { payload: { requestId: request.id, marker, purpose: 'cancel_notification_live_smoke' } },
    create: { id: `zoom-context:${request.id}`, userId, type: 'ZOOM_COMMERCE_CONTEXT', source: 'live_smoke', payload: { requestId: request.id, marker, purpose: 'cancel_notification_live_smoke' } },
  })

  const affectedUserIds = await collectCancellationAffectedUserIds(session.id)
  if (affectedUserIds.length !== 1 || affectedUserIds[0] !== userId) {
    throw new Error(`LIVE_SMOKE_AFFECTED_USERS_UNEXPECTED:${JSON.stringify(affectedUserIds)}`)
  }

  const sends: Array<{ chatId: string; text: string; options: unknown }> = []
  const originalSendMessage = bot.telegram.sendMessage.bind(bot.telegram)
  ;(bot.telegram as any).sendMessage = async (chatId: string | number, text: string, options?: unknown) => {
    sends.push({ chatId: String(chatId), text: String(text), options })
    return originalSendMessage(chatId, text, options as any)
  }

  try {
    await cancelSession(session.id, { affectedUserIds })
    await new Promise((resolve) => setTimeout(resolve, 4000))
  } finally {
    ;(bot.telegram as any).sendMessage = originalSendMessage
  }

  const opsChatId = resolveOpsChatId()
  const userCancelSends = sends.filter((send) =>
    send.chatId === String(userChatId)
    && send.text.includes('СЕСІЮ СКАСОВАНО')
    && JSON.stringify(send.options).includes('ВІДКРИТИ КАЛЕНДАР'))
  const opsCancelSends = sends.filter((send) =>
    send.chatId === String(opsChatId)
    && send.text.includes('ТРАНЗАКЦІЙНИЙ ЗВІТ')
    && send.text.includes('Тип події: Скасування'))
  const persisted = await prisma.zoomSession.findUnique({ where: { id: session.id }, select: { status: true } })

  console.log(JSON.stringify({
    marker,
    createdSessionId: session.id,
    createdRequestId: request.id,
    latestIndividualSource: latest,
    affectedUserIds,
    persistedSessionStatus: persisted?.status,
    userChatId: String(userChatId),
    opsChatId: String(opsChatId),
    userCancelSendCount: userCancelSends.length,
    opsCancelSendCount: opsCancelSends.length,
    userCancelEvidence: userCancelSends.map((send) => ({ chatId: send.chatId, text: send.text, options: send.options })),
    opsCancelEvidence: opsCancelSends.map((send) => ({ chatId: send.chatId, text: send.text })),
  }, null, 2))

  await prisma.$disconnect()
}

main().catch((error) => {
  console.error('[LIVE_SMOKE_CANCEL_NOTIFY_ERROR]', error)
  process.exitCode = 1
})
