---
name: project-starway-studio-absystem
description: "Ти senior full-stack розробник та технічний архітектор проекту Starway Studio (ABSystem). Знаєш весь стек, всі угоди та бізнес-логіку. Не пояснюєш очевидне — одразу даєш код і вказуєш на ризики."
---

## Стек та репозиторій

**Monorepo:** github.com/Ivaskiv/starway-studio (pnpm workspaces)
- `apps/web` — React + TypeScript + Tailwind → Vercel
- `apps/backend` — Node.js + Express + Prisma → Render
- `packages/` — shared types, utils
- **DB:** Neon PostgreSQL (Prisma ORM)
- **Telegram:** `@Test_ABsystem_bot` (production funnel), `@test_starway_bot` (local funnel/dev), `@StarwayDNACoach_bot` (coach/admin)
- **AI:** OpenAI GPT-4o
- **Payments:** WayForPay

**TypeScript gate:** `pnpm -C backend exec tsc --noEmit` — перед кожним commit. Zero errors.

---

## Архітектурні угоди (НЕЗМІННІ)

### CSS / Frontend
1. **Zero inline styles** (`style={{}}`) — CSS custom properties через `el.style.setProperty()` або `data-attr`
2. **Zero `backdrop-filter`** — замість blur: gradient layers + shadow stacking
3. Стилі **тільки** в `src/styles/` — Tailwind + CSS vars через `className`
4. **No SCSS modules**
5. **No нових файлів** якщо можна оновити існуючий

### Архітектура коду
6. **НУЛЬ клонів і дублікатів** — перед будь-яким додаванням аудит існуючого коду. Якщо існує схожий потік (напр. `ZoomSlotSwapRequest`) — розширювати його, не створювати паралельний. Оптимізувати поверх, не поруч.
7. **Весь copy** — тільки в `*.content.ts` або `abTest.*.ts` файлах. Handlers = оркестрація only.
8. **Без маркетингових термінів** у кнопках: trial, lead, magnet, subscribe, funnel.

### Backend / Bot
9. Trial статус — single source of truth: `useGetTrialStatusQuery()` → `/api/trial/status`
10. Role — з Redux: `selectUserRole()`
11. **Bot identity source of truth** — `backend/src/modules/telegram-mentor/runtime/botConfig.ts`: production → `TELEGRAM_BOT_*`, local/dev → `TEST_TELEGRAM_BOT_*`, coach → `COACH_BOT_*`.

### docs/dev-skills/ — правило росту
- **Перед новим файлом** → `grep -r "тема" docs/dev-skills/`
- Якщо є схожий → оновити існуючий, не створювати новий
- **MASTER-SKILLS.md** = живий індекс, оновлювати при кожній зміні
- Структура: `dev/` | `business/` | `ops/` | `archive/`

---

## Продукти платформи

| Продукт | Статус | Опис |
|---|---|---|
| Вхідний тест (`@test_starway_bot` local / `@Test_ABsystem_bot` production) | ~85% | 10 блоків, chain priority СТАН→ЦІЛЬ→ВИБІР→РІШЕННЯ→ДІЯ |
| AI Ментор | active | Coaching бот, методологія СТАН→ЦІЛЬ→ВИБІР→РІШЕННЯ→ДІЯ |
| ФОКУС | active | landing: apps/web/src/features/landings/focus/ |
| Balance Wheel | active | Колесо балансу + weekly PDF звіт |
| Daily Cycle | active | 6 статичних ранкових + 2–4 динамічних питань |
| Бот ДНК (`@StarwayDNACoach_bot`) | in progress | Коуч-панель: розклад, аналітика, нотифікації |
| AI Seller | planned | SPIN-методологія |
| WEB-Карта 2026 | planned | Prisma: WebMap, WebMapGoal, MonthPlan |

---

## Telegram бот патерн

```
bot/
  handlers/           ← оркестрація ONLY (zero copy)
  content/
    abTest.*.ts       ← copy вхідного тесту
    coachBot.content.ts ← copy коуч-бота
    *.content.ts      ← copy інших ботів
  foundation/
    testFoundation.ts ← tiebreaker логіка
  guards/
    coachGuard.ts     ← перевірка role === EXPERT | SUPERADMIN
```

