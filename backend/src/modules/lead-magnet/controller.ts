import type { Request, Response } from 'express'
import { prisma } from '../../db/client.js'
import { serverError } from '../../utils/serverError.js'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

export async function registerLeadMagnet(req: Request, res: Response) {
  const { name, phone, email, packageType = 'free' } = req.body as {
    name: string
    phone?: string
    email?: string
    packageType?: 'free' | 'trial' | 'paid'
  }

  if (!name || (!phone && !email)) {
    return res.status(400).json({ error: 'Вкажіть ім\'я та контакт' })
  }

  try {
    // Генеруємо email якщо немає (phone-only реєстрація)
    const userEmail = email ?? `${phone?.replace(/\D/g, '')}@starway.app`

    // Перевіряємо чи вже існує
    let user = await prisma.user.findUnique({ where: { email: userEmail } })

    if (!user) {
      const passwordHash = await bcrypt.hash(Math.random().toString(36), 10)
      user = await prisma.user.create({
        data: {
          email: userEmail,
          name,
          passwordHash,
          onboardingStage: 'lead_magnet',
        },
      })
    }

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
          },
        })
      } else {
        await prisma.subscription.create({
          data: {
            userId: user.id,
            status: 'TRIAL',
            planCode: 'trial_7d',
            trialEndsAt: trialEnd,
          },
        })
      }
    }

    // Видаємо токен щоб одразу залогінити
    const accessToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: '15m' }
    )

    res.json({
      ok: true,
      accessToken,
      user: { id: user.id, name: user.name, email: user.email },
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
