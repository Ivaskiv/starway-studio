// starway-studio/backend/src/utils/requireUser.ts


// middleware authRequired ≠ гарантія для TS
// TS не вірить — ми перевіряємо руками
// менше req.user! → менше мін

import { AuthenticatedRequest } from '@/types/globalTypes.js';
import type { Request, Response } from 'express';

export function requireUser(req: AuthenticatedRequest, res: Response) {
  if (!req.user) {
    res.status(401).json({ error: 'unauthorized' });
    return null;
  }

  return req.user;
}
