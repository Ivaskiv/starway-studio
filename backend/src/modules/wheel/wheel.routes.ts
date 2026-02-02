// backend/src/modules/wheel/wheel.routes.ts
import { Router } from 'express'
import { authRequired } from '../../middleware/auth.js'
import { createWheelAssessment, getWheelHistory, getLatestWheel, generateWheelPDF } from './wheel.controller.js'

const router = Router()

router.post('/', authRequired, createWheelAssessment)
router.get('/history', authRequired, getWheelHistory)
router.get('/latest', authRequired, getLatestWheel)
router.get('/:id/pdf', authRequired, generateWheelPDF)

export default router