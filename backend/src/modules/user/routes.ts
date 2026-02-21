// backend/src/modules/users/users.routes.ts
import { prisma } from '@/db/client.js';
import { authRequired } from '@/modules/auth/middleware/auth.js';
import { Router } from 'express';

const router = Router();

router.patch('/:id/role', authRequired, async (req, res) => {
  try {
    const userRole = req.user?.role;

    if (userRole !== 'ADMIN') {
      return res.status(403).json({ error: 'forbidden' });
    }

    const { id } = req.params;
    const { role } = req.body;

    const validRoles = ['USER', 'ADMIN', 'MENTOR'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'invalid_role' });
    }

    const user = await prisma.user.update({
      where: { id },
      data: { role },
      select: { id: true, email: true, role: true },
    });

    res.json({ message: 'Role updated', user });
  } catch (error) {
    console.error('❌ Update role error:', error);
    res.status(500).json({ error: 'server_error' });
  }
});

export default router;
