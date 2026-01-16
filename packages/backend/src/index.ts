// packages/backend/src/index.ts
import 'dotenv/config'
import { createApp } from './app'

// ✅ Для Vercel serverless functions
const app = createApp()

// ✅ Для локальної розробки
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3001
  
  app.listen(PORT, () => {
    console.log('='.repeat(60))
    console.log('🚀 Starway Studio Backend (Development)')
    console.log('='.repeat(60))
    console.log(`✅ Server running on port ${PORT}`)
    console.log(`🌐 API: http://localhost:${PORT}/api`)
    console.log(`🏥 Health: http://localhost:${PORT}/health`)
    console.log('='.repeat(60))
  })
}

// ✅ Експорт для Vercel
export default app