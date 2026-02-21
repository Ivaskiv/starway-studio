// backend/src/app.ts
import cookieParser from 'cookie-parser';
import cors from 'cors';
import 'dotenv/config';
import express from 'express';
import morgan from 'morgan';

// Import routes
import accessRoutes from './modules/access/routes.js';
import mentorRoutes from './modules/ai-mentor/routes.js';
import authRoutes from './modules/auth/auth.routes.js';
import consultationRoutes from './modules/consultation/routes.js';
import goalsRoutes from './modules/goals/routes.js';
import mentorshipRoutes from './modules/mentorship/routes.js';
import miniCoursesRoutes from './modules/mini-courses/routes.js';
import productsRoutes from './modules/products/routes.js';
import progressRoutes from './modules/progress/routes.js';
import trialRoutes from './modules/trial/routes.js';
import visionRoutes from './modules/vision/routes.js';
import wheelRoutes from './modules/wheel/routes.js';
import zoomRoutes from './modules/zoom/routes.js';
import onboardingRoutes from './modules/onboarding/routes.js';
import socialRoutes from './modules/social/routes.js';
import funnelRoutes from './modules/funnel/routes.js';
import aiGeneratorRoutes from './modules/ai-generator/routes.js';

export function createApp() {
  const app = express();

  // Middleware
  app.use(
    cors({
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
  }

  // Health check
  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
    });
  });

  // ==========================================
  // REGISTER ROUTES (ПОРЯДОК ВАЖЛИВИЙ!)
  // ==========================================

  // Core
  app.use('/api/auth', authRoutes);
  app.use('/api/access', accessRoutes);
  app.use('/api/products', productsRoutes);
  // fix code_x: mount progress API so /api/progress/:userId works for dashboard/progress page.
  app.use('/api/progress', progressRoutes);

  // AI Mentor Ecosystem
  app.use('/api/mentor', mentorRoutes);
  app.use('/api/onboarding', onboardingRoutes);
  app.use('/api/wheel', wheelRoutes);
  app.use('/api/vision', visionRoutes);
  app.use('/api/goals', goalsRoutes);
  app.use('/api/trial', trialRoutes);

  // Advanced Features
  app.use('/api/consultation', consultationRoutes);
  app.use('/api/zoom', zoomRoutes);
  app.use('/api/mentorship', mentorshipRoutes);
  app.use('/api/courses', miniCoursesRoutes);
  app.use('/api/social', socialRoutes);
  app.use('/api/funnels', funnelRoutes);
  app.use('/api/ai/generator', aiGeneratorRoutes);

  // 404 handler
  app.use((req, res) => {
    console.log('❌ [404]', { method: req.method, path: req.path });
    res.status(404).json({
      error: 'Route not found',
      path: req.path,
      method: req.method,
    });
  });

  // Error handler
  app.use(errorHandler);

  return app;
}

// Error handler function
const errorHandler = (
  error: any,
  req: express.Request,
  res: express.Response,
  _next: express.NextFunction,
) => {
  console.error('💥 [ERROR]', {
    path: req.path,
    method: req.method,
    error: error.message,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
  });

  // Prisma errors
  if (error.code?.startsWith('P')) {
    return res.status(400).json({
      error: 'Database error',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Bad request',
      code: error.code,
    });
  }

  // Default error
  return res.status(error.status || 500).json({
    error: error.name || 'Internal Server Error',
    message: error.message || 'An unexpected error occurred',
    ...(process.env.NODE_ENV === 'development' && {
      stack: error.stack,
    }),
  });
};
