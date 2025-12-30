// packages/backend/src/types/express.d.ts

import { UserRole } from '../../../shared/src/types';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        role?: UserRole;
      };
    }
  }
}

export {};