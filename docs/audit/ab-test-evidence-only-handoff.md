# AB Test Evidence-Only Handoff

## Purpose

Цей документ потрібен, щоб будь-який наступний аналіз AB test / miniapp / Telegram flow виконувався **лише по верифікованих фактах**, а не по припущеннях, старих скриншотах або "схожих" висновках.

Головне правило:

> Якщо факт не підтверджений кодом, grep, git history, build artifact, runtime trace або network response — він не може вважатися встановленим.

---

## Verified Facts

Нижче лише те, що вже підтверджено з документів, скриншотів і попереднього аналізу.

### Confirmed Working

- `/start` flow запускається.
- Питання `Q1-Q5` відображаються і збирають відповіді.
- Тест завершується результатом; на скриншотах видно результат типу `D`.
- WayForPay CTA-кнопки `15€ / 39€` присутні.
- Екран результату і social proof відображаються.
- Кнопка `Приєднатись до ФОКУСУ` веде в checkout flow.

### Confirmed Unknowns

Це **не можна стверджувати без прямої перевірки монорепо/runtime**:

- чи існують `Q6-Q8` і чи вони реально доходять до користувача;
- чи включений `email capture gate` після `Q8`;
- чи працює tiebreaker / canonical result logic коректно;
- яка саме реалізація `abTest.service.ts` є активною в runtime;
- чи немає дубльованих callback / render path у production flow.

---

## Required Evidence Standard

Будь-який наступний агент **зобов'язаний** розділяти висновки на 3 категорії:

### 1. Verified

Можна писати тільки якщо є одне з наступного:

- точний file path + line;
- `rg` / `grep` результат;
- `git show` / `git blame` / `git log`;
- реальний `curl` / HTTP response;
- browser network trace;
- локальний або production build artifact.

### 2. Inference

Можна писати лише з позначкою:

- `Inference:`
- і з поясненням, **на основі яких фактів** зроблено висновок.

### 3. Unknown

Якщо факт не перевірено напряму, треба писати:

- `Unknown until verified in repo/runtime`

Не можна замінювати `unknown` на впевнене формулювання.

---

## Forbidden Analysis Patterns

Наступному агенту заборонено:

- робити висновок по одному скриншоту про весь flow;
- писати `works`, якщо не перевірено current active code path;
- писати `missing`, якщо не перевірено route registration / imports / runtime wiring;
- плутати source code, local artifact і deployed artifact;
- змішувати legacy file і active runtime file без доказу;
- припускати, що `latest source == deployed production`;
- стверджувати наявність дубліката без `grep` / import graph / call graph;
- пропонувати mock endpoint або workaround до root cause.

---

## Mandatory Verification Checklist

Перед будь-яким висновком по AB test агент має пройти цей чеклист.

### A. Active Source Verification

1. Знайти всі входи в AB test:
   - routes;
   - Telegram handlers;
   - callback parsers;
   - CTA / button payloads.
2. Знайти точний active page / handler / service.
3. Перевірити imports і call chain.
4. Перевірити, чи немає parallel legacy implementation.

### B. Question Flow Verification

Обов'язково перевірити:

- де задається список питань;
- скільки питань реально в canonical order;
- які питання рендеряться після `Q5`;
- який condition завершує тест.

Мінімальні команди:

```bash
rg -n "q6|q7|q8|resolveAbTestQuestionOrder|getAbTestQuestion" backend/src apps/web/src
rg -n "AB_TEST_COMPLETED|result_key|current_question_id" backend/src
```

### C. Email Gate Verification

Обов'язково перевірити:

```bash
rg -n "skip_email_before_result" backend/src
rg -n "email_stage" backend/src
rg -n "buildAbTestEmailGateMessage|renderAbTestPostEmailSubmitSequence|renderAbTestResultThenOffer" backend/src
```

Треба показати:

- хто встановлює `email_stage = 'pending'`;
- хто рендерить email gate;
- хто обробляє skip;
- куди переходить flow після skip;
- чи є подвійний render path.

### D. Result Logic Verification

Обов'язково перевірити:

```bash
rg -n "resolveAbTestResultKey|resolveCanonicalTestResult|tiebreak|dominant" backend/src apps/web/src
```

Треба показати:

- canonical source result logic;
- input data shape;
- tie-breaking logic;
- чи є друга реалізація result resolver.

### E. Duplicate Implementation Verification

Для будь-якого claimed duplicate потрібно довести:

1. canonical file;
2. legacy file;
3. active callers canonical;
4. active callers legacy;
5. runtime impact.

Без цього не можна писати `дубль` як факт.

---

## Exact Unknowns To Verify Next

Ось список питань, які **ще треба довести кодом**, а не словами.

### 1. Q6-Q8

Потрібно відповісти точно:

- Чи присутні `Q6-Q8` у canonical question order?
- Чи доходить runtime до `Q6-Q8`?
- Чи не обрізає frontend список до `5` або `8` питань локально?
- Чи не завершується flow раніше через stale progress / completed status?

### 2. Email Capture Gate

Потрібно відповісти точно:

- Чи встановлюється `email_stage = pending` після фінального питання?
- Чи рендериться email gate до result screen чи після?
- Чи skip веде прямо на result?
- Чи є подвійне повідомлення / подвійний callback path?

### 3. Tiebreaker / Result Resolver

Потрібно відповісти точно:

- Яка canonical function вирішує result key?
- Чи є інша функція з подібною відповідальністю?
- Чи frontend має власний shadow resolver?
- Чи однаковий результат дає backend і frontend для тих самих answer sets?

### 4. Active Runtime Ownership

Потрібно відповісти точно:

- Який `abTest.service.ts` або інший handler реально виконується в Telegram runtime?
- Хто його імпортує?
- Через який router / middleware він підключений?
- Чи є legacy handler, який виглядає релевантним, але не викликається?

---

## Required Output Format For Future Analysis

Кожен наступний аналіз по цій темі має повертати результат в такому форматі:

### Verified

- факт
- факт

### Inference

- висновок + на чому базується

### Unknown

- що саме ще не доведено

### Evidence

- `absolute/path:line`
- command output
- network response

### Risk

- що може бути помилково витлумачено без додаткової перевірки

---

## Minimal Truthful Working Conclusion

Станом на зараз коректний висновок має звучати так:

### Verified

- `/start` запускається.
- `Q1-Q5` видно і відповіді збираються.
- Result screen відображається.
- Focus checkout CTA присутні.
- Перехід у checkout існує.

### Unknown until verified in repo/runtime

- чи реально присутні `Q6-Q8` у canonical active flow;
- чи активний email gate після фінального питання;
- чи canonical result resolver і tiebreaker працюють без дублювання;
- яка саме реалізація `abTest.service.ts` активна в runtime.

### Therefore

Будь-яка сильніша за це заява без перевірки монорепо, runtime path і active handlers є ненадійною.

---

## Operator Note

Якщо наступний агент не має доступу до монорепо або runtime:

- він не повинен "дописувати" відсутні факти;
- він повинен явно зупинитися на рівні `Unknown until verified`;
- він може лише сформувати список перевірок, але не видавати це за встановлену істину.
