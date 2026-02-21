// backend/src/modules/product-members/routes.ts
/**
 * Product Members Routes
 * Manages user memberships to products
 */

import { prisma } from '@/db/client.js';
import { authRequired } from '@/modules/auth/middleware/auth.js';
import { Router } from 'express';

const router = Router();

/**
 * GET /api/product-members/me
 * Get current user's product memberships
 *
 * ПРИЗНАЧЕННЯ: Отримати список продуктів, до яких користувач має доступ
 */
router.get('/me', authRequired, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    console.log('[ProductMembers] Getting memberships for user:', userId);

    const enrollments = await prisma.enrollment.findMany({
      where: { userId },
      include: {
        product: {
          select: {
            id: true,
            code: true,
            name: true,
            description: true,
            features: true,
            limits: true,
            durationDays: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const memberships = enrollments.map(e => ({
      enrollmentId: e.id,
      product: e.product,
      purchased: e.purchased,
      trialEnd: e.trialEnd,
      enrolledAt: e.createdAt,
      isActive: e.purchased || (e.trialEnd ? e.trialEnd > new Date() : false),
    }));

    return res.status(200).json(memberships);
  } catch (error: any) {
    console.error('[ProductMembers] Error getting memberships:', error);
    return res.status(500).json({
      error: 'Failed to get product memberships',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

export default router;
