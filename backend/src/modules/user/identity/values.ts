import { Prisma, Role } from '@starway/db/prisma-client'

export function normalizeEmail(email: string): string {
  return String(email ?? '').trim().toLowerCase()
}

export function isGuestEmail(email: string | null | undefined): boolean {
  if (typeof email !== 'string') return false
  return email.startsWith('telegram-guest-') || /^telegram-\d+@starway\.local$/i.test(email)
}

function isRecordObject(value: Prisma.JsonValue | null | undefined): value is Prisma.JsonObject {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

export function mergeJsonValues(
  source: Prisma.JsonValue | null | undefined,
  target: Prisma.JsonValue | null | undefined,
): Prisma.JsonValue | undefined {
  if (isRecordObject(source) && isRecordObject(target)) {
    return { ...source, ...target } as Prisma.JsonValue
  }

  if (target != null) return target
  if (source != null) return source
  return undefined
}

export function toJsonInput(
  value: Prisma.JsonValue | null | undefined,
): Prisma.InputJsonValue | typeof Prisma.JsonNull | undefined {
  if (typeof value === 'undefined') return undefined
  if (value === null) return Prisma.JsonNull
  return value as Prisma.InputJsonValue
}

export function toNullableJsonInput(
  value: Prisma.JsonValue | null | undefined,
): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | undefined {
  if (typeof value === 'undefined') return undefined
  if (value === null) return Prisma.JsonNull
  return value as Prisma.InputJsonValue
}

export function chooseRole(targetRole: Role, sourceRole: Role): Role {
  const order: Role[] = [
    Role.USER,
    Role.MENTOR,
    Role.EXPERT,
    Role.PRODUCT_OWNER,
    Role.ADMIN,
    Role.SUPERADMIN,
  ]

  return order.indexOf(sourceRole) > order.indexOf(targetRole) ? sourceRole : targetRole
}

export function maxDate(a: Date | null | undefined, b: Date | null | undefined): Date | null {
  if (!a) return b ?? null
  if (!b) return a
  return a > b ? a : b
}

export function minDate(a: Date | null | undefined, b: Date | null | undefined): Date | null {
  if (!a) return b ?? null
  if (!b) return a
  return a < b ? a : b
}

export function buildArchivedEmail(userId: string): string {
  return `merged+${userId}@starway.local`
}
