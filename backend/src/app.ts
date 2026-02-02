import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';

// Routes
import wheelRoutes from './modules/wheel/wheel.routes.js';
import authRoutes from './modules/auth/auth.routes.js';
import mentorRoutes from './modules/mentor/mentor.routes.js';
import funnelsRoutes from './modules/products/funnel.js';
import productsRoutes from './modules/products/products.routes.js';
import progressRoutes from './modules/progress/progress.routes.js';
import usersRoutes from './modules/users/users.js';
import socialRoutes from './routes/social.js';
import statsRoutes from './routes/stats.js';
import systemRoutes from './routes/system.js';

export function createApp() {
  const app = express();

  // ⚙️ MIDDLEWARE
  app.use(
    cors({
      origin: [
        'http://localhost:5173',
        'https://starway-studio.vercel.app',
      ],
      credentials: true,
      methods: ['GET','POST','PUT','DELETE','OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser()); // секретар для cookie
  app.use(morgan('dev'));  // фотограф для логів

  if (process.env.NODE_ENV !== 'production') {
    app.use((req, _res, next) => {
      console.log(`➡️  ${req.method} ${req.path}`);
      next();
    });
  }

  // 🏥 HEALTH CHECK
  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      env: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      time: new Date().toISOString(),
    });
  });

  // 🛣️ ROUTES
  app.use('/api/auth', authRoutes);
  app.use('/api/users', usersRoutes);
  app.use('/api/funnels', funnelsRoutes);
  app.use('/api/products', productsRoutes);
  app.use('/api/mentor', mentorRoutes);
  app.use('/api/ai-mentor', mentorRoutes);
  app.use('/api/wheel', wheelRoutes);
  app.use('/api/social', socialRoutes);
  app.use('/api/stats', statsRoutes);
  app.use('/api/system', systemRoutes);
  app.use('/api/progress', progressRoutes);

  // ❌ 404
  app.use((_req, res) => res.status(404).json({ error: 'Not Found' }));

  // 💥 ERROR HANDLER
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('💥 ERROR:', err);
    res.status(err.status || 500).json({
      error: err.name || 'Error',
      message: err.message || 'Internal Server Error',
      ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
    });
  });

  return app;
}
