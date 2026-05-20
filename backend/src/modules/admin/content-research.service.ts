import type { Prisma } from '@starway/db/prisma-client'
import { prisma } from '../../db/client.js'
import { openai } from '../../lib/openai.js'

type ResearchType = 'hooks' | 'ads' | 'formulas' | 'reels_trends'
type ResearchPlatform = 'instagram' | 'meta_ads' | 'tiktok' | 'youtube'

type ResearchConfig = {
  type: ResearchType
  platform: ResearchPlatform
  prompt: string
}

type CachedEnvelope<TData> = {
  data: TData
  generatedAt: string
  isStale: boolean
  isFallback: boolean
  source: 'openai' | 'cache' | 'fallback'
}

type HookRecord = {
  id: string
  type: string
  example: string
  why: string
  watchTimeBoost: number
  ctrBoost: number
  source: string
  bestFor: string[]
  platforms: string[]
  formula: string
  month: string
  year: string
}

type CampaignRecord = {
  id: string
  brand: string
  hook: string
  formula: string
  hookType: string
  metric: string
  metricValue: number
  metricType: string
  description: string
  audienceTemp: string
  platform: string
  format: string
  month: string
  year: string
}

type FormulaRecord = {
  id: string
  name: string
  fullName: string
  conversionBoost: number
  bestFor: string
  worstFor: string
  steps: string[]
  example: string
  rank: number
  trending: boolean
  month: string
  year: string
}

type TrendRecord = {
  id: string
  format: string
  hookText: string
  watchTimeBoost: number
  description: string
  duration: string
  structure: string[]
  example: string
  trending: boolean
  month: string
  year: string
}

function getCurrentMonthYear() {
  return {
    month: String(new Date().getMonth() + 1),
    year: String(new Date().getFullYear()),
  }
}

