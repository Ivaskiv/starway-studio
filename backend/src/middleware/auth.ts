// backend/src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../types/types.js';

const JWT_SECRET = process.env.JWT_SECRET || 'starway-secret-2024';

export interface JWTPayload {
  id: string;
  role: string;
  email?: string;
}

export async function authRequired(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'unauthorized' });
    }

    const token = authHeader.slice(7);
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;

    // Тут можна мапити на повний User, якщо треба
    req.user = {
      id: decoded.id,
      role: decoded.role,
      email: decoded.email,
    } as User & { id: string; role: string; email?: string };

    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'token_expired' });
    }
    return res.status(401).json({ error: 'invalid_token' });
  }
}
