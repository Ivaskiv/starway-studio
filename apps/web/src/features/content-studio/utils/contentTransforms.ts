import type { ContentStudioAIStrategy, ContentStudioInputs, ContentStudioItem } from '../types/contentStudio.types'
import { WIDTH_CLASS_BY_PROGRESS } from '../config/contentStudio.config'
import type { FormulaCardUi } from '../config/contentStudio.config'

export function getProgressWidthClass(percent: number) {
  const normalized = Number.isFinite(percent) ? Math.max(0, Math.min(100, percent)) : 0
  return WIDTH_CLASS_BY_PROGRESS[Math.max(0, Math.min(20, Math.round(normalized / 5)))]
}

export function splitMultiline(value: string) {
  return value
    .split('\n')
    .map((item) => item.replace(/\r/g, ''))
    .filter((item) => item.trim().length > 0)
}

export function detectLeadMagnetProblem(value: string) {
  const normalized = value.toLowerCase()
  const keywordPatterns = [
    /lead\s*magnet/,
    /ламається/,
    /слабк(ий|ий)\s+cta/,
    /немає\s+миттєвої/,
    /немає\s+миттєвої\s+цінності/,
    /немає\s+наступного\s+кроку/,
    /ясного\s+наступного\s+кроку/,
    /після\s+lead\s*magnet/,
    /не\s+бачить\s+ясного\s+наступного\s+кроку/,
  ] as const

  const matchedKeywords = keywordPatterns
    .map((pattern) => {
      const match = normalized.match(pattern)
      return match ? match[0].trim() : null
    })
    .filter((value): value is string => Boolean(value))

  return {
    matched: matchedKeywords.length > 0,
    keywords: matchedKeywords,
    signature: normalized.replace(/\s+/g, ' ').trim(),
  }
}

function normalizeHookSource(value: string) {
  return value.trim().replace(/[.?!]+$/g, '')
}

function buildUserCentricPainLine({ reflection, pain, audience }: { reflection: string; pain: string; audience: string }) {
  const source = [reflection, pain].map(normalizeHookSource).find((item) => item.length > 0) ?? ''
  const text = source.toLowerCase()

  if (/немає\s+продаж|немає\s+нових\s+користувач|не\s+купляють|немає\s+підписників|хаос\s+у\s+продаж|крутиш\s+колесо/.test(text)) {
    return 'Тобі знайоме відчуття, коли ти стараєшся, а результат усе ще не приходить?'
  }

  if (/прокраст|відклада|застря|не\s+знаєш\s+з\s+чого\s+почати|немає\s+ясного\s+кроку/.test(text)) {
    return 'Ти хочеш зрушити з місця, але все одно впираєшся в відкладання?'
  }

  if (/втом|перевант|перевантаж|хаос/.test(text)) {
    return 'Тобі знайоме відчуття, коли день уже розсипався на дрібниці?'
  }

  if (!source) {
    return `Тобі знайоме відчуття, коли ${audience || 'все'} хочеться змінити, але старт не клеїться?`
  }

  return `Тобі знайоме відчуття, коли ${normalizeHookSource(source).replace(/^ти\s+/i, '').replace(/^у\s+мене\s+/i, '')}?`
}

function buildUserCentricHookBody({
  product,
  result,
  strategyLead,
  strategyCTA,
  strategyProblem,
  variantIndex,
}: {
  product: string
  result: string
  strategyLead: string
  strategyCTA: string
  strategyProblem: string
  variantIndex: number
}) {
  const action = strategyCTA || 'перейди і спробуй одразу'
  const bridge = strategyLead || `перший зрозумілий крок до ${result}`
  const problem = strategyProblem ? `Це не про слабкість — це про ${strategyProblem}.` : 'Це не про слабкість — це про те, що зараз бракує простого кроку.'

  const variants = [
    `${problem} ${product ? `Саме ${product} допомагає повернути контроль без перевантаження.` : 'Потрібен лише один ясний маршрут.'} ${action}.`,
    `Малий крок зараз важливіший за ще один великий план. ${bridge ? `Почни з нього і дійди до ${result}.` : ''} ${action}.`,
    `Не треба ще одного хаотичного списку. ${product ? `${product} збирає для тебе один зрозумілий маршрут.` : 'Потрібен один ясний маршрут.'} ${action}.`,
    `Ти не одна: коли день розсипається, дуже легко зависнути. ${bridge ? `Саме тому важливо побачити ${bridge}.` : ''} ${action}.`,
    `Відчуття, що робиш багато, а руху мало, дуже виснажує. ${product ? `Спробуй ${product} і подивись, як змінюється ритм.` : 'Спробуй перший крок і подивись на різницю.'} ${action}.`,
  ]

  return variants[variantIndex % variants.length]
}

