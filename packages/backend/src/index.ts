// packages/backend/src/index.ts

import 'dotenv/config';
import express from 'express';
import cors from 'cors';

console.log('🔍 Environment check:');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? '✅ Set' : '❌ Not set');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? '✅ Set' : '❌ Not set');
console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? '✅ Set' : '❌ Not set');

import authRoutes from './routes/auth.js';
import funnelsRoutes from './routes/funnel.js';
import usersRoutes from './routes/users.js';
import aiRoutes from './routes/ai.js';
import productsRoutes from './routes/products.js';
import systemRoutes from './routes/system.js';
import statsRoutes from './routes/stats.js';
import wheelRoutes from './routes/wheel.js'

const app = express();

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/funnels', funnelsRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/wheel', wheelRoutes)

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🚀 API: http://localhost:${PORT}/api`);
  console.log(`🤖 AI Routes: http://localhost:${PORT}/api/ai`);
});

process.on('SIGTERM', () => {
  console.log('👋 SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('👋 SIGINT received, shutting down gracefully');
  process.exit(0);
});

export default app;