function buildFallbackResearch(config: ResearchConfig) {
  const { month, year } = getCurrentMonthYear()

  if (config.type === 'hooks') {
    return {
      hooks: [
        {
          id: 'reframe_1',
          type: 'reframe',
          example: 'Ти стараєшся все втримати, але всередині вже давно немає ресурсу.',
          why: 'Знімає провину → будує довіру → показує простий перший крок.',
          watchTimeBoost: 42,
          ctrBoost: 0,
          source: 'Coaching niche synthetic benchmark',
          bestFor: ['BOFU', 'warm_audience'],
          platforms: ['instagram', 'meta_ads'],
          formula: 'PAS',
          month,
          year,
        },
        {
          id: 'story_1',
          type: 'story',
          example: 'Тобі знайоме це відчуття о 23:58?',
          why: 'Конкретна деталь + знайоме відчуття зупиняють скрол і ведуть у зміну стану.',
          watchTimeBoost: 38,
          ctrBoost: 0,
          source: 'Storytelling coaching benchmark',
          bestFor: ['MOFU', 'warm_audience'],
          platforms: ['instagram'],
          formula: 'PAS',
          month,
          year,
        },
        {
          id: 'data_1',
          type: 'data',
          example: 'Коли руху нема, цифри показують де саме ламається шлях.',
          why: 'Specificity + credibility працюють, коли цифри ведуть до зрозумілого кроку.',
          watchTimeBoost: 27,
          ctrBoost: 27,
          source: 'Performance ad benchmark',
          bestFor: ['MOFU', 'cold_audience'],
          platforms: ['instagram', 'meta_ads'],
          formula: 'AIDA',
          month,
          year,
        },
        {
          id: 'gap_1',
          type: 'gap',
          example: 'Більшість здаються. Ось що допомагає не зірватися.',
          why: 'Відкрита петля тримає увагу, коли є знайоме впізнавання і обіцянка простого виходу.',
          watchTimeBoost: 31,
          ctrBoost: 0,
          source: 'Curiosity-gap short video benchmark',
          bestFor: ['TOFU', 'cold_audience'],
          platforms: ['instagram'],
          formula: 'BAB',
          month,
          year,
        },
        {
          id: 'question_1',
          type: 'question',
          example: 'Ти ведеш щоденник чи просто гасиш пожежі?',
          why: 'Питання одразу включає людину в самодіагностику.',
          watchTimeBoost: 24,
          ctrBoost: 12,
          source: 'Direct response coaching prompt bank',
          bestFor: ['TOFU', 'warm_audience'],
          platforms: ['instagram'],
          formula: 'BAB',
          month,
          year,
        },
        {
          id: 'contradiction_1',
          type: 'contradiction',
          example: 'Проблема не в мотивації. Проблема в системі.',
          why: 'Контраст ламає стару рамку і веде в новий кут подачі.',
          watchTimeBoost: 29,
          ctrBoost: 15,
          source: 'Contrarian coaching hooks',
          bestFor: ['BOFU', 'warm_audience'],
          platforms: ['instagram', 'meta_ads'],
          formula: 'PAS',
          month,
          year,
        },
        {
          id: 'before_after_1',
          type: 'before_after',
          example: 'Ще вчора: хаос. Через 7 днів: структура, стрік, результат.',
          why: 'До/після швидко продає відчутну зміну.',
          watchTimeBoost: 26,
          ctrBoost: 18,
          source: 'Transformation reels benchmark',
          bestFor: ['BOFU', 'warm_audience'],
          platforms: ['instagram'],
          formula: 'BAB',
          month,
          year,
        },
        {
          id: 'social_proof_1',
          type: 'social_proof',
          example: '24 учні вже зібрали собі систему без хаосу.',
          why: 'Соціальний доказ зменшує недовіру на вході.',
          watchTimeBoost: 19,
          ctrBoost: 21,
          source: 'Coaching social proof benchmark',
          bestFor: ['MOFU', 'BOFU'],
          platforms: ['instagram', 'meta_ads'],
          formula: '4P',
          month,
          year,
        },
      ],
    }
  }

  if (config.type === 'ads') {
    return {
      campaigns: [
        {
          id: 'campaign_storytelling',
          brand: 'Coaching brand',
          hook: 'Тобі знайоме це відчуття о 23:58?',
          formula: 'PAS',
          hookType: 'story',
          metric: 'CTR +38%',
          metricValue: 38,
          metricType: 'ctr',
          description: 'Конкретний момент і знайоме відчуття зупиняють скрол. Потім — коротке впізнавання, спокій і міст до рішення.',
          audienceTemp: 'warm',
          platform: config.platform,
          format: 'reels',
          month,
          year,
        },
        {
          id: 'campaign_reframe',
          brand: 'Self-dev coaching',
          hook: 'Ти тягнеш усе сама, і саме це виснажує найбільше.',
          formula: 'PAS',
          hookType: 'reframe',
          metric: 'Watch time +42%',
          metricValue: 42,
          metricType: 'watch_time',
          description: 'Спочатку знімаємо самозвинувачення, потім будуємо довіру і показуємо перший зрозумілий крок.',
          audienceTemp: 'warm',
          platform: config.platform,
          format: 'reels',
          month,
          year,
        },
        {
          id: 'campaign_data',
          brand: 'Health-tech coaching',
          hook: 'Коли руху нема, цифри показують де саме ламається шлях.',
          formula: 'AIDA',
          hookType: 'data',
          metric: 'CTR +27%',
          metricValue: 27,
          metricType: 'ctr',
          description: 'Специфічна цифра зупиняє більше, ніж округлена. Дані працюють, коли вони ведуть до зрозумілого кроку.',
          audienceTemp: 'cold',
          platform: config.platform,
          format: 'meta_ad',
          month,
          year,
        },
        {
          id: 'campaign_gap',
          brand: 'Coaching niche',
          hook: 'Більшість здаються. Ось що допомагає не зірватися.',
          formula: 'BAB',
          hookType: 'gap',
          metric: 'Watch time +31%',
          metricValue: 31,
          metricType: 'watch_time',
          description: 'Open loop тримає увагу, коли всередині є знайоме впізнавання і обіцянка простого виходу.',
          audienceTemp: 'cold',
          platform: config.platform,
          format: 'reels',
          month,
          year,
        },
        {
          id: 'campaign_fab',
          brand: 'Productivity mentor',
          hook: 'AI нагадує тобі не просто задачу, а простий наступний крок.',
          formula: 'FAB',
          hookType: 'feature',
          metric: 'Leads +22%',
          metricValue: 22,
          metricType: 'leads',
          description: 'Раціональна подача через користь продукту добре працює на теплій аудиторії.',
          audienceTemp: 'warm',
          platform: config.platform,
          format: 'feed',
          month,
          year,
        },
        {
          id: 'campaign_stack',
          brand: 'Premium mentoring',
          hook: 'Reels + DM + Bot + Trial → один зрозумілий маршрут до оплати.',
          formula: 'STACK',
          hookType: 'contradiction',
          metric: 'ROAS 3.8x',
          metricValue: 3.8,
          metricType: 'roas',
          description: 'Стекова логіка добре заходить, коли продаємо не один пост, а систему продажів.',
          audienceTemp: 'hot',
          platform: config.platform,
          format: 'meta_ad',
          month,
          year,
        },
      ],
    }
  }

  if (config.type === 'formulas') {
    return {
      formulas: [
        {
          id: 'pas',
          name: 'PAS',
          fullName: 'Problem · Agitate · Solution',
          conversionBoost: 42,
          bestFor: 'BOFU, warm audience, coaching',
          worstFor: 'very cold awareness traffic',
          steps: ['P: проблема', 'A: посилення', 'S: рішення'],
          example: 'Ти стараєшся, але результат усе ще не приходить. ABsystem збирає систему за тебе.',
          rank: 1,
          trending: true,
          month,
          year,
        },
        {
          id: 'aida',
          name: 'AIDA',
          fullName: 'Attention · Interest · Desire · Action',
          conversionBoost: 34,
          bestFor: 'cold ads, awareness',
          worstFor: 'короткий BOFU добір',
          steps: ['A: увага', 'I: інтерес', 'D: бажання', 'A: дія'],
          example: 'Стоп. Це про тебе, якщо день знову розсипається. Спробуй 7 днів і відчуй різницю сама.',
          rank: 2,
          trending: true,
          month,
          year,
        },
        {
          id: 'bab',
          name: 'BAB',
          fullName: 'Before · After · Bridge',
          conversionBoost: 29,
          bestFor: 'stories, reels, transformation',
          worstFor: 'сухі технічні офери',
          steps: ['Before', 'After', 'Bridge'],
          example: 'Ще вчора: хаос і ручна тяганина. Через 7 днів: ритм, ясність і відчуття контролю.',
          rank: 3,
          trending: true,
          month,
          year,
        },
        {
          id: 'fab',
          name: 'FAB',
          fullName: 'Feature · Advantage · Benefit',
          conversionBoost: 24,
          bestFor: 'раціональні сегменти',
          worstFor: 'емоційний прогрів',
          steps: ['Feature', 'Advantage', 'Benefit'],
          example: 'AI аналізує твій стан щодня. Результат — не губиш ритм.',
          rank: 4,
          trending: false,
          month,
          year,
        },
        {
          id: '4p',
          name: '4P',
          fullName: 'Promise · Picture · Proof · Push',
          conversionBoost: 22,
          bestFor: 'соціальний доказ і прогрів',
          worstFor: 'дуже короткі hooks',
          steps: ['Promise', 'Picture', 'Proof', 'Push'],
          example: 'Я покажу, як вийти із застою без зайвого шуму. Люди вже проходять цей маршрут і не починають з нуля.',
          rank: 5,
          trending: false,
          month,
          year,
        },
        {
          id: 'stack',
          name: 'STACK',
          fullName: 'PAS + FAB + CTA',
          conversionBoost: 34,
          bestFor: 'комплексні пакети і funnel-sale',
          worstFor: 'простий single-offer lead magnet',
          steps: ['Problem', 'Offer stack', 'Proof', 'CTA'],
          example: 'Спочатку зачіпаємо біль, потім швидко показуємо рішення і закриваємо простим CTA.',
          rank: 6,
          trending: true,
          month,
          year,
        },
      ],
    }
  }

  return {
    trends: [
      {
        id: 'trend_direct',
        format: 'Direct-to-camera',
        hookText: 'Ти стараєшся все тримати під контролем, але сил уже не вистачає.',
        watchTimeBoost: 38,
        description: 'Короткий прямий початок без заставок і складного монтажу.',
        duration: '15-30 sec',
        structure: ['0-3 sec: hook', '3-12 sec: body', '12-15 sec: CTA'],
        example: 'Reels про хаос, структуру і 7-денний trial.',
        trending: true,
        month,
        year,
      },
      {
        id: 'trend_story',
        format: 'Micro-story',
        hookText: 'Тобі знайоме це відчуття о 23:58?',
        watchTimeBoost: 36,
        description: 'Особиста сцена добре тримає увагу в coaching ніші.',
        duration: '20-35 sec',
        structure: ['story hook', 'insight', 'offer'],
        example: 'Кейс учениці, яка зібрала систему за 7 днів.',
        trending: true,
        month,
        year,
      },
      {
        id: 'trend_data',
        format: 'Data-first reels',
        hookText: 'Коли руху нема, цифри показують де саме ламається шлях.',
        watchTimeBoost: 27,
        description: 'Цифра + питання швидко зупиняє скрол.',
        duration: '15-25 sec',
        structure: ['data', 'meaning', 'CTA'],
        example: 'Метрика звички й дисципліни через ABsystem.',
        trending: true,
        month,
        year,
      },
      {
        id: 'trend_curiosity',
        format: 'Curiosity loop',
        hookText: 'Більшість здаються. Ось що допомагає не зірватися.',
        watchTimeBoost: 31,
        description: 'Open loop підходить для прогріву й переходу в DM.',
        duration: '12-20 sec',
        structure: ['gap', 'bridge', 'CTA'],
        example: 'Чому одні тримають стрік, а інші ні.',
        trending: true,
        month,
        year,
      },
      {
        id: 'trend_checklist',
        format: 'Checklist visual',
        hookText: '3 сигнали, що в тебе не проблема з контентом, а з системою',
        watchTimeBoost: 24,
        description: 'Списки дають швидку ясність і добре працюють у B2C coaching.',
        duration: '20-30 sec',
        structure: ['headline', '3 points', 'CTA'],
        example: 'Checklist для експерта перед запуском funnel.',
        trending: false,
        month,
        year,
      },
      {
        id: 'trend_overlay',
        format: 'Subtitle-led reel',
        hookText: 'Коли ти постиш, але заявок немає',
        watchTimeBoost: 22,
        description: 'Сильні субтитри витягують слабший відеоряд.',
        duration: '15-30 sec',
        structure: ['title', 'subtitles', 'CTA'],
        example: 'Reels з мінімальним монтажем і сильним меседжем.',
        trending: false,
        month,
        year,
      },
    ],
  }
}

