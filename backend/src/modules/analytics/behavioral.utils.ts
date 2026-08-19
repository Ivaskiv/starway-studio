import type { Prisma } from '@starway/db/prisma-client'

export function isJsonObject(value: unknown): value is Prisma.JsonObject {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

export function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

export function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

export function asBoolean(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null
}

export function getField(payload: Prisma.JsonObject, key: string): unknown {
  return payload[key]
}

export function getNumberField(payload: Prisma.JsonObject, keys: string[]): number | null {
  for (const key of keys) {
    const value = asNumber(getField(payload, key))
    if (value !== null) return value
  }
  return null
}

export function getStringField(payload: Prisma.JsonObject, keys: string[]): string | null {
  for (const key of keys) {
    const value = asString(getField(payload, key))
    if (value) return value
  }
  return null
}

export function getBooleanField(payload: Prisma.JsonObject, keys: string[]): boolean | null {
  for (const key of keys) {
    const value = asBoolean(getField(payload, key))
    if (value !== null) return value
  }
  return null
}
