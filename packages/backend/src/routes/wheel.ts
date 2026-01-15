// packages/backend/src/routes/wheel.ts
import { Router } from 'express'
import { sql } from '../db/client'
import { authRequired } from '../middleware/auth'

const router = Router()
const COOLDOWN_DAYS = 0
// const COOLDOWN_DAYS = 30


// GET /api/wheel
router.get('/', authRequired, async (req, res) => {
  try {
    const user_id = req.user!.id

    const rows = await sql`
      SELECT id, scores, total_score, average_score, strengths, gaps, ai_analysis, created_at
      FROM wheel_assessments WHERE user_id = ${user_id} ORDER BY created_at DESC LIMIT 12
    `

    const current = rows[0] || null
    let canFillNew = true, daysUntilNext = 0

    if (current) {
      const daysSince = Math.floor((Date.now() - new Date(current.created_at).getTime()) / (1000*60*60*24))
      canFillNew = daysSince >= COOLDOWN_DAYS
      daysUntilNext = Math.max(0, COOLDOWN_DAYS - daysSince)
    }

    const mapped = current ? {
      id: current.id,
      scores: current.scores,
      average: parseFloat(current.average_score) || 0,
      total_score: current.total_score || 0,
      strengths: current.strengths || [],
      gaps: current.gaps || [],
      ai_analysis: current.ai_analysis,
      completed_at: current.created_at,
    } : null

    res.json({ current: mapped, history: rows, canFillNew, daysUntilNext })
  } catch (err: any) {
    console.error('Get wheel error:', err)
    res.json({ current: null, history: [], canFillNew: true, daysUntilNext: 0 })
  }
})

// POST /api/wheel
router.post('/', authRequired, async (req, res) => {
  try {
    const user_id = req.user!.id
    const { scores } = req.body

    if (!scores || !Array.isArray(scores) || scores.length !== 8) {
      return res.status(400).json({ error: 'invalid_data', message: 'Expected 8 scores' })
    }

    const total_score = scores.reduce((s: number, i: any) => s + i.score, 0)
    const avgScore = (total_score / 8).toFixed(1)
    const sorted = [...scores].sort((a: any, b: any) => b.score - a.score)
    const strengths = sorted.slice(0, 3).map((s: any) => s.category_id)
    const gaps = sorted.slice(-3).reverse().map((s: any) => s.category_id)

    const result = await sql`
      INSERT INTO wheel_assessments (user_id, scores, total_score, average_score, strengths, gaps)
      VALUES (${user_id}, ${JSON.stringify(scores)}, ${total_score}, ${avgScore}, ${JSON.stringify(strengths)}, ${JSON.stringify(gaps)})
      RETURNING *
    `.then(r => r[0])

    await sql`UPDATE user_progress SET total_points = total_points + 100 WHERE user_id = ${user_id}`

    res.json({
      id: result.id, scores: result.scores, average: parseFloat(result.average_score),
      total_score: result.total_score, strengths: result.strengths, gaps: result.gaps, completed_at: result.created_at,
    })
  } catch (err: any) {
    console.error('Save wheel error:', err)
    res.status(500).json({ error: 'save_failed', message: err.message })
  }
})

// GET /api/wheel/cooldown
router.get('/cooldown', authRequired, async (req, res) => {
  try {
    const row = await sql`
      SELECT created_at FROM wheel_assessments WHERE user_id = ${req.user!.id} ORDER BY created_at DESC LIMIT 1
    `.then(r => r[0])

    if (!row) return res.json({ canFill: true, daysLeft: 0, lastFilledAt: null })

    const daysSince = Math.floor((Date.now() - new Date(row.created_at).getTime()) / (1000*60*60*24))
    res.json({ canFill: daysSince >= COOLDOWN_DAYS, daysLeft: Math.max(0, COOLDOWN_DAYS - daysSince), lastFilledAt: row.created_at })
  } catch { res.json({ canFill: true, daysLeft: 0, lastFilledAt: null }) }
})

// GET /api/wheel/latest/:user_id
router.get('/latest/:user_id', authRequired, async (req, res) => {
  try {
    const w = await sql`
      SELECT id, scores, total_score, average_score, strengths, gaps, created_at
      FROM wheel_assessments WHERE user_id = ${req.params.user_id} ORDER BY created_at DESC LIMIT 1
    `.then(r => r[0])

    if (!w) return res.json(null)
    res.json({ id: w.id, scores: w.scores, total_score: w.total_score, average_score: parseFloat(w.average_score), strengths: w.strengths, gaps: w.gaps, created_at: w.created_at })
  } catch (err: any) {
    res.status(500).json({ error: 'server_error', message: err.message })
  }
})

// GET /api/wheel/history/:user_id
router.get('/history/:user_id', authRequired, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 12
    const rows = await sql`
      SELECT id, scores, total_score, average_score, strengths, gaps, created_at
      FROM wheel_assessments WHERE user_id = ${req.params.user_id} ORDER BY created_at DESC LIMIT ${limit}
    `
    res.json(rows.map(w => ({ id: w.id, scores: w.scores, total_score: w.total_score, average_score: parseFloat(w.average_score), strengths: w.strengths, gaps: w.gaps, created_at: w.created_at })))
  } catch (err: any) {
    res.status(500).json({ error: 'server_error', message: err.message })
  }
})

export default router