function shouldUseFallbackResearch(error: unknown) {
  if (!(error instanceof Error)) return true
  return /429|quota|rate limit|timeout|network|fetch/i.test(error.message)
}

export type MarketResearchPayload = {
  hooks: CachedEnvelope<{ hooks: HookRecord[] }> | null
  ads: CachedEnvelope<{ campaigns: CampaignRecord[] }> | null
  formulas: CachedEnvelope<{ formulas: FormulaRecord[] }> | null
  reelsTrends: CachedEnvelope<{ trends: TrendRecord[] }> | null
}

let activeRefreshPromise: Promise<{ success: boolean; updated: number; errors: string[] }> | null = null
let marketResearchTableAvailable: boolean | null = null

async function ensureMarketResearchTableAvailable() {
  if (marketResearchTableAvailable !== null) return marketResearchTableAvailable

  const rows = await prisma.$queryRaw<Array<{ exists: boolean }>>`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = 'MarketResearchCache'
    ) AS "exists"
  `

  marketResearchTableAvailable = rows[0]?.exists === true
  return marketResearchTableAvailable
}

function buildHooksPrompt(platform: ResearchPlatform): string {
  const currentDate = new Date().toLocaleDateString('uk-UA', {
    month: 'long',
    year: 'numeric',
  })

  return `Ти — senior performance copywriter для SaaS coaching-платформи Starway Studio.

Сьогодні ${currentDate}. Проаналізуй найефективніші рекламні хуки для платформи ${platform} у ніші coaching / self-improvement / personal development.
Пиши hooks як дзеркало для користувача: спочатку впізнавання стану, потім емоція, потім мікро-надія і короткий міст до дії.
Уникай заїжджених штампів на кшталт "Вона написала мені..." або сухих бізнес-звітів.

Поверни тільки JSON:
{
  "hooks": [
    {
      "id": "reframe_1",
      "type": "reframe",
      "example": "Ти стараєшся все тримати під контролем, але сил уже не вистачає.",
      "why": "Знімає провину, будує довіру і дає людині перший зрозумілий крок.",
      "watchTimeBoost": 42,
      "ctrBoost": 0,
      "source": "Meta Ads coaching niche analysis",
      "bestFor": ["BOFU", "warm_audience"],
      "platforms": ["instagram", "meta_ads"],
      "formula": "PAS",
      "month": "${new Date().getMonth() + 1}",
      "year": "${new Date().getFullYear()}"
    }
  ]
}

Вимоги:
- рівно 8 хуків
- типи тільки: reframe, story, data, gap, question, contradiction, before_after, social_proof
- усі тексти українською
- реалістичні marketing metrics
- bestFor включає етап воронки та temperature аудиторії`
}

