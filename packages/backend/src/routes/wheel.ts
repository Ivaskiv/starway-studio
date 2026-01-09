// packages/backend/src/routes/wheel.ts

import { Router } from 'express'
import { authRequired } from '../middleware/auth.js'
import { sql } from '../db/client.js'
import { analyzeWheelWithAI } from '../services/wheel-prompts.js'

const router = Router()

/**
 * GET /wheel/latest/:userId
 * Останній результат колеса
 */
router.get('/latest/:userId', authRequired, async (req, res) => {
  try {
    const { userId } = req.params

    const [wheel] = await sql`
      SELECT 
        id, user_id, scores, total_score, average_score,
        strengths, gaps, created_at
      FROM wheel_assessments
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
      LIMIT 1
    `

    if (!wheel) {
      return res.json(null)
    }

    res.json({
      id: wheel.id,
      userId: wheel.user_id,
      scores: wheel.scores,
      totalScore: wheel.total_score,
      averageScore: wheel.average_score,
      strengths: wheel.strengths,
      gaps: wheel.gaps,
      createdAt: wheel.created_at,
    })
  } catch (error: any) {
    console.error('❌ [Wheel] Get latest error:', error)
    res.status(500).json({ error: 'server_error', message: error.message })
  }
})

/**
 * GET /wheel/history/:userId
 * Історія оцінок
 */
router.get('/history/:userId', authRequired, async (req, res) => {
  try {
    const { userId } = req.params
    const limit = parseInt(req.query.limit as string) || 12

    const wheels = await sql`
      SELECT 
        id, user_id, scores, total_score, average_score,
        strengths, gaps, created_at
      FROM wheel_assessments
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
      LIMIT ${limit}
    `

    res.json(wheels.map(w => ({
      id: w.id,
      userId: w.user_id,
      scores: w.scores,
      totalScore: w.total_score,
      averageScore: w.average_score,
      strengths: w.strengths,
      gaps: w.gaps,
      createdAt: w.created_at,
    })))
  } catch (error: any) {
    console.error('❌ [Wheel] Get history error:', error)
    res.status(500).json({ error: 'server_error', message: error.message })
  }
})

/**
 * GET /wheel/compare/:userId
 * Порівняння поточного з попереднім
 */
router.get('/compare/:userId', authRequired, async (req, res) => {
  try {
    const { userId } = req.params

    const wheels = await sql`
      SELECT 
        id, scores, total_score, created_at
      FROM wheel_assessments
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
      LIMIT 2
    `

    if (wheels.length < 2) {
      return res.status(404).json({ error: 'not_enough_data' })
    }

    const [current, previous] = wheels

    // Обчислюємо зміни по категоріях
    const changes = current.scores.map((curr: any) => {
      const prev = previous.scores.find((p: any) => p.categoryId === curr.categoryId)
      return {
        categoryId: curr.categoryId,
        delta: curr.score - (prev?.score || 0),
      }
    })

    res.json({
      current: { id: current.id, scores: current.scores, createdAt: current.created_at },
      previous: { id: previous.id, scores: previous.scores, createdAt: previous.created_at },
      changes,
    })
  } catch (error: any) {
    console.error('❌ [Wheel] Compare error:', error)
    res.status(500).json({ error: 'server_error', message: error.message })
  }
})

/**
 * POST /wheel
 * Зберегти нову оцінку колеса
 */
router.post('/', authRequired, async (req, res) => {
  try {
    const { userId, scores } = req.body

    if (!userId || !scores || !Array.isArray(scores) || scores.length !== 8) {
      return res.status(400).json({ error: 'invalid_data', message: 'Expected 8 scores' })
    }

    // Розрахунки
    const totalScore = scores.reduce((sum: number, s: any) => sum + s.score, 0)
    const averageScore = totalScore / 8

    // Сортуємо для визначення сильних/слабких сторін
    const sorted = [...scores].sort((a: any, b: any) => b.score - a.score)
    const strengths = sorted.slice(0, 3).map((s: any) => s.categoryId)
    const gaps = sorted.slice(-3).map((s: any) => s.categoryId)

    const [wheel] = await sql`
      INSERT INTO wheel_assessments (
        user_id, scores, total_score, average_score, strengths, gaps, created_at
      ) VALUES (
        ${userId},
        ${JSON.stringify(scores)},
        ${totalScore},
        ${averageScore},
        ${JSON.stringify(strengths)},
        ${JSON.stringify(gaps)},
        NOW()
      )
      RETURNING id, user_id, scores, total_score, average_score, strengths, gaps, created_at
    `

    console.log(`✅ [Wheel] Assessment saved for user ${userId}, avg: ${averageScore.toFixed(1)}`)

    res.json({
      id: wheel.id,
      userId: wheel.user_id,
      scores: wheel.scores,
      totalScore: wheel.total_score,
      averageScore: wheel.average_score,
      strengths: wheel.strengths,
      gaps: wheel.gaps,
      createdAt: wheel.created_at,
    })
  } catch (error: any) {
    console.error('❌ [Wheel] Save error:', error)
    res.status(500).json({ error: 'save_failed', message: error.message })
  }
})

/**
 * POST /wheel/analyze
 * AI аналіз колеса з рекомендаціями
 */
router.post('/analyze', authRequired, async (req, res) => {
  try {
    const { userId, scores } = req.body

    if (!scores || scores.length !== 8) {
      return res.status(400).json({ error: 'invalid_scores' })
    }

    console.log(`🤖 [Wheel] AI analysis for user ${userId}`)

    const analysis = await analyzeWheelWithAI(scores)

    res.json(analysis)
  } catch (error: any) {
    console.error('❌ [Wheel] Analysis error:', error)
    res.status(500).json({ error: 'analysis_failed', message: error.message })
  }
})

export default router