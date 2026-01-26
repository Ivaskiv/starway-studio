// backend/src/app.ts
// 🧠 createApp() — express + routes + middlewares

import express from 'express';
import cors from 'cors';
import morgan from 'morgan';

// Modules
import mentorRoutes from './modules/ai-mentor/mentor.routes';
import wheelRoutes from './modules/ai-mentor/wheel.routes';
import authRoutes from './modules/auth/auth.routes';
import funnelsRoutes from './modules/products/funnel';
import productsRoutes from './modules/products/products.routes';
import usersRoutes from './modules/users/users';
import socialRoutes from './routes/social';
import statsRoutes from './routes/stats';
import systemRoutes from './routes/system';

export function createApp() {
  const app = express();

  // ===============================
  // ⚙️ MIDDLEWARE
  // ===============================
  app.use(
    cors({
      origin: [
        'http://localhost:5173',
        'http://localhost:3001',
        'https://starway-studio.vercel.app',
      ],
      credentials: true,
    })
  );

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Логи HTTP запитів
  app.use(morgan('dev'));

  // Додаткове логування в development
  if (process.env.NODE_ENV !== 'production') {
    app.use((req, _res, next) => {
      console.log(`➡️  ${req.method} ${req.path}`);
      next();
    });
  }

  // ===============================
  // 🏥 HEALTH CHECK
  // ===============================
  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      env: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      time: new Date().toISOString(),
    });
  });
 app.use(['/api/auth/login', '/api/auth/social'], (req, _res, next) => {
    console.log('➡️ [AUTH LOG]');
    console.log('Path:', req.path);
    console.log('Method:', req.method);
    console.log('Headers:', req.headers);
    console.log('Body:', req.body);
    next();
  });
  // ===============================
  // 🛣️ ROUTES
  // ===============================
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

  // ===============================
  // ❌ 404 HANDLER
  // ===============================
  app.use((_req, res) => {
    res.status(404).json({ error: 'Not Found' });
  });

  // ===============================
  // 💥 ERROR HANDLER
  // ===============================
  app.use(
    (err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      console.error('💥 ERROR:', err);

      res.status(err.status || 500).json({
        error: err.name || 'Error',
        message: err.message || 'Internal Server Error',
        ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
      });
    }
  );

  return app;
}
