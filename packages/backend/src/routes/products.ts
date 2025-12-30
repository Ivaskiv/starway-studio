// packages/backend/src/routes/products.ts
// Об'єднує: products, cabinet, lessons, enrollments, purchases, progress

import { Router } from 'express'
import { authRequired } from '../middleware/auth.js'
import { sql } from '../db/client.js'
import multer from 'multer'
import { randomUUID } from 'crypto'

const router = Router()

// ============================================================
// PRODUCTS CRUD
// ============================================================

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9а-яії]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// POST / - Створити продукт
router.post('/', authRequired, async (req, res) => {
  try {
    const userId = req.user.id
    const { title, description, type, price, duration_days, category } = req.body
    
    const slug = slugify(title)
    
    const [product] = await sql`
      INSERT INTO products (
        title, slug, description, type, price, 
        duration_days, category, author_id, published
      )
      VALUES (
        ${title}, ${slug}, ${description || ''}, ${type}, ${price || 0},
        ${duration_days || 7}, ${category || 'course'}, ${userId}, false
      )
      RETURNING *
    `
    
    res.json(product)
  } catch (err: any) {
    console.error('CREATE PRODUCT ERROR:', err)
    res.status(500).json({ error: 'server_error', message: err.message })
  }
})

// GET / - Список продуктів автора
router.get('/', authRequired, async (req, res) => {
  try {
    const products = await sql`
      SELECT * FROM products 
      WHERE author_id = ${req.user.id}
      ORDER BY created_at DESC
    `
    res.json(products)
  } catch (err: any) {
    res.status(500).json({ error: 'server_error' })
  }
})

// GET /:id - Один продукт
router.get('/:id', authRequired, async (req, res) => {
  try {
    const [product] = await sql`
      SELECT * FROM products 
      WHERE id = ${req.params.id} AND author_id = ${req.user.id}
    `
    
    if (!product) {
      return res.status(404).json({ error: 'product_not_found' })
    }
    
    res.json(product)
  } catch (err: any) {
    res.status(500).json({ error: 'server_error' })
  }
})

// PUT /:id - Оновити
router.put('/:id', authRequired, async (req, res) => {
  try {
    const { title, description, price, duration_days, published } = req.body
    
    const [product] = await sql`
      UPDATE products 
      SET 
        title = COALESCE(${title}, title),
        description = COALESCE(${description}, description),
        price = COALESCE(${price}, price),
        duration_days = COALESCE(${duration_days}, duration_days),
        published = COALESCE(${published}, published),
        updated_at = NOW()
      WHERE id = ${req.params.id} AND author_id = ${req.user.id}
      RETURNING *
    `
    
    if (!product) {
      return res.status(404).json({ error: 'product_not_found' })
    }
    
    res.json(product)
  } catch (err: any) {
    res.status(500).json({ error: 'server_error' })
  }
})

// DELETE /:id
router.delete('/:id', authRequired, async (req, res) => {
  try {
    await sql`
      DELETE FROM products 
      WHERE id = ${req.params.id} AND author_id = ${req.user.id}
    `
    res.json({ success: true })
  } catch (err: any) {
    res.status(500).json({ error: 'server_error' })
  }
})

// ============================================================
// LESSONS (blocks)
// ============================================================

// GET /:product_id/lessons
router.get('/:product_id/lessons', authRequired, async (req, res) => {
  try {
    const lessons = await sql`
      SELECT * FROM blocks 
      WHERE product_id = ${req.params.product_id}
      ORDER BY order_index ASC
    `
    res.json(lessons)
  } catch (err) {
    res.status(500).json({ error: 'server_error' })
  }
})

// ============================================================
// ENROLLMENTS
// ============================================================

// POST /enroll
router.post('/enroll', authRequired, async (req, res) => {
  try {
    const { product_id, pay_ref, amount, currency } = req.body
    
    const enrollment = await sql`
      INSERT INTO enrollments (user_id, product_id, pay_ref, amount, currency)
      VALUES (${req.user.id}, ${product_id}, ${pay_ref}, ${amount}, ${currency})
      ON CONFLICT (user_id, product_id) DO UPDATE 
      SET updated_at = NOW()
      RETURNING *
    `
    
    res.json(enrollment)
  } catch (err) {
    res.status(500).json({ error: 'server_error' })
  }
})

