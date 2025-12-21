// routes/lessons.ts
import { Router, Request, Response } from "express";
import { sql } from "../db/client.js";

const router = Router();

router.get("/", async (req: Request, res: Response) => {
  try {
    const lessons = await sql`
      SELECT * FROM lessons ORDER BY order_index ASC
    `;
    res.json(lessons);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.get("/:slug", async (req: Request, res: Response) => {
  try {
    const slug = req.params.slug;
    const rows = await sql`
      SELECT * FROM lessons WHERE slug = ${slug} LIMIT 1
    `;
    res.json(rows[0] || null);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

export default router;