# Credential rotation readiness

## Scope and evidence

This runbook covers names found in all four historical tracked snapshots at
commit `c1d5908a`:

- `backend/.env.backup-before-url-fix`
- `backend/.env.env.backup-before-current-tunnel-sync`
- `backend/.env.env.backup-before-webapp-sync`
- `backend/.env.wayforpay-backup`

They contain the same credential-name inventory. This document deliberately
contains no values. Non-secret operational settings and identifiers are out of
scope; `WAYFORPAY_MERCHANT` is listed only because it must remain paired with
the payment secret.

## Inventory and runtime owners

| Historical variable name(s) | Code-level runtime owner | Runtime/config owner evidenced here | Rotation effect |
| --- | --- | --- | --- |
| `DATABASE_URL`, `DIRECT_URL`, `SUPABASE_DB_PASSWORD` | `packages/db/src/client.ts`, `packages/db/prisma/seed.ts`; Prisma datasource in `packages/db/prisma/schema.prisma` | `render.yaml` supplies `DATABASE_URL` and `DIRECT_URL` to both `starway-api` and `starway-background`. `SUPABASE_DB_PASSWORD` interpolates either URL when it contains its placeholder. | Database connection pools reconnect after restart; a bad pair takes API and worker database access down. Does not itself invalidate application sessions. |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | `backend/src/modules/auth/service/tokens.ts` | Render supplies both to API and background. | Immediately invalidates access and refresh tokens signed with the old secret. `backend/src/lib/secrets.ts` also falls back to these values for its generic encryption helper. |
| `BOT_TOKEN_SECRET_KEY` | `backend/src/lib/secrets.ts`, `backend/src/lib/telegram.ts` | Not declared in `render.yaml`; deployed owner must be located before rotation. | Invalidates decryption of persisted `ExpertBotConfig.botToken` ciphertext and changes derived Telegram webhook secrets when that key is used. |
| `TELEGRAM_BOT_TOKEN`, `COACH_BOT_TOKEN` | `backend/src/modules/telegram-mentor/runtime/botConfig.ts`, `backend/src/lib/telegram.ts` | Render supplies both to API and background. | Bot API delivery stops until both services run with the new token; webhook registration/secret must be reconciled. |
| `CONTENT_BOT_TOKEN` | `backend/src/lib/telegram.ts`, `backend/src/modules/telegram-mentor/runtime/botConfig.ts` | Not declared in `render.yaml`; deployed owner must be located before rotation. | Content-bot delivery/bootstrapping can fail. |
| `WAYFORPAY_SECRET` with `WAYFORPAY_MERCHANT` | `backend/src/modules/subscriptions/payments/wayforpay/service.ts`, `signature.ts`; verified callback owner is `callback/handler.ts` | Render supplies the pair to API and background. | New checkout signatures and provider-callback verification use the new secret. A mismatch rejects callbacks; do not rotate while an unresolved payment needs the old callback secret unless the provider supports overlap. |
| `OPENAI_API_KEY`, `ANTHROPIC_API_KEY` | `packages/ai/src/providers/*`, AI gateway; Anthropic is also used by briefing/content flows | Render supplies both to API and background. | A bad value disables/fails the corresponding AI calls, not user sessions. |
| `GEMINI_API_KEY` | `packages/ai/src/providers/gemini/geminiProvider.ts`, AI gateway | Not declared in `render.yaml`; deployed owner must be located before rotation. | Gemini calls fail if configured and active. |
| `CLOUDINARY_URL`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | `backend/src/lib/cloudinary.ts`, Zoom audio ingest service | Not declared in `render.yaml`; deployed owner must be located before rotation. | Zoom audio ingest and Cloudinary asset operations fail if the URL/key/secret set is inconsistent. |
| `ELEVENLABS_API_KEY` | `backend/src/modules/content-pipeline/steps/media.step.ts` | Not declared in `render.yaml`; deployed owner must be located before rotation. | Voice generation fails. |
| `SENDPULSE_API_TOKEN` | `backend/src/modules/integrations/sendpulse/sendpulse.service.ts` | Not declared in `render.yaml`; deployed owner must be located before rotation. | SendPulse calls fail. |
| `ADMIN_PASSWORD`, `HEYGEN_API_KEY`, `INSTAGRAM_API_KEY`, `NEON_API_KEY` | No production source reference found | No Render declaration found | No repository runtime consumer is evidenced. Do not assume these are safely unused outside the repository; confirm external ownership before revocation. |
| `ENCRYPTION_KEY` | No production source reference found; the code reads `SECRETS_ENCRYPTION_KEY` instead | No Render declaration found | The historical name has no evidenced runtime effect. Do not substitute it for `SECRETS_ENCRYPTION_KEY`. |

