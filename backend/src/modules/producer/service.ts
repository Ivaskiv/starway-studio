// backend/src/modules/producer/producer.service.ts
// ════════════════════════════════════════════════════════════
// AI-продюсер: генерація повного AI-ментора через OpenAI
// Повний цикл: Trial → Колесо → 2×/день → Аналіз →
//              Мікрозавдання → Афірмації → Тижневий → Місячний
// ════════════════════════════════════════════════════════════

import { prisma } from '../../db/client.js'
import { openai } from '../../lib/openai.js'
import type {
  MentorWizardInput,
  MentorPlanResult,
  ProducerChatInput,
  AssistantProgressDTO,
} from './types.js'

// ─── System промпт продюсера ──────────────────────────────────
const PRODUCER_SYSTEM = `Ти — AI-продюсер платформи Starway Studio.
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