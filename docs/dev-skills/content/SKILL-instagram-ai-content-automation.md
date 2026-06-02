---
name: instagram-ai-content-automation
description: >
  Використовуй цей скіл коли потрібно розробити AI-автоматизацію контент-плану
  для Instagram: аналіз Zoom-зідзвонів, генерація тижневого плану, UI підтвердження,
  чеклісти. Також застосовується для будь-якого клієнтського ТЗ типу "коуч/експерт
  + Instagram + AI агент + воронка". Включає патерни для розробки ТЗ-документів,
  SKILL для замовника, та технічну архітектуру Node.js автоматизацій.
---

# SKILL: Instagram AI Content Automation
## (Патерн для Starway Studio та клієнтських проектів)

---

## 1. КОНТЕКСТ ЗАДАЧІ

Замовник — коуч/експерт з Instagram-аудиторією. Задача:
1. Коуч наговорює завдання на тиждень голосом або текстом
2. AI аналізує Zoom-зідзвони + ввід коуча → генерує контент-план
3. Коуч підтверджує план кнопкою в UI
4. AI генерує чеклісти + пропонує оптимізацію
5. AI-агенти коуча реалізують план враховуючи всі наявні інструменти

**Стек:** Node.js + TypeScript + Prisma + React/Vite/Tailwind + Render + Vercel + Telegram Bot (Telegraf/GramIO)

---

## 2. АРХІТЕКТУРА AI CONTENT AUTOMATION

```
backend/src/modules/instagram-planner/
├── services/
│   ├── transcriptAnalyzer.service.ts   ← аналіз Zoom транскриптів
│   ├── contentPlan.service.ts          ← генерація тижневого плану
│   ├── checklist.service.ts            ← генерація чеклістів
│   └── agentOrchestrator.service.ts    ← оркестрація AI агентів
├── handlers/
│   ├── voiceInput.handler.ts           ← обробка голосового вводу
│   └── planConfirm.handler.ts          ← підтвердження плану
├── content/
│   └── instagramPlanner.content.ts     ← весь copy (нуль хардкоду в handlers)
└── types/
    └── contentPlan.types.ts            ← типи (shared з frontend)
```

```
apps/web/src/features/instagram-planner/
├── components/
│   ├── WeeklyPlanView.tsx              ← UI перегляд тижневого плану
│   ├── PlanConfirmButton.tsx           ← кнопка підтвердження
│   └── ChecklistPanel.tsx             ← чеклісти по публікаціях
└── hooks/
    └── useContentPlan.ts              ← React Query + plan state
```

---

## 3. PRISMA СХЕМА (додати до schema.prisma)

```prisma
model ContentWeekPlan {
  id          String   @id @default(cuid())
  coachId     String
  weekStart   DateTime
  status      PlanStatus @default(DRAFT)
  rawInput    String   // голосовий/текстовий ввід коуча
  aiAnalysis  Json     // результат аналізу транскриптів
  planItems   ContentPlanItem[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  coach       User     @relation(fields: [coachId], references: [id])
}

model ContentPlanItem {
  id          String   @id @default(cuid())
  planId      String
  dayOfWeek   Int      // 1=Пн ... 7=Нд
  rubric      InstagramRubric
  theme       String
  keyThought  String
  cta         String
  checklist   Json     // масив пунктів чекліста
  status      ItemStatus @default(PENDING)
  plan        ContentWeekPlan @relation(fields: [planId], references: [id])
}

enum PlanStatus {
  DRAFT
  CONFIRMED
  IN_PROGRESS
  COMPLETED
}

enum ItemStatus {
  PENDING
  CONFIRMED
  PUBLISHED
  SKIPPED
}

enum InstagramRubric {
  SVOIA          // своя — щопонеділка
  ODNA_DUMKA     // одна думка — щоп'ятниці
  ZSEREDYNY      // зсередини — щосереди
  ROZBYIR        // розбір — раз на місяць
  OKHOPLENNIA   // охоплення — щосуботи
  MY_Z_SYNOM     // ми з сином — раз на 2 тижні
}
```

---

## 4. КЛЮЧОВІ СЕРВІСИ — ВИРОБНИЧИЙ КОД

### 4.1 Аналіз транскриптів

