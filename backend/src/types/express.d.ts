import type { AuthTokenPayload } from './globalTypes.js'

declare global {
  namespace Express {
    interface Request {
      user?: AuthTokenPayload
    }
  }
}

declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthTokenPayload
  }
}

export {}
