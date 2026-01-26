// /backend/src/modules/products/products.routes.ts

import { randomUUID } from 'crypto';
import { Router } from 'express';
import { authRequired } from '../../middleware/auth';
import sql from '../../db/client';
import { Product, ProductWithEnrollment } from '../../types/types';

const router = Router();

// ======================= HELPERS =======================

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9а-яіїєґ]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ======================= CREATE =======================

router.post('/', authRequired, async (req, res) => {
  try {
    const user_id = req.user!.id;
    const title = req.body.title?.trim();

    if (!title) {
      return res.status(400).json({ error: 'title_required' });
    }

    const slug = slugify(title);

    const existing = await sql<{ id: string }[]>`
      SELECT id FROM products WHERE slug = ${slug}
    `;

    if (existing.length > 0) {
      return res.status(409).json({ error: 'slug_already_exists' });
    }

    const [newProduct] = await sql<Product>`
      INSERT INTO products (
        id, title, slug, description, type,
        price, duration_days, category, author_id, published
      ) VALUES (
        ${randomUUID()},
        ${title},
        ${slug},
        ${req.body.description?.trim() ?? null},
        ${req.body.type ?? 'course'},
        ${Number(req.body.price) || 0},
        ${Number(req.body.duration_days) || 7},
        ${req.body.category ?? 'personal_growth'},
        ${user_id},
        false
      )
      RETURNING *
    `;

    res.status(201).json(newProduct);
  } catch (err: any) {
    console.error('[POST /products]', err);
    res.status(500).json({ error: 'server_error', message: err.message });
  }
});

// ======================= UPDATE =======================

router.put('/:id', authRequired, async (req, res) => {
  try {
    const [updated] = await sql<Product[]>`
      UPDATE products SET
        title = COALESCE(${req.body.title?.trim()}, title),
        description = COALESCE(${req.body.description?.trim()}, description),
        price = COALESCE(${Number(req.body.price)}, price),
        duration_days = COALESCE(${Number(req.body.duration_days)}, duration_days),
        published = COALESCE(${req.body.published}, published),
        updated_at = NOW()
      WHERE id = ${req.params.id} AND author_id = ${req.user!.id}
      RETURNING *
    `;

    if (!updated) {
      return res.status(404).json({ error: 'product_not_found_or_not_owner' });
    }

    res.json(updated);
  } catch (err: any) {
    console.error('[PUT /products/:id]', err);
    res.status(500).json({ error: 'server_error', message: err.message });
  }
});

// ======================= DELETE =======================

router.delete('/:id', authRequired, async (req, res) => {
  try {
    const user_id = req.user!.id;
    const product_id = req.params.id;

    const deleted = await sql<{ id: string }[]>`
      DELETE FROM products
      WHERE id = ${product_id} AND author_id = ${user_id}
      RETURNING id
    `;

    if (!deleted.length) {
      return res.status(404).json({ error: 'product_not_found_or_not_owner' });
    }

    res.json({ success: true });
  } catch (err: any) {
    console.error('[DELETE /products/:id]', err);
    res.status(500).json({ error: 'server_error', message: err.message });
  }
});

// ======================= ENROLL =======================

router.post('/enroll', authRequired, async (req, res) => {
  try {
    const user_id = req.user!.id;
    const product_id = req.body.product_id;

    if (!product_id) {
      return res.status(400).json({ error: 'product_id_required' });
    }

    const [product] = await sql<{ id: string }[]>`
      SELECT id FROM products WHERE id = ${product_id} AND published = true
    `;

    if (!product) {
      return res.status(404).json({ error: 'product_not_found_or_unpublished' });
    }

    const [enrollment] = await sql<{ id: string }>`
      INSERT INTO enrollments
        (id, user_id, product_id, purchased, trial_start, trial_end)
      VALUES
        (${randomUUID()}, ${user_id}, ${product_id}, true, NOW(), NOW() + INTERVAL '7 days')
      ON CONFLICT (user_id, product_id) DO NOTHING
      RETURNING id
    `;

    res.status(200).json({ enrollment_id: enrollment?.id ?? null });
  } catch (err: any) {
    console.error('[POST /products/enroll]', err);
    res.status(500).json({ error: 'server_error', message: err.message });
  }
});

// ======================= CABINET =======================

router.get('/cabinet', authRequired, async (req, res) => {
  try {
    const products = await sql<ProductWithEnrollment>`
      SELECT 
        p.*,
        e.id AS enrollment_id,
        e.created_at AS enrolled_at
      FROM products p
      LEFT JOIN enrollments e 
        ON e.product_id = p.id 
        AND e.user_id = ${req.user!.id}
      WHERE p.published = true OR p.author_id = ${req.user!.id}
      ORDER BY p.created_at DESC
    `;

    res.json({
      products: products.map((p) => ({
        ...p,
        is_active: Boolean(p.enrollment_id),
        enrolled_at: p.enrolled_at ?? null,
      })),
    });
  } catch (err: any) {
    console.error('[GET /products/cabinet]', err);
    res.status(500).json({ error: 'server_error', message: err.message });
  }
});

// ======================= GET BY SLUG (public) =======================

router.get('/slug/:slug', async (req, res) => {
  try {
    const [product] = await sql<Product[]>`
      SELECT * FROM products 
      WHERE slug = ${req.params.slug} AND published = true
    `;

    if (!product) {
      return res.status(404).json({ error: 'product_not_found' });
    }

    res.json(product);
  } catch (err: any) {
    console.error('[GET /products/slug/:slug]', err);
    res.status(500).json({ error: 'server_error', message: err.message });
  }
});

// ======================= GET BY ID =======================

router.get('/:id', authRequired, async (req, res) => {
  try {
    const [product] = await sql<Product[]>`
      SELECT * FROM products WHERE id = ${req.params.id}
    `;

    if (!product) {
      return res.status(404).json({ error: 'product_not_found' });
    }

    res.json(product);
  } catch (err: any) {
    console.error('[GET /products/:id]', err);
    res.status(500).json({ error: 'server_error', message: err.message });
  }
});

export default router;