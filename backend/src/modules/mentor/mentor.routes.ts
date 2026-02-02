import { Router } from 'express';
import { mentorChat } from './controllers/mentor.controller.js';

const router = Router();

router.post('/chat', mentorChat);

export default router;
