import type { Request, Response } from 'express'
import { prisma } from '../../db/client.js'
import { serverError } from '../../utils/serverError.js'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { assignUserToExpert, resolveDefaultMentorOwnerExpertId } from '../experts/ownership.service.js'
import { trackEvent } from '../events/service.js'
import { syncLifecycleForUser } from '../flow-control/service.js'
import { UserAutoCreationDisabledError, UserCreationSource } from '../user/userCreation.service.js'
import { resolveOrCreateUser } from '../user/resolveOrCreateUser.js'

async function resolveExpertId(expertId: string | null | undefined): Promise<string | null> {
  const value = String(expertId ?? '').trim()
  if (!value) return null

  const expert = await prisma.expert.findUnique({
    where: { id: value },
    select: { id: true },
  }).catch(() => null)

  return expert?.id ?? null
}

export async function registerLeadMagnet(req: Request, res: Response) {
  const { name, phone, email, packageType = 'free', expertId, utm_source, utm_campaign, product_id } = req.body as {
    name: string
    phone?: string
    email?: string
    packageType?: 'free' | 'trial' | 'paid'
    expertId?: string
    utm_source?: string
    utm_campaign?: string
    product_id?: string
  }

  if (!name || (!phone && !email)) {
    return res.status(400).json({ error: 'Вкажіть ім\'я та контакт' })
  }

  try {
    const validatedExpertId = await resolveExpertId(expertId)
    const resolvedOwnerExpertId = validatedExpertId ?? await resolveDefaultMentorOwnerExpertId()
    // Генеруємо email якщо немає (phone-only реєстрація)
    const userEmail = email ?? `${phone?.replace(/\D/g, '')}@starway.app`

    const passwordHash = await bcrypt.hash(Math.random().toString(36), 10)
    const resolved = await resolveOrCreateUser(
      { email: userEmail },
      {
        source: UserCreationSource.LEAD_MAGNET,
        requestId: String(req.headers['x-request-id'] ?? '').trim() || null,
        name,
        expertId: resolvedOwnerExpertId ?? undefined,
        passwordHash,
        createData: {
          currentStep: 'START_FLOW',
        },
      },
    ).catch((error) => {
      if (error instanceof UserAutoCreationDisabledError) {
        return null
      }
      throw error
    })

    if (!resolved) {
      return res.status(403).json({ error: 'user_creation_disabled' })
    }

    let user = await prisma.user.findUnique({ where: { id: resolved.user.id } })
    if (!user) {
      return res.status(500).json({ error: 'leadmagnet_user_not_found_after_create' })
    }

    if (resolvedOwnerExpertId && user.expertId !== resolvedOwnerExpertId) {
      await assignUserToExpert(user.id, resolvedOwnerExpertId)
      user = await prisma.user.findUnique({ where: { id: user.id } })
    }

    if (!user) {
      return res.status(500).json({ error: 'leadmagnet_user_not_found_after_assignment' })
    }

    const effectiveExpertId = resolvedOwnerExpertId ?? user.expertId ?? null

    await trackEvent({
      userId: user.id,
      type: 'lead_entered_app',
      source: 'web',
      state: packageType === 'trial' ? 'in_trial' : 'lead_magnet',
      payload: {
        email: user.email,
        utm_source: utm_source ?? null,
        utm_campaign: utm_campaign ?? null,
        product_id: product_id ?? null,
        expertId: effectiveExpertId,
        packageType,
      },
    })

    // Якщо trial — активуємо 7-денний trial
    if (packageType === 'trial') {
      const trialEnd = new Date()
      trialEnd.setDate(trialEnd.getDate() + 7)

      const existing = await prisma.subscription.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
      })

      if (existing) {
        await prisma.subscription.update({
          where: { id: existing.id },
          data: {
            status: 'TRIAL',
            planCode: 'trial_7d',
            trialEndsAt: trialEnd,
            expertId: effectiveExpertId ?? undefined,
          },
        })
      } else {
        await prisma.subscription.create({
          data: {
            userId: user.id,
            status: 'TRIAL',
            planCode: 'trial_7d',
            trialEndsAt: trialEnd,
            expertId: effectiveExpertId ?? undefined,
          },
        })
      }
    }

    await syncLifecycleForUser(user.id)

    // Видаємо токен щоб одразу залогінити
    const accessToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_ACCESS_SECRET!,
      { expiresIn: '15m' }
    )

    res.json({
      ok: true,
      accessToken,
      user: { id: user.id, name: user.firstName, email: user.email },
      packageType,
      message: packageType === 'trial'
        ? 'AI-ментор активовано на 7 днів!'
        : 'Доступ до лідмагніту відкрито!',
    })
  } catch (err) {
    serverError(res, 'leadmagnet-register', err)
  }
}

export async function getLeadMagnetStatus(req: Request, res: Response) {
  const userId = (req as any).user?.id
  try {
    const subscription = await prisma.subscription.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    })
    res.json({
      plan: subscription?.planCode ?? 'free',
      status: subscription?.status ?? 'FREE',
      trialEndsAt: subscription?.trialEndsAt ?? null,
    })
  } catch (err) {
    serverError(res, 'leadmagnet-status', err)
  }
}
