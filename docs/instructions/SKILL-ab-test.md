# SKILL: ab-test
> Статус: ACTIVE — за test foundation + content файлами

## Джерела
- `backend/src/core/state-machine/testFoundation.ts`
- `backend/src/products/ab-system/content/abTest.results.ts`
- `backend/src/products/ab-system/content/abTest.faq.ts`

## 10 блоків тесту
- TODO: `backend/src/core/state-machine/testFoundation.ts` не містить явного переліку "10 блоків" як окремих сутностей; у поточному коді є canonical states/events і результатна модель. Перевір вручну специфікацію блоків.

## Priority chain
- Канонічний порядок результатів/пріоритетів:
  - `STATE → GOAL → CHOICE → DECISION → ACTION`
- Реалізовано в `chooseCanonicalTestWinner()`.

## Tiebreaker логіка
- Основний winner: максимальний score у `categoryBreakdown`.
- Якщо нічия:
  - порівняння по tie-break питаннях `q6, q7, q8` (`CANONICAL_TEST_TIEBREAK_QUESTION_ORDER`)
  - якщо ще нічия: реверс-пріоритет відповідей `q8 -> q7 -> q6`
  - fallback: перший у `CHAIN`.

## Контент-файли
- Результати: `abTest.results.ts`
- FAQ: `abTest.faq.ts`

## Правило копірайту
- Весь user-facing copy тільки в `abTest.*.ts` content-файлах.
- Handlers/services не повинні авторити довгі тексти вручну.
