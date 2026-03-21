// backend/src/modules/producer/producer.service.ts
// ════════════════════════════════════════════════════════════
// AI-продюсер: генерація повного AI-ментора через OpenAI
// Повний цикл: Trial → Колесо → 2×/день → Аналіз →
//              Мікрозавдання → Афірмації → Тижневий → Місячний
// ════════════════════════════════════════════════════════════

import { prisma } from '../../db/client.js'
import { openai } from '../../lib/openai.js'
import { getPrimaryGoal } from '../goals/service.js'
import type {
  MentorWizardInput,
  MentorPlanResult,
  ProducerChatInput,
  ProducerMentorChatBody,
  AssistantProgressDTO,
} from './types.js'
import { ProductKind } from '@starway/db/prisma-client'

// ─── System промпт продюсера ──────────────────────────────────
export const PRODUCER_SYSTEM = `Ти — AI-продюсер платформи Starway Studio.
Твоя спеціалізація: будувати повні AI-ментори для онлайн-бізнесів.

СТИЛЬ ВІДПОВІДЕЙ:
- Тільки українська мова
- Конкретні готові тексти — не описи того, що треба написати
- Структуровано, з emoji-маркерами
- Кожен блок — готовий до копіювання в Telegram або Notion
- Ніяких "можна спробувати", "рекомендується" — тільки конкретні рішення

ЕКСПЕРТИЗА:
- Колесо балансу: 8 сфер, питання 1-10, динаміка
- Trial-воронки: 7 днів, два рази на день, автоматизація
- AI-аналіз відповідей: патерни, дренажі, готовність до апселу
- Мікрозавдання: персоналізовані, 5-20 хвилин, на базі даних
- Афірмації: від першої особи, теперішній час, конкретна сфера
- Звіти: тижневі PDF з AI-аналізом, місячна динаміка
- Telegram-автоматизація: cron, webhooks, inline buttons`

// ─── Генерація повного плану AI-ментора ──────────────────────
export async function generateMentorPlan(
  input: MentorWizardInput,
): Promise<MentorPlanResult> {

  const prompt = buildMentorPrompt(input)

  const completion = await openai.chat.completions.create({
    model:       'gpt-4o',
    temperature: 0.65,
    max_tokens:  3500,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: PRODUCER_SYSTEM },
      { role: 'user',   content: prompt },
    ],
  })

  const raw = completion.choices[0]?.message?.content ?? '{}'

  try {
    const parsed = JSON.parse(raw)
    return { ...parsed, raw } as MentorPlanResult
  } catch {
    // fallback — якщо не JSON, повертаємо весь текст у raw
    return {
      concept:         extractSection(raw, 'КОНЦЕПЦІЯ'),
      wheelSetup:      extractSection(raw, 'КОЛЕСО'),
      trialSchedule:   extractSection(raw, 'TRIAL'),
      dailyQuestions:  { morning: [], evening: [] },
      analysisLogic:   extractSection(raw, 'АНАЛІЗ'),
      microTaskSystem: extractSection(raw, 'МІКРОЗАВДАННЯ'),
      affirmations:    extractSection(raw, 'АФІРМАЦІЇ'),
      weeklyReport:    extractSection(raw, 'ТИЖНЕВИЙ'),
      monthlyReport:   extractSection(raw, 'МІСЯЧНИЙ'),
      telegramBot:     extractSection(raw, 'TELEGRAM'),
      monetization:    extractSection(raw, 'МОНЕТИЗАЦІЯ'),
      launchPost:      extractSection(raw, 'ПОСТ'),
      raw,
    }
  }
}

