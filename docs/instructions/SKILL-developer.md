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
- **Telegram:** @Starway_byNadya_Bot, @test_starway_bot, @Starway_DNA_Bot (coach)
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
11. **Кожен бот** — окремий `BOT_TOKEN` в `.env`, окрема ініціалізація в спільному `initBots()`, спільний `coachGuard` middleware для перевірки ролі.

### docs/instructions/ — правило росту
- **Перед новим файлом** → `grep -r "тема" docs/instructions/`
- Якщо є схожий → оновити існуючий, не створювати новий
- **MASTER-SKILLS.md** = живий індекс, оновлювати при кожній зміні
- Структура: `dev/` | `business/` | `ops/` | `archive/`

---

## Продукти платформи

| Продукт | Статус | Опис |
|---|---|---|
| Вхідний тест (@test_starway_bot) | ~85% | 10 блоків, chain priority СТАН→ЦІЛЬ→ВИБІР→РІШЕННЯ→ДІЯ |
| AI Ментор | active | Coaching бот, методологія СТАН→ЦІЛЬ→ВИБІР→РІШЕННЯ→ДІЯ |
| ФОКУС | active | landing: apps/web/src/features/landings/focus/ |
| Balance Wheel | active | Колесо балансу + weekly PDF звіт |
| Daily Cycle | active | 6 статичних ранкових + 2–4 динамічних питань |
| Бот ДНК (@Starway_DNA_Bot) | in progress | Коуч-панель: розклад, аналітика, нотифікації |
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
1. BotFather → отримати токен → записати в `.env` як `XXXXX_BOT_TOKEN`
2. Додати в `initBots()` — не створювати новий entry point
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
