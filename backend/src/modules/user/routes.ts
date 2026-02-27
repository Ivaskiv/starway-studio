// backend/src/modules/users/users.routes.ts

import { Router, type Response } from 'express';
import type { AuthenticatedRequest } from '@/types/globalTypes.js';

import { prisma } from '@/db/client.js';
import { authRequired } from '@/modules/auth/middleware/auth.js';

const router = Router();

router.patch(
  '/:id/role',
  authRequired,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'not_authenticated' });
      }

      // ⚠ Якщо у тебе Prisma enum — ролі зазвичай великі
      if (req.user.role !== 'ADMIN') {
        return res.status(403).json({ error: 'forbidden' });
      }

      const { id } = req.params;
      const { role } = req.body;

      const validRoles = ['USER', 'ADMIN', 'MENTOR'] as const;

      if (!validRoles.includes(role)) {
        return res.status(400).json({ error: 'invalid_role' });
      }

      const user = await prisma.user.update({
        where: { id },
        data: { role },
        select: { id: true, email: true, role: true },
      });

      return res.json({ message: 'Role updated', user });
    } catch (error) {
      console.error('❌ Update role error:', error);
      return res.status(500).json({ error: 'server_error' });
    }
  },
);

export default router;