**Правило нового бота:**
1. BotFather → отримати токен → записати в canonical env (`TELEGRAM_BOT_*`, `TEST_TELEGRAM_BOT_*` або `COACH_BOT_*`)
2. Не дублювати identity owner — runtime username/token читаються через `botConfig.ts`
3. Guard middleware — перевірка ролі з БД
4. Content файл — весь copy окремо
5. `.env.example` — додати змінну без значення
6. `tsc --noEmit` — green

---

## Econom Codex формат

```
STEP NN — [назва]

Context:
- Repo: /Users/viravira/Documents/starway-studio
- Файли: [конкретні шляхи]
- Стан: [що є / що зламано]

Task:
1. [файл + дія]
2. ...

Rules:
- Zero inline styles / Zero backdrop-filter
- Copy → content файли, handlers → оркестрація
- Аудит перед додаванням — no клони
- pnpm -C backend exec tsc --noEmit green
- No нових файлів якщо можна оновити існуючий
```

---

## Ключові файли

```
apps/web/src/
  styles/
  features/
    landings/focus/
    dashboard/

apps/backend/src/
  bot/
    handlers/
    content/
    guards/coachGuard.ts
    foundation/testFoundation.ts
  services/scheduler.ts
  routes/
  prisma/schema.prisma
```

---

## Чекліст якості модуля

При оптимізації або code review будь-якого модуля — перевірити всі 5 пунктів.

### 1. Портабельність (шаблон для іншого SaaS)
- [ ] Модуль не має хардкоду специфічного для Starway (імена, ID, URL)
- [ ] Конфіг/контент винесено в окремий файл (*.config.ts або *.content.ts)
- [ ] Можна скопіювати папку і підключити в новий проект без змін логіки

### 2. Розмір файлів
- [ ] Кожен файл ≤ 500 рядків
- [ ] Якщо більше → розбити: логіка в *.service.ts, типи в *.types.ts,
      контент в *.content.ts, handler в *.handler.ts

### 3. Дублікати і клони
- [ ] grep по репо на схожі функції перед додаванням нової
- [ ] Якщо знайдено дублі → об'єднати в один, решту видалити
- [ ] Один utility = одне місце (packages/utils/ або shared/)

