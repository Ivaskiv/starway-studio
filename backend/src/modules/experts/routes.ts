// backend/src/modules/experts/routes.ts
// ПЕРЕВІР точний шлях authenticate:
// grep -rn "export.*authenticate\|export.*authRequired" backend/src/modules/auth/ | head -5

import { Router, Request } from 'express'
import type { Response } from 'express'
import { prisma } from '../../db/client.js'
import { encryptToken, decryptToken } from '../../lib/secrets.js'
import { reloadExpertBot } from '../../lib/bot-manager.js'
import { serverError } from '../../utils/serverError.js'
import { authenticate } from '../auth/middleware/auth.js' // адаптуй шлях
import { Telegraf } from 'telegraf'

const router = Router()

// ── Публічний список Expert-ів (тільки з активним ботом) ────────────────
// GET /api/experts
router.get('/', async (_req: Request, res: Response) => {
  try {
    const experts = await prisma.user.findMany({
      where: {
        role: 'EXPERT',
        expertBots: { some: { isActive: true } },
      },
      select: {
        id:   true,
        name: true,
        expertProfile: {
          select: { displayName: true, bio: true, avatarUrl: true, specialty: true },
        },
        expertBots: {
          where: { isActive: true },
          select: { botUsername: true, botName: true },
          take: 1,
        },
        _count: {
          select: { productSubscriptions: true },
        },
      },
    })

    // Фільтруємо тих хто реально налаштований
    const result = experts
      .filter(e => e.expertProfile !== null)
      .map(e => ({
        id:          e.id,
        displayName: e.expertProfile?.displayName ?? e.name,
        bio:         e.expertProfile?.bio,
        avatarUrl:   e.expertProfile?.avatarUrl,
        specialty:   e.expertProfile?.specialty,
        botUsername: e.expertBots[0]?.botUsername,
        botName: e.expertBots[0]?.botName,
        studentsCount: e._count.productSubscriptions,
      }))

    res.json({ experts: result })
  } catch (err) {
    serverError(res, 'list-experts', err)
  }
})

// ── Стати Expert-ом + підключити бот ─────────────────────────────────────
// POST /api/experts/register-bot
router.post('/register-bot', authenticate, async (req: Request, res: Response) => {
  const userId   = (req as any).user?.id
  const { botToken, displayName, bio, specialty, avatarUrl } = req.body as {
    botToken:    string
    displayName: string
    bio?:        string
    specialty?:  string
    avatarUrl?:  string
  }

  // Валідація
  if (!botToken?.match(/^\d{8,10}:[A-Za-z0-9_-]{35,}$/)) {
    return res.status(400).json({ error: 'Невалідний формат токена' })
  }
  if (!displayName?.trim()) {
    return res.status(400).json({ error: 'displayName обовʼязковий' })
  }

  try {
    // 1. Верифікуємо токен через Telegram
    const testBot: Telegraf = new Telegraf(botToken)
    const botInfo = await testBot.telegram.getMe().catch(() => null)
    if (!botInfo) {
      return res.status(400).json({
        error: 'Telegram не прийняв цей токен. Перевір — він має бути від @BotFather.',
      })
    }

    // 2. Шифруємо токен
    const encryptedToken = encryptToken(botToken)

    // 3. Транзакція: оновлюємо роль + зберігаємо все
    await prisma.$transaction(async (tx) => {
      // Оновлюємо роль
      // ПЕРЕВІР: якщо role це enum — використай значення enum
      await tx.user.update({
        where: { id: userId },
        data:  { role: 'EXPERT' },
      })

      // Створюємо/оновлюємо ExpertProfile
      await tx.expertProfile.upsert({
        where:  { expertId: userId },
        create: { expertId: userId, displayName, bio, specialty, avatarUrl, isPublic: true },
        update: { displayName, bio, specialty, avatarUrl },
      })

      // Зберігаємо зашифрований токен
      const configData = {
        expertId:    userId,
        botToken:    encryptedToken,
        botUsername: botInfo.username ?? '',
        botName:     botInfo.first_name ?? displayName,
        isActive:    true,
      }

      const existingBot = await tx.expertBotConfig.findFirst({ where: { expertId: userId } })
      if (existingBot) {
        await tx.expertBotConfig.update({
          where: { id: existingBot.id },
          data:  configData,
        })
      } else {
        await tx.expertBotConfig.create({ data: configData })
      }
    })

    // 4. Запускаємо бота
    await reloadExpertBot(userId)

    res.json({
      ok:       true,
      role:     'expert',
      username: botInfo.username,
    })
  } catch (err: any) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Бот з таким username вже підключено' })
    }
    serverError(res, 'register-bot', err)
  }
})

