// packages/backend/src/index.ts

import 'dotenv/config'
import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import morgan from 'morgan'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { sql } from './db/client.js'
import { generateWithAI } from './services/ai.js'
import { checkGenerationLimit, incrementGenerations } from './services/generations.js'
import {JwtPayload, User } from '../types/models.js'

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════


interface AuthRequest extends Request {
  user?: User
}

// interface JwtPayload {
//   id: string
//   role: string
// }

// ═══════════════════════════════════════════════════════════════
// APP SETUP
// ═══════════════════════════════════════════════════════════════

const app = express()
const PORT = process.env.PORT || 3001
const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production'

// Middleware
app.use(cors({ 
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true 
}))
app.use(express.json({ limit: '5mb' }))
app.use(express.urlencoded({ extended: true, limit: '5mb' }))

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'))
}

// ═══════════════════════════════════════════════════════════════
// AUTH MIDDLEWARE
// ═══════════════════════════════════════════════════════════════

const authRequired = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.split(' ')[1]
    
    if (!token) {
      return res.status(401).json({ error: 'unauthorized', message: 'No token provided' })
    }

    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload
    const [dbUser] = await sql`
      SELECT id, email, name, role 
      FROM users 
      WHERE id = ${decoded.id}
    `

    if (!dbUser) {
      return res.status(401).json({ error: 'user_not_found' })
    }

    req.user = 
    {
 id: dbUser.id,
  email: dbUser.email,
  name: dbUser.name,
  role: dbUser.role,
  telegram_id: dbUser.telegram_id || '',
  telegram_username: dbUser.telegram_username || null,
  created_at: dbUser.created_at || new Date(),
  updated_at: dbUser.updated_at || new Date(),
  avatar: dbUser.avatar || undefined,
  password_hash: dbUser.password_hash || undefined    }
    next()
  } catch (err) {
    return res.status(401).json({ error: 'invalid_token' })
  }
}

// ═══════════════════════════════════════════════════════════════
// AUTH ROUTES
// ═══════════════════════════════════════════════════════════════

// Register
app.post('/api/auth/register', async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'missing_fields' })
    }

    // Check if email exists
    const [exists] = await sql`SELECT 1 FROM users WHERE email = ${email}`
    if (exists) {
      return res.status(409).json({ error: 'email_exists' })
    }

    // First user = super_admin
    const [{ count }] = await sql`SELECT COUNT(*)::int as count FROM users`
    const role = count === 0 ? 'super_admin' : 'user'
    
    // Hash password
    const passwordHash = await bcrypt.hash(password, 10)
    const userId = crypto.randomUUID()

    // Create user
    const [user] = await sql`
      INSERT INTO users (id, email, password_hash, name, role, created_at)
      VALUES (
        ${userId}, 
        ${email}, 
        ${passwordHash}, 
        ${name || email.split('@')[0]}, 
        ${role},
        NOW()
      )
      RETURNING id, email, name, role
    `

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, role: user.role }, 
      JWT_SECRET, 
      { expiresIn: '30d' }
    )

    res.status(201).json({ token, user })
  } catch (error: any) {
    console.error('Register error:', error)
    res.status(500).json({ error: 'server_error', message: error.message })
  }
})

// Login
app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'missing_fields' })
    }

    // Find user
    const [user] = await sql`
      SELECT id, email, name, role, password_hash 
      FROM users 
      WHERE email = ${email}
    `

    if (!user || !user.password_hash) {
      return res.status(401).json({ error: 'invalid_credentials' })
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash)
    if (!validPassword) {
      return res.status(401).json({ error: 'invalid_credentials' })
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, role: user.role }, 
      JWT_SECRET, 
      { expiresIn: '30d' }
    )

    res.json({ 
      token, 
      user: { 
        id: user.id, 
        email: user.email, 
        name: user.name, 
        role: user.role 
      } 
    })
  } catch (error: any) {
    console.error('Login error:', error)
    res.status(500).json({ error: 'server_error', message: error.message })
  }
})

// Get current user
app.get('/api/auth/me', authRequired, (req: AuthRequest, res: Response) => {
  res.json({ user: req.user })
})

// ═══════════════════════════════════════════════════════════════
// AI GENERATION ROUTES
// ═══════════════════════════════════════════════════════════════