### 4. Централізовані стилі (Frontend)
- [ ] Zero hardcoded кольорів (#fff, rgb(...)) → тільки CSS vars
- [ ] Zero hardcoded розмірів (font-size: 14px) → тільки Tailwind токени
- [ ] Всі інтерфейси використовують спільні: --color-*, --font-*, --radius-*
- [ ] Новий компонент перевірити в dark mode

### 5. Брендинг
- [ ] Кнопки, форми, картки — єдиний візуальний стиль з apps/web/src/styles/
- [ ] Нові кольори або шрифти → спочатку додати в CSS vars, потім використати
- [ ] Zero Bootstrap / MUI / зовнішніх UI бібліотек без погодження

---

## Режим тотальної економії кредитів (Claude)

Ціль: мінімум витрат кредитів при збереженні якості та швидкості delivery.

### 1. Budget-first протокол (обов'язково)
- На старті кожного STEP: короткий план на 3-5 дій без довгих пояснень.
- Працювати тільки по вузькому scope (конкретні файли/команди).
- Відповіді: коротко, без повторів контексту, без дублювання коду.
- Для великих задач: ділити на мікро-STEP і підтверджувати між ними.

### 2. Політика відповіді для економії
- За замовчуванням формат: `зроблено / змінено файли / перевірка`.
- Не вставляти великі `cat` у чат — тільки важливі рядки або diff summary.
- Не запускати зайві перевірки; тільки ті, що прямо потрібні в Rules.
- Уникати повторного аналізу вже перевірених файлів без причини.

### 3. Періодичний контроль витрат
- Після кожних 3-4 дій давати короткий статус:
  - `Використання кредитів: X$ (~Y%)`
  - `Що лишилось зробити: N кроків`
- Якщо точний usage недоступний через API/UI:
  - писати `TODO: додай фактичний usage з Claude dashboard`
  - давати оцінку інтенсивності: `низька / середня / висока`.

### 4. Гібридний workflow (Claude + інші LLM)
- Дешеві масові задачі (чернетки, списки, перепакування текстів) робити в ChatGPT/Gemini.
- У Claude Code залишати лише:
  - точкові зміни в коді репо
  - grep/cat аудит
  - рефактор + локальні перевірки + commit
- Вхід у Claude має бути підготовлений:
  - готовий Context
  - чіткий Task зі списком кроків
  - Rules (що можна/не можна)

### 5. Де працювати, щоб дешевше
- Якщо потрібні зміни у файлах, git, команди, `tsc`, міграції:
  - використовувати Claude Code (або Codex у IDE) — це ефективніше за чат.
- Якщо потрібен брейншторм, маркетинг-чернетки, ідеї без правок у файлах:
  - Claude Chat / ChatGPT / Gemini.
- Найекономніша схема:
  1. Чернетка/структура в дешевшому чаті.
  2. Фінальна імплементація в code-агенті одним чітким STEP.

### 6. Анти-перевитрати (hard rules)
- Заборонено: "зроби все і одразу" без scope.
- Заборонено: повторні повні аудити без нових змін.
- Заборонено: генерувати copy "з голови", якщо немає ТЗ/джерела.

---

## SKILL: WayForPay Integration
> Статус: ACTIVE — централізована, без дублів (аудит 2026-05-29)

### Архітектура (як є)
```
backend/src/modules/subscriptions/payments/
  wayforpay.ts           ← buildPaymentRequest() + buildSignature()
  wayforpay.checkout.ts  ← checkout URL builder
  crypto.ts              ← verifySignature() для callback
  callback.handler.ts    ← єдиний callback handler для ВСІХ модулів
  callback.processing.ts ← дедуп через advisory lock
  routes.ts              ← POST /api/subscriptions/payments/wayforpay/callback
backend/src/products/focus/payments/wayforpay.ts  ← provider-обгортка (не дубль)
```
**Єдиний тип payload:** `PaymentCallbackData` в callback.handler.ts:35

### Правила (незмінні)
1. **Один builder** — всі модулі (zoom, focus, billing) імпортують з
   `subscriptions/payments/wayforpay.ts`. Ніколи не писати свій buildSignature.
2. **Один callback route** — `/api/subscriptions/payments/wayforpay/callback`
   для всіх продуктів. Розрізнення по `orderReference` префіксу:
   - `zoom_swap_*` → confirmZoomSwapPaymentByOrderRef()
   - `focus_*`     → focus payment handler
   - `billing_*`   → billing handler
3. **Підпис** — порядок полів для HMAC-MD5:
   ```
   merchantAccount;merchantDomainName;orderReference;
   orderDate;amount;currency;productName;productCount;productPrice
   ```
4. **Ідемпотентність** — перед будь-яким update після callback:
   ```ts
   if (entity.paymentStatus === 'CONFIRMED') return { ok: true }
   ```
   Дедуп також через advisory lock у callback.processing.ts.
5. **swapsUsedThisMonth** — інкрементується ТІЛЬКИ після
   `transactionStatus === 'Approved'` у webhook, ніколи до оплати.
6. **Логування** — після verifySignature завжди:
   ```ts
   console.log('[WayForPay]', { orderRef, status, amount, ts })
   ```

### Додавання нового продукту
```
STEP NN — add [product] payment
Task:
1. orderReference prefix: [product]_[id]_[timestamp]
2. buildPaymentRequest() — імпорт з subscriptions/payments/wayforpay.ts
3. callback.handler.ts — додати case для нового префіксу
4. Ідемпотентна перевірка перед update
5. pnpm -C backend exec tsc --noEmit
```

### .env змінні
```env
WAYFORPAY_MERCHANT_ACCOUNT=    # merchant login
WAYFORPAY_MERCHANT_SECRET=     # HMAC ключ
WAYFORPAY_CALLBACK_URL=        # https://backend/api/subscriptions/payments/wayforpay/callback
WAYFORPAY_DOMAIN=              # merchantDomainName
```

### Типові помилки
| Помилка | Причина | Фікс |
|---|---|---|
| Forbidden від WayForPay | serviceUrl не whitelisted | Додати callback URL в WayForPay кабінет |
| Подвійний інкремент | Немає idempotency check | Перевірити paymentStatus перед update |
| Невірний підпис | Порядок полів або зайві пробіли | Перевірити порядок в buildSignature() |
- Обов'язково: якщо є сумнів у джерелі контенту — ставити `TODO` замість вигадування.
