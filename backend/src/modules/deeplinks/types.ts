import type { Prisma } from '@starway/db/prisma-client'

export type DeepLinkSource = 'telegram' | 'web' | 'miniapp'
export type DeepLinkTarget = 'telegram' | 'web' | 'miniapp'

export type DeepLinkAction =
  | 'bind_telegram'
  | 'continue_flow'
  | 'open_web'
  | 'open_miniapp'
  | 'resume_task'
  | 'open_mentor'
  | 'magic_login'

export interface GenerateDeepLinkInput {
  userId: string
  action: DeepLinkAction
  source: DeepLinkSource
  target: DeepLinkTarget
  path?: string | null
  payload?: Prisma.InputJsonValue
  expiresInSeconds?: number
}

export interface ResolvedDeepLink {
  id: string
  userId: string
  token: string
  action: DeepLinkAction
  source: DeepLinkSource
  target: DeepLinkTarget
  path: string | null
  payload: Prisma.JsonValue | null
  createdAt: string
  expiresAt: string
  consumedAt: string | null
}

export interface ResolveDeepLinkInput {
  token: string
  consume?: boolean
}
