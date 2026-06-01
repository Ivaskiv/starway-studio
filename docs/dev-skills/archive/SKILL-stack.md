# SKILL: stack
> Статус: ACTIVE — зібрано з коду репозиторію

## Monorepo структура
- `apps/web` — React/Vite фронтенд
- `apps/bot` — окремий bot runtime
- `backend` — Node/Express API + Telegram mentor
- `packages/db` — Prisma schema + generated client
- `packages/ai`, `packages/shared`, `video-hooks`

Джерела:
- `pnpm-workspace.yaml`
- `package.json`

## Технологічний стек (факти з package.json)
- Frontend: `react@18`, `typescript`, `vite`, `tailwindcss@3`
- Backend: `node`, `express`, `telegraf`, `node-cron`, `openai`, `prisma`
- DB: `@neondatabase/serverless`, `pg`, Prisma (`packages/db/prisma/schema.prisma`)
- Payments: WayForPay (`backend/src/modules/subscriptions/payments/*`)
- AI providers: OpenAI (`openai`), Anthropic, Gemini (`backend/package.json`)

Примітки по запиту:
- `Grammy/node-telegram-bot-api`: у поточному коді використовується `telegraf` (див. `backend/package.json`, `apps/bot/package.json`).
- `Vercel`: є `vercel-build` scripts у root/backend/web.
- `Render`: TODO: прямих env/конфіг-файлів Render у кодобазі не знайдено, перевір вручну.

## Package manager / workspaces
- `pnpm@11.3.0`
- workspaces визначені в `pnpm-workspace.yaml`

## Hard gate перед commit
- Обов'язково запускати `tsc --noEmit` (або `pnpm ... typecheck`) перед merge/commit у production flow.
- Фактичні скрипти:
  - root: `pnpm typecheck`
  - backend: `pnpm -C backend exec tsc --noEmit`