```typescript
// backend/src/modules/instagram-planner/services/transcriptAnalyzer.service.ts
import OpenAI from 'openai';
import type { ContentInsight } from '../types/contentPlan.types';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function analyzeTranscripts(
  transcripts: string[],
  coachInput: string
): Promise<ContentInsight[]> {
  const combined = transcripts.join('\n\n---\n\n');
  
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{
      role: 'system',
      content: `Ти аналізуєш коуч-сесії та ввід коуча.
Архетипи: Мудрець (40%), Правитель (35%), Маг (25%).
Система: Стан → Ціль → Вибір → Рішення → Дія.
Витягни: ключові інсайти, патерни клієнтів, теми що резонують.
Формат відповіді: JSON масив ContentInsight.`
    }, {
      role: 'user',
      content: `Ввід коуча: ${coachInput}\n\nТранскрипти: ${combined}`
    }],
    response_format: { type: 'json_object' }
  });

  const parsed = JSON.parse(response.choices[0].message.content ?? '{}');
  return parsed.insights as ContentInsight[];
}
```

### 4.2 Генерація тижневого плану

```typescript
// backend/src/modules/instagram-planner/services/contentPlan.service.ts
import type { ContentInsight, WeeklyPlan, PlanItem } from '../types/contentPlan.types';
import { RUBRIC_SCHEDULE, ARCHETYPE_WEIGHTS } from '../content/instagramPlanner.content';

export async function generateWeeklyPlan(
  insights: ContentInsight[],
  coachInput: string,
  weekStart: Date
): Promise<WeeklyPlan> {
  // Детермінована прив'язка рубрик до днів (незмінна логіка)
  const schedule = RUBRIC_SCHEDULE.map(slot => ({
    ...slot,
    theme: selectTheme(insights, slot.rubric),
    keyThought: generateKeyThought(insights, slot.rubric, coachInput),
    cta: slot.defaultCta,
    checklist: generateChecklist(slot.rubric)
  }));

  return { weekStart, items: schedule };
}

// Детермінований вибір теми — 4-рівневий tiebreaker
function selectTheme(insights: ContentInsight[], rubric: InstagramRubric): string {
  const candidates = insights.filter(i => i.suitableRubrics.includes(rubric));
  if (candidates.length === 0) return insights[0]?.theme ?? 'система';
  
  // Level 1: архетипний вага матч
  const byArchetype = candidates.sort((a, b) => 
    archetypeWeight(b.archetype) - archetypeWeight(a.archetype));
  if (byArchetype[0].archetypeScore !== byArchetype[1]?.archetypeScore) 
    return byArchetype[0].theme;
  
  // Level 2: сила резонансу (кількість клієнтів)
  const byResonance = byArchetype.sort((a, b) => b.resonanceCount - a.resonanceCount);
  if (byResonance[0].resonanceCount !== byResonance[1]?.resonanceCount) 
    return byResonance[0].theme;
  
  // Level 3: давність (свіжіші — пріоритет)
  const byRecency = byResonance.sort((a, b) => 
    new Date(b.mentionedAt).getTime() - new Date(a.mentionedAt).getTime());
  if (byRecency[0].mentionedAt !== byRecency[1]?.mentionedAt)
    return byRecency[0].theme;
  
  // Level 4: детермінований fallback через hash ID
  return byRecency.sort((a, b) => a.id.localeCompare(b.id))[0].theme;
}

function archetypeWeight(archetype: 'sage' | 'ruler' | 'mage'): number {
  return ARCHETYPE_WEIGHTS[archetype]; // { sage: 40, ruler: 35, mage: 25 }
}
```

### 4.3 Content файл (нуль хардкоду в handlers)

