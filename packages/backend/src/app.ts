// packages/backend/src/app.ts
import cors from 'cors'
import express from 'express'

import aiRoutes from './routes/ai'
import authRoutes from './routes/auth'
import funnelsRoutes from './routes/funnel'
import mentorRoutes from './routes/mentor'
import paymentsRoutes from './routes/payments'
import productsRoutes from './routes/products'
import progressRoutes from './routes/progress'
import socialRoutes from './routes/social'
import statsRoutes from './routes/stats'
import systemRoutes from './routes/system'
import usersRoutes from './routes/users'
import wheelRoutes from './routes/wheel'

export function createApp() {
  const app = express()

  // ============================================
  // ⚙️ MIDDLEWARE
  // ============================================
  
  // CORS configuration
  app.use(cors({
    origin: [
      'http://localhost:5173',
      'http://localhost:3000',
      'https://starway-studio.vercel.app',
    ],
    credentials: true,
  }))

  // Body parsers
  app.use(express.json({ limit: '10mb' }))
  app.use(express.urlencoded({ extended: true, limit: '10mb' }))

  // Request logging (only in development)
  if (process.env.NODE_ENV !== 'production') {
    app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} ${req.method} ${req.path}`)
      next()
    })
  }

  // ============================================
  // 🏥 HEALTH CHECK
  // ============================================
  
  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      env: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
    })
  })

  // Root endpoint
  app.get('/', (_req, res) => {
    res.json({
      name: 'Starway Studio API',
      version: '1.0.0',
      status: 'running',
      endpoints: {
        health: '/health',
        auth: '/api/auth',
        users: '/api/users',
        funnels: '/api/funnels',
        products: '/api/products',
        ai: '/api/ai',
        mentor: '/api/mentor',
        payments: '/api/payments',
      },
    })
  })

  // ============================================
  // 🛣️ API ROUTES
  // ============================================
  
  app.use('/api/auth', authRoutes)
  app.use('/api/users', usersRoutes)
  app.use('/api/funnels', funnelsRoutes)
  app.use('/api/products', productsRoutes)
  app.use('/api/ai', aiRoutes)
  app.use('/api/system', systemRoutes)
  app.use('/api/stats', statsRoutes)
  app.use('/api/wheel', wheelRoutes)
  app.use('/api/social', socialRoutes)
  app.use('/api/progress', progressRoutes)
  app.use('/api/mentor', mentorRoutes)
  app.use('/api/ai-mentor', mentorRoutes) // Alias
  app.use('/api/payments', paymentsRoutes)

  // ============================================
  // 🚫 ERROR HANDLERS
  // ============================================
  
  // 404 handler
  app.use((req, res) => {
    console.warn(`⚠️  404 Not Found: ${req.method} ${req.path}`)
    res.status(404).json({
      error: 'Not Found',
      message: `Cannot ${req.method} ${req.path}`,
      path: req.path,
    })
  })

  // Global error handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('❌ Error:', err)
    
    const status = err.status || err.statusCode || 500
    const message = err.message || 'Internal Server Error'
    
    res.status(status).json({
      error: err.name || 'Error',
      message,
      ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
    })
  })

  return app
}