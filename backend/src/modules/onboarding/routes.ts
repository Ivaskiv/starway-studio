import { Router } from 'express';
import { authRequired } from '../auth/middleware/auth.js';
import { requireOnboardingStage } from './middleware/requireOnboardingStage.js';
import * as onboardingController from './controller.js';

const router = Router();

// Загальна авторизація на весь роут
router.use(authRequired);

// Отримати прогрес онбордінгу
router.get('/progress', onboardingController.getProgress);

// Завершити stage
router.post('/complete-stage', requireOnboardingStage('SETUP'), onboardingController.completeStage);

// Примусово оновити прогрес (для адмінських або внутрішніх endpoint)
router.post('/update-progress', onboardingController.updateProgress);

// Перевірка доступу до stage
router.get('/can-access/:stage', onboardingController.canAccessStage);

export default router;
