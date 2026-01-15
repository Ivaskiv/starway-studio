// packages/backend/src/middleware/auth.ts
// import { Request, Response, NextFunction } from 'express';

// export async function authRequired(req: Request, res: Response, next: NextFunction) {
//   try {
//     const token = req.headers.authorization?.split(' ')[1];
//     if (!token) return res.status(401).json({ error: 'unauthorized' });

//     // Припустимо, ти декодуєш JWT
//     const user = { id: '123', email: 'test@test.com' }; // заміни на реальну перевірку
//     req.user = user; // тут TS вже типізовано

//     next();
//   } catch {
//     res.status(401).json({ error: 'unauthorized' });
//   }
// }


import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

export interface JwtPayload {
  id: string
  role: 'super_admin' | 'admin' | 'user'
  email: string
}

export interface AuthRequest extends Request {
  user?: JwtPayload
}

const JWT_SECRET = process.env.JWT_SECRET as string

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not defined')
}

export async function authRequired(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'unauthorized' });

    // Припустимо, ти декодуєш JWT
    const user = { id: '123', email: 'test@test.com' }; // заміни на реальну перевірку
    req.user = user; // тут TS вже типізовано
    // const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
    // req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'unauthorized' });
  }
}


export function auth(
  req: AuthRequest, 
  res: Response, 
  next: NextFunction) {
    const authHeader = req.headers.authorization

    if (!authHeader) {
      return res.status(401).json({ message: 'No authorization header' })
    }

    const token = authHeader.split(' ')[1]
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload
      req.user = decoded
      next()
    } catch {
      res.status(401).json({ message: 'Invalid token' })
    }

    }

export function requireRole(
  allowedRoles: JwtPayload['role'][]
) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden' })
    }

    next()
  }
}