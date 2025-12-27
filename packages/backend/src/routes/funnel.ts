// packages/backend/src/routes/funnel.ts

import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { sql } from '../db/client.js';
import { authRequired, AuthRequest } from '../middleware/auth.js';

const router = Router();

// ============================================
// HELPER: Generate slug from name
// ============================================
function generateSlug(name: string): string {
  const baseSlug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  
  const randomPart = crypto.randomUUID().substring(0, 8);
  return `${baseSlug}-${randomPart}`;
}

// ============================================
// POST /api/funnels
// Створити воронку (тільки funnel_admin і super_admin)
// ============================================
const createFunnel = async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const { name, type, description } = authReq.body;

  // Перевіряємо роль
  if (authReq.user.role !== 'funnel_admin' && authReq.user.role !== 'super_admin') {
    res.status(403).json({
      success: false,
      message: 'Тільки адміністратори можуть створювати воронки'
    });
    return;
  }

  if (!name) {
    res.status(400).json({
      success: false,
      message: 'Назва воронки обов\'язкова'
    });
    return;
  }

  try {
    const funnelId = crypto.randomUUID();
    const slug = generateSlug(name);
    const funnelType = type || 'telegram';

    const [funnel] = await sql`
      INSERT INTO funnels (
        id, owner_id, name, type, description,
        slug, status, is_public, steps, settings,
        created_at, updated_at
      )
      VALUES (
        ${funnelId},
        ${authReq.user.id},
        ${name},
        ${funnelType},
        ${description || ''},
        ${slug},
        'draft',
        true,
        '[]'::jsonb,
        '{}'::jsonb,
        NOW(),
        NOW()
      )
      RETURNING *
    `;

    res.status(201).json({
      success: true,
      funnel: {
        id: funnel.id,
        owner_id: funnel.owner_id,
        name: funnel.name,
        type: funnel.type,
        description: funnel.description,
        slug: funnel.slug,
        status: funnel.status,
        is_public: funnel.is_public,
        created_at: funnel.created_at,
        updated_at: funnel.updated_at
      }
    });
  } catch (err) {
    console.error('[funnels/create]', err);
    res.status(500).json({
      success: false,
      message: 'Помилка сервера'
    });
  }
};

router.post('/', authRequired, createFunnel);

// ============================================
// GET /api/funnels
// Отримати всі СВОЇ воронки
// ============================================
const getMyFunnels = async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;

  try {
    let funnels;

    if (authReq.user.role === 'super_admin') {
      // Super admin бачить всі воронки
      funnels = await sql`
        SELECT * FROM funnels 
        ORDER BY created_at DESC
      `;
    } else if (authReq.user.role === 'funnel_admin') {
      // Funnel admin бачить тільки свої
      funnels = await sql`
        SELECT * FROM funnels 
        WHERE owner_id = ${authReq.user.id}
        ORDER BY created_at DESC
      `;
    } else {
      res.status(403).json({
        success: false,
        message: 'Доступ заборонено'
      });
      return;
    }

    res.json({
      success: true,
      funnels
    });
  } catch (err) {
    console.error('[funnels/list]', err);
    res.status(500).json({
      success: false,
      message: 'Помилка сервера'
    });
  }
};

router.get('/', authRequired, getMyFunnels);

// ============================================
// GET /api/funnels/:funnelId
// Отримати воронку по ID (тільки власник)
// ============================================
const getFunnelById = async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const { funnelId } = authReq.params;

  try {
    const [funnel] = await sql`
      SELECT * FROM funnels 
      WHERE id = ${funnelId}
    `;

    if (!funnel) {
      res.status(404).json({
        success: false,
        message: 'Воронка не знайдена'
      });
      return;
    }

    // Перевіряємо доступ
    if (authReq.user.role !== 'super_admin' && funnel.owner_id !== authReq.user.id) {
      res.status(403).json({
        success: false,
        message: 'Це не ваша воронка'
      });
      return;
    }

    res.json({
      success: true,
      funnel
    });
  } catch (err) {
    console.error('[funnels/get]', err);
    res.status(500).json({
      success: false,
      message: 'Помилка сервера'
    });
  }
};

router.get('/:funnelId', authRequired, getFunnelById);

