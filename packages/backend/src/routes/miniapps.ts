// routes/miniapps.ts
import { Router, Request, Response } from "express";
import { sql } from '../db/client.js';

const router = Router();

// ───────────────────────────────────────────────────────────────
// GET /api/miniapps/:slug/manifest
// ───────────────────────────────────────────────────────────────

router.get('/:slug/manifest', async (req: Request, res: Response): Promise<Response> => {
  try {
    const { slug } = req.params;
    const tgId = req.query.tg_id as string | undefined;

    const miniappRows = await sql`
      SELECT * FROM miniapps WHERE slug = ${slug} LIMIT 1
    `;
    const miniapp = miniappRows[0] as Miniapp | undefined;

    if (!miniapp) {
      return res.status(404).json({ error: 'Miniapp not found' });
    }

    const lessons = await sql`
      SELECT id, title, video_url, short_text, full_text, tasks, order_index
      FROM lessons
      WHERE miniapp_id = ${miniapp.id}
      ORDER BY order_index ASC
    `;

    let progress: Progress[] = [];

    if (tgId) {
      const userRows = await sql`
        SELECT id FROM users WHERE telegram_id = ${tgId} LIMIT 1
      `;
      const user = userRows[0] as User | undefined;

      if (user) {
        const progressRows = await sql`
          SELECT lesson_id, completed
          FROM progress
          WHERE user_id = ${user.id} AND miniapp_id = ${miniapp.id}
        `;
        progress = progressRows as Progress[];
      }
    }

    return res.json({
      miniapp,
      lessons: lessons as Lesson[],
      progress
    });

  } catch (err) {
    console.error("[miniapps] GET /:slug/manifest error:", err);
    return res.status(500).json({ error: "Internal error" });
  }
});

export default router;