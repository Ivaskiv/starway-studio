// packages/backend/src/middleware/auth.ts

import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { sql } from '../db/client.js'

export interface AuthRequest extends Request {
  user: {
    id: string
    email: string
    name: string
    role: string
  }
}

export async function authRequired(
  req: Request, 
  res: Response, 
  next: NextFunction
): Promise<void | Response> {
  const token = req.headers.authorization?.split(' ')[1]
  
  if (!token) {
    return res.status(401).json({ error: 'unauthorized' })
  }

  try {
    const secret = process.env.JWT_SECRET
    if (!secret) throw new Error('JWT_SECRET not configured')

    const decoded = jwt.verify(token, secret) as { id: string }
    
    const [user] = await sql`
      SELECT id, email, name, role 
      FROM users 
      WHERE id = ${decoded.id}
    `
    
    if (!user) {
      return res.status(401).json({ error: 'user_not_found' })
    }
    
    (req as AuthRequest).user = user
    next()
  } catch (err) {
    return res.status(401).json({ error: 'invalid_token' })
  }
}