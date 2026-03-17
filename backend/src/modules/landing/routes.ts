import { Router } from 'express'
import * as landingController from './cards/landingController.js'

const router = Router()

router.get('/cards', landingController.getUserLandingCards)
router.post('/cards', landingController.addLandingCard)
router.put('/cards/:id', landingController.updateLandingCard)
router.post('/pay', landingController.initiateLandingPayment)

export default router
