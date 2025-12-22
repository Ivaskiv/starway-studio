// packages/backend/src/routes/answers.ts

import { ServerResponse } from 'http'
import { AuthRequest } from '../middleware/auth'
import { sql } from '../db/client'

async function parseBody(req: AuthRequest): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', chunk => {
      body += chunk.toString()
    })
    req.on('end', () => {
      try {
        resolve(JSON.parse(body))
      } catch (e) {
        reject(new Error('Invalid JSON'))
      }
    })
    req.on('error', reject)
  })
}

export async function handleAnswers(
  req: AuthRequest,
  res: ServerResponse,
  pathname: string
): Promise<void> {
  const userId = req.user?.id

  if (!userId) {
    res.writeHead(401, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'unauthorized' }))
    return
  }

  // GET /api/answers - Отримати всі відповіді
  if (pathname === '/api/answers' && req.method === 'GET') {
    try {
      const answers = await sql`
        SELECT * FROM answers WHERE user_id = ${userId}
        ORDER BY updated_at DESC
      `

      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ answers }))
    } catch (error: any) {
      console.error('Get answers error:', error)
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'internal_error', message: error.message }))
    }
    return
  }

  // POST /api/answers - Створити або оновити відповідь
  if (pathname === '/api/answers' && req.method === 'POST') {
    try {
      const { questionId, answer } = await parseBody(req)

      if (!questionId || answer === undefined) {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'question_id_and_answer_required' }))
        return
      }

      // Upsert відповіді
      const [result] = await sql`
        INSERT INTO answers (user_id, question_id, answer)
        VALUES (${userId}, ${questionId}, ${answer})
        ON CONFLICT (user_id, question_id)
        DO UPDATE SET answer = ${answer}, updated_at = NOW()
        RETURNING *
      `

      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ answer: result }))
    } catch (error: any) {
      console.error('Save answer error:', error)
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'internal_error', message: error.message }))
    }
    return
  }

  // DELETE /api/answers/:id - Видалити відповідь
  if (pathname.startsWith('/api/answers/') && req.method === 'DELETE') {
    try {
      const answerId = pathname.split('/')[3]

      if (!answerId) {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'answer_id_required' }))
        return
      }

      await sql`
        DELETE FROM answers 
        WHERE id = ${answerId} AND user_id = ${userId}
      `

      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ success: true }))
    } catch (error: any) {
      console.error('Delete answer error:', error)
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'internal_error', message: error.message }))
    }
    return
  }

  // 404
  res.writeHead(404, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ error: 'route_not_found' }))
}