// ─── Промпт з усіма 8 кроками ────────────────────────────────
function buildMentorPrompt(d: MentorWizardInput): string {
  const spheres = d.wheelSpheres
    .split(',')
    .map((sphere: string) => sphere.trim())
    .filter(Boolean)

  return `Створи повний AI-ментор за наступними параметрами.
Відповідь — ТІЛЬКИ валідний JSON (без markdown, без \`\`\`).

ПАРАМЕТРИ МЕНТОРА:
Назва: ${d.name}
Аудиторія: ${d.audience}
Трансформація: ${d.transformation}

КОЛЕСО БАЛАНСУ:
Сфери (${spheres.length}): ${spheres.join(' | ')}
Вступне повідомлення: ${d.wheelIntro}

TRIAL 7 ДНІВ:
Ранок о ${d.trialMorningTime}, вечір о ${d.trialEveningTime}
День 1: ${d.trialDay1}
День 4 (дзеркало): ${d.trialDay4}
День 7 (оффер): ${d.trialDay7}

ЩОДЕННІ ПИТАННЯ (після trial):
Ранок: ${d.morningQ1} / ${d.morningQ2} / ${d.morningQ3}
Вечір: ${d.eveningQ1} / ${d.eveningQ2} / ${d.eveningQ3}

AI-АНАЛІЗ:
Фокус: ${d.analysisDepth}
Ескалація: ${d.analysisSignals}
Сигнал апселу: ${d.analysisUpsell}

МІКРОЗАВДАННЯ:
Логіка: ${d.microTaskLogic}
Типи: ${d.microTaskTypes}
Час: до ${d.microTaskTime} хвилин

АФІРМАЦІЇ:
Стиль: ${d.affirmStyle}
Тригер: ${d.affirmTrigger}
Приклад: ${d.affirmExample}

ЗВІТИ:
Тижневий (розділи): ${d.weeklyReportSections}
Місячний (розділи): ${d.monthlyReportSections}
Тон: ${d.reportTone}

JSON СТРУКТУРА ВІДПОВІДІ:
{
  "concept": "2-3 речення суті ментора",

  "wheelSetup": "Повний текст для запуску колеса у Telegram: привітання + інструкція + всі 8 питань з emoji",

  "trialSchedule": "7 днів — текст для кожного дня: ранкове + вечірнє повідомлення",

  "dailyQuestions": {
    "morning": ["питання 1", "питання 2", "питання 3"],
    "evening": ["питання 1", "питання 2", "питання 3"]
  },

  "analysisLogic": "Повна логіка AI: що аналізувати, коли ескалювати, коли пропонувати апсел",

  "microTaskSystem": "Приклади 7 мікрозавдань по кожній сфері колеса з умовами призначення",

  "affirmations": "10 готових афірмацій для цієї аудиторії + логіка персоналізації",

  "weeklyReport": "Структура тижневого PDF: розділи + шаблони текстів AI для кожного",

  "monthlyReport": "Структура місячного звіту: динаміка 4 тижнів + патерни + рекомендація",

  "telegramBot": "Команди: /start /wheel /streak /report /goal + розклад cron-задач",

  "monetization": "Тарифи 299/599/999 + тексти офферів для дня 7 + тригери апселу",

  "launchPost": "Готовий пост для Telegram-каналу для запуску ментора"
}`
}

// ─── Чат з продюсером (з контекстом ментора) ─────────────────
export async function producerChat(input: ProducerChatInput): Promise<string> {
  const contextStr = input.mentorContext
    ? `\nКОНТЕКСТ ПОТОЧНОГО МЕНТОРА:\n${JSON.stringify(input.mentorContext, null, 2)}`
    : ''

  const stepStr = input.stepFocus
    ? `\nФОКУС КРОКУ: ${input.stepFocus}`
    : ''

  const systemPrompt = `${PRODUCER_SYSTEM}${contextStr}${stepStr}`

  const completion = await openai.chat.completions.create({
    model:       'gpt-4o',
    temperature: 0.7,
    max_tokens:  1500,
    messages: [
      { role: 'system', content: systemPrompt },
      ...input.messages.slice(-12),
    ],
  })

  return completion.choices[0]?.message?.content ?? '⚠️ Порожня відповідь'
}

