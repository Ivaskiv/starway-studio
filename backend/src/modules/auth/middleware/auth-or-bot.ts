import type { NextFunction,Response } from 'express'

import type { AuthenticatedRequest } from '../../../types/globalTypes.js'
import { getServerUser } from '../server-user.js'

export async function authOrBotRequired(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const user = await getServerUser(req, { allowBot: true })
    if (!user) {
      return res.status(401).json({ error: 'unauthorized' })
    }
    req.user = user
    return next()
  } catch {
    return res.status(401).json({ error: 'invalid_token' })
  }
}
