import type { AuthUser } from '@/types/globalTypes.js';

declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthUser;
    tenant?: {
      expertId: string;
    };
    body?: any;
  }
}

export {};