export function buildContextHookDraft({ reflection, topic, platform, pain, result, audience, product, variantIndex, strategy }: { reflection: string; topic: string; platform: string; pain: string[]; result: string[]; audience: string[]; product: string[]; variantIndex: number; strategy?: Pick<ContentStudioAIStrategy, 'contentFocus' | 'hookAngle' | 'ctaStrategy' | 'coreProblem' | 'weakestStep'> | null }) {
  const topicLabel = { transformacia: 'трансформацію', bol: 'реальний біль клієнта', rezultat: 'видимий результат', sistema: 'системний підхід', history: 'особисту історію' }[topic] ?? 'головний зміст дня'
  const formatLabel = { reels: 'Reels', stories: 'Stories', ad: 'рекламний банер', post: 'пост', podcast: 'podcast', dm: 'DM' }[platform] ?? 'контент'
  const leadPain = pain[0] ?? 'хаос у щоденних діях'
  const leadResult = result[0] ?? 'ясність і контроль'
  const leadAudience = audience[0] ?? 'аудиторії'
  const leadProduct = product[0] ?? 'системи'
  const baseReflection = reflection.trim()
  const strategyLead = strategy?.hookAngle ?? strategy?.contentFocus ?? ''
  const strategyCTA = strategy?.ctaStrategy ?? ''
  const strategyProblem = strategy?.coreProblem ?? ''
  const leadLine = buildUserCentricPainLine({ reflection: baseReflection, pain: leadPain, audience: leadAudience })
  const bodyLine = buildUserCentricHookBody({
    product: leadProduct,
    result: leadResult,
    strategyLead,
    strategyCTA,
    strategyProblem,
    variantIndex,
  })
  const bridgeLine = strategyLead
    ? `Малий місток: ${strategyLead}.`
    : `Малий місток: ${leadProduct} допомагає перейти до ${leadResult}.`

  const variants = [
    `${leadLine} ${bodyLine}`,
    `${leadLine.replace('?', '...')} ${bridgeLine} ${strategyCTA || 'Перейди і спробуй одразу.'}`,
    `Знайоме відчуття, коли ${leadPain}? ${leadProduct} не обіцяє магію, а дає перший зрозумілий крок до ${leadResult}. ${strategyCTA || 'Перейди і спробуй одразу.'}`,
    `Ти хочеш ${leadResult}, але зараз впираєшся в ${leadPain}. ${bodyLine} ${strategyCTA || 'Зроби перший крок зараз.'}`,
    `${leadAudience ? `Для ${leadAudience},` : ''} ${leadLine.toLowerCase()} ${strategyLead ? `Саме тут починається ${strategyLead}.` : `Саме тут починається простий маршрут.`} ${strategyCTA || 'Перейди і спробуй одразу.'}`,
  ] as const
  return variants[variantIndex % variants.length].replace(/\s+/g, ' ').trim()
}

export function dedupeContentItems(items: ContentStudioItem[]) {
  const seen = new Set<string>()
  return items.filter((item) => {
    const fingerprint = [item.type, item.title.trim().toLowerCase(), item.content[0]?.trim().toLowerCase() ?? ''].join('::')
    if (seen.has(fingerprint)) return false
    seen.add(fingerprint)
    return true
  })
}

export function normalizeFormulaKey(value: string): FormulaCardUi['key'] {
  return (['PAS', 'AIDA', 'BAB', 'FAB', '4P', 'STACK'] as const).includes(value as FormulaCardUi['key']) ? (value as FormulaCardUi['key']) : 'PAS'
}

export function estimateLaunchPotential(items: ContentStudioItem[]) {
  const reels = items.filter((item) => item.type === 'reel').length
  const ads = items.filter((item) => item.type === 'ad').length
  const stories = items.filter((item) => item.type === 'story').length
  const podcasts = items.filter((item) => item.type === 'podcast').length
  const dms = items.filter((item) => item.type === 'dm').length
  const minViews = reels * 5000 + ads * 2000 + stories * 1000 + podcasts * 300
  const maxViews = reels * 15000 + ads * 8000 + stories * 4000 + podcasts * 1200
  const minDm = reels * 4 + ads * 5 + stories * 2 + podcasts * 1 + dms * 1
  const maxDm = reels * 10 + ads * 12 + stories * 5 + podcasts * 3 + dms * 2
  return { views: `${Math.max(0, Math.round(minViews / 1000))}k–${Math.max(0, Math.round(maxViews / 1000))}k`, dm: `${minDm}–${maxDm}`, trial: `${Math.max(0, Math.round(minDm * 0.14))}–${Math.max(0, Math.round(maxDm * 0.24))}` }
}

export function mergeContentItems(current: ContentStudioItem[], incoming: ContentStudioItem[]) {
  const nextMap = new Map(current.map((item) => [item.id, item]))
  for (const item of incoming) nextMap.set(item.id, item)
  return Array.from(nextMap.values()).sort((left, right) => left.id.localeCompare(right.id))
}

export function updateInputField(dispatch: (payload: Partial<ContentStudioInputs>) => void, key: keyof ContentStudioInputs, value: string) {
  dispatch({ [key]: splitMultiline(value) } as Partial<ContentStudioInputs>)
}
