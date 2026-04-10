import type {
  ContentStudioAIStrategy,
  ContentStudioItem,
  ContentStudioGoal,
  ContentStudioStrategy,
  ContentItemType,
  ContentStudioInputs,
} from '../types/contentStudio.types'
import { BANNER_VARIANT_PRESETS } from '../config/contentStudio.config'

function createId(type: ContentItemType, index: number) {
  return `${type}-${index + 1}`
}

function createTimestamp() {
  return new Date().toISOString()
}

function pick<T>(items: T[], index: number) {
  return items[index % items.length]
}

const REEL_HOOKS = [
  'Ти втрачаєш клієнтів і навіть не бачиш де саме.',
  'У тебе не проблема з контентом. У тебе проблема з системою.',
  'Хаос у продажах починається не в DM, а значно раніше.',
  'Ти досі продаєш руками те, що вже давно можна автоматизувати.',
  'Поки ти відповідаєш вручну, теплі ліди вже остигають.',
] as const

const STORY_STEPS = [
  'Біль',
  'Ситуація',
  'Усвідомлення',
  'Рішення',
  'CTA',
  'Соціальний доказ',
] as const

function resolveGoal(goal: string[] | undefined): ContentStudioGoal {
  const raw = goal?.[0]
  return raw === 'traffic' || raw === 'warmup' ? raw : 'sale'
}

function buildStrategy(inputs: ContentStudioInputs, format: string, strategy?: ContentStudioAIStrategy | null): ContentStudioStrategy {
  const goal = resolveGoal(inputs.goal)
  const primaryPain = inputs.pain[0] ?? 'хаос у продажах'

  const angle = goal === 'traffic'
    ? `перший дотик через ${strategy?.contentFocus ?? primaryPain}`
    : goal === 'warmup'
      ? `м'який прогрів через ${strategy?.contentFocus ?? primaryPain}`
      : strategy?.hookAngle ?? `продаж через втрату від ${primaryPain}`

  const hookType = goal === 'traffic'
    ? strategy?.hookType ?? 'curiosity'
    : goal === 'warmup'
      ? strategy?.hookType ?? 'education'
      : strategy?.hookType ?? 'disruption'

  const emotion = goal === 'traffic'
    ? strategy?.emotion ?? 'цікавість'
    : goal === 'warmup'
      ? strategy?.emotion ?? 'довіра'
      : strategy?.emotion ?? 'терміновість'

  return {
    angle,
    format,
    contentFocus: strategy?.contentFocus,
    hookAngle: strategy?.hookAngle,
    ctaStrategy: strategy?.ctaStrategy,
    hookType: strategy?.hookType ?? hookType,
    emotion: strategy?.emotion ?? emotion,
    coreProblem: strategy?.coreProblem,
    weakestStep: strategy?.weakestStep,
    conversion: strategy?.conversion,
  }
}

function buildTelegramPayload(type: ContentItemType, goal: ContentStudioGoal, index: number) {
  return `${type}_${goal}_${String(index + 1).padStart(2, '0')}`
}

function buildPerformanceForecast(type: ContentItemType, goal: ContentStudioGoal, index: number) {
  const boost = index > 1 ? 0.82 : 1

  if (type === 'reel') {
    if (goal === 'traffic') return { views: '8k–20k', dm: `${Math.round(16 * boost)}–${Math.round(34 * boost)}`, trial: `${Math.max(1, Math.round(2 * boost))}–${Math.round(6 * boost)}`, revenue: '€250–€900' }
    if (goal === 'warmup') return { views: '4k–12k', dm: `${Math.round(12 * boost)}–${Math.round(28 * boost)}`, trial: `${Math.max(1, Math.round(2 * boost))}–${Math.round(5 * boost)}`, revenue: '€180–€650' }
    return { views: '5k–15k', dm: `${Math.round(20 * boost)}–${Math.round(50 * boost)}`, trial: `${Math.max(1, Math.round(3 * boost))}–${Math.round(10 * boost)}`, revenue: '€300–€1.5k' }
  }

  if (type === 'ad') {
    return goal === 'sale'
      ? { views: '2k–8k', dm: `${Math.round(15 * boost)}–${Math.round(35 * boost)}`, trial: `${Math.max(1, Math.round(2 * boost))}–${Math.round(8 * boost)}`, revenue: '€250–€1.2k' }
      : { views: '3k–9k', dm: `${Math.round(10 * boost)}–${Math.round(24 * boost)}`, trial: `${Math.max(1, Math.round(1 * boost))}–${Math.round(5 * boost)}`, revenue: '€150–€700' }
  }

  if (type === 'story') {
    return { views: '1k–4k', dm: `${Math.max(2, Math.round(6 * boost))}–${Math.round(18 * boost)}`, trial: `${Math.max(1, Math.round(1 * boost))}–${Math.round(4 * boost)}`, revenue: '€80–€320' }
  }

  if (type === 'podcast') {
    return { views: '300–1.2k', dm: `${Math.max(1, Math.round(4 * boost))}–${Math.round(14 * boost)}`, trial: `${Math.max(1, Math.round(1 * boost))}–${Math.round(3 * boost)}`, revenue: '€70–€260' }
  }

  return { views: '—', dm: `${Math.max(1, Math.round(3 * boost))}–${Math.round(10 * boost)}`, trial: `${Math.max(1, Math.round(1 * boost))}–${Math.round(3 * boost)}`, revenue: '€50–€180' }
}

