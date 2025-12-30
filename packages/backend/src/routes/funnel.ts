// packages/backend/src/routes/funnels.ts

import { Router } from 'express';
import { authRequired } from '../middleware/auth';
import { sql } from '../db/client';

const router = Router();

// GET all funnels
router.get('/', authRequired, async (req, res) => {
  try {
    const userId = req.user!.id;

    console.log('📋 [funnels/GET] Fetching for user:', userId);

    const funnels = await sql`
      SELECT 
        id, 
        owner_id as user_id,
        name, 
        description,
        type,
        status,
        theme,
        user_prompt,
        ai_generated_data,
        steps,
        settings,
        is_public,
        slug,
        created_at, 
        updated_at
      FROM funnels 
      WHERE owner_id = ${userId}
      ORDER BY created_at DESC
    `;

    console.log(`✅ [funnels/GET] Found ${funnels.length} funnels`);

    res.json({ 
      success: true,
      funnels 
    });
  } catch (error: any) {
    console.error('❌ [funnels/GET] Error:', error);
    res.status(500).json({ 
      success: false,
      error: 'server_error',
      message: error.message 
    });
  }
});

// POST create funnel
router.post('/', authRequired, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { 
      name, 
      description, 
      theme = 'orange',
      type = 'mixed',
      user_prompt,
      ai_generated_data 
    } = req.body;

    if (!name) {
      return res.status(400).json({ 
        success: false,
        error: 'missing_name',
        message: 'Name is required' 
      });
    }

    console.log('📝 [funnels/POST] Creating funnel:', { name, userId });

    const result = await sql`
      INSERT INTO funnels (
        owner_id,
        name,
        description,
        type,
        status,
        theme,
        user_prompt,
        ai_generated_data,
        steps,
        created_at,
        updated_at
      ) VALUES (
        ${userId},
        ${name},
        ${description || ''},
        ${type},
        'draft',
        ${theme},
        ${user_prompt || ''},
        ${ai_generated_data ? JSON.stringify(ai_generated_data) : '{}'},
        '[]',
        NOW(),
        NOW()
      )
      RETURNING *
    `;

    const funnel = result[0];

    console.log('✅ [funnels/POST] Created funnel:', funnel.id);

    res.status(201).json({ 
      success: true,
      message: 'Funnel created successfully',
      funnel 
    });

  } catch (error: any) {
    console.error('❌ [funnels/POST] Error:', error);
    res.status(500).json({ 
      success: false,
      error: 'creation_failed',
      message: error.message 
    });
  }
});

// GET single funnel
router.get('/:id', authRequired, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const result = await sql`
      SELECT * FROM funnels 
      WHERE id = ${id} AND owner_id = ${userId}
    `;

    if (result.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'not_found',
        message: 'Funnel not found' 
      });
    }

    res.json({ 
      success: true,
      funnel: result[0] 
    });

  } catch (error: any) {
    console.error('❌ [funnels/GET:id] Error:', error);
    res.status(500).json({ 
      success: false,
      error: 'server_error',
      message: error.message 
    });
  }
});

// PATCH update funnel
router.patch('/:id', authRequired, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const updates = req.body;

    console.log('📝 [funnels/PATCH] Updating funnel:', id);

    // Перевіряємо що воронка належить користувачу
    const existing = await sql`
      SELECT id FROM funnels 
      WHERE id = ${id} AND owner_id = ${userId}
    `;

    if (existing.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'not_found'
      });
    }

    // Оновлюємо
    const result = await sql`
      UPDATE funnels 
      SET 
        name = COALESCE(${updates.name}, name),
        description = COALESCE(${updates.description}, description),
        status = COALESCE(${updates.status}, status),
        steps = COALESCE(${updates.steps ? JSON.stringify(updates.steps) : null}, steps),
        updated_at = NOW()
      WHERE id = ${id} AND owner_id = ${userId}
      RETURNING *
    `;

    console.log('✅ [funnels/PATCH] Updated funnel:', id);

    res.json({ 
      success: true,
      message: 'Funnel updated successfully',
      funnel: result[0] 
    });

  } catch (error: any) {
    console.error('❌ [funnels/PATCH] Error:', error);
    res.status(500).json({ 
      success: false,
      error: 'update_failed',
      message: error.message 
    });
  }
});

// DELETE funnel
router.delete('/:id', authRequired, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    console.log('🗑️ [funnels/DELETE] Deleting funnel:', id);

    const result = await sql`
      DELETE FROM funnels 
      WHERE id = ${id} AND owner_id = ${userId}
      RETURNING id
    `;

    if (result.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'not_found'
      });
    }

    console.log('✅ [funnels/DELETE] Deleted funnel:', id);

    res.json({ 
      success: true,
      message: 'Funnel deleted successfully'
    });

  } catch (error: any) {
    console.error('❌ [funnels/DELETE] Error:', error);
    res.status(500).json({ 
      success: false,
      error: 'deletion_failed',
      message: error.message 
    });
  }
});

export default router;