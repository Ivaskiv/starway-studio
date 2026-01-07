// packages/backend/src/routes/auth.ts
import type { Request, Response } from 'express';
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { sql } from '../db/client';
import { authRequired } from '../middleware/auth';

const router = Router();

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, firstName, lastName } = req.body;

    // Перевірка чи користувач існує
    const existingUsers = await sql`SELECT * FROM users WHERE email = ${email}`;
    if (existingUsers.length > 0) {
      return res.status(409).json({ error: 'user_exists', message: 'Користувач вже існує' });
    }

    // Хешування пароля
const hashedPassword = await bcrypt.hash(password, 10);

    // Створення користувача
    const users = await sql`
      INSERT INTO users (email, password_hash, first_name, last_name, role) 
      VALUES (${email}, ${hashedPassword}, ${firstName}, ${lastName}, 'funnel_admin') 
      RETURNING id, email, first_name, last_name, role, created_at
    `;
    const user = users[0];

    // Генерація токенів
    const secret = process.env.JWT_SECRET!;
    const accessToken = jwt.sign({ id: user.id }, secret, { expiresIn: '30d' });
    const refreshToken = jwt.sign({ id: user.id }, secret, { expiresIn: '30d' });

    res.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        isActive: true,
        isEmailVerified: false,
        createdAt: user.created_at,
        updatedAt: user.created_at,
      },
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: 30 * 24 * 60 * 60,
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'server_error', message: 'Помилка сервера' });
  }
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const users = await sql`
      SELECT id, email, password_hash, first_name, last_name, role
      FROM users 
      WHERE email = ${email}
    `;
    if (users.length === 0) {
      return res.status(401).json({ error: 'invalid_credentials', message: 'Невірний email або пароль' });
    }

    const user = users[0];
    if (!user.password_hash) {
      return res.status(500).json({ error: 'invalid_user_data', message: 'Помилка даних користувача. Зареєструйтесь заново.' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'invalid_credentials', message: 'Невірний email або пароль' });
    }

    const secret = process.env.JWT_SECRET!;
    const accessToken = jwt.sign({ id: user.id }, secret, { expiresIn: '30d' });
    const refreshToken = jwt.sign({ id: user.id }, secret, { expiresIn: '30d' });

    res.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name || '',
        lastName: user.last_name || '',
        role: user.role,
        isActive: true,
        isEmailVerified: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: 30 * 24 * 60 * 60,
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'server_error', message: 'Помилка сервера' });
  }
});

// GET /api/auth/me
router.get('/me', authRequired, (req, res) => {
  res.json({ user: req.user });
});

export default router;
