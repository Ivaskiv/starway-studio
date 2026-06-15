# Analysis: Strict Guardrails

## Проблема старої схеми

Стара intelligence-логіка покладалась на LLM не лише для класифікації, а й для формування фактологічної відповіді. Через це з'являлись три класи ризику:
- неточні або плаваючі ціни;
- вигадані деталі розкладу;
- м'які відповіді на out-of-scope питання замість жорсткого handoff.

## Архітектурне рішення

Нова схема переводить runtime у deterministic-first режим:
- `STRICT-SYSTEM-code.ts` містить структурований KB;
- quick intent detection працює через явні патерни;
- відповідь будується з наперед визначених фактів, а не генерується вільно;
- validation layer відсікає:
  - несанкціоновані ціни;
  - точні часові значення;
  - формулювання з невпевненістю;
- якщо перевірка не проходить, система повертає fallback.

## Чому це безпечніше

Тут немає місця для "майже правильних" фактів. Якщо питання не покривається KB або містить ризик домислення, відповідь не формується. Це важливіше за "ширший" діалоговий досвід, бо канал використовується як product information layer, а не як універсальний коуч.

## Runtime інтеграція

Один guardrails-модуль підключений у два входи:
- Telegram: [backend/src/modules/telegram-mentor/services/intelligence.service.ts](/Users/viravira/Documents/starway-studio/backend/src/modules/telegram-mentor/services/intelligence.service.ts:1)
- HTTP route: [backend/src/services/claude-intelligence.service.ts](/Users/viravira/Documents/starway-studio/backend/src/services/claude-intelligence.service.ts:1)

## Принципи

1. In-scope only.
2. Facts only from KB.
3. Pricing requires exact match.
4. Exact schedule is never invented.
5. Unknown or weak confidence means fallback.

## Expected outcomes

- zero invented prices inside supported replies;
- immediate fallback for out-of-scope topics;
- one source of truth for product facts;
- lower prompt drift and lower maintenance cost.
