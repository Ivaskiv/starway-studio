// backend/src/index.ts
// # 🚀 ЄДИНИЙ старт сервера (local + env check)
// backend/src/index.ts
import 'dotenv/config'
import { createApp } from './app'

// ===============================
// 🔍 ENV CHECK
// ===============================
console.log('='.repeat(60))
console.log('🔍 Environment Check')
console.log('='.repeat(60))

const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: process.env.PORT || '3001',
  DATABASE_URL: process.env.DATABASE_URL ? '✅' : '⚠️',
  JWT_SECRET: process.env.JWT_SECRET ? '✅' : '❌',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY ? '✅' : '⚠️',
}

Object.entries(env).forEach(([k, v]) =>
  console.log(`${k.padEnd(20)}: ${v}`),
)

console.log('='.repeat(60))

if (!process.env.JWT_SECRET) {
  throw new Error('❌ JWT_SECRET is missing. Server stopped.')
}

// ===============================
// 🚀 START
// ===============================
const app = createApp()

if (process.env.NODE_ENV !== 'production') {
  const PORT = Number(process.env.PORT) || 3001

  const server = app.listen(PORT, () => {
    console.log('🚀 Starway Studio Backend')
    console.log(`🌐 http://localhost:${PORT}`)
    console.log(`🏥 http://localhost:${PORT}/health`)
  })

  const shutdown = (signal: string) => {
    console.log(`👋 ${signal} received. Shutting down...`)
    server.close(() => process.exit(0))
  }

  process.on('SIGINT', () => shutdown('SIGINT'))
  process.on('SIGTERM', () => shutdown('SIGTERM'))
}

// 👇 ДЛЯ VERCEL
export default app
