import { openai } from '../../../lib/openai.js'
import type { ResearchConfig,ResearchPlatform } from './types.js'

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

export const RESEARCH_CONFIGS: ResearchConfig[] = [
  { type: 'hooks', platform: 'instagram', prompt: buildHooksPrompt('instagram') },
  { type: 'ads', platform: 'instagram', prompt: buildAdsPrompt('instagram') },
  { type: 'formulas', platform: 'instagram', prompt: buildFormulasPrompt() },
  { type: 'reels_trends', platform: 'instagram', prompt: buildReelsTrendsPrompt() },
]

function sanitizeJsonResponse(content: string) {
  return content.replace(/```json|```/g, '').trim()
}

export async function generateResearch(config: ResearchConfig) {
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
