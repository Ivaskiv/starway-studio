// packages/backend/src/routes/auth.ts

import { Router, Request, Response, RequestHandler } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { sql } from '../db/client.js';
import { authRequired, AuthRequest } from '../middleware/auth.js';

const router = Router();

// ============================================
// HELPER: Generate JWT
// ============================================
function generateToken(userId: string): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET not configured');
  return jwt.sign({ id: userId }, secret, { expiresIn: '30d' });
}

// ============================================
// POST /api/auth/register
// Перший користувач = super_admin, решта = funnel_admin
// ============================================
const register: RequestHandler = async (req, res) => {
  const { email, password, name } = req.body;

  if (!email || !password) {
    res.status(400).json({ 
      success: false,
      message: 'Email та пароль обов\'язкові' 
    });
    return;
  }

  if (password.length < 8) {
    res.status(400).json({ 
      success: false,
      message: 'Пароль має містити мінімум 8 символів' 
    });
    return;
  }

  try {
    const [exists] = await sql`SELECT 1 FROM users WHERE email = ${email}`;
    
    if (exists) {
      res.status(409).json({ 
        success: false,
        message: 'Цей email вже зареєстрований' 
      });
      return;
    }

    // ✅ Перевіряємо чи це перший користувач
    const [{ count }] = await sql`SELECT COUNT(*) as count FROM users`;
    const role = Number(count) === 0 ? 'super_admin' : 'funnel_admin';

    const passwordHash = await bcrypt.hash(password, 10);
    const userId = crypto.randomUUID();

    // ✅ Додаємо funnel_id і created_by (NULL для admins)
    const [user] = await sql`
      INSERT INTO users (
        id, email, password_hash, name, role, 
        funnel_id, created_by, created_at, updated_at
      )
      VALUES (
        ${userId}, 
        ${email}, 
        ${passwordHash}, 
        ${name || email.split('@')[0]}, 
        ${role},
        NULL,
        NULL,
        NOW(),
        NOW()
      )
      RETURNING id, email, name, role, funnel_id, created_at
    `;

    const token = generateToken(user.id);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        funnel_id: user.funnel_id,
        created_at: user.created_at
      }
    });
  } catch (err) {
    console.error('[auth/register]', err);
    res.status(500).json({ 
      success: false,
      message: 'Помилка сервера' 
    });
  }
};

router.post('/register', register);

// ============================================
// POST /api/auth/register/funnel/:funnelId
// Реєстрація USER через публічну воронку
// ============================================
const registerUserInFunnel: RequestHandler = async (req, res) => {
  const { email, password, name } = req.body;
  const { funnelId } = req.params;

  if (!email || !password) {
    res.status(400).json({ 
      success: false,
      message: 'Email та пароль обов\'язкові' 
    });
    return;
  }

  if (password.length < 8) {
    res.status(400).json({ 
      success: false,
      message: 'Пароль має містити мінімум 8 символів' 
    });
    return;
  }

  try {
    // Перевіряємо чи воронка існує і активна
    const [funnel] = await sql`
      SELECT id, owner_id, status, is_public 
      FROM funnels 
      WHERE id = ${funnelId}
    `;

    if (!funnel) {
      res.status(404).json({ 
        success: false,
        message: 'Воронка не знайдена' 
      });
      return;
    }

    if (funnel.status !== 'active' || !funnel.is_public) {
      res.status(403).json({ 
        success: false,
        message: 'Воронка неактивна або закрита для реєстрації' 
      });
      return;
    }

    // Перевіряємо чи email вже існує
    const [exists] = await sql`SELECT 1 FROM users WHERE email = ${email}`;
    
    if (exists) {
      res.status(409).json({ 
        success: false,
        message: 'Цей email вже зареєстрований' 
      });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userId = crypto.randomUUID();

    // Створюємо USER з прив'язкою до воронки
    const [user] = await sql`
      INSERT INTO users (
        id, email, password_hash, name, role, 
        funnel_id, created_by, created_at, updated_at
      )
      VALUES (
        ${userId}, 
        ${email}, 
        ${passwordHash}, 
        ${name || email.split('@')[0]}, 
        'user',
        ${funnelId},
        ${funnel.owner_id},
        NOW(),
        NOW()
      )
      RETURNING id, email, name, role, funnel_id, created_at
    `;

    const token = generateToken(user.id);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        funnel_id: user.funnel_id,
        created_at: user.created_at
      }
    });
  } catch (err) {
    console.error('[auth/register/funnel]', err);
    res.status(500).json({ 
      success: false,
      message: 'Помилка сервера' 
    });
  }
};

