---
name: master-coach-bot
description: Архітектура та інструкція Master Coach Bot — Telegram-бот через який Надя керує всіма AI-агентами системи STARWAY. Діалог, генерація контенту, публікація, розсилки — все з одного місця.
version: 1.0
author: Starway Studio
---

# SKILL: Master Coach Bot STARWAY

**Надя керує бізнесом з Telegram — один бот замість 10 інструментів**

---

## КОНЦЕПЦІЯ

```
НАДЯ пише в Telegram:
"Зроби розсилку про зміну валюти на євро"
    ↓
Master Bot → Claude API (з усіма скілами)
    ↓
Claude генерує текст + запитує уточнення в Telegram
    ↓
Надя підтверджує або редагує
    ↓
Кнопки: [✏️ Редагувати] [✅ Опублікувати] [🗑 Скасувати]
    ↓
Публікація в потрібний канал/бот/розсилку
```

---

## АРХІТЕКТУРА ДІАЛОГУ

### Стани розмови (ConversationState)

```typescript
enum CoachBotState {
  IDLE = 'idle', // очікує команду
  CLARIFYING = 'clarifying', // задає уточнюючі питання
  GENERATING = 'generating', // генерує контент
  REVIEWING = 'reviewing', // показує результат на затвердження
  EDITING = 'editing', // режим редагування
  PUBLISHING = 'publishing', // публікує
  DONE = 'done', // завершено
}
```

### Правило діалогу

```
1 ПИТАННЯ ЗА РАЗ — ніколи не задавати кілька одночасно
Після відповіді → підсумок → наступний крок або генерація
```

---

## КОМАНДИ НАДІ (природна мова)

Надя НЕ запам'ятовує команди. Вона пише як людина:

### Розсилки і повідомлення

```
"зроби розсилку про [тему]"
"напиши повідомлення для бота [сценарій]"
"оновлення для клієнтів [що змінилось]"
"announcement [тема]"
```

### Контент

```
"рілси на тиждень"
"3 пости для інстаграм про [тему]"
"пост в канал"
"блог за цей тиждень"
"контент-план на [тиждень/місяць]"
```

### Бізнес-оновлення

```
"зміни ціну ФОКУС на [нова ціна]"
"оновлення підписки [деталі]"
"нове правило воронки [деталі]"
```

### Zoom

```
"додай zoom [дата] [час] [тема]"
"скасуй zoom [id або дата]"
"звіт після zoom [нотатки голосом або текст]"
```

### Аналітика

```
"стат" / "статистика" / "revenue"
"хто в зоні ризику"
"скільки нових цього тижня"
```

---

## СЦЕНАРІЙ 1: БІЗНЕС-ОНОВЛЕННЯ (зміна валюти)

### Як це працює покроково

```
НАДЯ: "переходимо на євро з 1 липня, зроби розсилку"

БОТ: "Зрозуміла. Одне питання:
      Кому надсилати?
      [1] Всім активним клієнтам
      [2] Тільки учасникам ФОКУСУ
      [3] Всім в базі"

НАДЯ: [натискає 2] або пише "всім активним"

БОТ: "Генерую... ⏳"
     [через 5-10 секунд]

     "Ось розсилка:
     ━━━━━━━━━━━━━━━━━━━━
     З 1 липня ФОКУС оплачується в євро.

     Що змінюється: тільки валюта.
     Було 780 грн → стало 19 €.

     Дата списання — та сама.

     Хочеш зафіксувати гривневу ціну?
     Перейди на 3 місяці до 1 липня —
     заощадиш 20%.
     ━━━━━━━━━━━━━━━━━━━━

     [✏️ Редагувати] [✅ Надіслати N клієнтам] [🗑 Скасувати]"

НАДЯ: [✏️ Редагувати]

БОТ: "Що хочеш змінити? Надішли виправлений текст
     або скажи що саме не так."

НАДЯ: "поміняй 19 євро на 15 євро"

БОТ: "Оновила:
     ...було 19 € → стало 15 €...

     [✅ Надіслати 47 клієнтам] [✏️ Ще редагувати] [🗑 Скасувати]"

НАДЯ: [✅ Надіслати]

БОТ: "✅ Розсилку надіслано 47 клієнтам.
     📊 Доставлено: 47 | Прочитано: — (оновлю через годину)"
```

---

## СЦЕНАРІЙ 2: КОНТЕНТ-ПЛАН ТИЖНЯ

