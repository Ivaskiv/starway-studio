# SKILL: telegram
> Статус: ACTIVE — зібрано з telegram mentor коду

## Базові entrypoints
- `backend/src/modules/telegram-mentor/index.ts`
  - `bot.command('start'|'morning'|'evening'|'status'|'privacy'|'zoomhelp', ...)`
  - `bot.on('text'|'voice'|'audio'|'callback_query'|'chat_member'|'my_chat_member'|'channel_post', ...)`

## Handler pattern
- orchestration-first: handler керує state/route/calls
- heavy copy і кнопки витягнуті у content/config modules (`abTest.*`, `absystem.content`, FAQ/content registries)

## Callbacks registry pattern
- централізований callback router: `backend/src/modules/telegram-mentor/services/telegram-event-bus.service.ts`
- action -> transition/kind mapping (`CALLBACK_KIND_BY_ACTION`)
- спеціальні обробники для zoom swap/book/cancel, ab_test callbacks, lifecycle actions

## CTA / behavior policy
- canonical CTA registry використовується в event bus:
  - `CANONICAL_CTA_REGISTRY`
  - `resolveCanonicalCtaId`
  - `resolveCanonicalMessageKeyByCtaId`
- runtime guards + idempotency:
  - `guard.middleware.ts`
  - `withRuntimeAdvisoryLock`, replay claim

## Lifecycle -> Telegram UX
- для нового `/start` matrix див. `SKILL-orchestrator.md`.
- фактична поведінка базується на `UserLifecycleState` і callback event routing.

## Copy policy
- copy зберігається в content-файлах (`backend/src/products/ab-system/content/*.ts`, `abTest.start.ts`, `abTest.faq.ts` тощо)
- handlers мають уникати інлайн-копірайту, окрім коротких системних ack/fallback повідомлень.