export async function producerMentorChat(userId: string, input: ProducerMentorChatBody): Promise<string> {
  const { message, history = [], stepContext, context } = input

  const [user, streak, lastEntry, wheel, goal, vision, subscription, products, microTasks, progress] =
    await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          trialStartsAt: true,
          trialEndsAt: true,
          onboardingStage: true,
        },
      }),
      prisma.streak.findFirst({ where: { userId }, orderBy: { updatedAt: 'desc' } }),
      prisma.dailyEntry.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' } }),
      prisma.wheelAssessment.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' } }),
      getPrimaryGoal(userId),
      prisma.visionStatement.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: { content: true },
      }),
      prisma.subscription.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: { status: true, planCode: true, trialEndsAt: true },
      }),
      prisma.product.findMany({
        where: { ownerId: userId },
        select: { id: true, name: true, kind: true },
        take: 5,
      }),
      prisma.microTask.findMany({
        where: { userId, isCompleted: false },
        select: { title: true },
        take: 3,
      }),
      prisma.userProgress.findUnique({
        where: { userId },
        select: { level: true, totalPoints: true },
      }),
    ])

  const scoresMap = wheel?.scores as Record<string, number> | undefined
  const avgScore = scoresMap && Object.keys(scoresMap).length > 0
    ? Math.round(Object.values(scoresMap).reduce((left, right) => left + right, 0) / Object.values(scoresMap).length)
    : null
  const weakSphere = scoresMap
    ? Object.entries(scoresMap).sort((left, right) => left[1] - right[1])[0]?.[0] ?? null
    : null

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPERADMIN' || user?.role === 'EXPERT'
  const subStatus = subscription?.status ?? 'none'
  const trialActive = subStatus === 'TRIAL'
  const trialDaysLeft = subscription?.trialEndsAt
    ? Math.max(0, Math.ceil((new Date(subscription.trialEndsAt).getTime() - Date.now()) / 86400000))
    : user?.trialEndsAt
      ? Math.max(0, Math.ceil((new Date(user.trialEndsAt).getTime() - Date.now()) / 86400000))
      : 0
  const hasPaid = subStatus === 'ACTIVE'
  const currentState = lastEntry && typeof lastEntry.state === 'string'
    ? lastEntry.state
    : 'не визначено'
  const productList = products.length
    ? products.map((product: { name: string; kind: ProductKind | null }) => `${product.name} (${product.kind ?? 'без типу'})`).join(', ')
    : 'немає'
  const microTaskList = microTasks.length
    ? microTasks.map((task: { title: string }) => task.title).join(', ')
    : 'немає'

  const systemPrompt = `Ти — AI-Ментор платформи Starway. Твоє ім'я — Starway Mentor.

════ РОЛЬ ════
Ти — не чатбот. Ти — керуючий модуль.
Методологія: СТАН → ЦІЛЬ → ВИБІР → РІШЕННЯ → ДІЯ
Тон: жорстка ясність. Без «ти молодець», без мотивації заради мотивації.
AI фіксує стан — не рятує. AI аналізує вибір — не схвалює.

════ ВОРОНКА ПЛАТФОРМИ ════
1. ЛІДМАГНІТ "5 точок опори" — 5-денний практикум (безкоштовно, /5-tochok)
2. AI-МЕНТОР TRIAL — 7 днів безкоштовно
3. ПІДПИСКА — місяць/рік (повний доступ)

МОДУЛІ ЗА ТАРИФОМ:
▸ Free / Лідмагніт: перегляд, без AI-функцій
▸ Trial (7 днів):
  • Колесо балансу (6 сфер: гроші, реалізація, відносини, енергія, свобода, внутрішня опора)
  • Ранкові питання (3 хв, щоранку) → /dashboard/daily
  • Вечірні питання + рефлексія → /dashboard/daily
  • AI-аналіз відповідей
  • Афірмації під поточний стан
  • Мікрозавдання (конкретні дії 2-5 хв)
  • Дзеркало тижня (день 4 і фінал)
  • Чат з AI-ментором → /dashboard/sessions
▸ Підписка Active:
  • Все з trial + необмежено
  • Бачення → /dashboard/vision
  • Цілі (5 → 1 головна) → /dashboard/goals
  • Модуль вибору і рішень
  • PDF тижневі звіти → /dashboard/reports
  • Zoom-сесії → /dashboard/zoom
  • AI Генератор → /ai-generator
  • AI Продюсер → /producer
  • Пропозиція міні-курсів за патерном
  • Шлях у наставництво (30+ днів стабільності)

════ ПОТОЧНИЙ КОРИСТУВАЧ ════
- Ім'я: ${user?.name ?? 'Користувач'}
- Роль: ${isAdmin ? 'Адміністратор / Експерт' : 'Користувач'}
- Підписка: ${hasPaid ? `Активна (${subscription?.planCode ?? 'paid'})` : trialActive ? `Trial (${trialDaysLeft} дн. залишилось)` : 'Без підписки (free)'}
- Onboarding: ${user?.onboardingStage ?? 'не розпочато'}
- Streak: ${streak?.current ?? 0} днів | Рекорд: ${streak?.longest ?? 0}
- Рівень: ${progress?.level ?? 1} | XP: ${progress?.totalPoints ?? 0}
- Колесо балансу: ${avgScore != null ? `${avgScore}/10` : 'не заповнено'}
- Слабка сфера: ${weakSphere ?? 'невідомо'}
- Поточний стан: ${currentState}
- Головна ціль: ${goal?.text ?? 'не задана'}
- Бачення: ${vision?.content ? `${vision.content.slice(0, 100)}...` : 'не задано'}
- Активні мікрозавдання: ${microTaskList}
- Продукти: ${productList}
${stepContext ? `▸ Контекст кроку: ${stepContext}` : ''}
${context ? `▸ Додатковий контекст: ${context}` : ''}

════ ЛОГІКА ПРОПОЗИЦІЙ (ЖОРСТКО) ════
- Колесо НЕ заповнено → перший крок: /dashboard/wheel
- Ціль не задана → другий крок: /dashboard/goals
- Trial закінчується (≤ 2 дні) → нагадай про підписку 1 раз, конкретно
- Патерн зливу 5+ днів → запропонуй відповідний міні-курс (1 раз за розмову)
- Стабільність 30+ днів → запропонуй наставництво
- Free без підписки → м'яко веди до trial: поясни що отримає
- НЕ пропонуй платне без тригера
- НЕ повторюй пропозицію в тій самій розмові двічі

════ ТВОЯ РОЛЬ ════
${isAdmin
  ? 'Адміністратор/Експерт. Допомагай з технічними аспектами платформи, налаштуванням продуктів, воронок, аналітикою.'
  : !trialActive && !hasPaid
    ? 'Без підписки. М\'яко веди до trial: /dashboard або /5-tochok для старту.'
    : avgScore === null
      ? 'Колесо не заповнено — це перший пріоритет. Запропонуй /dashboard/wheel.'
      : !goal?.text
        ? 'Ціль не задана — другий пріоритет. Запропонуй /dashboard/goals.'
        : 'Допомагай з поточними задачами відповідно до стану і цілей.'
}

════ СТИЛЬ ════
- Мова: ТІЛЬКИ українська
- Коротко: 2-4 речення для простих питань
- Структура: emoji-маркери і нумерація для кроків
- Посилання: формат /dashboard/wheel (без домену)
- Завершення: один конкретний наступний крок або питання
- НЕ вигадуй функцій яких немає в списку модулів вище`

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 600,
    temperature: 0.65,
    messages: [
      { role: 'system', content: systemPrompt },
      ...history.slice(-10),
      { role: 'user', content: message },
    ],
  })

  return completion.choices[0]?.message?.content ?? 'Системна помилка.'
}

