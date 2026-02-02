// backend/src/modules/progress/progress.routes.ts
import { Router } from 'express'
import { authRequired } from '../../middleware/auth.js'
import sql from '../../db/client.js'

const router = Router()

// GET /progress (current user)
router.get('/', authRequired, async (req, res) => {
  try {
    const user_id = req.user!.id
    let [p] = await sql`SELECT * FROM user_progress WHERE user_id = ${user_id} LIMIT 1`
    
    if (!p) {
      [p] = await sql`INSERT INTO user_progress (user_id) VALUES (${user_id}) RETURNING *`
    }

    res.json({
      totalPoints: Number(p.total_points) || 0,
      completedBlocks: Number(p.completed_blocks) || 0,
      level: Number(p.level) || 1,
    })
  } catch (err: any) {
    console.error('Get progress error:', err)
    res.status(500).json({ error: 'server_error', message: err.message })
  }
})

// GET /progress/:userId (specific user)
router.get('/:userId', authRequired, async (req, res) => {
  try {
    let [p] = await sql`SELECT * FROM user_progress WHERE user_id = ${req.params.userId} LIMIT 1`
    
    if (!p) {
      [p] = await sql`INSERT INTO user_progress (user_id) VALUES (${req.params.userId}) RETURNING *`
    }

    res.json({
      totalPoints: Number(p.total_points) || 0,
      completedBlocks: Number(p.completed_blocks) || 0,
      level: Number(p.level) || 1,
    })
  } catch (err: any) {
    console.error('Get progress error:', err)
    res.status(404).json({ error: 'not_found' })
  }
})

export default router