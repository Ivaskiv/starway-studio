// packages/backend/src/index.ts

import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import morgan from 'morgan'

// routes
import authRoutes from './routes/auth.js'
import productsRoutes from './routes/products.js'
import funnelsRoutes from './routes/funnels.js'
import aiRoutes from './routes/ai.js'
import systemRoutes from './routes/system.js'

const app = express()
const PORT = process.env.PORT || 3001

// ─────────────────────────────────────────────
// Middleware
// ─────────────────────────────────────────────

app.use(cors({ origin: true, credentials: true }))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'))
}

// ─────────────────────────────────────────────
// Routes
// ─────────────────────────────────────────────

app.use('/api/auth', authRoutes)
app.use('/api/products', productsRoutes)
app.use('/api/funnels', funnelsRoutes)
app.use('/api/ai', aiRoutes)
app.use('/api', systemRoutes)

// ─────────────────────────────────────────────
// Health check
// ─────────────────────────────────────────────

app.get('/', (_req, res) => {
  res.json({
    status: 'ok',
    message: 'Starway Backend API',
    version: '3.0.0',
  })
})

// ─────────────────────────────────────────────
// Global error handler
// ─────────────────────────────────────────────

app.use((err: any, _req: any, res: any, _next: any) => {
  console.error('[ERROR]', err)
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  })
})

// ─────────────────────────────────────────────
// Start server (local only)
// ─────────────────────────────────────────────

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`✅ Backend running on http://localhost:${PORT}`)
  })
}

export default app
