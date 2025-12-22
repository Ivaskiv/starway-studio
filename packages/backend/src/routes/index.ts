// packages/backend/src/index.ts

import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import routes from './routes/index.js'

const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(cors({ origin: true, credentials: true }))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'))
}

// Routes
app.use('/api', routes)

// Health check
app.get('/', (req, res) => res.json({ 
  status: 'ok', 
  message: 'Starway Backend API',
  version: '3.0.0' 
}))

// Error handler
app.use((err: any, req: any, res: any, next: any) => {
  console.error('[ERROR]', err)
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  })
})

// Start
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`✅ Backend running on http://localhost:${PORT}`)
  })
}

export default app