import type { Prisma } from '@starway/db/prisma-client'

import { prisma } from '../../../db/client.js'
import { getUiSettings, isJsonObject } from '../../ab-system/telegram/abTest.progress.js'

export const WELCOME_TEST_UI_KEY = 'welcomeTest'

export type WelcomeTestPaymentStatus = 'PAYMENT_PENDING' | 'PAID'

export type WelcomeTestPaymentRecord = {
  status: WelcomeTestPaymentStatus
  paymentProvider: 'wayforpay'
  paymentId: string | null
  paidAt: string | null
  linkToken: string | null
}

function normalizePayment(raw: unknown): WelcomeTestPaymentRecord | null {
  if (!isJsonObject(raw)) return null
  const status = raw.status
  if (status !== 'PAYMENT_PENDING' && status !== 'PAID') return null
  return {
    status,
    paymentProvider: 'wayforpay',
    paymentId: typeof raw.paymentId === 'string' ? raw.paymentId : null,
    paidAt: typeof raw.paidAt === 'string' ? raw.paidAt : null,
    linkToken: typeof raw.linkToken === 'string' ? raw.linkToken : null,
  }
}

export function getWelcomeTestPaymentFromUiSettings(uiSettings: unknown): WelcomeTestPaymentRecord | null {
  const record = getUiSettings(uiSettings)
  const welcome = record[WELCOME_TEST_UI_KEY]
  if (!isJsonObject(welcome)) return null
  return normalizePayment(welcome.payment)
}

export async function saveWelcomeTestPayment(
  userId: string,
  payment: WelcomeTestPaymentRecord
): Promise<void> {
  const uiSettings = getUiSettings(
    (
      await prisma.user.findUnique({
        where: { id: userId },
        select: { uiSettings: true },
      })
    )?.uiSettings
  )

  const welcome = isJsonObject(uiSettings[WELCOME_TEST_UI_KEY])
    ? { ...(uiSettings[WELCOME_TEST_UI_KEY] as Record<string, unknown>) }
    : {}

  await prisma.user.update({
    where: { id: userId },
    data: {
      uiSettings: {
        ...uiSettings,
        [WELCOME_TEST_UI_KEY]: {
          ...welcome,
          payment,
        },
      } as Prisma.InputJsonValue,
    },
  })
}

export async function markWelcomeTestPaymentPending(
  userId: string,
  input: { linkToken: string; paymentId: string }
): Promise<void> {
  await saveWelcomeTestPayment(userId, {
    status: 'PAYMENT_PENDING',
    paymentProvider: 'wayforpay',
    paymentId: input.paymentId,
    paidAt: null,
    linkToken: input.linkToken,
  })
}

export async function markWelcomeTestPaymentPaid(userId: string): Promise<void> {
  const current = getWelcomeTestPaymentFromUiSettings(
    (await prisma.user.findUnique({ where: { id: userId }, select: { uiSettings: true } }))
      ?.uiSettings
  )

  await saveWelcomeTestPayment(userId, {
    status: 'PAID',
    paymentProvider: 'wayforpay',
    paymentId: current?.paymentId ?? null,
    paidAt: new Date().toISOString(),
    linkToken: current?.linkToken ?? null,
  })
}

export async function isFocusSubscriptionActive(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { lifecycleState: true },
  })
  if (user?.lifecycleState === 'focus_active' || user?.lifecycleState === 'platform_active') {
    return true
  }

  const focusProduct = await prisma.product.findFirst({
    where: { code: { in: ['focus', 'FOCUS'] } },
    select: { id: true },
  })
  if (!focusProduct) return false

  const subscription = await prisma.productSubscription.findFirst({
    where: {
      userId,
      productId: focusProduct.id,
      status: 'active',
      expiresAt: { gt: new Date() },
    },
  })

  return Boolean(subscription)
}
