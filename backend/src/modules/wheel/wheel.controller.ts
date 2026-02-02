// backend/src/modules/wheel/wheel.controller.ts
import { Request, Response } from 'express'
import sql from '../../db/client.js'
import { findUserById } from '../auth/auth.service.js'
import { generateWheelAnalysis, WheelUserContext } from './wheel.ai.js'
import { createWheelPDF } from './wheel.pdf.js'
import { WheelScore } from '../mentor/types/mentor.types.js'
import { User } from '../../types/types.js'

export function mapUserToWheelContext(user: User): WheelUserContext {
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

export async function createWheelAssessment(req: Request, res: Response) {
  try {
    const userId = req.user!.id
    const { scores } = req.body

    if (!Array.isArray(scores) || scores.length !== 8) {
      return res.status(400).json({ error: 'invalid_scores' })
    }

    const user = await findUserById(userId)
    if (!user) return res.status(404).json({ error: 'user_not_found' })

    const scoresTyped = scores as WheelScore[]

    const weakestSphere = scoresTyped.reduce((min, curr) =>
      curr.score < min.score ? curr : min
    )

    const focusSphere =
      scoresTyped.find(
        (s) => s.sphere !== weakestSphere.sphere && s.score < 7
      ) || weakestSphere

    const wheelUser = mapUserToWheelContext(user)

    const analysis = await generateWheelAnalysis(
      scoresTyped,
      wheelUser
    )

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
        ${JSON.stringify(scoresTyped)},
        ${weakestSphere.sphere},
        ${focusSphere.sphere},
        ${analysis}
      )
      RETURNING *
    `

    res.json({
      id: result.id,
      userId: result.user_id,
      scores: JSON.parse(result.scores),
      weakestSphere: result.weakest_sphere,
      focusSphere: result.focus_sphere,
      analysis: result.analysis,
      createdAt: result.created_at,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'server_error' })
  }
}

export async function getWheelHistory(req: Request, res: Response) {
  try {
    const userId = req.user!.id

    const results = await sql`
      SELECT * FROM wheel_assessments
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
      LIMIT 10
    `

    res.json(
      results.map((r) => ({
        id: r.id,
        userId: r.user_id,
        scores: JSON.parse(r.scores),
        weakestSphere: r.weakest_sphere,
        focusSphere: r.focus_sphere,
        analysis: r.analysis,
        createdAt: r.created_at,
      }))
    )
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'server_error' })
  }
}

export async function getLatestWheel(req: Request, res: Response) {
  try {
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
      userId: result.user_id,
      scores: JSON.parse(result.scores),
      weakestSphere: result.weakest_sphere,
      focusSphere: result.focus_sphere,
      analysis: result.analysis,
      createdAt: result.created_at,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'server_error' })
  }
}

export async function generateWheelPDF(req: Request, res: Response) {
  try {
    const userId = req.user!.id
    const wheelId = req.params.id

    const [wheel] = await sql`
      SELECT * FROM wheel_assessments
      WHERE id = ${wheelId} AND user_id = ${userId}
    `

    if (!wheel) {
      return res.status(404).json({ error: 'wheel_not_found' })
    }

    const user = await findUserById(userId)

    let userName = 'Користувач'
    let isEmail = false

    if (user?.email) {
      userName = user.email
      isEmail = true
    }

    const pdfBuffer = await createWheelPDF({
      id: wheel.id,
      userId: wheel.user_id,
      userName,
      isEmail,
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
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'server_error' })
  }
}
