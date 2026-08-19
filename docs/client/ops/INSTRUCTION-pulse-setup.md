# ІНСТРУКЦІЯ: Пульт пульта — Сайт + Telegram-бот для коуча
**Version:** 1.0 | Starway Studio

---

## КОНЦЕПЦІЯ

Коуч працює з одного місця — Telegram або веб-інтерфейс (Пульт ДНК STARWAY). Вводить голосове або текст → система генерує контент, оффер, ТЗ на рілси, повідомлення для бота. Паралельно Telegram-бот обслуговує клієнтів автоматично.

```
КОУЧ (голос/текст)
    ↓
ПУЛЬТ ДНК STARWAY (веб або Telegram)
    ↓ генерує
┌──────────────────────────────────┐
│  Контент  │  Оффер  │  ТЗ рілсів │
│  Копі бот │  Серії  │  Стратегія │
└──────────────────────────────────┘
    ↓ передається в
┌─────────────┐    ┌──────────────┐
│  Telegram   │    │   Сайт       │
│  бот        │    │   лендінг    │
│  (клієнти)  │    │   (трафік)   │
└─────────────┘    └──────────────┘
```

---

## ЧАСТИНА 1: CLAUDE PROJECT ЯК МОЗОК СИСТЕМИ

### Що вже зроблено (твій проєкт "my DNA $100M Offer Builder"):

```
Instructions     → хто агент, як думає
SKILL.md         → оффери (Хормозі × ABSystem)
docs/agents/ai-mentor/comeback-flows.md → контент-машина
SKILL-funnel.md  → воронка продажів
SKILL-ux-copy.md → копі для бота
docs/agents/ai-mentor/methodology-absystem.md    → ДНК клієнта
docs/agents/ai-content/SKILL-creative-ads.md  → відео і рілси
SKILL-ai-positions.md  → позиції Пульта
docs/agents/shared/STARWAY-DNA-LEXICON.md      → теги MUST/BAN
docs/agents/ai-content/SKILL-output-engine.md → формати виходу
SKILL-telegram-channel.md → Telegram-канал
SKILL-ab-test-results.md  → 5 результатів тесту
```

### Як коуч використовує щодня:

**Сценарій 1: після Zoom-практики**
```
Коуч → Claude Project:
"[вставляє транскрипт або диктує голосово суть практики]
Зроби: /from-zoom"

Отримує:
→ Аналіз золотих кусків
→ Оновлений оффер
→ 7 рілсів ТЗ на тиждень
→ Пост для Telegram-каналу
```

**Сценарій 2: написати серію для бота**
```
Коуч → Claude Project:
"Напиши Telegram-серію після тесту для результату СТАН
/series СТАН"

Отримує:
→ 3 готові повідомлення з правильним тоном
→ Кнопки і CTA
→ Затримки між повідомленнями
```

**Сценарій 3: оновити оффер**
```
Коуч → Claude Project:
"Старт [описує поточну ситуацію з продажами]"

Отримує:
→ Покроковий процес через методологію
→ Готовий стек оффера
```

---

## ЧАСТИНА 2: TELEGRAM-БОТ — ПІДКЛЮЧЕННЯ ДО CLAUDE PROJECT

### Архітектура зв'язку

```
Telegram-бот (Node.js)
    ↓ webhook
Backend (твій Render сервер)
    ↓ API call
Anthropic API (claude-sonnet-4-6)
    ↓ system prompt = твої скіли
    ↓ відповідь
Telegram-бот → клієнт
```

### Що додати в system prompt бота

Бот клієнтів використовує ІНШИЙ промпт ніж твій Claude Project. Для бота беремо тільки релевантні скіли:

```javascript
// backend/src/bots/absystem/config/bot.system-prompt.ts

export const BOT_SYSTEM_PROMPT = `
Ти — AI-ментор системи ABSystem.
Знаєш методологію СТАН → ЦІЛЬ → ВИБІР → РІШЕННЯ → ДІЯ.
Говориш тепло, без тиску, без telemetry-мови.
Пам'ятаєш контекст користувача з бази даних.