// ─── Генерація персональних афірмацій (для scheduler) ────────
export async function generateAffirmation(ctx: {
  userName:    string
  focusSphere: string
  currentGoal: string
  stateScore:  number
}): Promise<string> {
  const completion = await openai.chat.completions.create({
    model:       'gpt-4o',
    temperature: 0.8,
    max_tokens:  80,
    messages: [{
      role: 'user',
      content: `Згенеруй одну персональну афірмацію.
Умови: від першої особи, теперішній час, без "я буду" або "я хочу".
Фокус-сфера: ${ctx.focusSphere}
Ціль: ${ctx.currentGoal}
Поточний стан: ${ctx.stateScore}/10
Максимум 1 речення. Тільки афірмація, без пояснень.`,
    }],
  })
  return completion.choices[0]?.message?.content?.trim() ?? 'Я роблю один крок вперед прямо зараз.'
}

// ─── Генерація мікрозавдання (для scheduler) ─────────────────
export async function generateMicroTask(ctx: {
  focusSphere:  string
  lowestSphere: string
  stateScore:   number
  recentDrains: string[]
  userName:     string
}): Promise<{ title: string; description: string; durationMin: number }> {
  const completion = await openai.chat.completions.create({
    model:       'gpt-4o',
    temperature: 0.75,
    max_tokens:  150,
    response_format: { type: 'json_object' },
    messages: [{
      role: 'user',
      content: `Згенеруй персональне мікрозавдання.
Фокус: ${ctx.focusSphere}, найслабша сфера: ${ctx.lowestSphere}
Стан: ${ctx.stateScore}/10, дренажі тижня: ${ctx.recentDrains.join(', ')}
JSON: { "title": "до 8 слів", "description": "1-2 речення що робити конкретно", "durationMin": число від 5 до 20 }`,
    }],
  })
  try {
    return JSON.parse(completion.choices[0]?.message?.content ?? '{}')
  } catch {
    return { title: 'Одна хвилина тиші', description: 'Сядь зручно, закрий очі, дихай.', durationMin: 5 }
  }
}

