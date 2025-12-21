// routes/users.ts
import { Router, Request, Response } from "express";
import { sql } from "../db/client.js";
import bcrypt from "bcryptjs";

const router = Router();

// ───────────────────────────────────────────────────────────────
// Types
// ───────────────────────────────────────────────────────────────

interface User {
  id: string;
  email: string | null;
  telegram_id: string | null;
  telegram_username: string | null;
  name: string;
  role: string;
  password_hash?: string;
  created_at?: Date;
}

interface CreateTelegramUserBody {
  telegram_id: string;
  telegram_username?: string;
  name?: string;
}

interface CreateEmailUserBody {
  email: string;
  password: string;
  name?: string;
}

// ───────────────────────────────────────────────────────────────
// GET /api/users/telegram/:tgId
// ───────────────────────────────────────────────────────────────

router.get("/telegram/:tgId", async (req: Request, res: Response): Promise<Response> => {
  const { tgId } = req.params;
  
  try {
    const result = await sql`
      SELECT * FROM users WHERE telegram_id = ${tgId}
    `;
    
    const user = result[0] as User | undefined;
    return res.json(user || null);
  } catch (err) {
    console.error("[users] GET /telegram/:tgId error:", err);
    return res.status(500).json({ error: "server_error" });
  }
});

// ───────────────────────────────────────────────────────────────
// POST /api/users/create-telegram
// ───────────────────────────────────────────────────────────────

router.post("/create-telegram", async (req: Request, res: Response): Promise<Response> => {
  const body = req.body as CreateTelegramUserBody;
  const { telegram_id, telegram_username, name } = body;

  if (!telegram_id) {
    return res.status(400).json({ error: "missing_tg_id" });
  }

  try {
    const existingResult = await sql`
      SELECT id FROM users WHERE telegram_id = ${telegram_id}
    `;
    
    const existing = existingResult[0] as { id: string } | undefined;
    
    if (existing) {
      return res.status(409).json({ error: "already_exists" });
    }

    const userResult = await sql`
      INSERT INTO users (telegram_id, telegram_username, name, role)
      VALUES (
        ${telegram_id}, 
        ${telegram_username || null}, 
        ${name || "Telegram User"}, 
        ${'user'}
      )
      RETURNING id, telegram_id, telegram_username, name, role
    `;

    const user = userResult[0] as User;
    return res.json(user);
  } catch (err) {
    console.error("[users] POST /create-telegram error:", err);
    return res.status(500).json({ error: "server_error" });
  }
});

// ───────────────────────────────────────────────────────────────
// POST /api/users/create-email
// ───────────────────────────────────────────────────────────────

router.post("/create-email", async (req: Request, res: Response): Promise<Response> => {
  const body = req.body as CreateEmailUserBody;
  const { email, password, name } = body;

  if (!email || !password) {
    return res.status(400).json({ error: "missing_fields" });
  }

  try {
    const existingResult = await sql`
      SELECT id FROM users WHERE email = ${email}
    `;
    
    const existing = existingResult[0] as { id: string } | undefined;
    
    if (existing) {
      return res.status(409).json({ error: "email_exists" });
    }

    const hashed = await bcrypt.hash(password, 10);

    const userResult = await sql`
      INSERT INTO users (email, password_hash, name, role)
      VALUES (
        ${email}, 
        ${hashed}, 
        ${name || email.split("@")[0]}, 
        ${'user'}
      )
      RETURNING id, email, name, role
    `;

    const user = userResult[0] as User;
    return res.json(user);
  } catch (err) {
    console.error("[users] POST /create-email error:", err);
    return res.status(500).json({ error: "server_error" });
  }
});

export default router;