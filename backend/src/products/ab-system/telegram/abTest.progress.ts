import type { Prisma } from '@starway/db/prisma-client'

import { resolveTelegramWebappBaseUrl } from '../../../config/webapp.js'
import { prisma } from '../../../db/client.js'
import {
  AB_TEST_UI_SETTINGS_KEY,
  buildAbTestProgressPatch,
  normalizeAbTestProgress,
  type AbTestProgress,
} from '../../../core/state-machine/abTestFoundation.js'

export type UiSettingsObject = Record<string, unknown>
export type SettingsObject = Record<string, unknown>

export function isJsonObject(value: unknown): value is Prisma.JsonObject {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

export function getUiSettings(raw: unknown): UiSettingsObject {
  return isJsonObject(raw) ? { ...(raw as UiSettingsObject) } : {}
}

export function getSettingsObject(raw: unknown): SettingsObject {
  return isJsonObject(raw) ? { ...(raw as SettingsObject) } : {}
}

export function readTimestamp(raw: unknown): Date | null {
  if (typeof raw !== 'string' || !raw.trim()) {
    return null
  }

  const date = new Date(raw)
  return Number.isFinite(date.getTime()) ? date : null
}

export function resolvePublicFrontendBaseUrl() {
  return resolveTelegramWebappBaseUrl()
}

export function getAbTestProgressFromUiSettings(uiSettings: unknown): AbTestProgress {
  const record = getUiSettings(uiSettings)
  return normalizeAbTestProgress(record[AB_TEST_UI_SETTINGS_KEY])
}

export function mergeUiSettings(
  current: unknown,
  progress: AbTestProgress
): Prisma.InputJsonValue {
  return {
    ...getUiSettings(current),
    [AB_TEST_UI_SETTINGS_KEY]: progress,
  } as Prisma.InputJsonValue
}

export async function loadUserUiSettings(userId: string): Promise<UiSettingsObject> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { uiSettings: true },
  })

  return getUiSettings(user?.uiSettings)
}

export async function loadAbTestProgress(userId: string): Promise<AbTestProgress> {
  const uiSettings = await loadUserUiSettings(userId)
  return getAbTestProgressFromUiSettings(uiSettings)
}

export async function saveAbTestProgress(
  userId: string,
  progress: AbTestProgress
): Promise<AbTestProgress> {
  const uiSettings = await loadUserUiSettings(userId)
  await prisma.user.update({
    where: { id: userId },
    data: {
      uiSettings: mergeUiSettings(uiSettings, progress),
    },
  })
  return progress
}

export async function patchAbTestProgress(
  userId: string,
  patch: Parameters<typeof buildAbTestProgressPatch>[1]
): Promise<AbTestProgress> {
  const current = await loadAbTestProgress(userId)
  const next = buildAbTestProgressPatch(current, patch)
  return saveAbTestProgress(userId, next)
}
