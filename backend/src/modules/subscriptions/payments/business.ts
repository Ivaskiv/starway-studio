// backend/src/payments/business.ts
import { randomUUID } from 'crypto';
import { sql } from '../../../db/client.js';

export async function processPayment(paymentData: any) {
  const { user_id, product_id, amount, pay_ref } = paymentData;

  // 1️⃣ Створюємо або оновлюємо enrollment
  const [enrollment] = await sql`
    INSERT INTO enrollments (id, user_id, product_id, pay_ref, amount)
    VALUES (${randomUUID()}, ${user_id}, ${product_id}, ${pay_ref}, ${amount})
    ON CONFLICT (user_id, product_id) DO UPDATE
    SET pay_ref = ${pay_ref}, amount = ${amount}, updated_at = NOW()
    RETURNING *
  `;

  // 2️⃣ Отримуємо сам продукт
  const [product] = await sql`
    SELECT * FROM products WHERE id = ${product_id}
  `;

  // 3️⃣ Повертаємо статус (припустимо, якщо enrollment є — approved)
  return {
    status: enrollment ? 'approved' : 'failed',
    user_id,
    product,
    enrollment,
  };
}
