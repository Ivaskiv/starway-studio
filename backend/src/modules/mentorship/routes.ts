// backend/src/modules/mentorship/routes.ts
import { authRequired } from '../../modules/auth/middleware/auth.js'
import { Router } from 'express'
import {
  create,
  activate,
  pause,
  resume,
  complete,
  cancel,
  checkEligibility,
  getMyMentorship,
} from './controller.js'

const router = Router()
router.use(authRequired)

router.get('/access', checkEligibility)
router.get('/active', getMyMentorship)

router.post('/', create)
router.post('/activate', activate)

router.patch('/:id/pause', pause)
router.patch('/:id/resume', resume)
router.patch('/:id/complete', complete)
router.patch('/:id/cancel', cancel)

export default router