// export async function getAssistantProgress(userId: string): Promise<AssistantProgressDTO> {
//   const [funnels, mentorState, productCount, publishedProducts, attachedLink, activeFunnels] =
//     await Promise.all([
//       prisma.funnel.findMany({ where: { ownerId: userId }, orderBy: { createdAt: 'desc' } }),
//       prisma.userAIMentor.findFirst({ where: { userId } }),
//       prisma.product.count({ where: { ownerId: userId } }),
//       prisma.enrollment.count({ where: { product: { ownerId: userId }, purchased: true } }),
//       prisma.funnelProduct.findFirst({
//         where: {
//           funnel: { ownerId: userId },
//           product: { ownerId: userId },
//         },
//         select: { id: true },
//       }),
//       prisma.funnel.count({ where: { ownerId: userId, status: 'active' } }),
//     ])

//   const funnelStage: AssistantProgressDTO['funnelStage'] = funnels.length === 0
//     ? 'not_started'
//     : funnels.some(f => f.status === 'active')
//       ? 'ready'
//       : 'draft'

//   const mentorStage: AssistantProgressDTO['mentorStage'] = mentorState ? 'active' : 'locked'

//   let productStage: AssistantProgressDTO['productStage'] = 'none'
//   if (productCount > 0) {
//     productStage = publishedProducts > 0 ? 'published' : 'draft'
//   }

//   const funnelAttached = Boolean(attachedLink)

//   const distributionStage: AssistantProgressDTO['distributionStage'] = !funnelAttached
//     ? 'none'
//     : activeFunnels > 0
//       ? 'active'
//       : 'planned'

//   let nextRecommendedAction = 'Система активна. Відстежуй результати'
//   if (funnelStage === 'not_started') {
//     nextRecommendedAction = 'Почни з воронки "5 точок" — перегляд 5 відео'
//   } else if (funnelStage === 'draft') {
//     nextRecommendedAction = 'Доглянь воронку до кінця — залишились відео'
//   } else if (mentorStage === 'locked') {
//     nextRecommendedAction = 'Активуй AI-Ментора — спробуй 7 днів безкоштовно'
//   } else if (productStage === 'none') {
//     nextRecommendedAction = 'Створи свій продукт на основі шаблону'
//   } else if (!funnelAttached) {
//     nextRecommendedAction = 'Підключи свій продукт до воронки'
//   } else if (distributionStage === 'none') {
//     nextRecommendedAction = 'Запусти воронку і поділись посиланням'
//   }

//   return {
//     funnelStage,
//     mentorStage,
//     productStage,
//     funnelAttached,
//     distributionStage,
//     nextRecommendedAction,
//   }
// }

// ─── helper ──────────────────────────────────────────────────
function extractSection(text: string, keyword: string): string {
  const regex = new RegExp(`${keyword}[:\\s]+([\\s\\S]*?)(?=\\n[A-ZА-ЯІЇЄ]{3,}|$)`, 'i')
  return text.match(regex)?.[1]?.trim() ?? ''
}


// ─── Типи для SEO/targeting/funnel ───────────────────────────
// (якщо не визначені в types.ts — додати туди)
// import type { SEOInput, SEOResult, TargetingResult, FunnelAnalysis } from './types.js'