// ============================================
// GET /api/funnels/:funnelId/users
// Отримати юзерів воронки (тільки власник)
// ============================================
const getFunnelUsers = async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const { funnelId } = authReq.params;

  try {
    // Перевіряємо що воронка існує
    const [funnel] = await sql`
      SELECT owner_id FROM funnels 
      WHERE id = ${funnelId}
    `;

    if (!funnel) {
      res.status(404).json({
        success: false,
        message: 'Воронка не знайдена'
      });
      return;
    }

    // Перевіряємо доступ
    if (authReq.user.role !== 'super_admin' && funnel.owner_id !== authReq.user.id) {
      res.status(403).json({
        success: false,
        message: 'Це не ваша воронка'
      });
      return;
    }

    // Отримуємо юзерів
    const users = await sql`
      SELECT 
        id, name, email, role, funnel_id,
        telegram_id, created_at, updated_at
      FROM users
      WHERE funnel_id = ${funnelId} AND role = 'user'
      ORDER BY created_at DESC
    `;

    res.json({
      success: true,
      users,
      total: users.length
    });
  } catch (err) {
    console.error('[funnels/users]', err);
    res.status(500).json({
      success: false,
      message: 'Помилка сервера'
    });
  }
};

router.get('/:funnelId/users', authRequired, getFunnelUsers);

// ============================================
// PUT /api/funnels/:funnelId
// Оновити воронку (тільки власник)
// ============================================
const updateFunnel = async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const { funnelId } = authReq.params;
  const { name, type, description, status, steps, settings } = authReq.body;

  try {
    // Перевіряємо що воронка існує
    const [funnel] = await sql`
      SELECT owner_id FROM funnels 
      WHERE id = ${funnelId}
    `;

    if (!funnel) {
      res.status(404).json({
        success: false,
        message: 'Воронка не знайдена'
      });
      return;
    }

    // Перевіряємо доступ
    if (authReq.user.role !== 'super_admin' && funnel.owner_id !== authReq.user.id) {
      res.status(403).json({
        success: false,
        message: 'Це не ваша воронка'
      });
      return;
    }

    // Оновлюємо через окремі запити або один великий
    const [updatedFunnel] = await sql`
      UPDATE funnels 
      SET 
        name = COALESCE(${name}, name),
        type = COALESCE(${type}, type),
        description = COALESCE(${description}, description),
        status = COALESCE(${status}, status),
        steps = COALESCE(${steps ? JSON.stringify(steps) : null}::jsonb, steps),
        settings = COALESCE(${settings ? JSON.stringify(settings) : null}::jsonb, settings),
        updated_at = NOW()
      WHERE id = ${funnelId}
      RETURNING *
    `;

    res.json({
      success: true,
      funnel: updatedFunnel
    });
  } catch (err) {
    console.error('[funnels/update]', err);
    res.status(500).json({
      success: false,
      message: 'Помилка сервера'
    });
  }
};

router.put('/:funnelId', authRequired, updateFunnel);

// ============================================
// DELETE /api/funnels/:funnelId
// Видалити воронку (тільки власник)
// ============================================
const deleteFunnel = async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const { funnelId } = authReq.params;

  try {
    // Перевіряємо що воронка існує
    const [funnel] = await sql`
      SELECT owner_id FROM funnels 
      WHERE id = ${funnelId}
    `;

    if (!funnel) {
      res.status(404).json({
        success: false,
        message: 'Воронка не знайдена'
      });
      return;
    }

    // Перевіряємо доступ
    if (authReq.user.role !== 'super_admin' && funnel.owner_id !== authReq.user.id) {
      res.status(403).json({
        success: false,
        message: 'Це не ваша воронка'
      });
      return;
    }

    // Видаляємо (CASCADE автоматично видалить users)
    await sql`DELETE FROM funnels WHERE id = ${funnelId}`;

    res.json({
      success: true,
      message: 'Воронка видалена'
    });
  } catch (err) {
    console.error('[funnels/delete]', err);
    res.status(500).json({
      success: false,
      message: 'Помилка сервера'
    });
  }
};

router.delete('/:funnelId', authRequired, deleteFunnel);

// ============================================
// GET /api/funnels/slug/:slug
// Публічний доступ - для реєстрації
// ============================================
const getFunnelBySlug = async (req: Request, res: Response) => {
  const { slug } = req.params;

  try {
    const [funnel] = await sql`
      SELECT id, name, type, slug, description, status, is_public
      FROM funnels 
      WHERE slug = ${slug} AND status = 'active' AND is_public = true
    `;

    if (!funnel) {
      res.status(404).json({
        success: false,
        message: 'Воронка не знайдена або неактивна'
      });
      return;
    }

    res.json({
      success: true,
      funnel
    });
  } catch (err) {
    console.error('[funnels/slug]', err);
    res.status(500).json({
      success: false,
      message: 'Помилка сервера'
    });
  }
};

router.get('/slug/:slug', getFunnelBySlug);

export default router;