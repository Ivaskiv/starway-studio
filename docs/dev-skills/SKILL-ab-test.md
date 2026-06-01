# SKILL: AB TEST

Status: ACTIVE
Version: 2.0

## PURPOSE

AB Test не визначає характер людини.

AB Test визначає:

* де зараз знаходиться головна точка зупинки;
* який вузол системи блокує рух;
* який DNA сегмент зараз домінує;
* який наступний крок буде найбільш доречним.

---

## USED BY

* ai-seller
* ai-mentor
* SKILL-funnel
* SKILL-orchestrator
* Telegram followups
* Payment routing
* FOCUS onboarding

---

## SOURCE OF TRUTH

Priority order:

1. STARWAY-DNA-LEXICON.md
2. customer-avatar-deep.md
3. methodology-absystem.md
4. testFoundation.ts
5. abTest.results.ts
6. abTest.faq.ts

Якщо виникає конфлікт:

STARWAY-DNA-LEXICON.md має пріоритет.

---

## CANONICAL CHAIN

STATE
↓
GOAL
↓
CHOICE
↓
DECISION
↓
ACTION

Результат тесту показує:

де саме зараз знаходиться головна точка зупинки.

---

## RESULT STRUCTURE

Кожен результат повинен містити:

### Primary Node

Поточна точка зупинки.

### DNA Segment

Основний сегмент користувача.

### Core Block

Що реально блокує рух.

### Surface Problem

Що людина бачить сама.

### Deep Problem

Що насправді відбувається.

### Risk

Що станеться якщо нічого не зміниться.

### Recommended Route

Який наступний крок рекомендувати.

### Recommended Product

Який продукт показувати першим.

### Seller Notes

Як говорити з цим сегментом.

### Mentor Notes

На чому фокусувати супровід.

---

## RESULT: STATE

Primary Node:
STATE

DNA Segment:
S2 — Виснажена але продовжує

Core Block:
Людина намагається рухатись із виснаження.

Surface Problem:
Не вистачає сил тримати рішення.

Deep Problem:
Пробує вирішити проблему через дисципліну замість зміни точки опори.

Risk:
Почне шукати нові інструменти замість вирішення кореневої причини.

Recommended Route:
FOCUS

Recommended Product:
FOCUS

Seller Notes:
Не продавати результат.
Працювати через впізнавання.

Mentor Notes:
Повернення точки опори.

---

## RESULT: GOAL

Primary Node:
GOAL

DNA Segment:
S3 — Ціль є але щось не те

Core Block:
Ціль сформульована нечітко або не відповідає внутрішньому вектору.

Surface Problem:
Є рух але немає задоволення.

Deep Problem:
Людина рухається до чужої або застарілої цілі.

Risk:
Досягнення не принесе бажаного результату.

Recommended Route:
FOCUS

Recommended Product:
FOCUS

Seller Notes:
Не переконувати.
Допомагати прояснювати.

Mentor Notes:
Робота з власним вектором.

---

## RESULT: CHOICE

Primary Node:
CHOICE

DNA Segment:
S3 — Ціль є але щось не те

Core Block:
Людина зависла між кількома варіантами.

Surface Problem:
Не може обрати.

Deep Problem:
Боїться втратити щось через вибір.

Risk:
Залишиться у циклі аналізу.

Recommended Route:
FOCUS

Recommended Product:
FOCUS

Seller Notes:
Не допомагати вибирати.
Допомагати зрозуміти страх втрати.

Mentor Notes:
Робота з ціною вибору.

---

## RESULT: DECISION

Primary Node:
DECISION

DNA Segment:
S1 — Все розуміє але не рухається

Core Block:
Рішення не зафіксоване.

Surface Problem:
Все зрозуміло але нічого не змінюється.

Deep Problem:
Немає внутрішнього "так".

Risk:
Повернення до циклу роздумів.

Recommended Route:
FOCUS

Recommended Product:
FOCUS

Seller Notes:
Не пояснювати.
Підсилювати ясність.

Mentor Notes:
Фіксація рішення.

---

## RESULT: ACTION

Primary Node:
ACTION

DNA Segment:
S1 — Все розуміє але не рухається

Core Block:
Рішення є.
Регулярна дія відсутня.

Surface Problem:
Відкладання.

Deep Problem:
Відсутня система повернення у контекст.

Risk:
Постійний restart.

Recommended Route:
FOCUS → ABSYSTEM AI

Recommended Product:
ABSYSTEM AI

Seller Notes:
Не говорити про мотивацію.

Mentor Notes:
Формування циклу дії.

---

## ROUTING RULES

STATE
→ FOCUS

GOAL
→ FOCUS

CHOICE
→ FOCUS

DECISION
→ FOCUS

ACTION
→ FOCUS → ABSYSTEM AI

---

## TIEBREAKER LOGIC

Основний winner:

максимальний score у categoryBreakdown.

Якщо нічия:

q6
→ q7
→ q8

Якщо нічия зберігається:

використовувати canonical chain:

STATE
→ GOAL
→ CHOICE
→ DECISION
→ ACTION

---

## CONTENT RULE

Весь user-facing текст:

* abTest.results.ts
* abTest.faq.ts

Skill не генерує копірайт.

Skill визначає логіку,
DNA сегмент,
маршрут
і наступний крок.
