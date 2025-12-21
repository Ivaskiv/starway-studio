// routes/me.ts
import { Router, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { sql } from "../db/client.js";

const router = Router();

// ───────────────────────────────────────────────────────────────
// Types
// ───────────────────────────────────────────────────────────────

interface User {
  id: number;
  name: string | null;
  email: string | null;
  telegram_id: string | null;
  telegram_username: string | null;
}

interface JwtPayload {
  userId?: number;
  id?: number;
  [key: string]: any;
}

// ───────────────────────────────────────────────────────────────
// GET /api/me
// ───────────────────────────────────────────────────────────────

router.get("/", async (req: Request, res: Response): Promise<Response> => {
  try {
    const auth = req.headers.authorization;
    if (!auth) {
      return res.status(401).json({ error: "missing_token" });
    }

    const token = auth.replace("Bearer ", "").trim();
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      console.error("[me] JWT_SECRET not configured");
      return res.status(500).json({ error: "server_error" });
    }

    const payload = jwt.verify(token, secret) as JwtPayload;
    const userId = payload.userId || payload.id;

    if (!userId) {
      return res.status(401).json({ error: "invalid_token" });
    }

    const rows = await sql`
      SELECT id, name, email, telegram_id, telegram_username
      FROM users WHERE id = ${userId} LIMIT 1
    `;

    if (!rows.length) {
      return res.status(404).json({ error: "user_not_found" });
    }

    return res.json({ user: rows[0] as User });
    
  } catch (err) {
    console.error("[me] error:", err);
    
    if (err instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ error: "invalid_token" });
    }
    
    if (err instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ error: "token_expired" });
    }
    
    return res.status(500).json({ error: "server_error" });
  }
});

export default router;