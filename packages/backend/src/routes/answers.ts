// routes/answers.ts
import { Router, Request, Response } from "express";
import { getLessonById } from "../models/lessons.js";
import { sql } from "../db/client.js";

const router = Router();

router.post("/", async (req: Request, res: Response) => {
  const userId = req.user.id; // Виправлено: req.user.id замість req.userId
  const { lesson_id, text } = req.body;
  
  if (!lesson_id || !text) {
    return res.status(400).json({ error: "missing_fields" });
  }

  try {
    const lesson = await getLessonById(lesson_id);
    if (!lesson) {
      return res.status(404).json({ error: "lesson_not_found" });
    }

    await sql`
      INSERT INTO answers (user_id, lesson_id, raw_text, source)
      VALUES (${userId}, ${lesson_id}, ${text}, 'miniapp')
    `;

    await sql`
      UPDATE progress
      SET task_sent = true, updated_at = NOW()
      WHERE user_id = ${userId} AND lesson_id = ${lesson_id}
    `;

    res.json({ ok: true });
  } catch (err) {
    console.error("Answer save error:", err);
    res.status(500).json({ error: "server_error" });
  }
});

export default router;