function buildTelegramMessage({
  title,
  cta,
  dmEntry,
  payload,
}: {
  title: string
  cta?: string
  dmEntry?: string
  payload: string
}) {
  return [
    `🎯 ${title}`,
    dmEntry ?? 'Напиши в DM, якщо хочеш розбір під свій кейс.',
    cta ? `Ключове слово: ${cta}` : null,
    `Payload: ${payload}`,
  ].filter(Boolean).join('\n')
}

export function generateContentStudioItems(inputs: ContentStudioInputs, strategy?: ContentStudioAIStrategy | null): ContentStudioItem[] {
  const timestamp = createTimestamp()
  const goal = resolveGoal(inputs.goal)
  const [primaryAudience] = inputs.audience
  const [primaryPain] = inputs.pain
  const [secondaryPain] = inputs.pain.slice(1)
  const [primaryOffer] = inputs.offer
  const [primaryResult] = inputs.result
  const [secondaryResult] = inputs.result.slice(1)
  const [primaryCta, secondaryCta = primaryCta] = inputs.cta
  const productLine = inputs.product.join(', ')
  const funnelPath = ['Reels', 'Profile', 'Stories', 'DM', 'Bot', 'Trial', 'Payment']
  const adFunnelPath = ['Ads', 'Post', 'DM', 'Bot', 'Trial', 'Payment']
  const strategyHookAngle = strategy?.hookAngle ?? 'отримай результат за 60 секунд'
  const strategyFocus = strategy?.contentFocus ?? primaryPain
  const strategyCta = strategy?.ctaStrategy ?? primaryCta
  const strategyProblem = strategy?.coreProblem ?? primaryPain

  const reels = Array.from({ length: 5 }, (_, index): ContentStudioItem => ({
    id: createId('reel', index),
    type: 'reel',
    title: `Reels ${index + 1}`,
    formatLabel: 'Instagram Reels',
    status: 'draft',
    updatedAt: timestamp,
    goal,
    offer: primaryOffer,
    hook: index === 0 ? strategyHookAngle : REEL_HOOKS[index],
    script: `${primaryAudience} часто живе в сценарії "${pick(inputs.pain, index)}", тому заявки нестабільні, а день розсипається на ручну роботу. Фокус: ${strategyFocus}.`,
    strategy: buildStrategy(inputs, 'reels', strategy),
    telegramPayload: buildTelegramPayload('reel', goal, index),
    telegramMessage: buildTelegramMessage({
      title: `Reels ${index + 1}`,
      cta: index % 2 === 0 ? primaryCta : secondaryCta,
      dmEntry: `Після Reels ведемо людину в профіль, stories і далі в бот через "${index % 2 === 0 ? strategyCta : secondaryCta}".`,
      payload: buildTelegramPayload('reel', goal, index),
    }),
    dmEntry: `Напиши "${index % 2 === 0 ? strategyCta : secondaryCta}" в дірект або переходь у профіль → бот.`,
    funnelPath,
    performance: buildPerformanceForecast('reel', goal, index),
    launchReady: true,
    cta: index % 2 === 0 ? primaryCta : secondaryCta,
    content: [
      index === 0 ? strategyHookAngle : REEL_HOOKS[index],
      `${primaryAudience} часто живе в сценарії "${pick(inputs.pain, index)}", тому заявки нестабільні, а день розсипається на ручну роботу. Фокус кроку: ${strategyFocus}.`,
      `Я зібрала ${productLine}, щоб шлях був один: REELS → PROFILE → STORIES → DM → BOT → TRIAL → PAYMENT без хаосу й ручного збирання кожного кроку.`,
      `Напиши "${index % 2 === 0 ? strategyCta : secondaryCta}" і я покажу, де саме у тебе зараз губляться продажі. ${strategyProblem ? `Причина: ${strategyProblem}.` : ''}`,
    ],
  }))

  const ads = BANNER_VARIANT_PRESETS.map((variant, index): ContentStudioItem => ({
    id: createId('ad', index),
    type: 'ad',
    title: variant.title,
    formatLabel: 'Рекламний пост',
    status: 'draft',
    updatedAt: timestamp,
    goal,
    offer: primaryOffer,
    hook: `${variant.badge} формула · ${variant.key === 'PAS' ? 'болючий вхід' : variant.key === 'AIDA' ? 'увага → інтерес → дія' : variant.key === 'BAB' ? 'transformation bridge' : variant.key === 'FAB' ? 'features → benefits' : variant.key === '4P' ? 'promise → push' : 'stacked hybrid'}`,
    script: `${primaryAudience} приходить у систему, коли втомлюється від ручної роботи, відсутності контролю і хаотичних продажів.`,
    strategy: buildStrategy(inputs, 'ads', strategy),
    telegramPayload: buildTelegramPayload('ad', goal, index),
    telegramMessage: buildTelegramMessage({
      title: variant.title,
      cta: primaryCta,
      dmEntry: `Реклама має привести в DM або бот через "${primaryCta}".`,
      payload: buildTelegramPayload('ad', goal, index),
    }),
    dmEntry: `CTA у рекламі має вести в DM або бот через "${primaryCta}".`,
    funnelPath: adFunnelPath,
    performance: buildPerformanceForecast('ad', goal, index),
    launchReady: true,
    cta: primaryCta,
    visualStyle: 'Liquid Glass / premium / dark / glow',
    imagePrompt: variant.imagePrompt,
    content: [
      `${variant.badge} · ${variant.title}.`,
      `${primaryAudience} приходить у систему, коли втомлюється від ручної роботи, відсутності контролю і хаотичних продажів.`,
      `Це рішення дає ${primaryResult}${secondaryResult ? ` і ${secondaryResult}` : ''}, бо кожен крок від прогріву до DM зібраний в одну логіку. Фокус: ${strategyFocus}.`,
      `Напиши "${strategyCta}" і отримай розбір, де саме у тебе зараз губляться ліди.`,
    ],
  }))

  const stories = Array.from({ length: 6 }, (_, index): ContentStudioItem => ({
    id: createId('story', index),
    type: 'story',
    title: `Stories ${index + 1}`,
    formatLabel: 'Stories',
    status: 'draft',
    updatedAt: timestamp,
    goal,
    offer: primaryOffer,
    strategy: buildStrategy(inputs, 'stories', strategy),
    telegramPayload: buildTelegramPayload('story', goal, index),
    telegramMessage: buildTelegramMessage({
      title: `Stories ${index + 1}`,
      cta: secondaryCta,
      dmEntry: `Stories мають перевести людину в DM через "${strategyCta}".`,
      payload: buildTelegramPayload('story', goal, index),
    }),
    dmEntry: `Stories мають вести в DM через "${strategyCta}" і далі в бот.`,
    funnelPath,
    performance: buildPerformanceForecast('story', goal, index),
    launchReady: index < 3,
    cta: secondaryCta,
    content: [
      `${STORY_STEPS[index]}: ${
        index === 0 ? `Ти вкладаєшся в контент, а заявки все одно нестабільні. Фокус: ${strategyFocus}.` :
        index === 1 ? 'За кадром завжди один і той самий сценарій: ручні відповіді, хаос і втрата темпу.' :
        index === 2 ? `Проблема не в тобі. Проблема в тому, що продажі не зібрані в систему. ${strategyProblem ? `Ключовий вузол: ${strategyProblem}.` : ''}` :
        index === 3 ? 'Тому я зробила AI-систему: чатбот + сайт + mini app + автоворонка.' :
        index === 4 ? `Вона веде людину в діалог і не дає ліду розсипатись після першого дотику. ${strategyCta ? `CTA: ${strategyCta}.` : ''}` :
        `Напиши "${strategyCta}" і я покажу, як це зібрати під твій продукт.`
      }`,
    ],
  }))

  const podcasts = [
    'Чому у тебе немає продажів, навіть коли ти багато працюєш',
    'Чому хаос у процесах напряму бʼє по грошах',
    'Як AI забирає ручну рутину і повертає контроль у продажі',
  ].map((topic, index): ContentStudioItem => ({
    id: createId('podcast', index),
    type: 'podcast',
    title: `Podcast ${index + 1}`,
    topic,
    formatLabel: 'Podcast / Talking head',
    status: 'draft',
    updatedAt: timestamp,
    goal,
    offer: primaryOffer,
    strategy: buildStrategy(inputs, 'podcast', strategy),
    telegramPayload: buildTelegramPayload('podcast', goal, index),
    telegramMessage: buildTelegramMessage({
      title: `Podcast ${index + 1}`,
      cta: primaryCta,
      dmEntry: `Після подкасту ведемо слухача в DM і далі в trial через "${primaryCta}".`,
      payload: buildTelegramPayload('podcast', goal, index),
    }),
    dmEntry: `Після podcast дай CTA "${primaryCta}" і заведи людину в DM / trial.`,
    funnelPath,
    performance: buildPerformanceForecast('podcast', goal, index),
    launchReady: true,
    audioReady: true,
    cta: primaryCta,
    content: [
      `Тема: ${topic}.`,
      'Структура: 1) де ламається продаж, 2) чому ручна робота більше не тягне, 3) як система повертає контроль.',
      `Ключові фрази: "${primaryPain}" · "${secondaryPain ?? 'ручна робота'}" · "${primaryResult}" · "контроль замість хаосу". Фокус: ${strategyFocus}.`,
      `Напиши "${strategyCta}" і я покажу, яку частину цієї системи треба зібрати першою.`,
    ],
  }))

  const dms = [
    'Початок діалогу',
    'Виявлення проблеми',
    'Продаж через рішення',
  ].map((title, index): ContentStudioItem => ({
    id: createId('dm', index),
    type: 'dm',
    title: `DM ${index + 1} · ${title}`,
    formatLabel: 'DM-скрипт',
    status: 'draft',
    updatedAt: timestamp,
    goal,
    offer: primaryOffer,
    strategy: buildStrategy(inputs, 'dm', strategy),
    telegramPayload: buildTelegramPayload('dm', goal, index),
    telegramMessage: buildTelegramMessage({
      title: `DM ${index + 1}`,
      cta: index === 0 ? strategyCta : secondaryCta,
      dmEntry: 'Це готовий DM-entry сценарій для діалогу.',
      payload: buildTelegramPayload('dm', goal, index),
    }),
    dmEntry: `Це вже сам DM-entry сценарій. ${strategyCta ? `CTA: ${strategyCta}.` : ''}`,
    funnelPath,
    performance: buildPerformanceForecast('dm', goal, index),
    launchReady: index === 0,
    cta: index === 0 ? strategyCta : secondaryCta,
    content: [
      index === 0
        ? `Початок: Бачу, що тобі відгукнулась тема системи продажів. Напиши, що зараз найбільше гальмує: заявки, прогрів чи хаос у процесах? ${strategyFocus ? `Фокус: ${strategyFocus}.` : ''}`
        : index === 1
          ? `Виявлення: Скільки потенційних клієнтів ти зараз втрачаєш між контентом і діалогом, бо частина процесу лишається ручною? ${strategyProblem ? `Вузол: ${strategyProblem}.` : ''}`
          : `Продаж: Якщо хочеш, покажу, як під твій продукт зібрати чатбот + сайт + mini app + DM-флоу в одну систему без ручного хаосу. ${strategyCta ? `CTA: ${strategyCta}.` : ''}`,
      `Підводка: ${primaryAudience} найчастіше застрягає в точці "${pick(inputs.pain, index)}", хоча насправді їм потрібна одна зібрана логіка переходу до продажу.`,
      `Напиши "${index === 0 ? strategyCta : secondaryCta}".`,
    ],
  }))

  return [...reels, ...ads, ...stories, ...podcasts, ...dms]
}

export function regenerateContentStudioItem(item: ContentStudioItem, inputs: ContentStudioInputs, strategy?: ContentStudioAIStrategy | null): ContentStudioItem {
  const refreshed = generateContentStudioItems(inputs, strategy).find(candidate => candidate.id === item.id)
  return refreshed
    ? { ...refreshed, status: 'draft' }
    : { ...item, updatedAt: createTimestamp(), status: 'draft' }
}