// Generate with AI
app.post('/api/ai/generate', authRequired, async (req: AuthRequest, res: Response) => {
  try {
    const { field, prompt, context } = req.body
    const userId = req.user!.id

    if (!field || !prompt) {
      return res.status(400).json({ error: 'missing_field_or_prompt' })
    }

    // Check generation limit
    const { canGenerate, remaining } = await checkGenerationLimit(userId)
    
    if (!canGenerate) {
      return res.status(403).json({ 
        error: 'generation_limit_reached',
        remaining: 0 
      })
    }

    // Generate with AI
    const result = await generateWithAI(field, prompt, context)
    
    // Increment counter
    await incrementGenerations(userId, field, result)

    res.json({
      success: true,
      result,
      remaining: remaining - 1
    })
  } catch (error: any) {
    console.error('AI generation error:', error)
    res.status(500).json({ 
      error: 'generation_failed',
      message: error.message 
    })
  }
})

// Check generation limit
app.get('/api/ai/limit', authRequired, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id
    const { canGenerate, remaining } = await checkGenerationLimit(userId)
    
    res.json({ canGenerate, remaining })
  } catch (error: any) {
    console.error('Check limit error:', error)
    res.status(500).json({ error: 'server_error', message: error.message })
  }
})

// ═══════════════════════════════════════════════════════════════
// ANSWERS ROUTES
// ═══════════════════════════════════════════════════════════════

// Get all answers
app.get('/api/answers', authRequired, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id
    
    const answers = await sql`
      SELECT * FROM answers 
      WHERE user_id = ${userId}
      ORDER BY updated_at DESC
    `

    res.json({ answers })
  } catch (error: any) {
    console.error('Get answers error:', error)
    res.status(500).json({ error: 'server_error', message: error.message })
  }
})

// Save or update answer
app.post('/api/answers', authRequired, async (req: AuthRequest, res: Response) => {
  try {
    const { questionId, answer } = req.body
    const userId = req.user!.id

    if (!questionId || answer === undefined) {
      return res.status(400).json({ error: 'question_id_and_answer_required' })
    }

    // Upsert
    const [result] = await sql`
      INSERT INTO answers (user_id, question_id, answer, created_at, updated_at)
      VALUES (${userId}, ${questionId}, ${answer}, NOW(), NOW())
      ON CONFLICT (user_id, question_id)
      DO UPDATE SET answer = ${answer}, updated_at = NOW()
      RETURNING *
    `

    res.json({ answer: result })
  } catch (error: any) {
    console.error('Save answer error:', error)
    res.status(500).json({ error: 'server_error', message: error.message })
  }
})

// Delete answer
app.delete('/api/answers/:id', authRequired, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const userId = req.user!.id

    await sql`
      DELETE FROM answers 
      WHERE id = ${id} AND user_id = ${userId}
    `

    res.json({ success: true })
  } catch (error: any) {
    console.error('Delete answer error:', error)
    res.status(500).json({ error: 'server_error', message: error.message })
  }
})

// ═══════════════════════════════════════════════════════════════
// HEALTH CHECK
// ═══════════════════════════════════════════════════════════════

app.get('/health', (_req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  })
})

app.get('/', (_req, res) => {
  res.json({ 
    message: '🚀 Starway Studio API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth/*',
      ai: '/api/ai/*',
      answers: '/api/answers'
    }
  })
})

// ═══════════════════════════════════════════════════════════════
// ERROR HANDLING
// ═══════════════════════════════════════════════════════════════

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'route_not_found' })
})

// Global error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', err)
  res.status(500).json({ 
    error: 'internal_server_error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  })
})

// ═══════════════════════════════════════════════════════════════
// SERVER START
// ═══════════════════════════════════════════════════════════════

const server = app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🚀 Starway Studio Backend API                          ║
║                                                           ║
║   📍 Local:      http://localhost:${PORT}                    ║
║   🌍 Network:    http://0.0.0.0:${PORT}                      ║
║                                                           ║
║   📦 Environment: ${process.env.NODE_ENV || 'development'}                              ║
║   🗄️  Database:   ${process.env.DATABASE_URL ? '✅ Connected' : '❌ Not configured'}                     ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `)
})

// Graceful shutdown
const shutdown = () => {
  console.log('\n🛑 Shutting down gracefully...')
  server.close(() => {
    console.log('✅ Server closed')
    process.exit(0)
  })

  // Force shutdown after 10s
  setTimeout(() => {
    console.error('⚠️  Forcing shutdown')
    process.exit(1)
  }, 10000)
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)

// Unhandled errors
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled Rejection:', error)
})

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error)
  shutdown()
})

export default app