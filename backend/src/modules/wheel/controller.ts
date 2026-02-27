// backend/src/modules/wheel/controller.ts
// Express handlers для колеса балансу — CRUD + PDF + Telegram нагадування
// Приклад: POST /api/wheel → createWheelAssessment(req, res)

import { prisma } from '@/db/client.js';
import type { Response } from 'express';
import { createWheelPDF } from './pdf.js';
import {
  addWheelMicroTasks,
  createWheelEntry as createWheel,
  findWeakest,
  getLatestWheel,
  getWheelAnalytics,
  getWheelHistory,
  scoresFromMap,
  canFillWheel,
  findFocus
} from './service.js';
import { sendWheelNotification } from './telegram.js';
import type { WheelPDFData, WheelScore, WheelSphereId } from './types.js';
import { AuthenticatedRequest } from '@/types/globalTypes.js';

// ── helpers ───────────────────────────────────────────────────────────────────

/** Отримує expertId + balanceConfigId для юзера з БД */
async function resolveWheelContext(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      expertId: true,
      // Додаємо найближчий balanceWheelConfig через relation (якщо потрібно)
      // Але простіше взяти expertId і знайти config окремо або через expert
    },
  });

  if (!user || !user.expertId) {
    throw new Error('user_not_found_or_no_expert');
  }

  // Знаходимо дефолтний або останній balanceConfig через expertId
  const config = await prisma.balanceWheelConfig.findFirst({
    where: {
      expertId: user.expertId,
      deletedAt: null,
    },
    orderBy: { isDefault: 'desc' }, // спочатку дефолтний
    select: { id: true },
  });

  if (!config) {
    throw new Error('balance_config_not_found');
  }

  return {
    expertId: user.expertId,
    balanceConfigId: config.id,
  };
}

// ── Handlers ──────────────────────────────────────────────────────────────────

/** POST /api/wheel — створити нове колесо */
export async function createWheelAssessment(req: AuthenticatedRequest, res: Response) {
  try {
        // ── 1. Отримуємо id користувача з middleware авторизації
    const userId = req.user!.id;

    // ── 2. Витягуємо scores з body і перевіряємо
    const { scores } = req.body as { scores: WheelScore[] };
    if (!Array.isArray(scores) || scores.length !== 8) {
      return res.status(400).json({ error: 'Потрібно 8 сфер з оцінками' });
    }

        // ── 3. Отримуємо контекст колеса (expertId + balanceConfigId)
    const { expertId, balanceConfigId } = await resolveWheelContext(userId);

        // ── 4. Створюємо запис у БД
    const entry   = await createWheel({userId, balanceConfigId, scores});
    
        // ── 5. Знаходимо найслабшу сферу
    const weakest = findWeakest(scores);

    // ── 6. Паралельно надсилаємо Telegram і (якщо є) мікрозавдання
    await Promise.allSettled([
      addWheelMicroTasks(userId, weakest), // поки закоментовано, якщо функція відсутня
      sendWheelNotification(userId, entry.id),
    ]);
    // ── 7. Повертаємо успішну відповідь
    return res.status(201).json({ success: true, wheel: entry });
  } catch (err: any) {
        // ── 8. Обробка cooldown
    if (err.message?.includes('Cooldown')) return res.status(429).json({ error: err.message });
    if (err.message === 'balance_config_not_found') return res.status(400).json({ error: err.message });
    // ── 9. Якщо немає balanceConfig
    if (err.message === 'balance_config_not_found') {
      return res.status(400).json({ error: err.message });
    }

    // ── 10. Інші помилки сервера
    console.error('❌ createWheelAssessment', err);
    return res.status(500).json({ error: 'server_error' });
  }
}

/** GET /api/wheel/cooldown */
export async function getWheelCooldownHandler(req: AuthenticatedRequest, res: Response) {
  try {
        const userId = req.user!.id; 
    const cooldown = await canFillWheel(userId);
    return res.json({ success: true, ...cooldown });
  } catch (err) {
    console.error('❌ getWheelCooldown', err);
    return res.status(500).json({ error: 'server_error' });
  }
}

/** GET /api/wheel/history?limit=10 */
export async function getWheelHistoryHandler(req: AuthenticatedRequest, res: Response) {
  try {
    const limit  = Math.min(parseInt(req.query.limit as string) || 10, 100);
    const wheels = await getWheelHistory(req.user!.id, limit);
    return res.json({ success: true, count: wheels.length, wheels });
  } catch (err) {
    console.error('❌ getWheelHistory', err);
    return res.status(500).json({ error: 'server_error' });
  }
}

/** GET /api/wheel/latest */
export async function getLatestWheelHandler(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'unauthorized' });
    const wheel = await getLatestWheel(userId);
    return res.json({ success: true, wheel: wheel ?? null });
  } catch (err) {
    console.error('❌ getLatestWheel', err);
    return res.json({ success: true, wheel: null }); // graceful fallback
  }
}

/** GET /api/wheel/analytics */
export async function getWheelAnalyticsHandler(req: AuthenticatedRequest, res: Response) {
  try {
    const analytics = await getWheelAnalytics(req.user!.id);
    return res.json({ success: true, analytics });
  } catch (err) {
    console.error('❌ getWheelAnalytics', err);
    return res.status(500).json({ error: 'server_error' });
  }
}

/** GET /api/wheel/:id/pdf */
export async function generateWheelPDFHandler(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const entry = await prisma.userBalanceEntry.findFirst({
      where: { id, userId },
      include: { user: true },
    });
    if (!entry) return res.status(404).json({ error: 'Колесо не знайдено' });

    const scores = scoresFromMap(entry.scores);

    // note зберігає аналіз
    const analysis = entry.note ?? '';

    // ── визначаємо найслабшу та фокусну сферу
    const weakest = findWeakest(scores);
    const focus   = findFocus(scores, weakest);

    // ── формуємо дані для PDF
    const pdfData: WheelPDFData = {
      userName:      entry.user.firstName ?? entry.user.email ?? 'Користувач',
      scores,
      weakestSphere: weakest.categoryId,
      focusSphere:   focus.categoryId,
      analysis,
      createdAt:     entry.createdAt.toISOString(),
    };

    const buffer = await createWheelPDF(pdfData);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="wheel-${id}.pdf"`);
    return res.send(buffer);
  } catch (err) {
    console.error('❌ generateWheelPDF', err);
    return res.status(500).json({ error: 'server_error' });
  }
}

/** POST /api/wheel/:id/remind-telegram */
export async function sendWheelTelegramReminderHandler(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const entry = await prisma.userBalanceEntry.findFirst({
      where:  { id, userId },
      select: { id: true },
    });
    if (!entry) return res.status(404).json({ error: 'Колесо не знайдено' });

    const result = await sendWheelNotification(userId, id);
    if (!result.ok) {
      const status = result.code?.startsWith('telegram_') ? 409 : 400;
      return res.status(status).json({
        error:   result.code ?? 'telegram_send_failed',
        message: result.reason,
        action:  result.action,
        botLink: result.botLink,
      });
    }

    return res.json({ success: true, message: 'Нагадування надіслано' });
  } catch (err) {
    console.error('❌ sendWheelTelegramReminder', err);
    return res.status(500).json({ error: 'server_error' });
  }
}