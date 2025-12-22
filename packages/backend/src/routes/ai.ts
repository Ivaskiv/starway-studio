// packages/backend/src/routes/ai.ts

import { IncomingMessage, ServerResponse } from 'http'
import { AuthRequest } from '../middleware/auth'
import { generateWithAI } from '../services/ai'
import { checkGenerationLimit, incrementGenerations } from '../services/generations'

interface AIRequestBody {
  field: string
  prompt: string
  context?: any
}

async function parseBody(req: IncomingMessage): Promise<any> {
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

export async function handleAIGenerate(
  req: AuthRequest, 
  res: ServerResponse
): Promise<void> {
  try {
    // Перевірка методу
    if (req.method !== 'POST') {
      res.writeHead(405, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Method not allowed' }))
      return
    }

    // Парсинг body
    const body = await parseBody(req) as AIRequestBody
    const { field, prompt, context } = body
    const userId = (req as AuthRequest).user?.id

    if (!userId) {
      res.writeHead(401, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'unauthorized' }))
      return
    }

    // Валідація
    if (!field || !prompt) {
      res.writeHead(400, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'missing_field_or_prompt' }))
      return
    }

    // Перевірка ліміту генерацій
    const { canGenerate, remaining } = await checkGenerationLimit(userId)
    
    if (!canGenerate) {
      res.writeHead(403, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ 
        error: 'generation_limit_reached',
        remaining: 0 
      }))
      return
    }

    // Генерація з AI
    const result = await generateWithAI(field, prompt, context)
    
    // Збільшення лічильника
    await incrementGenerations(userId, field, result)

    // Успішна відповідь
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({
      success: true,
      result,
      remaining: remaining - 1
    }))

  } catch (error: any) {
    console.error('AI generation error:', error)
    res.writeHead(500, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ 
      error: 'generation_failed',
      message: error.message 
    }))
  }
}