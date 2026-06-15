# Surgical Guardrails Update

Це нова канонічна схема для intelligence layer у Telegram та `/api/intelligence`.

Що змінилось:
- генерація відповідей більше не залежить від вільного LLM-виводу для фактів;
- використовується один структурований knowledge base;
- будь-яка невпевненість або out-of-scope питання одразу переводяться у fallback;
- ціни та розклад проходять жорстку валідацію перед відправкою.

Що вважати source of truth:
- [ANALYSIS-strict-guardrails.md](/Users/viravira/Documents/starway-studio/docs/agents/ai-assistant-bot/ANALYSIS-strict-guardrails.md:1)
- [STRICT-SYSTEM-code.ts](/Users/viravira/Documents/starway-studio/backend/src/modules/telegram-mentor/services/STRICT-SYSTEM-code.ts:1)
- [10-TEST-QUESTIONS.md](/Users/viravira/Documents/starway-studio/docs/agents/ai-assistant-bot/10-TEST-QUESTIONS.md:1)

Що замінено логічно:
- старий м'який Claude response generation;
- soft fallback на out-of-scope;
- відповіді з ризиком вигаданих деталей.

Що тепер очікувати:
- питання про ФОКУС, ABSystem і точні ціни дають детерміновані відповіді;
- питання про точний час, квартиру, політику, медицину та інші чужі теми дають один жорсткий fallback;
- один і той самий guardrails-шар працює і в Telegram, і в HTTP route.