function buildAdsPrompt(platform: ResearchPlatform): string {
  const currentDate = new Date().toLocaleDateString('uk-UA', {
    month: 'long',
    year: 'numeric',
  })

  return `Ти — performance marketer з великим досвідом у coaching/personal development ніші.

Сьогодні ${currentDate}. Проаналізуй найефективніші рекламні кампанії у coaching/self-improvement для платформи ${platform}.
Hook має звучати як дзеркало для користувача: впізнавання, емоція, мікро-надія, міст до дії.
Не використовуй штампи на кшталт "Вона написала мені..." або "ти перевантажена" без нового кута.

Поверни тільки JSON:
{
  "campaigns": [
    {
      "id": "campaign_1",
      "brand": "Coaching brand",
      "hook": "Ти тягнеш усе сама, і саме це виснажує найбільше.",
      "formula": "PAS",
      "hookType": "reframe",
      "metric": "CTR +38%",
      "metricValue": 38,
      "metricType": "ctr",
      "description": "Чому реклама спрацювала психологічно",
      "audienceTemp": "warm",
      "platform": "${platform}",
      "format": "reels",
      "month": "${new Date().getMonth() + 1}",
      "year": "${new Date().getFullYear()}"
    }
  ]
}

Вимоги:
- рівно 6 кампаній
- різні формули: PAS, AIDA, BAB, FAB, 4P, STACK
- різні hookType
- українська мова
- конкретні психологічні пояснення`
}

