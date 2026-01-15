// packages/backend/src/payments/callback.ts
import { randomUUID } from 'crypto'
import { Request, Response } from 'express'
import { sql } from '../db/client.js'
import { processPayment } from './business.js'
import { verifySignature } from './crypto.js'

/**
 * WayForPay callback handler
 * ✅ Верифікація підпису
 * ✅ Створення/оновлення enrollments
 * ✅ Логування в payments_log
 * ✅ Повертає success/fail
 */
export const wayForPayCallback = async (req: Request, res: Response) => {
  try {
    const data = req.body

    // 1. Верифікація підпису
    if (!verifySignature(data)) {
      console.warn('Invalid signature from WayForPay')
      return res.status(400).send('FAIL')
    }

    // 2. Обробка успішного платежу
    if (data.transaction_status === 'Approved') {
      const user_id = data.clientAccountId // або інше поле, де передається user_id
      const product_id = data.product_name?.[0] // або інше поле
      const amount = Number(data.amount)
      const pay_ref = data.order_reference

      if (!user_id || !product_id) {
        console.error('Missing user_id or product_id in callback')
        return res.status(400).send('FAIL')
      }

      // Обробляємо платіж
      const paymentResult = await processPayment({
        user_id,
        product_id,
        amount,
        pay_ref,
      })

      // Логування
      await sql`
        INSERT INTO payments_log (
          id, user_id, product_id, amount, pay_ref, status, created_at
        ) VALUES (
          ${randomUUID()}, ${user_id}, ${product_id}, ${amount}, ${pay_ref}, 'approved', NOW()
        )
      `

      return res.status(200).send('OK')
    }

    // Інші статуси (Declined, Refunded тощо)
    console.log('Payment status:', data.transaction_status)
    return res.status(200).send('OK') // WayForPay вимагає OK навіть при помилках
  } catch (err) {
    console.error('WayForPay callback error:', err)
    return res.status(500).send('FAIL')
  }
}