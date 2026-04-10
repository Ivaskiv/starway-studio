import { prisma } from '../../../db/client.js'
import { canRunLeadMagnetFlow } from '../../flow-control/service.js'
import { triggerLeadMagnet } from '../../integrations/sendpulse/sendpulse.service.js'

export async function startLeadMagnet(userId: string, chatId: string, payload: string) {
  if (!(await canRunLeadMagnetFlow(userId))) {
    return false
  }

  const existingLead = await prisma.funnelLead.findFirst({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    select: { id: true },
  })

  if (existingLead) {
    await prisma.funnelLead.update({
      where: { id: existingLead.id },
      data: {
        status: 'LEAD',
        source: payload,
        notes: 'active_lead_magnet_session',
      },
    })
  } else {
    await prisma.funnelLead.create({
      data: {
        userId,
        status: 'LEAD',
        source: payload,
        notes: 'active_lead_magnet_session',
      },
    })
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      leadMagnetSentAt: new Date(),
      funnelStage: 'LEAD',
      funnelUpdatedAt: new Date(),
    },
  }).catch(() => null)

  await triggerLeadMagnet(chatId)
  return true
}
