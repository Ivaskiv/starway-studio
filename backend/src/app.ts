// backend/src/app.ts
import { config as loadEnv } from 'dotenv'
import express, {
  type NextFunction,
  type Request,
  type Response,
} from 'express';
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import cookieParser from 'cookie-parser';
import cors from 'cors';
import morgan from 'morgan';

const currentFilePath = fileURLToPath(import.meta.url)
const currentDirPath = dirname(currentFilePath)

loadEnv({ path: resolve(currentDirPath, '../../.env') })

// Routes
import accessRoutes from './modules/access/routes.js';
import adminRoutes from './modules/admin/routes.js';
import affiliateRoutes from "./modules/affiliate/routes.js";
import aiRoutes from './modules/ai/routes.js';
import mentorRoutes from './modules/ai-mentor/routes.js';
import analyticsRoutes from './modules/analytics/routes.js';
import assistantRoutes from './modules/assistant/routes.js';
import authRoutes, { telegramRouter } from './modules/auth/auth.routes.js';
import consultationRoutes from './modules/consultation/routes.js';
import dailyRoutes from './modules/daily-cycle/routes.js';
import deeplinkRoutes from './modules/deeplinks/routes.js';
import eventsRoutes from './modules/events/routes.js';
import expertsRoutes from './modules/experts/routes.js';
import fivePointsRoutes from './modules/five-points/routes.js';
import gamificationRoutes from './modules/gamification/routes.js';
import goalsRoutes from './modules/goals/routes.js';
import landingRoutes from './modules/landing/routes.js';
import leadMagnetRoutes from './modules/lead-magnet/routes.js';
import mentorshipRoutes from './modules/mentorship/routes.js';
import miniCoursesRoutes from './modules/mini-courses/routes.js';
import notificationsRoutes from './modules/notifications/routes.js';
import onboardingRoutes from './modules/onboarding/routes.js';
import journalRoutes from './modules/journal/routes.js';
import mentorWeeklyAnalysisRoutes from './modules/ai-mentor/weekly-analysis/routes.js';
import productMembersRoutes from './modules/product-members/routes.js';
import productsRoutes from './modules/products/routes.js';
import progressRoutes from './modules/progress/routes.js';
import quotaRoutes from './modules/quota/routes.js';
import settingsRoutes from './modules/settings/routes.js';
import socialRoutes from './modules/social/routes.js';
import startFlowRoutes from './modules/start-flow/routes.js';
import subscriptionsRoutes from './modules/subscriptions/routes.js';
import trialRoutes from './modules/trial/routes.js';
import userStateRoutes from './modules/user-state/routes.js';
import userRoutes from './modules/user/routes.js';
import visionRoutes from './modules/vision/routes.js';
import wheelRoutes from './modules/wheel/routes.js';
import webMapRouter from './modules/web-map/web-map.router.js';
import zoomRoutes from './modules/zoom/routes.js';
import { securityHeaders } from './middleware/securityHeaders.js';

export function createApp() {
  const app = express();
  const allowedOrigins = [
    'http://localhost:5173',
    'https://starway-frontend.vercel.app',
    process.env.FRONTEND_URL?.trim(),
  ].filter((origin): origin is string => Boolean(origin));

  const corsOptions = cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error('CORS blocked'));
    },
    credentials: true,
  });

  // =====================
  // Middleware
  // =====================
  app.use(corsOptions);
  app.options('*', corsOptions);
  app.use(securityHeaders)

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
  app.use('/api/telegram', telegramRouter);
  app.use('/api/access', accessRoutes);
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/events', eventsRoutes);
  app.use('/api/deeplinks', deeplinkRoutes);
  app.use('/api/experts', expertsRoutes);
  app.use('/api/five-points', fivePointsRoutes);
  app.use('/api/products', productsRoutes);
  app.use('/api/product-members', productMembersRoutes);
  app.use('/api/progress', progressRoutes);
  app.use('/api/notifications', notificationsRoutes);

app.use('/api/mentor', mentorRoutes);
app.use('/api/mentor', mentorWeeklyAnalysisRoutes);
app.use('/api/aIMentor', mentorRoutes);
  app.use('/api/ai', aiRoutes);
  app.use('/api/onboarding', onboardingRoutes);
  app.use('/api/journal', journalRoutes);
  app.use('/api/wheel', wheelRoutes);
  app.use('/api/vision', visionRoutes);
  app.use('/api/goals', goalsRoutes);
  app.use('/api/trial', trialRoutes);
  app.use('/api/user', userStateRoutes);
  app.use('/api/user', userRoutes);
  app.use('/api/quota', quotaRoutes);
app.use("/api/affiliate", affiliateRoutes)
app.use('/api/lead-magnet', leadMagnetRoutes)
  app.use('/api/settings', settingsRoutes)
  app.use('/api/gamification', gamificationRoutes)
  app.use('/api/start-flow', startFlowRoutes)

  app.use('/api/consultation', consultationRoutes);
  app.use('/api/zoom', zoomRoutes);
  app.use('/api/mentorship', mentorshipRoutes);
  app.use('/api/courses', miniCoursesRoutes);
  app.use('/api/social', socialRoutes);
  app.use('/api/subscriptions', subscriptionsRoutes);
  app.use('/api/landing', landingRoutes);
  app.use('/api/assistant', assistantRoutes)
  app.use('/api/users', userRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/daily', dailyRoutes);
  app.use('/api/web-map', webMapRouter);

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
