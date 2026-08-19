import {
  Prisma,
  type Role,
  type UserState,
  type UserStep,
} from '@starway/db/prisma-client'

export type Tx = Prisma.TransactionClient

export type MergeReason = 'email_attach' | 'telegram_identity'

export type MergeCandidate = {
  id: string
  email: string
  phone: string | null
  role: Role
  firstName: string | null
  lastName: string | null
  passwordHash: string | null
  telegramUserId: string | null
  telegramUserName: string | null
  telegramChatId: string | null
  telegramLinkedAt: Date | null
  currentState: UserState
  currentStep: UserStep
  onboardingStartedAt: Date | null
  trialStartsAt: Date | null
  trialEndsAt: Date | null
  settings: Prisma.JsonValue | null
  lastLoginAt: Date | null
  createdAt: Date
  updatedAt: Date
}
