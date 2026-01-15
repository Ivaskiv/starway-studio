import { randomUUID } from 'crypto'
import { Router } from 'express'
import { sql } from '../db/client.js'
import { authRequired } from '../middleware/auth.js'
import type { Products } from '../types/types.js'

const router = Router()

type ProductWithEnrollment = Products & {
  enrollment_id?: string | null
  enrolled_at?: string | null
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9а-яіїєґ]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// ======================= CREATE =======================
router.post('/', authRequired, async (req, res) => {
  try {
    const user_id = req.user!.id

    const title = req.body.title?.trim()
    if (!title) {
      return res.status(400).json({ error: 'title_required' })
    }

    const slug = slugify(title)

    const existing = await sql`
      SELECT id FROM products WHERE slug = ${slug}
    `
    if (existing.length > 0) {
      return res.status(409).json({ error: 'slug_already_exists' })
    }

    const rows = await sql<Products[]>`
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
    `

    res.status(201).json(rows[0])
  } catch (err: any) {
    res.status(500).json({ error: 'server_error', message: err.message })
  }
})

// ======================= UPDATE =======================
router.put('/:id', authRequired, async (req, res) => {
  try {
    const rows = await sql<Products[]>`
      UPDATE products SET
        title = COALESCE(${req.body.title?.trim() ?? null}, title),
        description = COALESCE(${req.body.description?.trim() ?? null}, description),
        price = COALESCE(${Number(req.body.price) ?? null}, price),
        duration_days = COALESCE(${Number(req.body.duration_days) ?? null}, duration_days),
        published = COALESCE(${req.body.published ?? null}, published),
        updated_at = NOW()
      WHERE id = ${req.params.id}
        AND author_id = ${req.user!.id}
      RETURNING *
    `

    if (!rows[0]) {
      return res.status(404).json({ error: 'product_not_found_or_not_owner' })
    }

    res.json(rows[0])
  } catch {
    res.status(500).json({ error: 'server_error' })
  }
})

// ======================= DELETE =======================
router.delete('/:id', authRequired, async (req, res) => {
  try {
    const user_id = req.user!.id
    const product_id = req.params.id

    const rows = await sql<{ id: string }[]>`
      DELETE FROM products
      WHERE id = ${product_id}
        AND author_id = ${user_id}
      RETURNING id
    `

    if (rows.length === 0) {
      return res.status(404).json({ error: 'product_not_found_or_not_owner' })
    }

    res.json({ success: true })
  } catch (err) {
    console.error('[DELETE /products/:id]', err)
    res.status(500).json({ error: 'server_error' })
  }
})


// ======================= ENROLL =======================
router.post('/enroll', authRequired, async (req, res) => {
  const user_id = req.user!.id
  const product_id = req.body.product_id

  if (!product_id) {
    return res.status(400).json({ error: 'product_id_required' })
  }

  // 1️⃣ Перевіряємо продукт
  const productRows = await sql<{ id: string }[]>`
    SELECT id
    FROM products
    WHERE id = ${product_id}
      AND published = true
  `

  if (!productRows[0]) {
    return res.status(404).json({ error: 'product_not_found_or_unpublished' })
  }

  // 2️⃣ Enroll
const rows = await sql<{ id: string }[]>`
  INSERT INTO enrollments (
    id,
    user_id,
    product_id,
    purchased,
    trial_start,
    trial_end
  ) VALUES (
    ${randomUUID()},
    ${user_id},
    ${product_id},
    true,
    NOW(),
    NOW() + INTERVAL '7 days'
  )
  ON CONFLICT (user_id, product_id)
  DO NOTHING
  RETURNING id
`

if (!rows[0]) {
  return res.status(200).json({ alreadyEnrolled: true })
}

res.json({ enrollment_id: rows[0].id })
})


// ======================= CABINET =======================
router.get('/cabinet', authRequired, async (req, res) => {
  const products = await sql<ProductWithEnrollment[]>`
    SELECT p.*, e.id AS enrollment_id, e.created_at AS enrolled_at
    FROM products p
    LEFT JOIN enrollments e
      ON e.product_id = p.id
     AND e.user_id = ${req.user!.id}
    WHERE p.published = true OR p.author_id = ${req.user!.id}
    ORDER BY p.created_at DESC
  `

  res.json({
    products: products.map(p => ({
      ...p,
      is_active: Boolean(p.enrollment_id),
      enrolled_at: p.enrolled_at,
    })),
  })
})

export default router
