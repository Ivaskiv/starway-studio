import type { Prisma } from '@starway/db/prisma-client'

import { prisma } from '../../db/client.js'

export enum UserCreationSource {
  TELEGRAM_START = 'TELEGRAM_START',
  TELEGRAM_MINIAPP = 'TELEGRAM_MINIAPP',
  GOOGLE_LOGIN = 'GOOGLE_LOGIN',
  LEAD_MAGNET = 'LEAD_MAGNET',
  TRACKING_EVENT = 'TRACKING_EVENT',
  FIRST_LOGIN = 'FIRST_LOGIN',
  ADMIN = 'ADMIN',
  SYSTEM = 'SYSTEM',
}

export class UserAutoCreationDisabledError extends Error {
  constructor(public readonly source: UserCreationSource) {
    super(`AUTO_USER_CREATION_DISABLED:${source}`)
    this.name = 'UserAutoCreationDisabledError'
  }
}

type UserCreationClient = Prisma.TransactionClient | typeof prisma

type CreateUserInput = {
  source: UserCreationSource
  data: Prisma.UserUncheckedCreateInput
  requestId?: string | null
  payloadSummary?: Prisma.InputJsonValue
  client?: UserCreationClient
}

const AUTO_CREATION_DISABLED =
  String(process.env.DISABLE_AUTO_USER_CREATION ?? 'false').trim().toLowerCase() === 'true'

function summarizePayload(data: Prisma.UserUncheckedCreateInput): Prisma.InputJsonValue {
  return {
    email: typeof data.email === 'string' ? data.email : null,
    phone: typeof data.phone === 'string' ? data.phone : null,
    firstName: typeof data.firstName === 'string' ? data.firstName : null,
    role: typeof data.role === 'string' ? data.role : 'USER',
    expertId: typeof data.expertId === 'string' ? data.expertId : null,
    telegramUserId: typeof data.telegramUserId === 'string' ? data.telegramUserId : null,
    telegramChatId: typeof data.telegramChatId === 'string' ? data.telegramChatId : null,
    telegramUserName: typeof data.telegramUserName === 'string' ? data.telegramUserName : null,
  }
}

export class UserCreationService {
  static async createUser(input: CreateUserInput): Promise<{ id: string }> {
    const client = input.client ?? prisma
    const summary = input.payloadSummary ?? summarizePayload(input.data)

    console.info('[USER_CREATION_ATTEMPT]', {
      source: input.source,
      requestId: input.requestId ?? null,
      timestamp: new Date().toISOString(),
      payloadSummary: summary,
    })

    if (AUTO_CREATION_DISABLED) {
      throw new UserAutoCreationDisabledError(input.source)
    }

    const created = await client.user.create({
      data: input.data,
      select: { id: true, email: true, telegramUserId: true },
    })

    await client.userCreationAudit.create({
      data: {
        userId: created.id,
        source: input.source,
        payloadSummary: summary,
      },
    })

    console.info('[USER_CREATED]', {
      userId: created.id,
      source: input.source,
      email: created.email,
      telegramUserId: created.telegramUserId ?? null,
      requestId: input.requestId ?? null,
      timestamp: new Date().toISOString(),
    })

    return { id: created.id }
  }
}