```
НАДЯ: "рілси на тиждень, в понеділок був розбір про рішення"

БОТ: "Тема тижня — РІШЕННЯ. Одне питання:
     Який головний інсайт з понеділкового розбору?
     (1-2 речення або голосове)"

НАДЯ: [голосове або текст з інсайтом]

БОТ: "Транскрибую... ⏳
     Зрозуміла: [підсумок інсайту]

     Генерую 7 рілсів... ⏳

     ━━━ РІЛС 1/7 ━━━
     [Назва + хук + структура]
     [Промпт для Kling AI]

     [➡️ Наступний] [✏️ Редагувати цей] [📋 Всі 7 одразу]"

НАДЯ: [➡️ Наступний] або [📋 Всі 7 одразу]

БОТ: [надсилає всі 7 одним повідомленням або по черзі]

     "Готово. Що далі?
     [📱 3 пости Instagram] [📢 Пост каналу] [📝 Блог] [✅ Все зроблено]"
```

---

## СЦЕНАРІЙ 3: ПЛАН ТИЖНЯ ЗА ОДИН ДІАЛОГ

```
НАДЯ: "план на сьогодні: розсилка про євро, рілси з понеділка,
      3 пости інста, оновити блог"

БОТ: "Беру в роботу. Починаємо по черзі:

     📋 ПЛАН СЕСІЇ:
     1️⃣ Розсилка про євро
     2️⃣ 7 рілсів (тема з понеділка)
     3️⃣ 3 пости Instagram
     4️⃣ Блог тижня

     Починаємо з розсилки.
     Кому надсилати? [Всім активним] [Тільки ФОКУС] [Всім в базі]"

[... послідовний діалог по кожному пункту ...]

БОТ (в кінці): "✅ Сесія завершена:
     • Розсилка: надіслано 47 клієнтам
     • Рілси: 7 ТЗ готові → папка Notion/файл
     • Пости: 3 чернетки в Instagram Draft
     • Блог: опубліковано на [url]

     Загальний час: 43 хвилини"
```

---

## ТЕХНІЧНА РЕАЛІЗАЦІЯ

### Структура файлів

```
bots/coach-assistant/
├── index.ts                    # точка входу, webhook
├── handlers/
│   ├── message.handler.ts      # обробка тексту і голосового
│   ├── callback.handler.ts     # обробка кнопок
│   └── session.handler.ts      # стан діалогу
├── services/
│   ├── claude.service.ts       # виклик Claude API зі скілами
│   ├── broadcast.service.ts    # розсилка клієнтам
│   ├── publish.service.ts      # публікація в канал/Instagram
│   └── transcribe.service.ts  # Whisper для голосового
├── skills/
│   └── index.ts                # склейка всіх скілів в system prompt
├── keyboards/
│   └── actions.ts              # кнопки [Редагувати][Опублікувати]
└── content/
    └── responses.ts            # тексти відповідей бота
```

### Головний обробник

```typescript
// handlers/message.handler.ts

export const handleCoachMessage = async (ctx: Context) => {
  const text = ctx.message?.text || ''
  const voice = ctx.message?.voice
  const session = await getSession(ctx.from.id)

  // 1. Якщо голосове → транскрибуємо
  const input = voice ? await transcribeVoice(voice.file_id) : text

  // 2. Якщо є активна сесія → продовжуємо діалог
  if (session.state !== 'idle') {
    return continueDialog(ctx, session, input)
  }

  // 3. Новий запит → визначаємо intent
  const intent = await detectIntent(input)

  switch (intent.type) {
    case 'broadcast':
      return startBroadcastFlow(ctx, session, intent)
    case 'content_week':
      return startContentWeekFlow(ctx, session, intent)
    case 'reels':
      return startReelsFlow(ctx, session, intent)
    case 'zoom':
      return handleZoomCommand(ctx, intent)
    case 'stats':
      return sendStats(ctx)
    default:
      return generateWithClaude(ctx, input)
  }
}
```

### Кнопки дій

