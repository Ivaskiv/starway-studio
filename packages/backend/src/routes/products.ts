// backend/routes/products.ts
import { Router, Request, Response } from "express";
import { sql } from "../db/client.js";
import { Product } from "../../types/models.js";

const router = Router();

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9а-яії]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Створити продукт
router.post("/", async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "unauthorized" });
    }

    const { title, description, type, price, duration_days, category } = req.body;
    
    const slug = slugify(title);
    
    const [product] = await sql`
      INSERT INTO products (
        title, slug, description, type, price, 
        duration_days, category, author_id, published, 
        free, trial, upsell, access_type, modules
      )
      VALUES (
        ${title}, ${slug}, ${description || ''}, ${type}, ${price || 0},
        ${duration_days || 7}, ${category || 'course'}, ${parseInt(userId, 10)}, false,
        ${type === 'free'}, false, false, 'sequential', '[]'
      )
      RETURNING *
    `;
    
    res.json(product);
  } catch (err: any) {
    console.error("❌ CREATE PRODUCT ERROR:", err);
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

// Отримати продукти автора
router.get("/", async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "unauthorized" });
    }

    const products = await sql`
      SELECT * FROM products 
      WHERE author_id = ${parseInt(userId, 10)}
      ORDER BY created_at DESC
    `;
    
    res.json(products);
  } catch (err: any) {
    console.error("❌ GET PRODUCTS ERROR:", err);
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

// Отримати один продукт
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "unauthorized" });
    }

    const productId = parseInt(req.params.id, 10);
    
    const [product] = await sql`
      SELECT * FROM products 
      WHERE id = ${productId} AND author_id = ${parseInt(userId, 10)}
      LIMIT 1
    `;
    
    if (!product) {
      return res.status(404).json({ error: "product_not_found" });
    }
    
    res.json(product);
  } catch (err: any) {
    console.error("❌ GET PRODUCT ERROR:", err);
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

// Оновити продукт
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "unauthorized" });
    }

    const productId = parseInt(req.params.id, 10);
    const { title, description, price, duration_days, published } = req.body;
    
    const [product] = await sql`
      UPDATE products 
      SET 
        title = COALESCE(${title}, title),
        description = COALESCE(${description}, description),
        price = COALESCE(${price}, price),
        duration_days = COALESCE(${duration_days}, duration_days),
        published = COALESCE(${published}, published),
        updated_at = NOW()
      WHERE id = ${productId} AND author_id = ${parseInt(userId, 10)}
      RETURNING *
    `;
    
    if (!product) {
      return res.status(404).json({ error: "product_not_found" });
    }
    
    res.json(product);
  } catch (err: any) {
    console.error("❌ UPDATE PRODUCT ERROR:", err);
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

// Видалити продукт
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "unauthorized" });
    }

    const productId = parseInt(req.params.id, 10);
    
    await sql`
      DELETE FROM products 
      WHERE id = ${productId} AND author_id = ${parseInt(userId, 10)}
    `;
    
    res.json({ success: true });
  } catch (err: any) {
    console.error("❌ DELETE PRODUCT ERROR:", err);
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

export default router;