// ── Мій профіль Expert-а ─────────────────────────────────────────────────
// GET /api/experts/me
router.get('/me', authenticate, async (req: Request, res: Response) => {
  const userId = (req as any).user?.id
  try {
    const [profile, bot, studentsCount] = await Promise.all([
      prisma.expertProfile.findUnique({ where: { expertId: userId } }),
      prisma.expertBotConfig.findFirst({
        where:  { expertId: userId },
        select: { botUsername: true, botName: true, isActive: true, createdAt: true },
        // ніколи не вибираємо botToken
      }),
      prisma.productSubscription.count({
        where: {
          product: { ownerId: userId },
          status:  { in: ['active', 'trial'] },
        },
      }).catch(() => 0),
    ])

    res.json({ profile, bot, studentsCount })
  } catch (err) {
    serverError(res, 'expert-me', err)
  }
})

// ── Оновлення профілю ────────────────────────────────────────────────────
// PUT /api/experts/me
router.put('/me', authenticate, async (req: Request, res: Response) => {
  const userId = (req as any).user?.id
  const { displayName, bio, specialty, avatarUrl, isPublic } = req.body
  try {
    const profile = await prisma.expertProfile.upsert({
      where:  { expertId: userId },
      create: { expertId: userId, displayName, bio, specialty, avatarUrl, isPublic },
      update: { displayName, bio, specialty, avatarUrl, isPublic },
    })
    res.json({ ok: true, profile })
  } catch (err) {
    serverError(res, 'expert-update', err)
  }
})

// ── Список студентів Expert-а ─────────────────────────────────────────────
// GET /api/experts/students
router.get('/students', authenticate, async (req: Request, res: Response) => {
  const ownerId = (req as any).user?.id
  try {
    const subs = await prisma.productSubscription.findMany({
      where: {
        product: { ownerId },
        status:  { in: ['active', 'trial'] },
      },
      include: {
        user: {
          select: {
            id:    true,
            name:  true,
            email: true,
            telegramLinks: {
              select: { chatId: true, isActive: true },
              take: 1,
              orderBy: { updatedAt: 'desc' },
            },
          },
        },
        product: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    res.json({
      students: subs.map((s) => {
        const link = s.user.telegramLinks?.[0]
        return {
          ...s.user,
          telegramChatId: link?.chatId ?? null,
          telegramLinked: Boolean(link?.isActive),
          productId:   s.productId,
          productName: s.product.name,
          status:      s.status,
          expiresAt:   s.expiresAt,
        }
      }),
    })
  } catch (err) {
    serverError(res, 'expert-students', err)
  }
})

// ── User підписується на Product Expert-а ────────────────────────────────
// POST /api/experts/:expertId/subscribe
// Викликається після успішної оплати WayForPay
router.post('/:expertId/subscribe', authenticate, async (req: Request, res: Response) => {
  const userId   = (req as any).user?.id
  const { expertId }  = req.params
  const { productId, amount, transactionId } = req.body as {
    productId:     string
    amount:        number
    transactionId: string
  }

  try {
    // Перевіряємо що Product належить цьому Expert-у
    const product = await prisma.product.findFirst({
      where: { id: productId, ownerId: expertId },
    })
    if (!product) {
      return res.status(404).json({ error: 'Продукт не знайдено' })
    }

    // Створюємо підписку
    const expiresAt = new Date()
    expiresAt.setMonth(expiresAt.getMonth() + 1) // 30 днів

    const sub = await prisma.productSubscription.upsert({
      where:  { userId_productId: { userId, productId } },
      create: {
        userId,
        productId,
        status:    'active',
        paidAt:    new Date(),
        amount,
        expiresAt,
      },
      update: {
        status:    'active',
        paidAt:    new Date(),
        amount,
        expiresAt,
      },
    })

    // Повертаємо deeplink до бота Expert-а
    const bot = await prisma.expertBotConfig.findFirst({
      where:  { expertId },
      select: { botUsername: true },
    })

    res.json({
      ok:          true,
      subscription: sub,
      telegramUrl: bot
        ? `https://t.me/${bot.botUsername}?start=link_${userId}`
        : null,
    })
  } catch (err) {
    serverError(res, 'subscribe-expert', err)
  }
})

// ── Видалити бота ─────────────────────────────────────────────────────────
// DELETE /api/experts/bot
router.delete('/bot', authenticate, async (req: Request, res: Response) => {
  const userId = (req as any).user?.id
  try {
    const { stopExpertBot } = await import('../../lib/bot-manager.js')
    await stopExpertBot(userId)
    const botConfig = await prisma.expertBotConfig.findFirst({ where: { expertId: userId } })
    if (botConfig) {
      await prisma.expertBotConfig.update({
        where: { id: botConfig.id },
        data:  { isActive: false },
      })
    }
    res.json({ ok: true })
  } catch (err) {
    serverError(res, 'delete-bot', err)
  }
})

export default router
