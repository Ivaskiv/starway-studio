// routes/landing-pages.ts
// routes/landing-pages.ts
import { Router, Request, Response } from "express";
import { sql } from "../db/client.js";

const router = Router();

// GET /api/landing-pages - список всіх landing pages користувача
router.get("/", async (req: Request, res: Response) => {
  try {
    const pages = await sql`
      SELECT lp.*, f.name as funnel_name
      FROM landing_pages lp
      JOIN funnels f ON lp.funnel_id = f.id
      WHERE f.user_id = ${req.user.id}
      ORDER BY lp.created_at DESC
    `;
    res.json(pages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

// GET /api/landing-pages/:slug - отримати landing page за slug
router.get("/:slug", async (req: Request, res: Response) => {
  try {
    const [page] = await sql`
      SELECT * FROM landing_pages 
      WHERE slug = ${req.params.slug} AND published = true
    `;
    
    if (!page) {
      return res.status(404).json({ error: "not_found" });
    }
    
    res.json(page);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

// POST /api/landing-pages - створити landing page
router.post("/", async (req: Request, res: Response) => {
  const { funnel_id, slug, html_content, css_content, meta } = req.body;
  
  if (!funnel_id || !slug) {
    return res.status(400).json({ error: "missing_fields" });
  }
  
  try {
    // Перевірка що воронка належить користувачу
    const [funnel] = await sql`
      SELECT id FROM funnels WHERE id = ${funnel_id} AND user_id = ${req.user.id}
    `;
    
    if (!funnel) {
      return res.status(404).json({ error: "funnel_not_found" });
    }
    
    const [page] = await sql`
      INSERT INTO landing_pages (funnel_id, slug, html_content, css_content, meta, published)
      VALUES (
        ${funnel_id},
        ${slug},
        ${html_content || ''},
        ${css_content || ''},
        ${JSON.stringify(meta || {})}::jsonb,
        false
      )
      RETURNING *
    `;
    
    res.status(201).json(page);
  } catch (err: any) {
    console.error(err);
    if (err.code === '23505') { // unique violation
      return res.status(409).json({ error: "slug_already_exists" });
    }
    res.status(500).json({ error: "server_error" });
  }
});

// PUT /api/landing-pages/:id - оновити landing page
router.put("/:id", async (req: Request, res: Response) => {
  const { html_content, css_content, meta, published } = req.body;
  
  try {
    const [page] = await sql`
      UPDATE landing_pages lp
      SET 
        html_content = COALESCE(${html_content}, lp.html_content),
        css_content = COALESCE(${css_content}, lp.css_content),
        meta = COALESCE(${meta ? JSON.stringify(meta) : null}::jsonb, lp.meta),
        published = COALESCE(${published}, lp.published),
        updated_at = NOW()
      FROM funnels f
      WHERE lp.id = ${req.params.id} 
        AND lp.funnel_id = f.id 
        AND f.user_id = ${req.user.id}
      RETURNING lp.*
    `;
    
    if (!page) {
      return res.status(404).json({ error: "not_found" });
    }
    
    res.json(page);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

// DELETE /api/landing-pages/:id - видалити landing page
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const [page] = await sql`
      DELETE FROM landing_pages lp
      USING funnels f
      WHERE lp.id = ${req.params.id}
        AND lp.funnel_id = f.id
        AND f.user_id = ${req.user.id}
      RETURNING lp.id
    `;
    
    if (!page) {
      return res.status(404).json({ error: "not_found" });
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

export default router;