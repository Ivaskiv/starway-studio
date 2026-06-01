# Env Architecture

// DOCS(18.05.2026): payment architecture documentation update — Gemini
FIX(18.05.2026): centralized payment callback envs - Codex

This monorepo keeps env ownership split by runtime. Do not use the root `.env` for secrets.

## Ownership

`backend/.env` owns backend-only runtime config:

- `DATABASE_URL`, `DIRECT_URL`, Prisma/Neon values used by backend runtime
- backend public/internal URLs
- WayForPay credentials, hosted payment URLs, and callback URLs
- Telegram bot tokens, webhook/polling config, and Telegram web app URLs
- JWT, encryption, admin, AI, feature flags, and backend integrations

`apps/web/.env` owns browser-safe Vite values only:

- `VITE_API_URL`, `VITE_WS_URL`, `VITE_APP_URL`, `VITE_APP_URL_LOCAL`
- public OAuth/client IDs
- browser feature flags
- local dev tunnel/HMR values

`packages/db/.env` owns Prisma/database-only values:

- `DATABASE_URL`
- `DIRECT_URL`

Root `.env` should stay non-secret. The backend and db package may load it as a fallback, but new runtime values should not be added there.

## Local Setup

1. Copy `backend/.env.example` to `backend/.env`.
2. Copy `apps/web/.env.example` to `apps/web/.env`.
3. Copy `packages/db/.env.example` to `packages/db/.env` only if running Prisma commands directly from `packages/db`.
4. Use localhost for normal browser development:
   - `FRONTEND_URL=http://localhost:5173`
   - `PUBLIC_FRONTEND_URL=http://localhost:5173`
   - `VITE_API_URL=http://localhost:3001/api`
   - `VITE_WS_URL=ws://localhost:3001`
5. Use HTTPS tunnels for external callbacks or Telegram web apps:
   - backend tunnel for `PUBLIC_API_URL`, `WAYFORPAY_CALLBACK_URL`, `BILLING_CALLBACK_URL`, and `TELEGRAM_WEBHOOK_URL`
   - frontend tunnel for `TELEGRAM_WEBAPP_BASE_URL` and optionally `VITE_DEV_TUNNEL_URL`

## Production Setup

Production must use deployed domains:

- Render backend origin for `PUBLIC_API_URL`
- Render backend callback routes for WayForPay and billing callbacks
- Vercel frontend origin for `FRONTEND_URL`, `PUBLIC_FRONTEND_URL`, and `TELEGRAM_WEBAPP_BASE_URL`
- no localhost, `127.0.0.1`, ngrok, or Cloudflare tunnel URLs in production envs

## Render Envs

Set these in the Render backend service:

- `NODE_ENV=production`
- `DATABASE_URL`
- `DIRECT_URL` if needed by Prisma commands
- `PUBLIC_API_URL=https://<render-service>.onrender.com`
- `FRONTEND_URL=https://<vercel-app>.vercel.app`
- `PUBLIC_FRONTEND_URL=https://<vercel-app>.vercel.app`
- `TELEGRAM_WEBAPP_BASE_URL=https://<vercel-app>.vercel.app`
- `WAYFORPAY_MERCHANT`
- `WAYFORPAY_SECRET`
- `WAYFORPAY_CALLBACK_URL=https://<render-service>.onrender.com/api/subscriptions/payments/wayforpay/callback`
- `BILLING_CALLBACK_URL=https://<render-service>.onrender.com/api/billing/webhook`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_BOT_USERNAME`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `ENCRYPTION_KEY`
- `OPENAI_API_KEY`

## Vercel Envs

Set only browser-safe values in the Vercel frontend project:

- `VITE_API_MODE=remote`
- `VITE_API_URL=https://<render-service>.onrender.com/api`
- `VITE_WS_URL=wss://<render-service>.onrender.com`
- `VITE_APP_URL=https://<vercel-app>.vercel.app`
- `VITE_GOOGLE_CLIENT_ID`
- `VITE_TELEGRAM_BOT_ID`
- `VITE_FACEBOOK_APP_ID`