// ============================================================
// PROGRESS
// ============================================================

// Multer для файлів завдань
const upload = multer({
  dest: 'uploads/tasks/',
  limits: { fileSize: 100 * 1024 * 1024 }
})

// POST /progress/complete
router.post('/progress/complete', authRequired, upload.single('file'), async (req, res) => {
  try {
    const { block_id, answer } = req.body
    const fileUrl = req.file ? `/uploads/tasks/${req.file.filename}` : null

    const [block] = await sql`
      SELECT * FROM blocks WHERE id = ${block_id}
    `

    if (!block) {
      return res.status(404).json({ error: 'block_not_found' })
    }

    // Зберегти completion
    await sql`
      INSERT INTO block_completions (
        id, user_id, block_id, completed, user_answer, file_url, points_earned
      ) VALUES (
        ${randomUUID()}, ${req.user.id}, ${block_id}, true, ${answer}, ${fileUrl}, ${block.points}
      )
      ON CONFLICT (user_id, block_id) DO UPDATE 
      SET user_answer = ${answer}, file_url = COALESCE(${fileUrl}, block_completions.file_url)
    `

    // Оновити прогрес
    const [progress] = await sql`
      INSERT INTO user_progress (
        id, user_id, product_id, total_points, completed_blocks
      ) VALUES (
        ${randomUUID()}, ${req.user.id}, ${block.product_id}, ${block.points}, 1
      )
      ON CONFLICT (user_id, product_id) DO UPDATE SET
        total_points = user_progress.total_points + ${block.points},
        completed_blocks = user_progress.completed_blocks + 1,
        level = FLOOR((user_progress.total_points + ${block.points}) / 500) + 1
      RETURNING *
    `

    res.json({ success: true, points_earned: block.points, progress })
  } catch (err) {
    res.status(500).json({ error: 'complete_failed' })
  }
})

// GET /progress/:product_id
router.get('/progress/:product_id', authRequired, async (req, res) => {
  try {
    const [progress] = await sql`
      SELECT up.*, 
        (SELECT COUNT(*) FROM blocks WHERE product_id = ${req.params.product_id}) as total_blocks
      FROM user_progress up
      WHERE up.user_id = ${req.user.id} AND up.product_id = ${req.params.product_id}
    `

    if (!progress) {
      const [newProgress] = await sql`
        INSERT INTO user_progress (id, user_id, product_id)
        VALUES (${randomUUID()}, ${req.user.id}, ${req.params.product_id})
        RETURNING *
      `
      return res.json(newProgress)
    }

    res.json(progress)
  } catch (err) {
    res.status(500).json({ error: 'fetch_failed' })
  }
})

// ============================================================
// CABINET (user dashboard)
// ============================================================

// GET /cabinet - Дані кабінету користувача
router.get('/cabinet', authRequired, async (req, res) => {
  try {
    // Отримати всі продукти + enrollments + progress
    const products = await sql`
      SELECT 
        p.*,
        e.id as enrollment_id,
        up.total_points,
        up.completed_blocks,
        (SELECT COUNT(*) FROM blocks WHERE product_id = p.id) as total_blocks
      FROM products p
      LEFT JOIN enrollments e ON e.product_id = p.id AND e.user_id = ${req.user.id}
      LEFT JOIN user_progress up ON up.product_id = p.id AND up.user_id = ${req.user.id}
      WHERE p.published = true OR p.author_id = ${req.user.id}
      ORDER BY p.created_at DESC
    `

    res.json({ 
      user: req.user, 
      products: products.map(p => ({
        ...p,
        is_active: !!p.enrollment_id,
        progress: p.total_blocks > 0 
          ? Math.round((p.completed_blocks / p.total_blocks) * 100) 
          : 0
      }))
    })
  } catch (err: any) {
    res.status(500).json({ error: 'server_error' })
  }
})

export default router