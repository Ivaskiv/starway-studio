import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { sql } from '../db/client.js';
import type { User } from '../types/types.js';

// -----------------------------
// Типи
// -----------------------------
export interface JwtPayload {
  id: string;
  role: 'super_admin' | 'admin' | 'user';
  email?: string;
}

export interface AuthRequest extends Request {
  user?: JwtPayload & { dbUser?: User };
}

// -----------------------------
// JWT secret
// -----------------------------
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error('JWT_SECRET is not defined');

// -----------------------------
// Middleware authRequired
// -----------------------------
export const authRequired = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: 'Unauthorized: no token' });

    const token = authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Unauthorized: invalid token format' });

    let payload: JwtPayload;
    try {
      payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
    } catch {
      return res.status(401).json({ message: 'Unauthorized: invalid or expired token' });
    }

    const [user] = await sql<User>`SELECT * FROM users WHERE id = ${payload.id}`;
    if (!user) return res.status(401).json({ message: 'Unauthorized: user not found' });

    req.user = { ...payload, dbUser: user };

    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// -----------------------------
// Middleware requireRole
// -----------------------------
export const requireRole = (allowedRoles: JwtPayload['role'][]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized: no user' });
    if (!allowedRoles.includes(req.user.role)) return res.status(403).json({ message: 'Forbidden: insufficient role' });
    next();
  };
};

// -----------------------------
// Генерація токена
// -----------------------------
export const generateToken = (payload: JwtPayload, expiresIn: string | number = '7d') => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
};
