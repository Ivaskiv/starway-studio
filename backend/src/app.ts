// backend/src/app.ts
import express, {
  type NextFunction,
  type Request,
  type Response,
} from 'express';

import cookieParser from 'cookie-parser';
import cors from 'cors';
import 'dotenv/config';
import morgan from 'morgan';

// Routes
import accessRoutes from './modules/access/routes.js';
import adminRoutes from './modules/admin/routes.js';
import affiliateRoutes from "./modules/affiliate/routes.js";
import aiGeneratorRoutes from './modules/ai-generator/routes.js';
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
import funnelRoutes from './modules/funnel/routes.js';
import gamificationRoutes from './modules/gamification/routes.js';
import goalsRoutes from './modules/goals/routes.js';
import landingRoutes from './modules/landing/routes.js';
import leadMagnetRoutes from './modules/lead-magnet/routes.js';
import mentorshipRoutes from './modules/mentorship/routes.js';
import miniCoursesRoutes from './modules/mini-courses/routes.js';
import onboardingRoutes from './modules/onboarding/routes.js';
import producerRoutes from './modules/producer/routes.js';
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
import zoomRoutes from './modules/zoom/routes.js';

export function createApp() {
  const app = express();

  // =====================
  // Middleware
  // =====================
app.use(
  cors({
    origin: (origin, callback) => {
      const allowedOrigins = [
        'http://localhost:5173',
        'https://starway-frontend.vercel.app',
      ];

      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('CORS blocked'));
      }
    },
    credentials: true,
  }),
);
app.options('*', cors());

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

app.use('/api/mentor', mentorRoutes);
app.use('/api/aIMentor', mentorRoutes);
  app.use('/api/onboarding', onboardingRoutes);
  app.use('/api/wheel', wheelRoutes);
  app.use('/api/vision', visionRoutes);
  app.use('/api/goals', goalsRoutes);
  app.use('/api/trial', trialRoutes);
  app.use('/api/user', userStateRoutes);
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
  app.use('/api/funnels', funnelRoutes);
  app.use('/api/producer', producerRoutes);
  app.use('/api/landing', landingRoutes);
  app.use('/api/assistant', assistantRoutes)
  app.use('/api/users', userRoutes);
  app.use('/api/admin', adminRoutes);
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
