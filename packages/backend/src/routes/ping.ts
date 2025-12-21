// routes/ping.ts
import { Router, Request, Response } from "express";

const router = Router();

// ───────────────────────────────────────────────────────────────
// GET /api/ping
// ───────────────────────────────────────────────────────────────

router.get('/', (req: Request, res: Response): Response => {
  return res.json({
    ok: true,
    status: "alive",
    message: "pong",
    timestamp: Date.now(),
    env: process.env.NODE_ENV || "development"
  });
});

export default router;