ПРАВИЛА:
- Максимум 3-4 речення на відповідь
- Continuation-based: "продовжимо" не "почнемо"
- Ніяких streaks, counters, stage-мови
- Мова — та якою пише користувач

ПРОДУКТИ ЕКОСИСТЕМИ:
- Тест (безкоштовно) → ФОКУС (780/1990 грн) → ABSystem AI (1900/9900/18000 грн)
- Платформа відкривається тільки через ФОКУС
`;
```

### Як передавати скіли в бот (вибірково)

Не всі скіли потрібні боту клієнтів. Завантажуй тільки релевантні:

```javascript
// Для обробки результатів тесту
import { TEST_RESULTS_COPY } from './content/ab-test-results';

// Для comeback flows  
import { COMEBACK_FLOWS } from './content/ux-copy';

// Для upgrade flows
import { UPGRADE_FLOWS } from './content/funnel';
```

---

## ЧАСТИНА 3: САЙТ — ПІДКЛЮЧЕННЯ

### Пульт ДНК STARWAY (веб-інтерфейс для коуча)

Те що ти вже маєш на скріншоті — це і є пульт. Щоб він використовував твої скіли з Claude Project:

**Варіант А: Через Anthropic API напряму**
```javascript
// apps/web/src/features/dna-pulse/api/generate.ts

const response = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': process.env.ANTHROPIC_API_KEY,
    'anthropic-version': '2023-06-01'
  },
  body: JSON.stringify({
    model: 'claude-sonnet-4-6',
    max_tokens: 4000,
    system: COMBINED_SKILLS_PROMPT, // склеєні скіли
    messages: [{ role: 'user', content: userInput }]
  })
});
```

**Як зібрати COMBINED_SKILLS_PROMPT:**
```javascript
// apps/web/src/features/dna-pulse/config/skills.ts

import { readFileSync } from 'fs';

// Завантажуєш скіли як рядки
const SKILL_OFFERS = readFileSync('skills/SKILL.md', 'utf-8');
const SKILL_CONTENT = readFileSync('skills/docs/agents/ai-mentor/comeback-flows.md', 'utf-8');
const SKILL_AI_POSITIONS = readFileSync('skills/SKILL-ai-positions.md', 'utf-8');
// ... інші скіли

// Збираєш під активну AI-позицію
export const getSkillsForPosition = (position: 'truth' | 'architect' | 'psychology') => {
  const base = `${INSTRUCTIONS}\n\n${SKILL_OFFERS}\n\n${SKILL_MUST_BAN}`;
  
  switch(position) {
    case 'truth':
      return `${base}\n\nАКТИВНА ПОЗИЦІЯ: ОГОЛЕНА ПРАВДА\n${POSITION_TRUTH_RULES}`;
    case 'architect':
      return `${base}\n\nАКТИВНА ПОЗИЦІЯ: ГОЛОВНИЙ АРХІТЕКТОР\n${POSITION_ARCHITECT_RULES}`;
    case 'psychology':
      return `${base}\n\nАКТИВНА ПОЗИЦІЯ: ПСИХОЛОГІЯ ДІЇ\n${POSITION_PSYCHOLOGY_RULES}`;
  }
};
```

**Варіант Б: Через Claude Project API (Projects API)**
```
Наразі Projects API не має публічного endpoint для програмного доступу.
Тому Варіант А — через прямий API з скілами як system prompt — 
є правильним підходом для Пульта.
```

---

## ЧАСТИНА 4: ГОЛОСОВИЙ ВХІД ДЛЯ КОУЧА

