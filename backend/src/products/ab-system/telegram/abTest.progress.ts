import type { Prisma } from '@starway/db/prisma-client'

import { resolveTelegramWebappBaseUrl } from '../../../config/webapp.js'
import { prisma } from '../../../db/client.js'
import { testOrchestrator } from '../../../core/orchestrator/testOrchestrator.js'
import {
  AB_TEST_UI_SETTINGS_KEY,
  buildAbTestProgressPatch,
  normalizeAbTestProgress,
  repairAbTestProgress,
  type AbTestProgress,
} from '../../../core/state-machine/abTestFoundation.js'

export type UiSettingsObject = Record<string, unknown>
export type SettingsObject = Record<string, unknown>

function normalizeEmail(value: string | null | undefined): string | null {
  const normalized = String(value ?? '').trim().toLowerCase()
  return normalized || null
}

function isValidEmail(value: string | null | undefined): boolean {
  const normalized = normalizeEmail(value)
  if (!normalized || normalized.length > 254) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)
}

function isPlaceholderEmail(value: string | null | undefined): boolean {
  const normalized = normalizeEmail(value)
  if (!normalized) return false
  return normalized.endsWith('@placeholder.starway.app')
    || normalized.startsWith('telegram-guest-')
    || normalized.startsWith('tg.')
}

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
    select: { settings: true },
  })

  const settings = getSettingsObject(user?.settings)
  const nestedUi = getUiSettings(settings.ui)
  if (Object.keys(nestedUi).length > 0) {
    return nestedUi
  }

  return {}
}

export async function getAbTestProfileEmail(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  })
  const email = normalizeEmail(user?.email)
  if (!isValidEmail(email) || isPlaceholderEmail(email)) {
    return null
  }

  return email
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

export function buildAbTestEmailGateMessage(profileEmail: string | null): string {
  if (profileEmail) {
    const email = escapeHtml(profileEmail)
    return [
      `У профілі вже є email: <a href="mailto:${email}">${email}</a>`,
      '',
      'Підтвердь його, надіславши ще раз одним повідомленням.',
      'Якщо він змінився — надішли актуальний email.',
    ].join('\n')
  }

  return [
    'Щоб зберегти результат, надішли email одним повідомленням.',
    '',
    'Після цього я покажу твій результат і наступний крок.',
  ].join('\n')
}

export async function ensureAbTestEmailCapturedFromProfile(userId: string, progress: AbTestProgress): Promise<AbTestProgress> {
  if (progress.email_stage === 'captured') {
    return progress
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  })
  const email = normalizeEmail(user?.email)
  if (!isValidEmail(email) || isPlaceholderEmail(email)) {
    return progress
  }

  const nowIso = new Date().toISOString()
  const next = buildAbTestProgressPatch(progress, {
    email_stage: 'captured',
    email_captured_at: progress.email_captured_at ?? nowIso,
    last_event_at: nowIso,
  })

  await saveAbTestProgress(userId, next)
  await testOrchestrator.onTestCompleted(
    userId,
    progress.result_key ?? null,
    email,
    {
      startedAt: progress.started_at ? new Date(progress.started_at) : undefined,
    },
  )

  return next
}

export async function loadAbTestProgress(userId: string): Promise<AbTestProgress> {
  const uiSettings = await loadUserUiSettings(userId)
  const progress = getAbTestProgressFromUiSettings(uiSettings)
  const repaired = repairAbTestProgress(progress)
  if (!repaired.repaired) {
    return repaired.progress
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { settings: true },
  })
  const settings = getSettingsObject(user?.settings)
  const nextUiSettings = mergeUiSettings(getUiSettings(settings.ui), repaired.progress)
  await prisma.user.update({
    where: { id: userId },
    data: {
      settings: {
        ...settings,
        ui: nextUiSettings,
      } as Prisma.InputJsonValue,
    },
  })
  console.warn('[AB_TEST_FLOW] invalid progress auto-recovered', {
    userId,
    reasons: repaired.reasons,
  })
  return repaired.progress
}

export async function saveAbTestProgress(
  userId: string,
  progress: AbTestProgress
): Promise<AbTestProgress> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { settings: true },
  })
  const uiSettings = await loadUserUiSettings(userId)
  const settings = getSettingsObject(user?.settings)
  const nextUiSettings = mergeUiSettings(uiSettings, progress)
  await prisma.user.update({
    where: { id: userId },
    data: {
      settings: {
        ...settings,
        ui: nextUiSettings,
      } as Prisma.InputJsonValue,
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