function buildFormulasPrompt(): string {
  const currentDate = new Date().toLocaleDateString('uk-UA', {
    month: 'long',
    year: 'numeric',
  })

  return `Ти — copy strategist у ніші coaching/self-improvement.

Сьогодні ${currentDate}. Оціни ефективність формул копірайтингу для coaching-пакетів в Україні.

Поверни тільки JSON:
{
  "formulas": [
    {
      "id": "pas",
      "name": "PAS",
      "fullName": "Problem · Agitate · Solution",
      "conversionBoost": 42,
      "bestFor": "BOFU, warm audience, coaching",
      "worstFor": "cold traffic, broad awareness",
      "steps": ["Problem", "Agitate", "Solution"],
      "example": "Ти стараєшся, але результат усе ще не приходить. ABsystem збирає систему за тебе.",
      "rank": 1,
      "trending": true,
      "month": "${new Date().getMonth() + 1}",
      "year": "${new Date().getFullYear()}"
    }
  ]
}

Включи рівно 6 формул: PAS, AIDA, BAB, FAB, 4P, STACK.
Пиши приклади живою мовою ментора/коуча: впізнавання користувача, емоція, мікро-надія і міст до дії. Без сухих бізнес-формулювань і без “експертського звіту”.
Ранжуй від найефективнішої до найслабшої.`
}

function buildReelsTrendsPrompt(): string {
  const currentDate = new Date().toLocaleDateString('uk-UA', {
    month: 'long',
    year: 'numeric',
  })

  return `Ти — SMM strategist для short-form video у coaching/self-improvement ніші.

Сьогодні ${currentDate}. Які формати Reels і hook-подачі зараз найкраще працюють для coaching брендів?
Hook має бути user-centric: стан користувача, емоція, мікро-надія і зрозумілий наступний крок.
Уникай заїжджених штампів та бізнес-опису замість людського відчуття.

Поверни тільки JSON:
{
  "trends": [
    {
      "id": "trend_1",
      "format": "Direct-to-camera",
      "hookText": "Ти стараєшся все тримати під контролем, але сил уже не вистачає.",
      "watchTimeBoost": 38,
      "description": "Чому формат зараз працює",
      "duration": "15-30 sec",
      "structure": ["0-3 sec hook", "3-12 sec body", "12-15 sec CTA"],
      "example": "Приклад для coaching ніші",
      "trending": true,
      "month": "${new Date().getMonth() + 1}",
      "year": "${new Date().getFullYear()}"
    }
  ]
}

Включи рівно 6 трендів. Усі тексти українською.`
}

const RESEARCH_CONFIGS: ResearchConfig[] = [
  { type: 'hooks', platform: 'instagram', prompt: buildHooksPrompt('instagram') },
  { type: 'ads', platform: 'instagram', prompt: buildAdsPrompt('instagram') },
  { type: 'formulas', platform: 'instagram', prompt: buildFormulasPrompt() },
  { type: 'reels_trends', platform: 'instagram', prompt: buildReelsTrendsPrompt() },
]

