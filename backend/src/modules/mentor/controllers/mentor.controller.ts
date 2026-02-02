// mentor.controller.ts
// controller = тупо HTTP

import { Request, Response } from 'express'
import { chatMentor } from '../services/mentor.service.js'

export async function mentorChat(req: Request, res: Response) {
  if (!req.user?.id) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { prompt } = req.body
  const result = await chatMentor(req.user, prompt)

  res.json(result)
}
