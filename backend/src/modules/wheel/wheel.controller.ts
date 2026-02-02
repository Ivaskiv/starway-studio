// backend/src/modules/wheel/wheel.controller.ts
import { Request, Response } from 'express'
import sql from '../../db/client.js'
import { findUserById } from '../auth/auth.service.js'
import { createWheelPDF } from './wheel.pdf.js'
import { User } from '../../types/types.js'
import { WheelScore, WheelUserContext } from './wheel.types.js'
import { analyzeWheel, findWeakest, findFocus } from './wheel.service.js'

function mapApiScores(scores: any[]): WheelScore[] {
  return scores.map(s => ({
    categoryId: s.category_id,
    score: s.score,
    comment: s.comment,
  }))
}

function mapUserToContext(user: User): WheelUserContext {
  const name =
    user.first_name || user.last_name
      ? `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim()
      : user.telegram_username
      ? `@${user.telegram_username}`
      : user.email ?? null

  return {
    name,
    email: user.email ?? null,
    phone: null,
    gender: null,
    age: null,
  }
}

// === Створення нового колеса ===
export async function createWheelAssessment(req: Request, res: Response) {
  const userId = req.user!.id
  const scores = mapApiScores(req.body.scores)

  if (scores.length !== 8) {
    return res.status(400).json({ error: 'invalid_scores' })
  }

  const user = await findUserById(userId)
  if (!user) return res.status(404).json({ error: 'user_not_found' })

  const weakest = findWeakest(scores)
  const focus = findFocus(scores, weakest)

  const analysis = await analyzeWheel(scores, mapUserToContext(user))

  const [result] = await sql`
    INSERT INTO wheel_assessments (
      user_id,
      scores,
      weakest_sphere,
      focus_sphere,
      analysis
    )
    VALUES (
      ${userId},
      ${JSON.stringify(scores)},
      ${weakest.categoryId},
      ${focus.categoryId},
      ${analysis}
    )
    RETURNING *
  `

  res.json({
    id: result.id,
    scores,
    weakestSphere: weakest.categoryId,
    focusSphere: focus.categoryId,
    analysis,
    createdAt: result.created_at,
  })
}

// === Історія останніх 10 коліс ===
export async function getWheelHistory(req: Request, res: Response) {
  const userId = req.user!.id

  const results = await sql`
    SELECT * FROM wheel_assessments
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
    LIMIT 10
  `

  res.json(
    results.map(r => ({
      id: r.id,
      scores: JSON.parse(r.scores),
      weakestSphere: r.weakest_sphere,
      focusSphere: r.focus_sphere,
      analysis: r.analysis,
      createdAt: r.created_at,
    }))
  )
}

// === Останнє колесо ===
export async function getLatestWheel(req: Request, res: Response) {
  const userId = req.user!.id

  const [result] = await sql`
    SELECT * FROM wheel_assessments
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
    LIMIT 1
  `

  if (!result) return res.json(null)

  res.json({
    id: result.id,
    scores: JSON.parse(result.scores),
    weakestSphere: result.weakest_sphere,
    focusSphere: result.focus_sphere,
    analysis: result.analysis,
    createdAt: result.created_at,
  })
}

// === Генерація PDF ===
export async function generateWheelPDF(req: Request, res: Response) {
  const userId = req.user!.id
  const wheelId = req.params.id

  const [wheel] = await sql`
    SELECT * FROM wheel_assessments
    WHERE id = ${wheelId} AND user_id = ${userId}
  `

  if (!wheel) return res.status(404).json({ error: 'wheel_not_found' })

  const user = await findUserById(userId)
  const userName = user?.email ?? 'Користувач'

  const pdfBuffer = await createWheelPDF({
    userName,
    scores: JSON.parse(wheel.scores),
    weakestSphere: wheel.weakest_sphere,
    focusSphere: wheel.focus_sphere,
    analysis: wheel.analysis,
    createdAt: wheel.created_at,
  })

  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="wheel-${wheelId}.pdf"`
  )
  res.send(pdfBuffer)
}