function sanitizeJsonResponse(content: string) {
  return content.replace(/```json|```/g, '').trim()
}

async function generateResearch(config: ResearchConfig) {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: 'You generate structured market research JSON for a coaching SaaS. Output valid JSON only.',
      },
      {
        role: 'user',
        content: config.prompt,
      },
    ],
  })

  const raw = response.choices[0]?.message?.content ?? '{}'
  return JSON.parse(sanitizeJsonResponse(raw))
}

function getValidUntil(days = 30) {
  const next = new Date()
  next.setDate(next.getDate() + days)
  return next
}

function toCachedEnvelope<TData>(record: { data: unknown; generatedAt: Date; model?: string | null }): CachedEnvelope<TData> {
  const isFallback = Boolean(record.model?.startsWith('fallback:'))
  return {
    data: record.data as TData,
    generatedAt: record.generatedAt.toISOString(),
    isStale: Date.now() - record.generatedAt.getTime() > 25 * 24 * 60 * 60 * 1000,
    isFallback,
    source: isFallback ? 'fallback' : 'openai',
  }
}

export async function refreshMarketResearch() {
  if (!(await ensureMarketResearchTableAvailable())) {
    return {
      success: false,
      updated: 0,
      errors: ['market_research_cache_table_missing'],
    }
  }

  if (activeRefreshPromise) return activeRefreshPromise

  activeRefreshPromise = (async () => {
    const errors: string[] = []
    let updated = 0
    const validUntil = getValidUntil(30)

    for (const config of RESEARCH_CONFIGS) {
      try {
        let data: unknown
        let model = 'gpt-4o-mini'

        try {
          data = await generateResearch(config)
        } catch (error) {
          if (!shouldUseFallbackResearch(error)) {
            throw error
          }
          data = buildFallbackResearch(config)
          model = 'fallback:gpt-4o-mini'
          errors.push(
            `${config.type}/${config.platform}: fallback_used_due_to_${error instanceof Error ? error.message : 'unknown_error'}`,
          )
        }

        await prisma.marketResearchCache.updateMany({
          where: {
            type: config.type,
            platform: config.platform,
            niche: 'coaching_personal_dev',
          },
          data: {
            validUntil: new Date(0),
          },
        })

        await prisma.marketResearchCache.create({
          data: {
            type: config.type,
            platform: config.platform,
            niche: 'coaching_personal_dev',
            data: data as Prisma.InputJsonValue,
            generatedAt: new Date(),
            validUntil,
            promptUsed: config.prompt.slice(0, 1000),
            model,
          },
        })

        updated += 1
        await new Promise((resolve) => setTimeout(resolve, 1000))
      } catch (error) {
        errors.push(
          `${config.type}/${config.platform}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        )
      }
    }

    return {
      success: errors.length === 0,
      updated,
      errors,
    }
  })()

  try {
    return await activeRefreshPromise
  } finally {
    activeRefreshPromise = null
  }
}

export async function getResearchData<TData>(type: ResearchType, platform: ResearchPlatform = 'instagram') {
  if (!(await ensureMarketResearchTableAvailable())) {
    return null
  }

  const record = await prisma.marketResearchCache.findFirst({
    where: {
      type,
      platform,
      validUntil: { gt: new Date() },
    },
    orderBy: {
      generatedAt: 'desc',
    },
  })

  return record ? toCachedEnvelope<TData>(record) : null
}

async function ensureResearchSeeded() {
  if (!(await ensureMarketResearchTableAvailable())) return

  const count = await prisma.marketResearchCache.count({
    where: {
      validUntil: { gt: new Date() },
    },
  })

  if (count > 0) return
  await refreshMarketResearch()
}

export async function getAllResearchData(): Promise<MarketResearchPayload> {
  await ensureResearchSeeded()

  const [hooks, ads, formulas, reelsTrends] = await Promise.all([
    getResearchData<{ hooks: HookRecord[] }>('hooks', 'instagram'),
    getResearchData<{ campaigns: CampaignRecord[] }>('ads', 'instagram'),
    getResearchData<{ formulas: FormulaRecord[] }>('formulas', 'instagram'),
    getResearchData<{ trends: TrendRecord[] }>('reels_trends', 'instagram'),
  ])

  return { hooks, ads, formulas, reelsTrends }
}
