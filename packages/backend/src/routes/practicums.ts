// routes/practicums.ts
import { Router, Request, Response } from "express";
import { sql } from '../db/client.js';
import { authRequired } from '../utils/auth-required.js';

const router = Router();

// ───────────────────────────────────────────────────────────────
// Types
// ───────────────────────────────────────────────────────────────

interface Practicum {
  id: number;
  title: string;
  description: string | null;
  category: string | null;
  duration_days: number | null;
  price: number | null;
  steps: any;
  created_by: string;
  created_at?: Date;
}

interface PracticumBody {
  title: string;
  description?: string;
  category?: string;
  duration_days?: number;
  price?: number;
  steps?: any;
}

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
  body: PracticumBody;
}

// ───────────────────────────────────────────────────────────────
// POST /api/practicums
// ───────────────────────────────────────────────────────────────

router.post('/', authRequired, async (req: Request, res: Response): Promise<Response> => {
  const authReq = req as AuthenticatedRequest;
  const { title, description, category, duration_days, price, steps } = authReq.body;
  
  try {
    // authRequired middleware гарантує що user існує
    const result = await sql`
      INSERT INTO practicums (title, description, category, duration_days, price, steps, created_by) 
      VALUES (
        ${title}, 
        ${description || null}, 
        ${category || null}, 
        ${duration_days || null}, 
        ${price || null}, 
        ${JSON.stringify(steps || {})}, 
        ${authReq.user.id}
      ) 
      RETURNING *
    `;
    
    return res.json(result[0] as Practicum);
    
  } catch (err) {
    console.error('[practicums] POST error:', err);
    return res.status(500).json({ error: 'Помилка збереження' });
  }
});
export default router;