```typescript
// backend/src/modules/instagram-planner/content/instagramPlanner.content.ts
import { InstagramRubric } from '@prisma/client';

export const ARCHETYPE_WEIGHTS = {
  sage: 40,
  ruler: 35,
  mage: 25
} as const;

export const RUBRIC_SCHEDULE = [
  { dayOfWeek: 1, rubric: InstagramRubric.SVOIA,        defaultCta: '', goal: 'TRUST' },
  { dayOfWeek: 2, rubric: InstagramRubric.ODNA_DUMKA,   defaultCta: 'STORIES_DIRECT', goal: 'CONVERSION' },
  { dayOfWeek: 3, rubric: InstagramRubric.ZSEREDYNY,    defaultCta: '', goal: 'TRUST' },
  { dayOfWeek: 5, rubric: InstagramRubric.ODNA_DUMKA,   defaultCta: 'COMMENT_QUESTION', goal: 'TRUST' },
  { dayOfWeek: 6, rubric: InstagramRubric.OKHOPLENNIA, defaultCta: 'SAVE_SHARE', goal: 'REACH' },
] as const;

export const CHECKLIST_ITEMS = {
  [InstagramRubric.SVOIA]: [
    'Перші 2 секунди чіпляють без контексту',
    'Total black або один акцентний колір',
    'Погляд: прямо або навмисно вбік',
    'Різкий cut — без плавних переходів',
    'Без пояснень що це за образ',
  ],
  [InstagramRubric.ODNA_DUMKA]: [
    'Починаєш з незручного — без вступу',
    'Одна думка — не список',
    'Є пауза після ключової фрази',
    'Питання в підписі яке провокує відповідь',
  ],
  [InstagramRubric.ZSEREDYNY]: [
    'Знімай в моменті — не готуй заздалегідь',
    'Без фільтрів і корекцій',
    'Підпис: одне речення від себе',
  ],
  [InstagramRubric.OKHOPLENNIA]: [
    'Перша фраза — одразу провокація',
    'Тема: те що більшість думає але мовчить',
    'CTA на збереження в кінці',
  ],
  [InstagramRubric.ROZBYIR]: [
    'Один елемент системи — детально',
    'Від першої особи: «я пройшла через це»',
    'Прямий CTA: «Напиши TEST в директ»',
  ],
  [InstagramRubric.MY_Z_SYNOM]: [
    'Живий непостановочний момент',
    'Підпис пов\'язує момент з системою',
    'Без CTA',
  ],
} as const;

export const MESSAGES = {
  planReady: (weekStart: string) => 
    `✅ Твій контент-план на тиждень з ${weekStart} готовий.\nПереглянь і натисни «Підтвердити».`,
  planConfirmed: '🎯 План підтверджено! Чеклісти для кожної публікації додані.',
  analysisStart: '🔍 Аналізую зідзвони та твій ввід...',
} as const;
```

---

## 5. API ENDPOINTS

```typescript
// POST /api/content-plan/generate
// Body: { coachInput: string, transcriptIds?: string[] }
// → ContentWeekPlan (DRAFT status)

// POST /api/content-plan/:planId/confirm
// → ContentWeekPlan (CONFIRMED status) + checklists populated

// GET /api/content-plan/current
// → ContentWeekPlan з items (для UI)

// PATCH /api/content-plan/item/:itemId
// Body: { status: ItemStatus }
// → ContentPlanItem updated
```

---

## 6. TELEGRAM BOT ІНТЕГРАЦІЯ

```typescript
// Коуч пише боту текст або голос → бот запускає pipeline
coachBot.on('voice', async (ctx) => {
  await ctx.reply(CONTENT.analysisStart);
  const transcript = await transcribeVoice(ctx.message.voice.file_id);
  const plan = await generateAndSavePlan(ctx.from.id, transcript);
  await ctx.reply(CONTENT.planReady(plan.weekStart.toLocaleDateString('uk')), {
    reply_markup: { inline_keyboard: [[
      { text: '👁 Переглянути план', web_app: { url: `${WEB_APP_URL}/planner/${plan.id}` } }
    ]]}
  });
});
```

---

## 7. ФЛОУ ДЛЯ НОВОГО КЛІЄНТСЬКОГО ПРОЕКТУ АНАЛОГІЧНОГО ТИПУ

