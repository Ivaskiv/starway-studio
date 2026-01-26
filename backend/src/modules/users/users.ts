// backend/src/routes/users.ts

import { Router } from 'express';
import { sql } from '../../db/client';
import { authRequired } from '../../middleware/auth';

const router = Router();

// PATCH /api/users/:id/role - тільки для super_admin
router.patch('/:id/role', authRequired, async (req, res) => {
  console.log('👑 [users/role] Request from:', req.user?.email);

  try {
    // Перевірка чи користувач має права
    const userRole = req.user?.role?.toLowerCase(); // нормалізуємо до нижнього регістру

    if (!['super_admin', 'admin'].includes(userRole || '')) {
      console.warn('⚠️ [users/role] Unauthorized attempt');
      return res.status(403).json({ error: 'forbidden', message: 'Недостатньо прав' });
    }
    const { id } = req.params;
    const { role } = req.body;

    // Валідація ролі
    const validRoles = ['user', 'admin', 'super_admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'invalid_role', message: 'Невірна роль' });
    }

    // Оновлення ролі
    const users = await sql`
      UPDATE users 
      SET role = ${role}, updated_at = NOW()
      WHERE id = ${id}
      RETURNING id, email, first_name, last_name, role
    `;

    if (users.length === 0) {
      return res.status(404).json({ error: 'user_not_found', message: 'Користувача не знайдено' });
    }

    console.log('✅ [users/role] Role updated:', { user: users[0].email, newRole: role });

    res.json({
      message: 'Роль оновлено',
      user: users[0],
    });
  } catch (err) {
    console.error('❌ [users/role]', err);
    res.status(500).json({ error: 'server_error', message: 'Помилка сервера' });
  }
});

export default router;