```typescript
// keyboards/actions.ts

export const contentActionKeyboard = (contentId: string) =>
  Markup.inlineKeyboard([
    [
      Markup.button.callback('✏️ Редагувати', `edit:${contentId}`),
      Markup.button.callback('✅ Опублікувати', `publish:${contentId}`),
    ],
    [Markup.button.callback('🗑 Скасувати', `cancel:${contentId}`)],
  ])

export const broadcastConfirmKeyboard = (count: number, broadcastId: string) =>
  Markup.inlineKeyboard([
    [
      Markup.button.callback(
        `✅ Надіслати ${count} клієнтам`,
        `broadcast:confirm:${broadcastId}`
      ),
    ],
    [
      Markup.button.callback('✏️ Редагувати', `broadcast:edit:${broadcastId}`),
      Markup.button.callback('🗑 Скасувати', `broadcast:cancel:${broadcastId}`),
    ],
  ])

export const sessionPlanKeyboard = (steps: string[]) =>
  Markup.inlineKeyboard(
    steps.map((step, i) => [
      Markup.button.callback(`${i + 1}️⃣ ${step}`, `plan:step:${i}`),
    ])
  )
```

### Claude з усіма скілами

```typescript
// services/claude.service.ts

import { readFileSync } from 'fs'
import path from 'path'

const SKILLS_DIR = path.join(__dirname, '../../../skills')

const loadSkill = (name: string) =>
  readFileSync(path.join(SKILLS_DIR, `${name}.md`), 'utf-8')

export const buildSystemPrompt = (intent: IntentType): string => {
  // Базові скіли — завжди
  const base = [
    loadSkill('SKILL-orchestrator'),
    loadSkill('SKILL-starway-lexicon'),
    loadSkill('SKILL-must-ban'),
  ].join('\n\n---\n\n')

  // Додаткові скіли залежно від intent
  const intentSkills: Record<IntentType, string[]> = {
    broadcast: ['SKILL-ux-copy', 'SKILL-ab-test-results'],
    content_week: [
      'SKILL-content',
      'SKILL-creative-ads',
      'SKILL-ai-tools-stack',
    ],
    reels: ['SKILL-creative-ads', 'SKILL-ai-tools-stack', 'SKILL-ai-positions'],
    offer: ['SKILL', 'SKILL-client-dna', 'SKILL-funnel'],
    blog: ['SKILL-content', 'SKILL-telegram-channel'],
    zoom: [],
    stats: [],
  }

  const additional = (intentSkills[intent] || [])
    .map(loadSkill)
    .join('\n\n---\n\n')

  return `${base}\n\n---\n\n${additional}`
}
```

---

## АВТОМАТИЗАЦІЯ ПУБЛІКАЦІЙ

### Куди публікує бот

```typescript
// services/publish.service.ts

export const publishContent = async (
  content: string,
  destination: PublishDestination
) => {
  switch (destination) {
    case 'telegram_channel':
      return telegramBot.sendMessage(FOCUS_CHANNEL_ID, content, {
        parse_mode: 'HTML',
      })

    case 'broadcast_active':
      const users = await getActiveSubscribers()
      return sendBroadcast(users, content)

    case 'instagram_draft':
      // Зберігає як чернетку через Meta API або Notion
      return saveInstagramDraft(content)

    case 'blog':
      // Публікує в CMS або Notion-блог
      return publishToBlog(content)

    case 'notion':
      // Зберігає як документ
      return saveToNotion(content)
  }
}
```

---

## БЛОГ НАДІ — АРХІТЕКТУРА

### Що таке блог Наді в системі

```
Блог = автоматичний тижневий звіт-інсайт
Публікується: щонеділі о 18:00 (cron) або вручну командою "блог"
Джерела: Zoom-практики тижня + активність в боті + канал

Платформа: Notion (через API) або власна CMS на /blog
URL: starway.studio/blog або nadya.starway.studio
```

### Алгоритм генерації блогу

```
КРОК 1: Збір даних тижня
  - Теми Zoom-практик (з ZoomSession.topic)
  - Топ-3 питання з щоденного циклу (з DailyEntry)
  - Найактивніша точка ABSystem тижня (аналітика)
  - Пости з Telegram-каналу (тексти)

КРОК 2: Claude генерує
  Формат: 600-900 слів
  Структура:
  - Тема тижня + 1 інсайт (150 слів)
  - Що спостерігали в практиках (200 слів)
  - Механіка системи ABSystem (200 слів)
  - Один кейс без імені (150 слів)
  - CTA → тест або ФОКУС (100 слів)

КРОК 3: Надя підтверджує через бот
  [✅ Опублікувати] [✏️ Редагувати] [📅 Відкласти]

КРОК 4: Автопублікація
  → Notion або власний блог
  → Анонс в Telegram-каналі
  → (опційно) LinkedIn пост
```

---

## CHANGELOG

| Версія | Дата       | Зміни                         |
| ------ | ---------- | ----------------------------- |
| 1.0    | 28.05.2026 | Перша версія Master Coach Bot |
