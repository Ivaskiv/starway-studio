// backend/src/modules/product-members/routes.ts
/**
 * Product Members Routes
 * Manages user memberships to products
 */

import { Router, type Response } from 'express';
import type { AuthenticatedRequest } from '../../types/globalTypes.js';

import { prisma } from '../../db/client.js';
import { authRequired } from '../../modules/auth/middleware/auth.js';

const router = Router();

/**
 * GET /api/product-members/me
 * Отримати список продуктів, до яких користувач має доступ
 */
router.get(
  '/me',
  authRequired,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const userId = req.user.id;

      console.log('[ProductMembers] Getting memberships for user:', userId);

      const enrollments = await prisma.enrollment.findMany({
        where: { userId },
        include: {
          product: {
            select: {
              id: true,
              code: true,
                            description: true,
              features: true,
              limits: true,
              durationDays: true,
            },
          },
        },
        orderBy: { enrolledAt: 'desc' },
      });

      const memberships = enrollments.map((e) => ({
        enrollmentId: e.id,
        product: e.product,
        purchased: e.purchased,
        trialEnd: e.trialEnd,
        enrolledAt: e.enrolledAt,
        isActive:
          e.purchased ||
          (e.trialEnd ? e.trialEnd.getTime() > Date.now() : false),
      }));

      return res.status(200).json(memberships);
    } catch (error: any) {
      console.error('[ProductMembers] Error getting memberships:', error);

      return res.status(500).json({
        error: 'Failed to get product memberships',
        details:
          process.env.NODE_ENV === 'development'
            ? error.message
            : undefined,
      });
    }
  },
);

export default router;