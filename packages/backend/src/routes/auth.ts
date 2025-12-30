// packages/backend/src/routes/auth.ts

import { Router } from 'express';
import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { sql } from '../db/client';
import { authRequired } from '../middleware/auth';

const router = Router();

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response) => {
  console.log('📝 [auth/register] Request body:', { ...req.body, password: '***' });
  
  try {
    const { email, password, firstName, lastName } = req.body;

    // Перевірка чи користувач існує
    const existingUsers = await sql`
      SELECT * FROM users WHERE email = ${email}
    `;

    console.log('🔍 [auth/register] Existing users:', existingUsers.length);

    if (existingUsers.length > 0) {
      console.warn('⚠️ [auth/register] User already exists');
      return res.status(409).json({ error: 'user_exists', message: 'Користувач вже існує' });
    }

    // Хешування пароля
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log('🔐 [auth/register] Password hashed');

    // Створення користувача
    const users = await sql`
      INSERT INTO users (email, password_hash, first_name, last_name, role) 
      VALUES (${email}, ${hashedPassword}, ${firstName}, ${lastName}, 'funnel_admin') 
      RETURNING id, email, first_name, last_name, role, created_at
    `;

    const user = users[0];
    console.log('✅ [auth/register] User created:', { id: user.id, email: user.email });

    // Генерація токену
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
        updatedAt: user.created_at
      },
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: 30 * 24 * 60 * 60
      }
    });
  } catch (err) {
    console.error('❌ [auth/register]', err);
    res.status(500).json({ error: 'server_error', message: 'Помилка сервера' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  console.log('🔐 [auth/login] Request body:', { email: req.body.email, password: '***' });
  
  try {
    const { email, password } = req.body;

    // Вибираємо тільки існуючі колонки
    const users = await sql`
      SELECT id, email, password_hash, first_name, last_name, role
      FROM users 
      WHERE email = ${email}
    `;

    console.log('🔍 [auth/login] Users found:', users.length);

    if (users.length === 0) {
      console.warn('⚠️ [auth/login] User not found');
      return res.status(401).json({ error: 'invalid_credentials', message: 'Невірний email або пароль' });
    }

    const user = users[0];
    console.log('👤 [auth/login] User data:', {
      id: user.id,
      email: user.email,
      hasPassword: !!user.password_hash,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role
    });

    // Перевірка чи пароль існує
    if (!user.password_hash) {
      console.error('❌ [auth/login] Password hash is null/undefined in database!');
      return res.status(500).json({ 
        error: 'invalid_user_data', 
        message: 'Помилка даних користувача. Зареєструйтесь заново.' 
      });
    }

    console.log('🔑 [auth/login] Comparing passwords...');
    const valid = await bcrypt.compare(password, user.password_hash);
    console.log('🔑 [auth/login] Password valid:', valid);

    if (!valid) {
      console.warn('⚠️ [auth/login] Invalid password');
      return res.status(401).json({ error: 'invalid_credentials', message: 'Невірний email або пароль' });
    }

    const secret = process.env.JWT_SECRET!;
    const accessToken = jwt.sign({ id: user.id }, secret, { expiresIn: '30d' });
    const refreshToken = jwt.sign({ id: user.id }, secret, { expiresIn: '30d' });

    console.log('✅ [auth/login] Login successful');

    res.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name || '',
        lastName: user.last_name || '',
        role: user.role,
        isActive: true,  // За замовчуванням true (якщо немає колонки)
        isEmailVerified: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: 30 * 24 * 60 * 60
      }
    });
  } catch (err) {
    console.error('❌ [auth/login]', err);
    res.status(500).json({ error: 'server_error', message: 'Помилка сервера' });
  }
});

// GET /api/auth/me
router.get('/me', authRequired, (req, res) => {
  console.log('👤 [auth/me] Request from user:', req.user?.id);
  res.json({ user: req.user });
});

export default router;