Never put backend secrets, database URLs, Telegram bot tokens, JWT secrets, WayForPay secrets, or AI keys in Vercel frontend envs.

## Auth Loop & Token Cleanup

To prevent infinite login loops and 404 spam on the backend:

1. **Frontend Cleanup**: After detecting a `token` in the URL and successfully calling the login API, the frontend MUST immediately clear the URL:
   ```typescript
   window.history.replaceState({}, document.title, window.location.pathname)
   ```
2. **Origin Separation**: `PUBLIC_API_URL` must point to port 3001. `FRONTEND_URL` must point to port 5173.
3. **Vite Proxy**: Ensure `vite.config.ts` only proxies `/api`. Do NOT proxy `/` or the backend will receive requests for frontend assets and return 404.
   ```typescript
   proxy: {
     '/api': 'http://localhost:3001'
   }
   ```
4. **Infinite Loop Root Cause**: If the token remains in the URL, React Query or `useEffect` hooks will re-trigger the auth flow on every re-render/navigation.

## Payment Envs

### Architecture Overview

The system uses a **Centralized Dynamic Checkout Flow**.

1. **Button Registry**: All button labels and `callback_data` are defined in `packages/buttonsRegistry.ts`.
2. **Dynamic Generation**: When a user clicks a payment button, the backend generates a signed WayForPay payload.
3. **Short Tokens**: Payloads are stored in a temporary session (TTL 30m) and identified by a UUID token.
4. **Checkout Proxy**: The user is sent to `https://api.domain.com/api/payments/wayforpay/checkout/:token`.
5. **Form Rendering**: The backend renders a hidden HTML form that auto-submits via POST to WayForPay's secure endpoint.

### Hosted vs Checkout Payments

- **Hosted**: Static buttons pre-created in the WayForPay dashboard. Managed via `WAYFORPAY_FOCUS_..._URL` env vars. (Legacy/Landing only).
- **Checkout**: Dynamic sessions created per-user. Allows for metadata tracking (userId, orderRef) in webhooks.

### Webhook Lifecycle

1. **Incoming POST**: WayForPay sends a signed JSON payload to the callback endpoint.
2. **Signature Verification**: Validated using `WAYFORPAY_SECRET` and HMAC-MD5.
3. **Idempotency Check**: `PaymentLog` is checked for existing `orderReference`.
4. **Target Resolution**: The system parses the `orderReference` (e.g., `focus_1month_user123_timestamp`) to find the user and product.
5. **Activation**: The `Subscription` and `ProductSubscription` tables are updated, and `lifecycleState` is progressed.
6. **Notification**: Telegram messages are sent to the user via `sendDedupedTelegramMessage`.

### Required Env Variables (Backend)

```bash
# Credentials
WAYFORPAY_MERCHANT="your_merchant_id"
WAYFORPAY_SECRET="your_secret_key"
WAYFORPAY_MERCHANT_DOMAIN="your_registered_domain"

# URLs
PUBLIC_API_URL="https://your-api.com"
WAYFORPAY_CALLBACK_URL="https://your-api.com/api/subscriptions/payments/wayforpay/callback"
FRONTEND_URL="https://your-app.com"
```

### Local Dev Setup

1. **Tunneling**: Use `ngrok` or `cloudflare-tunnel` to expose port 3001.
2. **Update Env**: Set `PUBLIC_API_URL` and `WAYFORPAY_CALLBACK_URL` to your tunnel URL.
3. **Test Buttons**: In `NODE_ENV=development`, the system appends a "🧪 Тестова оплата 1 грн" button to payment messages via `withDevTestPaymentButton`.

### Production Setup

- Ensure `WAYFORPAY_CALLBACK_URL` is configured in the WayForPay merchant dashboard.
- Verify `NODE_ENV=production` is set to disable dev test buttons.
- Ensure `PUBLIC_API_URL` points to the production load balancer/origin.