## Required external actions

The repository has no automation for credential issuance or revocation. The
operator must perform these provider-side actions directly:

- **Render dashboard:** update the declared variables on both `starway-api`
  and `starway-background`, then deploy/restart both. `render.yaml` is the
  service/key ownership map; it has `sync: false`, so it does not provide
  secret values or perform an update.
- **Supabase dashboard:** create/change the database password or connection
  credentials and obtain matching pooled and direct connection URLs. Update
  `DATABASE_URL` and `DIRECT_URL` as one set. If URL placeholders are used,
  update `SUPABASE_DB_PASSWORD` at its actual deployment owner too.
- **Telegram BotFather:** regenerate each affected bot token. Reconcile each
  bot's webhook after the Render deployment, using the runtime-derived secret
  path in `backend/src/lib/telegram.ts`; do not log the token or secret.
- **WayForPay merchant portal/support:** issue/activate the replacement
  merchant secret according to its overlap policy. The repository has no
  dual-secret callback verifier.
- **OpenAI, Anthropic, Google/Gemini, Cloudinary, ElevenLabs, SendPulse** and
  any confirmed owner of HeyGen/Instagram/Neon: issue the replacement in that
  provider's dashboard, then update the confirmed deployment owner.

## Ordered operator checklist

Use one credential family at a time. Do not copy a secret into tickets, shell
history, logs, this file, or Git.

1. **Preflight.** Record the variable *name*, provider account, service owner,
   rotation time, and rollback contact in the incident system. Confirm which
   API and worker services are live. For variables absent from `render.yaml`,
   find the actual deployment owner first; do not rotate on an assumption.
2. **Check the special gates.** Schedule a user re-login window before either
   JWT secret changes. Do not rotate `BOT_TOKEN_SECRET_KEY` until every active
   persisted expert-bot token has a proven re-encryption/re-registration plan
   and the Telegram webhook change is scheduled. Do not rotate WayForPay
   during unresolved callbacks unless provider overlap is confirmed.
3. **Create replacement at the provider.** Prefer a provider overlap period.
   If the provider revokes the old credential immediately (notably a bot token
   or a single WayForPay secret), have the Render update prepared and execute
   the provider change and deployment as one short maintenance operation.
4. **Update runtime atomically by dependency set.** In Render, update every
   consumer listed in the table before deploying: both database URLs together;
   both JWT secrets together; WayForPay merchant plus secret together; and all
   members of any Cloudinary credential set together. Apply the same value to
   both Render services wherever `render.yaml` declares the variable.
5. **Deploy/restart both services.** Confirm the API's read-only health route
   and that the background process is running. For a database change, confirm
   each service establishes its normal database connection without exposing a
   URL. For bot changes, confirm webhook configuration and observe an existing
   non-sensitive operational delivery path; do not send diagnostic messages to
   users. For WayForPay, verify configuration and await a normal signed
   provider callback; do not create a payment solely for this rotation.
6. **Verify the protected behavior.** Confirm the expected JWT re-login
   outcome, bot/webhook delivery, database API/worker access, and the relevant
   provider health/status without creating payment requests, database records,
   or Telegram messages. Preserve provider and Render audit entries.
7. **Revoke the old credential only after verification.** Revoke in the
   provider dashboard, then repeat the read-only runtime checks. If verification
   fails while overlap exists, restore the old runtime value and investigate;
   if no overlap exists, use the provider's emergency replacement process.

## Deployment gates and blockers

- `BOT_TOKEN_SECRET_KEY` is **blocked** pending a safe re-encryption or
  re-registration procedure for persisted `ExpertBotConfig.botToken` values.
  No such migration/dual-key owner is present in this repository.
- JWT rotation is operationally executable but deliberately logs out live
  users; communicate that user action before deployment.
- WayForPay rotation is gated on the provider's old/new-secret overlap policy
  and the absence of callbacks that still require the old verifier.
- Variables not declared in `render.yaml` have no evidenced current runtime
  configuration owner. Their rotation/revocation is blocked pending ownership
  confirmation, not a code change.
- The historical files are already absent from the working tree, but remain in
  Git history. Credential rotation limits future use; a separate, explicitly
  approved Git-history remediation decision is required to remove historical
  exposure.
