// packages/backend/src/middleware/auth.ts

import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { sql } from '../db/client';

export const authRequired = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'unauthorized' });
    }

    const token = authHeader.substring(7);
    const secret = process.env.JWT_SECRET!;

    const decoded = jwt.verify(token, secret) as { id: string };

    // Отримуємо користувача - тільки існуючі колонки
    const users = await sql`
      SELECT id, email, first_name, last_name, role 
      FROM users 
      WHERE id = ${decoded.id}
    `;

    if (users.length === 0) {
      return res.status(401).json({ error: 'user_not_found' });
    }

    const user = users[0];

    // Додаємо користувача в request
    req.user = {
      id: user.id,
      email: user.email,
      firstName: user.first_name || '',
      lastName: user.last_name || '',
      role: user.role
    };

    next();
  } catch (err) {
    console.error('[auth middleware]', err);
    return res.status(401).json({ error: 'invalid_token' });
  }
};