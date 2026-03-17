// backend/src/modules/social/routes.ts
import { Router } from 'express';
import { authRequired } from '../auth/middleware/auth.js';
import * as socialController from './controller.js';

const router = Router();

// Отримати список підключених соціальних мереж
router.get('/connections', authRequired, socialController.getConnections);

// Підключити соціальну мережу
router.post('/connect', authRequired, socialController.connect);

// Відключити соціальну мережу
router.post('/disconnect', authRequired, socialController.disconnect);

// Згенерувати Telegram link для підключення
router.get('/telegram/link', authRequired, socialController.telegramLink);

// Верифікувати Telegram код (для бота)
router.post('/telegram/verify', socialController.verifyTelegramCode);

export default router;
