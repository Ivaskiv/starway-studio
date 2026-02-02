// backend/src/modules/wheel/wheel.routes.ts
import { Router } from 'express'
import { authRequired } from '../../middleware/auth.js'
import {
  createWheelAssessment,
  getWheelHistory,
  getLatestWheel,
  generateWheelPDF,
} from './wheel.controller.js'

const router = Router()

// Створення нової оцінки колеса
router.post('/', authRequired, createWheelAssessment)

// Історія останніх 10 оцінок
router.get('/history', authRequired, getWheelHistory)

// Остання оцінка колеса
router.get('/latest', authRequired, getLatestWheel)

// Завантажити PDF оцінки за id
router.get('/:id/pdf', authRequired, generateWheelPDF)

export default router
