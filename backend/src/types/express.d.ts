// backend/src/types/express.d.ts

import type { User } from './types';

declare global {
  namespace Express {
    // req.user може бути або JWT-пейлоадом, або повним User з бази
    interface Request {
      user?: User & { id: string; role: string; email?: string };
    }
  }
}

export {};
