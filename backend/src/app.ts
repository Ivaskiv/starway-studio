// backend/src/app.ts
import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express';

import cookieParser from 'cookie-parser';
import cors from 'cors';
import 'dotenv/config';
import morgan from 'morgan';

// Routes
import accessRoutes from './modules/access/routes.js';
import aiGeneratorRoutes from './modules/ai-generator/routes.js';
import mentorRoutes from './modules/ai-mentor/routes.js';
import authRoutes from './modules/auth/auth.routes.js';
import consultationRoutes from './modules/consultation/routes.js';
import dailyRoutes from './modules/daily-cycle/routes.js';
import funnelRoutes from './modules/funnel/routes.js';
import goalsRoutes from './modules/goals/routes.js';
import mentorshipRoutes from './modules/mentorship/routes.js';
import miniCoursesRoutes from './modules/mini-courses/routes.js';
import onboardingRoutes from './modules/onboarding/routes.js';
import productsRoutes from './modules/products/routes.js';
import progressRoutes from './modules/progress/routes.js';
import socialRoutes from './modules/social/routes.js';
import trialRoutes from './modules/trial/routes.js';
import visionRoutes from './modules/vision/routes.js';
import wheelRoutes from './modules/wheel/routes.js';
import zoomRoutes from './modules/zoom/routes.js';

export function createApp() {
  const app = express();

  // =====================
  // Middleware
  // =====================
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

  // =====================
  // Health check
  // =====================
  app.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
    });
  });

  // =====================
  // Routes
  // =====================
  app.use('/api/auth', authRoutes);
  app.use('/api/access', accessRoutes);
  app.use('/api/products', productsRoutes);
  app.use('/api/progress', progressRoutes);

  app.use('/api/mentor', mentorRoutes);
  app.use('/api/onboarding', onboardingRoutes);
  app.use('/api/wheel', wheelRoutes);
  app.use('/api/vision', visionRoutes);
  app.use('/api/goals', goalsRoutes);
  app.use('/api/trial', trialRoutes);

  app.use('/api/consultation', consultationRoutes);
  app.use('/api/zoom', zoomRoutes);
  app.use('/api/mentorship', mentorshipRoutes);
  app.use('/api/courses', miniCoursesRoutes);
  app.use('/api/social', socialRoutes);
  app.use('/api/funnels', funnelRoutes);
  app.use('/api/ai-generator', aiGeneratorRoutes);
  app.use('/api/daily', dailyRoutes);

  // =====================
  // 404
  // =====================
  app.use((req: Request, res: Response) => {
    console.log('❌ [404]', { method: req.method, path: req.path });

    res.status(404).json({
      error: 'Route not found',
      path: req.path,
      method: req.method,
    });
  });

  // =====================
  // Error handler (ЗАВЖДИ ОСТАННІЙ)
  // =====================
  app.use(errorHandler);

  return app;
}

// =====================
// Error handler
// =====================
function errorHandler(
  error: any,
  req: Request,
  res: Response,
  _next: NextFunction,
) {
  console.error('💥 [ERROR]', {
    path: req.path,
    method: req.method,
    error: error?.message,
    stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined,
  });

  if (error?.code?.startsWith?.('P')) {
    return res.status(400).json({
      error: 'Database error',
      message:
        process.env.NODE_ENV === 'development'
          ? error.message
          : 'Bad request',
      code: error.code,
    });
  }

  return res.status(error?.status || 500).json({
    error: error?.name || 'Internal Server Error',
    message: error?.message || 'An unexpected error occurred',
    ...(process.env.NODE_ENV === 'development' && {
      stack: error?.stack,
    }),
  });
}