router.post('/register/funnel/:funnelId', registerUserInFunnel);

// ============================================
// POST /api/auth/login
// ============================================
const login: RequestHandler = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ 
      success: false,
      message: 'Email та пароль обов\'язкові' 
    });
    return;
  }

  try {
    const [user] = await sql`
      SELECT id, email, name, role, funnel_id, password_hash, created_at
      FROM users 
      WHERE email = ${email}
    `;

    if (!user || !user.password_hash) {
      res.status(401).json({ 
        success: false,
        message: 'Невірний email або пароль' 
      });
      return;
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    
    if (!isValid) {
      res.status(401).json({ 
        success: false,
        message: 'Невірний email або пароль' 
      });
      return;
    }

    const token = generateToken(user.id);

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        funnel_id: user.funnel_id,
        created_at: user.created_at
      }
    });
  } catch (err) {
    console.error('[auth/login]', err);
    res.status(500).json({ 
      success: false,
      message: 'Помилка сервера' 
    });
  }
};

router.post('/login', login);

// ============================================
// GET /api/auth/me
// ============================================
const getMe = async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  
  try {
    const [user] = await sql`
      SELECT id, email, name, role, funnel_id, created_at, updated_at
      FROM users 
      WHERE id = ${authReq.user.id}
    `;

    if (!user) {
      res.status(404).json({ 
        success: false,
        message: 'Користувача не знайдено' 
      });
      return;
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        funnel_id: user.funnel_id,
        created_at: user.created_at,
        updated_at: user.updated_at
      }
    });
  } catch (err) {
    console.error('[auth/me]', err);
    res.status(500).json({ 
      success: false,
      message: 'Помилка сервера' 
    });
  }
};

router.get('/me', authRequired, getMe);

// ============================================
// POST /api/auth/logout
// ============================================
const logout = async (req: Request, res: Response) => {
  res.json({ 
    success: true,
    message: 'Успішно вийшли' 
  });
};

router.post('/logout', authRequired, logout);

// ============================================
// POST /api/auth/change-password
// ============================================
const changePassword = async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const { oldPassword, newPassword } = authReq.body;

  if (!oldPassword || !newPassword) {
    res.status(400).json({ 
      success: false,
      message: 'Старий та новий пароль обов\'язкові' 
    });
    return;
  }

  if (newPassword.length < 8) {
    res.status(400).json({ 
      success: false,
      message: 'Новий пароль має містити мінімум 8 символів' 
    });
    return;
  }

  try {
    const [user] = await sql`
      SELECT password_hash FROM users WHERE id = ${authReq.user.id}
    `;

    if (!user) {
      res.status(404).json({ 
        success: false,
        message: 'Користувача не знайдено' 
      });
      return;
    }

    const isValid = await bcrypt.compare(oldPassword, user.password_hash);
    
    if (!isValid) {
      res.status(401).json({ 
        success: false,
        message: 'Невірний старий пароль' 
      });
      return;
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    await sql`
      UPDATE users 
      SET password_hash = ${newPasswordHash}, updated_at = NOW()
      WHERE id = ${authReq.user.id}
    `;

    res.json({
      success: true,
      message: 'Пароль успішно змінено'
    });
  } catch (err) {
    console.error('[auth/change-password]', err);
    res.status(500).json({ 
      success: false,
      message: 'Помилка сервера' 
    });
  }
};

router.post('/change-password', authRequired, changePassword);

export default router;