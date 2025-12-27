// routes/webhook.ts
import { Router, Request, Response } from "express";
import { sql } from '../db/client.js';

const router = Router();


// ───────────────────────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────────────────────

async function findOrCreateUser(params: {
  email?: string | null;
  telegram_id?: string | null;
}): Promise<User> {
  const { email, telegram_id } = params;
  
  if (!email && !telegram_id) {
    throw new Error('User identification required: email or telegram_id');
  }

  const users = await sql`
    SELECT * FROM users
    WHERE (${email}::text IS NOT NULL AND email = ${email})
       OR (${telegram_id}::text IS NOT NULL AND telegram_id = ${telegram_id})
    LIMIT 1
  `;

  const user = users[0] as User | undefined;
  if (user) return user;

  const newUsers = await sql`
    INSERT INTO users (email, telegram_id, source)
    VALUES (${email}, ${telegram_id}, 'webhook')
    RETURNING *
  `;

  return newUsers[0] as User;
}

async function findMiniappByProduct(product?: string | null): Promise<Miniapp | null> {
  if (!product) return null;

  const miniapps = await sql`
    SELECT * FROM miniapps
    WHERE slug = ${product} OR code = ${product}
    LIMIT 1
  `;
  
  return (miniapps[0] as Miniapp | undefined) || null;
}

function parseStartParam(start?: string | null): {
  status: string | null;
  product: string | null;
  source: string | null;
} {
  if (!start) return { status: null, product: null, source: null };

  const [statusAndProduct, sourcePart] = String(start).split('|');
  let status: string | null = null;
  let product: string | null = null;
  let source: string | null = null;

  if (statusAndProduct) {
    const [st, prod] = statusAndProduct.split('-');
    status = st || null;
    product = prod || null;
  }

  if (sourcePart?.includes('=')) {
    const [, value] = sourcePart.split('=');
    source = value || null;
  }

  return { status, product, source };
}

async function upsertPurchase(params: {
  user_id: number;
  miniapp_id: number;
  source: string;
  external_id: string | null;
  status: string;
  amount: number | null;
  currency: string | null;
}): Promise<Purchase> {
  const { user_id, miniapp_id, source, external_id, status, amount, currency } = params;

  const purchases = await sql`
    INSERT INTO purchases (user_id, miniapp_id, source, external_id, status, amount, currency)
    VALUES (
      ${user_id}, 
      ${miniapp_id}, 
      ${source || 'unknown'}, 
      ${external_id}, 
      ${status || 'paid'}, 
      ${amount}, 
      ${currency}
    )
    ON CONFLICT (user_id, miniapp_id)
    DO UPDATE SET
      source = EXCLUDED.source,
      external_id = EXCLUDED.external_id,
      status = EXCLUDED.status,
      amount = EXCLUDED.amount,
      currency = EXCLUDED.currency
    RETURNING *
  `;

  return purchases[0] as Purchase;
}

// ───────────────────────────────────────────────────────────────
// Main endpoint /api/webhook
// ───────────────────────────────────────────────────────────────

router.post('/', async (req: Request, res: Response): Promise<Response> => {
  const payload = (req.body as WebhookPayload) || {};
  console.log('[webhook] incoming payload:', payload);

  try {
    // ─────────────────────────────────────────────
    // 1) WayForPay webhook
    // ─────────────────────────────────────────────
    if (payload.orderReference && payload.merchantSignature) {
      const { orderReference, email, product, telegram_id, amount, currency } = payload;

      const user = await findOrCreateUser({ email, telegram_id });
      const miniapp = await findMiniappByProduct(product);

      if (!miniapp) {
        return res.status(400).json({
          ok: false,
          reason: 'UNKNOWN_PRODUCT',
          message: `No miniapp found for product="${product}"`,
        });
      }

      const purchase = await upsertPurchase({
        user_id: user.id,
        miniapp_id: miniapp.id,
        source: 'wayforpay',
        external_id: orderReference,
        status: 'paid',
        amount: amount || null,
        currency: currency || null,
      });

      return res.json({
        ok: true,
        source: 'wayforpay',
        user_id: user.id,
        miniapp_id: miniapp.id,
        purchase_id: purchase.id,
      });
    }

    // ─────────────────────────────────────────────
    // 2) Start param → через start=paid-5funnel|source=miniapp
    // ─────────────────────────────────────────────
    if (payload.start || payload.startParam) {
      const start = payload.start || payload.startParam;
      const { status, product, source } = parseStartParam(start);
      const { email, telegram_id } = payload;

      if (!product) {
        return res.status(400).json({
          ok: false,
          reason: 'INVALID_START_PARAM',
          message: `Cannot parse product from start="${start}"`,
        });
      }

      const user = await findOrCreateUser({ email, telegram_id });
      const miniapp = await findMiniappByProduct(product);

      if (!miniapp) {
        return res.status(400).json({
          ok: false,
          reason: 'UNKNOWN_PRODUCT',
          message: `No miniapp found for product="${product}" (from start param)`,
        });
      }

      const purchase = await upsertPurchase({
        user_id: user.id,
        miniapp_id: miniapp.id,
        source: source || 'miniapp',
        external_id: null,
        status: status || 'paid',
        amount: null,
        currency: null,
      });

      return res.json({
        ok: true,
        source: source || 'miniapp',
        user_id: user.id,
        miniapp_id: miniapp.id,
        purchase_id: purchase.id,
        start,
      });
    }

    return res.status(400).json({
      ok: false,
      reason: 'UNSUPPORTED_PAYLOAD',
      message: 'Webhook payload is not recognized.',
    });
    
  } catch (err) {
    console.error('[webhook] error:', err);
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    
    return res.status(500).json({
      ok: false,
      error: 'INTERNAL_ERROR',
      message: errorMessage,
    });
  }
});

export default router;