// ─── generateSEO ─────────────────────────────────────────────
// export async function generateSEO(input: import('./types.js').SEOInput): Promise<Record<string, unknown>> {
//   const product = await prisma.product.findUnique({
//     where: { id: input.productId },
//     select: { name: true, description: true },
//   })
//   if (!product) throw new Error('Product not found')

//   const completion = await openai.chat.completions.create({
//     model:       'gpt-4o',
//     temperature: 0.6,
//     max_tokens:  800,
//     response_format: { type: 'json_object' },
//     messages: [
//       { role: 'system', content: PRODUCER_SYSTEM },
//       {
//         role: 'user',
//         content: `Згенеруй SEO для продукту.
// Назва: ${product.name}
// Опис: ${product.description ?? ''}
// Тип сторінки: ${input.pageType}
// ${input.keyword ? `Ключове слово: ${input.keyword}` : ''}

// JSON: {
//   "title": "SEO заголовок до 60 символів",
//   "description": "Meta description до 160 символів",
//   "keywords": ["ключ1", "ключ2", "ключ3"],
//   "h1": "Заголовок сторінки",
//   "ogTitle": "Open Graph заголовок",
//   "ogDescription": "Open Graph опис"
// }`,
//       },
//     ],
//   })

//   try {
//     return JSON.parse(completion.choices[0]?.message?.content ?? '{}')
//   } catch {
//     return {}
//   }
// }

// ─── generateTargeting ───────────────────────────────────────
// export async function generateTargeting(productId: string): Promise<Record<string, unknown>> {
//   const product = await prisma.product.findUnique({
//     where: { id: productId },
//     select: { name: true, description: true, audience: true },
//   })
//   if (!product) throw new Error('Product not found')

//   const completion = await openai.chat.completions.create({
//     model:       'gpt-4o',
//     temperature: 0.65,
//     max_tokens:  1000,
//     response_format: { type: 'json_object' },
//     messages: [
//       { role: 'system', content: PRODUCER_SYSTEM },
//       {
//         role: 'user',
//         content: `Згенеруй стратегію таргетингу.
// Продукт: ${product.name}
// Аудиторія: ${product.audience ?? product.description ?? ''}

// JSON: {
//   "primaryAudience": "опис основної аудиторії",
//   "demographics": { "age": "діапазон", "gender": "стать", "location": "гео" },
//   "psychographics": ["характеристика 1", "характеристика 2", "характеристика 3"],
//   "painPoints": ["біль 1", "біль 2", "біль 3"],
//   "adAngles": ["кут реклами 1", "кут реклами 2"],
//   "platforms": ["Instagram", "Telegram"],
//   "hooks": ["хук для реклами 1", "хук для реклами 2"]
// }`,
//       },
//     ],
//   })

//   try {
//     return JSON.parse(completion.choices[0]?.message?.content ?? '{}')
//   } catch {
//     return {}
//   }
// }

// ─── analyzeFunnel ───────────────────────────────────────────
// export async function analyzeFunnel(productId: string): Promise<Record<string, unknown>> {
//   const product = await prisma.product.findUnique({
//     where: { id: productId },
//     include: {
//       funnels: {
//         include: { enrollments: true },
//         take: 5,
//         orderBy: { createdAt: 'desc' },
//       },
//     },
//   })
//   if (!product) throw new Error('Product not found')

//   const funnelData = product.funnels.map(f => ({
//     name:        f.name,
//     status:      f.status,
//     enrollments: f.enrollments?.length ?? 0,
//   }))

//   const completion = await openai.chat.completions.create({
//     model:       'gpt-4o',
//     temperature: 0.6,
//     max_tokens:  1000,
//     response_format: { type: 'json_object' },
//     messages: [
//       { role: 'system', content: PRODUCER_SYSTEM },
//       {
//         role: 'user',
//         content: `Проаналізуй воронки продукту.
// Продукт: ${product.name}
// Воронки: ${JSON.stringify(funnelData)}

// JSON: {
//   "summary": "короткий аналіз стану воронок",
//   "conversionRate": "оцінка конверсії",
//   "bottlenecks": ["вузьке місце 1", "вузьке місце 2"],
//   "recommendations": ["рекомендація 1", "рекомендація 2", "рекомендація 3"],
//   "nextStep": "один конкретний наступний крок"
// }`,
//       },
//     ],
//   })

