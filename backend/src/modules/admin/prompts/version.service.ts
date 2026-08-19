import type { Prisma } from '@starway/db/prisma-client'

import { prisma } from '../../../db/client.js'
import { invalidateTelegramAgentPromptCache } from '../../ai/gateway/index.js'

export async function createPromptVersion(input: {
  name: string
  content: string
  isActive: boolean
}) {
  const created = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const latest = await tx.promptVersion.findFirst({
      where: { name: input.name },
      orderBy: { version: 'desc' },
      select: { version: true },
    })

    if (input.isActive) {
      await tx.promptVersion.updateMany({
        where: { name: input.name, isActive: true },
        data: { isActive: false },
      })
    }

    return tx.promptVersion.create({
      data: {
        name: input.name,
        version: (latest?.version ?? 0) + 1,
        content: input.content,
        isActive: input.isActive,
      },
    })
  })

  if (created.isActive) {
    await invalidateTelegramAgentPromptCache()
  }

  return created
}

export async function activatePromptVersion(id: string) {
  const activated = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const existing = await tx.promptVersion.findUnique({ where: { id } })
    if (!existing) return null

    await tx.promptVersion.updateMany({
      where: { name: existing.name, isActive: true },
      data: { isActive: false },
    })

    return tx.promptVersion.update({
      where: { id: existing.id },
      data: { isActive: true },
    })
  })

  if (activated) {
    await invalidateTelegramAgentPromptCache()
  }

  return activated
}