### Current Known Risks

- **Session Volatility**: Checkout tokens are stored in memory. A server restart will invalidate pending checkout links.
- **Webhook Delays**: If activation logic fails, the user may be charged but not granted access. Check `PaymentLog` for `FAILED` statuses.
- **IP Whitelisting**: Ensure your hosting provider (Render) allows incoming traffic from WayForPay IP ranges.

### Launch Checklist

- [ ] WayForPay Merchant ID and Secret verified.
- [ ] Callback URL responds with `200 OK` (test with empty POST/invalid signature).
- [ ] `orderReference` parsing logic covers all products in `ECOSYSTEM_PAYMENT_CATALOG`.
- [ ] Telegram bot has permissions to send messages to users upon activation.

### Render/Vercel Separation

- **Render (Backend)**: Handles all crypto, signatures, database updates, and WayForPay forms.
- **Vercel (Frontend)**: Only acts as a redirect target after payment via `returnUrl`. It should never handle WayForPay secrets.

### Centralized Button Registry

All Telegram payment actions must be mapped in `packages/buttonsRegistry.ts`.
Example:

```typescript
PAYMENT: {
  MONTH_1: { text: '...', action: 'open_focus_payment:1month' }
}
```

WayForPay values belong in `backend/.env` and Render only.

Required:

- `WAYFORPAY_MERCHANT`
- `WAYFORPAY_SECRET`
- `WAYFORPAY_CALLBACK_URL`
- `BILLING_CALLBACK_URL`
- `PUBLIC_API_URL`

Hosted payment links, when used by product catalogs:

- `WAYFORPAY_FOCUS_BOT_1M_URL`
- `WAYFORPAY_FOCUS_BOT_3M_URL`
- `WAYFORPAY_FOCUS_LANDING_URL`

Local payment testing requires an HTTPS backend tunnel. Production payment callbacks must point to Render.

## Telegram Envs

Backend-only Telegram bot values:

- `TELEGRAM_BOT_USERNAME`
- `TELEGRAM_BOT_TOKEN`
- `BOT_TOKEN_SECRET_KEY`
- `START_TELEGRAM_BOT`
- `TELEGRAM_POLLING_ENABLED`
- `TELEGRAM_WEBHOOK_URL`
- `FOCUS_TELEGRAM_CHANNEL_INVITE_LINK`

Telegram mini app URL values:

- Local testing: `TELEGRAM_WEBAPP_BASE_URL=https://<frontend-tunnel>`
- Production: `TELEGRAM_WEBAPP_BASE_URL=https://<vercel-app>.vercel.app`

## Dangerous Anti-Patterns

- backend secrets in `apps/web/.env`
- database URLs in Vercel frontend envs
- Telegram bot tokens in frontend envs
- WayForPay secret keys in frontend envs
- root `.env` used as a shared dumping ground
- localhost callback URLs in production
- production Render/Vercel domains mixed with local tunnels without a clear reason
- `VITE_` values in backend envs unless runtime code still needs a temporary compatibility fallback

## Required Envs Before Deploy

Backend deploy checklist:

- `NODE_ENV=production`
- `DATABASE_URL`
- `PUBLIC_API_URL`
- `FRONTEND_URL`
- `PUBLIC_FRONTEND_URL`
- `TELEGRAM_WEBAPP_BASE_URL`
- `WAYFORPAY_MERCHANT`
- `WAYFORPAY_SECRET`
- `WAYFORPAY_CALLBACK_URL`
- `BILLING_CALLBACK_URL`
- `TELEGRAM_BOT_TOKEN`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `ENCRYPTION_KEY`
- `OPENAI_API_KEY`

Frontend deploy checklist:

- `VITE_API_MODE=remote`
- `VITE_API_URL`
- `VITE_WS_URL`
- `VITE_APP_URL`
- public OAuth/client IDs used by enabled login providers