//   try {
//     return JSON.parse(completion.choices[0]?.message?.content ?? '{}')
//   } catch {
//     return {}
//   }
// }
//========================================================================
// Замінити функцію getAssistantProgress в backend/src/modules/producer/service.ts
// Використовує реальні моделі зі схеми: FivePointsEnrollment, UserAIMentor, Product, FunnelProduct, Funnel

export async function getAssistantProgress(userId: string): Promise<AssistantProgressDTO> {
  const [
    fivePointsEnrollment,
    userMentor,
    productCount,
    publishedEnrollments,
    attachedFunnel,
    activeFunnelCount,
  ] = await Promise.all([
    // Step 1: воронка 5 точок — FivePointsEnrollment
    prisma.fivePointsEnrollment.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { completedAt: true, progress: true },
    }),

    // Step 2: AI ментор активований — UserAIMentor
    prisma.userAIMentor.findFirst({
      where: { userId },
      select: { id: true },
    }),

    // Step 3: продукт створений — Product де ownerId = userId
    prisma.product.count({
      where: { ownerId: userId },
    }),

    // Step 3b: published = є хоча б один Enrollment purchased=true на продукт юзера
    prisma.enrollment.count({
      where: {
        purchased: true,
        product: { ownerId: userId },
      },
    }),

    // Step 4: продукт підключений до воронки — FunnelProduct
    prisma.funnelProduct.findFirst({
      where: {
        funnel: { ownerId: userId },
        product: { ownerId: userId },
      },
      select: { id: true },
    }),

    // Step 5: активна воронка
    prisma.funnel.count({
      where: { ownerId: userId, status: 'active', isActive: true },
    }),
  ])

  // ── funnelStage ──────────────────────────────────────────
  let funnelStage: AssistantProgressDTO['funnelStage'] = 'not_started'
  if (fivePointsEnrollment) {
    funnelStage = fivePointsEnrollment.completedAt ? 'ready' : 'draft'
  }

  // ── mentorStage ──────────────────────────────────────────
  const mentorStage: AssistantProgressDTO['mentorStage'] = userMentor ? 'active' : 'locked'

  // ── productStage ─────────────────────────────────────────
  let productStage: AssistantProgressDTO['productStage'] = 'none'
  if (productCount > 0) {
    productStage = publishedEnrollments > 0 ? 'published' : 'draft'
  }

  // ── funnelAttached ───────────────────────────────────────
  const funnelAttached = Boolean(attachedFunnel)

  // ── distributionStage ────────────────────────────────────
  let distributionStage: AssistantProgressDTO['distributionStage'] = 'none'
  if (funnelAttached) {
    distributionStage = activeFunnelCount > 0 ? 'active' : 'planned'
  }

  // ── nextRecommendedAction ────────────────────────────────
  let nextRecommendedAction = 'Система активна. Відстежуй результати'

  if (funnelStage === 'not_started') {
    nextRecommendedAction = 'Почни з воронки "5 точок" — перегляд 5 відео'
  } else if (funnelStage === 'draft') {
    nextRecommendedAction = 'Доглянь воронку до кінця — залишились відео'
  } else if (mentorStage === 'locked') {
    nextRecommendedAction = 'Активуй AI-Ментора — спробуй 7 днів безкоштовно'
  } else if (productStage === 'none') {
    nextRecommendedAction = 'Створи свій продукт на основі шаблону'
  } else if (!funnelAttached) {
    nextRecommendedAction = 'Підключи свій продукт до воронки'
  } else if (distributionStage === 'none') {
    nextRecommendedAction = 'Запусти воронку і поділись посиланням'
  }

  return {
    funnelStage,
    mentorStage,
    productStage,
    funnelAttached,
    distributionStage,
    nextRecommendedAction,
  }
}

