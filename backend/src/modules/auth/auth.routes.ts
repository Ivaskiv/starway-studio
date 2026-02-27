// backend/src/modules/auth/auth.routes.ts

import { Router, type Response } from 'express';
import type { AuthenticatedRequest } from '@/types/globalTypes.js';
import { prisma } from '@/db/client.js';
import { authRequired } from '@/modules/auth/middleware/auth.js';

import {
  forgotPassword,
  getMe,
  login,
  logout,
  refresh,
  register,
  resetPassword,
  socialAuth,
  updateSettings,
} from './auth.controller.js';

const router = Router();

// ── Auth ──────────────────────────────────────────────

router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refresh);
router.post('/social', socialAuth);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/me', authRequired, getMe);
router.post('/logout', authRequired, logout);
router.patch('/settings', authRequired, updateSettings);

// ── Users (admin) ─────────────────────────────────────

router.patch(
  '/users/:id/role',
  authRequired,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'not_authenticated' });
      }

      // ⚠ якщо у тебе enum з Prisma, то має бути 'ADMIN'
      if (req.user.role !== 'ADMIN') {
        return res.status(403).json({ error: 'forbidden' });
      }

      const { role } = req.body;

      const allowedRoles = ['USER', 'ADMIN', 'MENTOR'] as const;

      if (!allowedRoles.includes(role)) {
        return res.status(400).json({ error: 'invalid_role' });
      }

      const user = await prisma.user.update({
        where: { id: req.params.id },
        data: { role },
        select: { id: true, email: true, role: true },
      });

      return res.json({ user });
    } catch (err) {
      console.error('❌ Update role error:', err);
      return res.status(500).json({ error: 'server_error' });
    }
  },
);

export default router;