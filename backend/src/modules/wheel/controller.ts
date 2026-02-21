// backend/src/modules/wheel/wheel.controller.ts
import { prisma } from '@/db/client.js';
import type { Request, Response } from 'express';
import { createWheelPDF } from './pdf.js';
import {
  addWheelMicroTasks,
  createWheel,
  findWeakest,
  getWheelAnalytics,
  getWheelCooldown,
  getWheelHistory,
} from './service.js';
import { sendWheelNotification } from './telegram.js';
import type { WheelPDFData, WheelScore } from './types.js';

// ========== CREATE WHEEL ==========
export async function createWheelAssessment(req: Request, res: Response) {
  try {
    const userId = req.user!.id;
    const { scores } = req.body;

    if (!Array.isArray(scores) || scores.length !== 8) {
      return res.status(400).json({ error: 'Потрібно 8 сфер з оцінками' });
    }

    const wheel = await createWheel(userId, scores);

    // Додати мікро-завдання
    const weakest = findWeakest(scores);
    await addWheelMicroTasks(userId, weakest);

    // fix code_x: auto-trigger Telegram notification after successful wheel save.
    await sendWheelNotification(userId, wheel.id);

    res.status(201).json({
      success: true,
      wheel,
      message: 'Колесо створено! Додано автоматичні завдання.',
    });
  } catch (error: any) {
    console.error('❌ Create wheel error:', error);

    if (error.message.includes('Cooldown')) {
      return res.status(429).json({ error: error.message });
    }

    res.status(500).json({ error: 'Помилка створення колеса' });
  }
}

// ========== GET COOLDOWN ==========
export async function getWheelCooldownHandler(req: Request, res: Response) {
  try {
    const userId = req.user!.id;
    const cooldown = await getWheelCooldown(userId);
    return res.json({ success: true, ...cooldown });
  } catch (error) {
    console.error('❌ Cooldown error:', error);
    return res.status(500).json({ error: 'Помилка перевірки cooldown' });
  }
}

// ========== GET HISTORY ==========
export async function getWheelHistoryHandler(req: Request, res: Response) {
  try {
    const userId = req.user!.id;
    const limit = parseInt(req.query.limit as string) || 10;

    const wheels = await getWheelHistory(userId, limit);

    res.json({
      success: true,
      count: wheels.length,
      wheels,
    });
  } catch (error) {
    console.error('❌ Get history error:', error);
    res.status(500).json({ error: 'Помилка отримання історії' });
  }
}

// ========== GET LATEST ==========
export async function getLatestWheelHandler(req: Request, res: Response) {
  try {
    const userId = req.user!.id;

    const wheel = await prisma.wheelAssessment.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    if (!wheel) {
      // fix code_x: treat "no wheel yet" as valid empty state for frontend (avoid noisy 404 UX).
      return res.status(200).json({ success: true, wheel: null });
    }

    res.json({ success: true, wheel });
  } catch (error) {
    console.error('❌ Get latest error:', error);
    res.status(500).json({ error: 'Помилка отримання колеса' });
  }
}

// ========== GET ANALYTICS ==========
export async function getWheelAnalyticsHandler(req: Request, res: Response) {
  try {
    const userId = req.user!.id;
    const analytics = await getWheelAnalytics(userId);

    res.json({ success: true, analytics });
  } catch (error) {
    console.error('❌ Get analytics error:', error);
    res.status(500).json({ error: 'Помилка отримання аналітики' });
  }
}

// ========== GENERATE PDF ==========
export async function generateWheelPDFHandler(req: Request, res: Response) {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const wheel = await prisma.wheelAssessment.findFirst({
      where: { id, userId },
      include: { user: true },
    });

    if (!wheel) {
      return res.status(404).json({ error: 'Колесо не знайдено' });
    }

    // Parse JSON scores
    let scores: WheelScore[] = [];
    if (Array.isArray(wheel.scores)) {
      scores = wheel.scores.map((s: any) => ({
        categoryId: s.categoryId,
        score: s.score,
        comment: s.comment ?? null,
      }));
    }

    const pdfData: WheelPDFData = {
      userName: wheel.user.firstName || wheel.user.name || wheel.user.email || 'Користувач',
      scores,
      weakestSphere: wheel.weakestSphere,
      focusSphere: wheel.focusSphere,
      analysis: wheel.analysis,
      createdAt: wheel.createdAt.toISOString(),
    };

    const pdfBuffer = await createWheelPDF(pdfData);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="wheel-${wheel.id}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('❌ Generate PDF error:', error);
    res.status(500).json({ error: 'Помилка генерації PDF' });
  }
}

// ========== SEND TELEGRAM REMINDER ==========
export async function sendWheelTelegramReminderHandler(req: Request, res: Response) {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const wheel = await prisma.wheelAssessment.findFirst({
      where: { id, userId },
      select: { id: true },
    });

    if (!wheel) {
      return res.status(404).json({ error: 'Колесо не знайдено' });
    }

    // fix code_x: explicit endpoint to trigger Telegram reminder from dashboard wheel actions.
    const sent = await sendWheelNotification(userId, id);
    if (sent.ok === false) {
      const status = sent.code?.startsWith('telegram_') ? 409 : 400;
      return res.status(status).json({
        error: sent.code || 'telegram_send_failed',
        message: sent.reason,
        action: sent.action,
        botLink: sent.botLink,
      });
    }
    return res.json({ success: true, message: 'Нагадування надіслано в Telegram' });
  } catch (error) {
    console.error('❌ Telegram reminder error:', error);
    return res.status(500).json({ error: 'Помилка надсилання нагадування' });
  }
}