```
Етап 1 — БРИФ (без зідзвону, тільки форма):
  → Хто ти в блозі (архетипи, % розподіл)
  → Скільки публікацій/тиждень
  → Яка воронка (куди веде контент)
  → Які рубрики та їх графік
  → Чи є Zoom-сесії для аналізу

Етап 2 — ТЗ ДОКУМЕНТ (.docx):
  → Ідентичність + позиція
  → Архетипи + методика подачі
  → Цілі блогу (3 рівні: охоплення / довіра / конверсія)
  → Детальний опис кожної рубрики (РОБИ / НЕ РОБИ / CTA)
  → Воронка (покрокова від холодного до конверсії)
  → Правила подачі (погляд, поза, голос, рух)
  → Візуальна мова (палітра, одяг, зйомка, монтаж)
  → Чеклісти перед публікацією
  → AI автоматизація тижневого плану

Етап 3 — ТЕХНІЧНА РЕАЛІЗАЦІЯ:
  → Prisma схема (ContentWeekPlan, ContentPlanItem, Enums)
  → AI сервіси (transcriptAnalyzer, contentPlan, checklist)
  → API endpoints (generate, confirm, status update)
  → Telegram Bot integration (voice input → plan → web app)
  → React UI (WeeklyPlanView, PlanConfirmButton, ChecklistPanel)

Етап 4 — ЗДАЧА + RETAINER:
  → Vercel (frontend) + Render (backend)
  → Документація для коуча
  → Upsell: analytics dashboard, A/B тест воронки, AI seller
```

---

## 8. ТИПИ (shared між frontend і backend)

```typescript
// packages/types/src/instagram.ts
export interface ContentInsight {
  id: string;
  theme: string;
  keyThought: string;
  archetype: 'sage' | 'ruler' | 'mage';
  archetypeScore: number;
  resonanceCount: number;
  mentionedAt: string;
  suitableRubrics: InstagramRubric[];
}

export interface PlanItem {
  id: string;
  dayOfWeek: number;
  rubric: InstagramRubric;
  theme: string;
  keyThought: string;
  cta: string;
  checklist: ChecklistItem[];
  status: ItemStatus;
}

export interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
}

export interface WeeklyPlan {
  id: string;
  weekStart: Date;
  status: PlanStatus;
  items: PlanItem[];
}
```

---

## 9. СКІЛ ДЛЯ ЗАМОВНИКА (ШАБЛОН НАРАДИ/ЗІДЗВОНУ)

Цей блок — готовий prompt для AI-асистента замовника:

```
SYSTEM PROMPT для AI-агента коуча:
---
Ти AI-асистент коуча {ІМ'Я}. Ти знаєш:
- Архетипи: Мудрець (40%), Правитель (35%), Маг (25%)
- Систему: Стан → Ціль → Вибір → Рішення → Дія
- 6 рубрик: своя (пн), одна думка (пт), зсередини (ср), 
  розбір (1р/міс), охоплення (сб), ми з {дитина} (2р/міс)
- Воронку: Охоплення → Знайомство → Контакт → Тест → {ПРОДУКТ}
- Правила подачі та візуальну мову (детально в базі знань)

Коли коуч наговорює тижневий ввід:
1. Підтверди що отримав ввід
2. Назви 3 ключових інсайти які ти витягнув
3. Запропонуй теми для кожного дня тижня
4. До кожної теми: рубрика / ключова думка / CTA / чеклист
5. Запитай: «Підтверджуєш цей план?»
---
```

---

## 10. ЦІНОУТВОРЕННЯ ТА UPSELL

| Послуга | Опис | Діапазон |
|---|---|---|
| ТЗ документ | .docx з повною стратегією | разова оплата |
| AI Content Bot | Telegram бот + тижневий план | налаштування + retainer |
| Web UI | React плейнер з підтвердженням | налаштування + retainer |
| Transcript Analysis | Інтеграція Zoom → AI | налаштування |
| Analytics Dashboard | Статистика ефективності | upsell після запуску |

**Retainer тригер:** після запуску AI Content Bot → запропонувати аналітику конверсій директ → підписки → продажі.

---

## 11. АРХІТЕКТУРНІ ПРАВИЛА ДЛЯ ЦЬОГО ТИПУ ПРОЕКТІВ

```
✅ Весь copy → *.content.ts (нуль тексту в handlers)
✅ Типи → packages/types (shared frontend ↔ backend)
✅ 4-рівневий tiebreaker при вирішенні конфліктів (архетип → резонанс → давність → hash)
✅ Голосовий ввід → Whisper API → string → той самий pipeline що текст
✅ AI відповіді → завжди з fallback якщо OpenAI недоступний
✅ Плани → зберігати в БД (Prisma) одразу при генерації (DRAFT)
✅ Підтвердження → PATCH status: CONFIRMED + тільки тоді фіксувати
❌ Не зберігати API ключі в коді
❌ Не блокувати Event Loop при аналізі транскриптів (async/await + queue)
❌ Не хардкодити дні тижня — використовувати RUBRIC_SCHEDULE constant
```