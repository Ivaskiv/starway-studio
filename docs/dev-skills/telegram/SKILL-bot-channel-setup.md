---
name: skill-bot-channel-setup
description: "Використовуй цей скіл коли треба створити новий Telegram бот або канал для клієнта SaaS. Покриває: збір даних від замовника, BotFather кроки, підключення до монорепо, .env змінні, guard middleware, content файл."
---

## Коли використовувати

- Клієнт замовляє новий продукт → потрібен окремий бот
- Додається новий тип бота (коуч / учасник / адмін / продажі)
- Потрібен Telegram канал для нотифікацій або контенту

---

## Чекліст: новий бот

### Крок 1 — Дані від замовника (заповнити форму)
Перед будь-якою розробкою замовник заповнює `bot-setup-form.html`.
Обов'язкові поля: назва бота, username, тип (коуч/учасник/продажі), мова, роль у системі.

### Крок 2 — BotFather (вручну, займає 2 хв)
```
1. Відкрити @BotFather в Telegram
2. /newbot
3. Назва: [з форми, поле "Публічна назва"]
4. Username: [з форми, поле "Username"] + Bot
5. Скопіювати токен → зберегти у .env як [PREFIX]_BOT_TOKEN
6. /setdescription → текст з форми
7. /setuserpic → логотип з форми (якщо є)
8. /setcommands → список команд з форми
```

### Крок 3 — Підключення до репо (Codex STEP)
```
STEP NN — add [назва] bot

Context:
- Repo: /Users/viravira/Documents/starway-studio
- .env.example: додати [PREFIX]_BOT_TOKEN=
- Точка входу ботів: [знайти через grep initBots]

Task:
1. Додати [PREFIX]_BOT_TOKEN= в .env.example
2. В initBots() додати ініціалізацію нового бота
3. Створити guard: bot/guards/[role]Guard.ts
   — перевіряти role з БД, якщо не відповідає → ігнорувати
4. Створити content: bot/content/[name].content.ts
   — весь copy бота тут
5. Створити handler: bot/handlers/[name]/start.handler.ts
   — тільки оркестрація
6. tsc --noEmit → green

Rules:
- Zero дублікатів — перевірити чи немає схожого бота
- No нових entry point файлів — тільки в initBots()
- Copy → content файл, handler → оркестрація
```

### Крок 4 — Telegram канал (якщо потрібен)
```
1. Створити канал вручну в Telegram
2. Зробити бота адміністратором каналу
3. Отримати chat_id: переслати повідомлення з каналу
   на @userinfobot або через getUpdates
4. Додати в .env: [PREFIX]_CHANNEL_ID=-100xxxxxxxxx
5. Додати в .env.example: [PREFIX]_CHANNEL_ID=
```

---

## Типи ботів у системі Starway

| Тип | Prefix | Роль | Guard |
|---|---|---|---|
| Вхідний тест | TEST | будь-який | немає |
| Основний | MAIN | USER | userExists |
| Коуч-панель | COACH | EXPERT / SUPERADMIN | coachGuard |
| Адмін | ADMIN | SUPERADMIN | adminGuard |

---

## .env структура для ботів

```env
# Telegram Bots
TELEGRAM_BOT_USERNAME=Test_ABsystem_bot
TELEGRAM_BOT_TOKEN=       # production funnel bot
TEST_TELEGRAM_BOT_USERNAME=test_starway_bot
TEST_TELEGRAM_BOT_TOKEN=  # local/dev funnel bot
COACH_BOT_TOKEN=          # @StarwayDNACoach_bot

# Telegram Channels
FOCUS_CHANNEL_ID=         # канал учасників ФОКУС
COACH_CHANNEL_ID=         # приватний канал коуча
```

---

## Форма замовника

Файл: `docs/client/onboarding/bot-setup-form.html`
Замовник заповнює → розробник отримує всі дані для BotFather + розробки.
Поля: назва, username, тип, мова, роль, команди, опис, welcome-текст, логотип.