// ─── analyzeFunnel ───────────────────────────────────────────
// Product не має прямого relayшну funnels — беремо через FunnelProduct
export async function analyzeFunnel(productId: string): Promise<Record<string, unknown>> {
  const product = await prisma.product.findUnique({
    where:  { id: productId },
    select: { name: true, description: true },
  })
  if (!product) throw new Error('Product not found')

  const funnelLinks = await prisma.funnelProduct.findMany({
    where:   { productId },
    include: {
      funnel: {
        select: { name: true, status: true, isActive: true, createdAt: true },
      },
    },
    take: 5,
  })

  const funnelData = funnelLinks.map((fp: {
    funnel: { name: string; status: string; isActive: boolean }
  }) => ({
    name:     fp.funnel.name,
    status:   fp.funnel.status,
    isActive: fp.funnel.isActive,
  }))

  const completion = await openai.chat.completions.create({
    model:           'gpt-4o',
    temperature:     0.6,
    max_tokens:      1000,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: PRODUCER_SYSTEM },
      {
        role:    'user',
        content: `Проаналізуй воронки продукту.
Продукт: ${product.name}
Опис: ${product.description ?? '—'}
Воронки: ${JSON.stringify(funnelData)}

JSON: {
  "summary": "короткий аналіз стану воронок",
  "conversionRate": "оцінка конверсії",
  "bottlenecks": ["вузьке місце 1", "вузьке місце 2"],
  "recommendations": ["рекомендація 1", "рекомендація 2", "рекомендація 3"],
  "nextStep": "один конкретний наступний крок"
}`,
      },
    ],
  })

  try {
    return JSON.parse(completion.choices[0]?.message?.content ?? '{}')
  } catch {
    return {}
  }
}

// ─── generateSEO ─────────────────────────────────────────────
export async function generateSEO(input: import('./types.js').SEOInput): Promise<Record<string, unknown>> {
  const product = await prisma.product.findUnique({
    where:  { id: input.productId },
    select: { name: true, description: true },
  })
  if (!product) throw new Error('Product not found')

  const completion = await openai.chat.completions.create({
    model:           'gpt-4o',
    temperature:     0.6,
    max_tokens:      800,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: PRODUCER_SYSTEM },
      {
        role:    'user',
        content: `Згенеруй SEO для продукту.
Назва: ${product.name}
Опис: ${product.description ?? ''}
Тип сторінки: ${input.pageType}
${input.keyword ? `Ключове слово: ${input.keyword}` : ''}

JSON: {
  "title": "SEO заголовок до 60 символів",
  "description": "Meta description до 160 символів",
  "keywords": ["ключ1", "ключ2", "ключ3"],
  "h1": "Заголовок сторінки",
  "ogTitle": "Open Graph заголовок",
  "ogDescription": "Open Graph опис"
}`,
      },
    ],
  })

  try {
    return JSON.parse(completion.choices[0]?.message?.content ?? '{}')
  } catch {
    return {}
  }
}

// ─── generateTargeting ───────────────────────────────────────
// Product не має поля audience — беремо з ProducerConfig
export async function generateTargeting(productId: string): Promise<Record<string, unknown>> {
  const product = await prisma.product.findUnique({
    where:   { id: productId },
    include: { producerConfig: true },
    // producerConfig має: niche, targetAudience, utp
  })
  if (!product) throw new Error('Product not found')

  const audience = product.producerConfig?.targetAudience ?? product.description ?? ''
  const niche    = product.producerConfig?.niche ?? ''

  const completion = await openai.chat.completions.create({
    model:           'gpt-4o',
    temperature:     0.65,
    max_tokens:      1000,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: PRODUCER_SYSTEM },
      {
        role:    'user',
        content: `Згенеруй стратегію таргетингу.
Продукт: ${product.name}
Ніша: ${niche}
Аудиторія: ${audience}

JSON: {
  "primaryAudience": "опис основної аудиторії",
  "demographics": { "age": "діапазон", "gender": "стать", "location": "гео" },
  "psychographics": ["характеристика 1", "характеристика 2", "характеристика 3"],
  "painPoints": ["біль 1", "біль 2", "біль 3"],
  "adAngles": ["кут реклами 1", "кут реклами 2"],
  "platforms": ["Instagram", "Telegram"],
  "hooks": ["хук для реклами 1", "хук для реклами 2"]
}`,
      },
    ],
  })

  try {
    return JSON.parse(completion.choices[0]?.message?.content ?? '{}')
  } catch {
    return {}
  }
}
