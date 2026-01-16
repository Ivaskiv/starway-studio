// // packages/backend/src/server.ts
// import { createApp } from './app'

// export async function startServer() {
//   // ============================================
//   // 🔍 ENVIRONMENT CHECK
//   // ============================================
  
//   console.log('='.repeat(60))
//   console.log('🔍 Environment Check')
//   console.log('='.repeat(60))
  
//   const checks = {
//     'NODE_ENV': process.env.NODE_ENV || 'development',
//     'PORT': process.env.PORT || '3001',
//     'DATABASE_URL': process.env.DATABASE_URL ? '✅ Set' : '⚠️  Not set (using mock)',
//     'JWT_SECRET': process.env.JWT_SECRET ? '✅ Set' : '⚠️  Using default',
//     'OPENAI_API_KEY': process.env.OPENAI_API_KEY ? '✅ Set' : '⚠️  Not set',
//   }

//   Object.entries(checks).forEach(([key, value]) => {
//     console.log(`${key.padEnd(20)}: ${value}`)
//   })
  
//   console.log('='.repeat(60))

//   // ============================================
//   // 🗄️ DATABASE CHECK (optional)
//   // ============================================
  
//   // Розкоментуйте якщо потрібно:
//   // try {
//   //   await checkDatabaseConnection()
//   //   console.log('✅ Database connected')
//   // } catch (err) {
//   //   console.error('❌ Database connection failed:', err)
//   //   process.exit(1)
//   // }

//   // ============================================
//   // 🚀 START SERVER
//   // ============================================
  
//   const app = createApp()
//   const PORT = process.env.PORT || 3001

//   const server = app.listen(PORT, () => {
//     console.log('='.repeat(60))
//     console.log('🚀 Starway Studio Backend')
//     console.log('='.repeat(60))
//     console.log(`✅ Server running on port ${PORT}`)
//     console.log(`🌐 API: http://localhost:${PORT}/api`)
//     console.log(`🏥 Health: http://localhost:${PORT}/health`)
//     console.log('='.repeat(60))
//   })

//   // ============================================
//   // 🛑 GRACEFUL SHUTDOWN
//   // ============================================
  
//   const shutdown = (signal: string) => {
//     console.log(`\n👋 Received ${signal}, shutting down gracefully...`)
    
//     server.close(() => {
//       console.log('✅ HTTP server closed')
      
//       // Close database connections if needed
//       // await closeDatabaseConnection()
      
//       console.log('✅ All connections closed')
//       process.exit(0)
//     })

//     // Force shutdown after 10 seconds
//     setTimeout(() => {
//       console.error('⚠️  Forced shutdown after 10s timeout')
//       process.exit(1)
//     }, 10000)
//   }

//   // Handle shutdown signals
//   process.on('SIGTERM', () => shutdown('SIGTERM'))
//   process.on('SIGINT', () => shutdown('SIGINT'))

//   // Handle uncaught errors
//   process.on('uncaughtException', (err) => {
//     console.error('💥 Uncaught Exception:', err)
//     shutdown('uncaughtException')
//   })

//   process.on('unhandledRejection', (reason, promise) => {
//     console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason)
//     shutdown('unhandledRejection')
//   })

//   return server
// }