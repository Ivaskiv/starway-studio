import { Router, Request, Response } from "express";
// api/payments/wayforpay.js

import { Router } from "express";
import { sql } from "../../db/client.js";
import { getProductBySlug } from "../../models/products.js";
import { createEnrollment } from "../../models/enrollments.js";
import { logPayment } from "../../models/payments.js";

const router = Router();

router.post("/", async (req: Request, res: Response) => {
  try {
    const data = req.body;

    const telegramId = data?.customParameters?.telegram_id;
    const email = data?.email || data?.customParameters?.email;
    const productSlug = data?.customParameters?.product_slug;
    const pay_ref = data.orderReference;
    const amount = data.amount;
    const currency = data.currency;
    const expires_at = null;

    if (!productSlug) return res.json({ ok: false, error: "no_product" });
    if (!telegramId && !email) return res.json({ ok: false, error: "no_user_id" });

    // Шукаємо user по telegram_id або email
    const users = await sql`
      SELECT * FROM users
      WHERE telegram_id = ${telegramId} OR email = ${email}
      LIMIT 1
    `;

    let user = users[0];

    if (!user) {
      // Створюємо нового
      const newUsers = await sql`
        INSERT INTO users (telegram_id, email, source)
        VALUES (${telegramId}, ${email}, 'wayforpay')
        RETURNING *
      `;
      user = newUsers[0];
    } else {
      // Оновлюємо існуючого
      if (telegramId && !user.telegram_id) {
        await sql`
          UPDATE users
          SET telegram_id = ${telegramId}, updated_at = NOW()
          WHERE id = ${user.id}
        `;
      }
      
      if (email && !user.email) {
        await sql`
          UPDATE users
          SET email = ${email}, updated_at = NOW()
          WHERE id = ${user.id}
        `;
      }
    }

    const product = await getProductBySlug(productSlug);
    if (!product) return res.json({ ok: false, error: "product_not_found" });

    await createEnrollment({
      user_id: user.id,
      product_id: product.id,
      pay_source: "wayforpay",
      pay_ref,
      amount,
      currency,
      expires_at
    });

    await logPayment({
      source: "wayforpay",
      event_type: "payment_success",
      external_id: pay_ref,
      user_id: user.id,
      payload: data
    });

    return res.json({ ok: true, user_id: user.id });
  } catch (err) {
    console.error("WayForPay error:", err);
    return res.json({ ok: false, error: err.message });
  }
});

export default router;