### Варіант А: Через браузер (Web Speech API)
Те що вже є на Пульті — кнопка мікрофону. Розширити:
```javascript
// Додати Whisper для точності (замість Web Speech API)
const transcribeAudio = async (audioBlob: Blob) => {
  const formData = new FormData();
  formData.append('file', audioBlob, 'audio.webm');
  formData.append('model', 'whisper-1');
  formData.append('language', 'uk'); // українська
  
  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}` },
    body: formData
  });
  return response.json();
};
```

### Варіант Б: Через Telegram (найзручніше для коуча)
Коуч надсилає голосове в окремий **приватний бот-асистент** (не той що для клієнтів):

```
@Test_ABsystem_bot (для клієнтів) ← окремий
@starway_coach_assistant_bot (для Наді) ← новий приватний бот
```

```javascript
// Обробка голосового в приватному боті коуча
bot.on('voice', async (ctx) => {
  // 1. Отримати файл з Telegram
  const fileLink = await ctx.telegram.getFileLink(ctx.message.voice.file_id);
  
  // 2. Транскрибувати через Whisper
  const transcript = await transcribeFromUrl(fileLink.href);
  
  // 3. Відправити в Claude з активними скілами
  const result = await generateWithSkills(transcript, {
    position: ctx.session.activePosition || 'architect',
    outputFormat: ctx.session.outputFormat || 'post'
  });
  
  // 4. Повернути результат коучу
  await ctx.reply(result);
});
```

---

## ЧАСТИНА 5: ШВИДКІ КОМАНДИ ДЛЯ КОУЧА В TELEGRAM

Приватний бот коуча розуміє команди зі скілів:

```
/reels-pack [текст або голосове]  → 7 рілсів ТЗ
/from-zoom [транскрипт]           → аналіз + оффер + рілси
/tg-post [тема]                   → пост для каналу
/tg-week                          → план на тиждень
/offer [ніша]                     → новий оффер
/copy-review [текст]              → перевірка копі бота
/tags [сегмент]                   → MUST/BAN набір
/result [СТАН/ЦІЛЬ/...]           → серія для цього результату
```

---

## ЧАСТИНА 6: ФАЙЛОВА СТРУКТУРА СКІЛІВ У ПРОЄКТІ

```
starway-studio/
├── skills/                    ← папка для всіх скілів
│   ├── SKILL.md               ← оффери
│   ├── docs/agents/ai-mentor/comeback-flows.md       ← контент
│   ├── SKILL-funnel.md        ← воронка
│   ├── SKILL-ux-copy.md       ← копі бота
│   ├── docs/agents/ai-mentor/methodology-absystem.md    ← ДНК клієнта
│   ├── docs/agents/ai-content/SKILL-creative-ads.md  ← відео/рілси
│   ├── SKILL-ai-positions.md  ← позиції пульта
│   ├── docs/agents/shared/STARWAY-DNA-LEXICON.md      ← теги
│   ├── docs/agents/ai-content/SKILL-output-engine.md ← формати виходу
│   ├── SKILL-telegram-channel.md → канал
│   └── SKILL-ab-test-results.md  → результати тесту
│
├── apps/
│   ├── web/src/features/dna-pulse/
│   │   ├── config/skills.ts   ← збирає скіли під позицію
│   │   └── api/generate.ts    ← Anthropic API call
│   └── bot/
│       ├── absystem/          ← бот для клієнтів
│       └── coach-assistant/   ← приватний бот коуча
```

---

## ЧАСТИНА 7: ПРІОРИТЕТ ЗАПУСКУ

```
ТИЖДЕНЬ 1:
✅ Завантажити всі скіли в Claude Project (Files)
✅ Оновити Instructions
✅ Тестувати через Claude Project вручну

ТИЖДЕНЬ 2:
☐ Підключити скіли до Пульта через Anthropic API
☐ Активувати вибір позиції (3 кнопки)
☐ Підключити Whisper для голосового входу

ТИЖДЕНЬ 3:
☐ Запустити приватний бот-асистент для коуча
☐ Налаштувати команди /from-zoom, /reels-pack тощо
☐ Підключити до каналу ФОКУС автопостинг

ТИЖДЕНЬ 4:
☐ Тестування повного циклу: голосове → контент → публікація
☐ Оптимізація під реальне використання
```

---

## CHANGELOG
| Версія | Дата | Зміни |
|--------|------|-------|
| 1.0 | 28.05.2026 | Перша версія повної інструкції |