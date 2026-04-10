import type { ContentItemType } from '../types/contentStudio.types'

export type ContentStudioTab = 'input' | 'scripts' | 'publish'
export type ContentStudioStep = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10
export type ContentStudioStepDefinition = {
  step: ContentStudioStep
  title: string
  heading: string
  subtitle: string
  description: string
  instruction: string
  accent?: 'gold'
}

export type FormulaCardUi = {
  key: 'PAS' | 'AIDA' | 'BAB' | 'FAB' | '4P' | 'STACK'
  badge: string
  accentClass: string
  badgeClass: string
  title: string
  description: string
  bullets: readonly { key: string; text: string }[]
  footer: string
  note?: string
}

export type BannerVariantPresetUi = {
  key: FormulaCardUi['key']
  title: string
  badge: string
  emoji: string
  imagePrompt: string
}

export type ResearchCampaignCardUi = {
  key: string
  eyebrow: string
  title: string
  body: string
  metrics: readonly string[]
}

export type ResearchHookOptionUi = {
  key: string
  eyebrow: string
  title: string
  body: string
  footer: string
}

export const GROUPS: Array<{ key: ContentItemType; label: string }> = [
  { key: 'reel', label: 'Reels' },
  { key: 'ad', label: 'Реклама' },
  { key: 'story', label: 'Stories' },
  { key: 'podcast', label: 'Podcast' },
  { key: 'dm', label: 'DM' },
]

export const FORMAT_GENERATION_OPTIONS = [
  { key: 'reels', label: 'Instagram Reels', itemType: 'reel' as const, requestFormats: ['reels'] as const },
  { key: 'stories', label: 'Stories', itemType: 'story' as const, requestFormats: ['stories'] as const },
  { key: 'ad', label: 'Рекламний банер', itemType: 'ad' as const, requestFormats: ['ad'] as const },
  { key: 'post', label: 'Пост', itemType: 'ad' as const, requestFormats: ['post'] as const },
  { key: 'podcast', label: 'Podcast', itemType: 'podcast' as const, requestFormats: ['podcast'] as const },
  { key: 'dm', label: 'DM-скрипт', itemType: 'dm' as const, requestFormats: ['dm'] as const },
] as const

export const SECTION_EYEBROW_CLASS = 'text-[11px] font-semibold uppercase tracking-[0.24em] text-[rgb(var(--accent-soft-rgb))]'
export const CM_SECTION_TITLE_CLASS = 'text-[13px] font-semibold uppercase tracking-[0.18em] text-[rgb(var(--accent-soft-rgb))]'
export const CM_FIELD_CLASS = 'w-full rounded-[18px] border border-[var(--border)] bg-[rgba(255,255,255,0.03)] px-4 py-3 text-sm text-[var(--text-field)] placeholder:text-[var(--text-field-placeholder)] outline-none transition-colors focus:border-[rgba(var(--accent-rgb),0.2)]'
export const CM_TEXTAREA_CLASS = 'w-full rounded-[18px] border border-[var(--border)] bg-[rgba(255,255,255,0.03)] px-4 py-3 text-sm leading-6 text-[var(--text-field)] placeholder:text-[var(--text-field-placeholder)] outline-none transition-colors focus:border-[rgba(var(--accent-rgb),0.2)]'
export const CM_STACKED_COLUMNS_CLASS = 'grid gap-4 min-[480px]:grid-cols-2'
export const CM_STACK_COLUMN_CLASS = 'space-y-4'
export const CM_SECTION_CARD_CLASS = 'rounded-[22px] px-4 py-4'
export const CM_SEGMENT_CLASS = 'border-t border-[rgba(255,255,255,0.06)] pt-4 first:border-t-0 first:pt-0'
export const CM_MODAL_STEP_TOTAL = 9

export const CM_PIPELINE_STEPS = ['Рефлексія', 'AI інсайт', 'Копірайт', '3 варіанти', 'Голос', 'Reels', 'Telegram', 'Публікація'] as const
export const REELS_ENGINE_NODES = ['Контекст', 'СТА', 'Hook', 'Дослідження', 'Формула', 'API', 'Текст × 3', 'Банери × 3', 'Reels Engine'] as const
export const TEXT_VARIANT_PRESETS = [
  { title: 'Емоційний / Storytelling', badge: 'PAS', tone: 'A' },
  { title: 'Data-driven / Раціональний', badge: 'AIDA', tone: 'B' },
  { title: 'Провокативний / Питання', badge: 'BAB', tone: 'C' },
] as const

export function buildTextVariantPresets(formulaType: FormulaCardUi['key']) {
  const variants = {
    PAS: [
      { title: 'Problem / Біль', tone: 'A' },
      { title: 'Agitate / Загострення', tone: 'B' },
      { title: 'Solution / Рішення', tone: 'C' },
    ],
    AIDA: [
      { title: 'Attention / Увага', tone: 'A' },
      { title: 'Interest / Інтерес', tone: 'B' },
      { title: 'Action / Дія', tone: 'C' },
    ],
    BAB: [
      { title: 'Before / Було', tone: 'A' },
      { title: 'After / Стало', tone: 'B' },
      { title: 'Bridge / Міст', tone: 'C' },
    ],
    FAB: [
      { title: 'Feature / Функція', tone: 'A' },
      { title: 'Advantage / Перевага', tone: 'B' },
      { title: 'Benefit / Вигода', tone: 'C' },
    ],
    '4P': [
      { title: 'Promise / Обіцянка', tone: 'A' },
      { title: 'Picture / Картина', tone: 'B' },
      { title: 'Proof / Доказ', tone: 'C' },
    ],
    STACK: [
      { title: 'Hook / Вхід', tone: 'A' },
      { title: 'Stack / Підсилення', tone: 'B' },
      { title: 'CTA / Дія', tone: 'C' },
    ],
  } as const

  return variants[formulaType].map((variant) => ({
    title: formulaType + ' · ' + variant.title,
    badge: formulaType,
    tone: variant.tone,
  }))
}

export const GOAL_OPTIONS = [
  { value: 'sale', label: 'Продаж', hint: 'Контент веде в DM → bot → trial → payment.' },
  { value: 'traffic', label: 'Трафік', hint: 'Перший дотик і перехід у профіль, stories або бот.' },
  { value: 'warmup', label: 'Прогрів', hint: 'Довіра, діалог і підготовка до оферу.' },
] as const

export const TOPIC_OPTIONS = [
  { value: 'transformacia', label: 'Трансформація', hint: 'Подача через зміну стану, шляху або ролі людини.' },
  { value: 'bol', label: 'Біль клієнта', hint: 'Фокус на проблемі, яка вже болить і вимагає рішення.' },
  { value: 'rezultat', label: 'Результат / успіх', hint: 'Показ конкретного ефекту, вигоди або зрушення.' },
  { value: 'sistema', label: 'Система / метод', hint: 'Розбір підходу, структури, карти чи логіки роботи.' },
  { value: 'history', label: 'Особиста історія', hint: 'Подача через особистий кейс, досвід або момент усвідомлення.' },
] as const

export const FORMAT_OPTIONS = [
  { value: 'reels', label: 'Instagram Reels', hint: 'Основний вертикальний формат для сценарію, hook, CTA і продажного переходу.' },
  { value: 'stories', label: 'Stories', hint: 'Короткі вертикальні слайди для прогріву, догріву і переходу в DM.' },
  { value: 'ad', label: 'Рекламний банер', hint: 'Meta / Instagram ad preview для реклами, банерного тексту й image prompt.' },
  { value: 'post', label: 'Пост', hint: 'Статичний або карусельний формат для feed, контентної воронки й реклами.' },
  { value: 'podcast', label: 'Podcast', hint: 'Talking-head або аудіо-сценарій з тезами, ритмом і субтитрами.' },
  { value: 'dm', label: 'DM-скрипт', hint: 'Сценарій прогріву й продажу через direct messages.' },
] as const

export const PLATFORM_OPTIONS = [
  { value: 'reels_stories', label: 'Instagram Reels / Stories', formats: ['reels', 'stories'] as const },
  { value: 'reels', label: 'Instagram Reels', formats: ['reels'] as const },
  { value: 'stories', label: 'Instagram Stories', formats: ['stories'] as const },
  { value: 'reels_ads', label: 'Instagram Reels / Банери', formats: ['reels', 'ad'] as const },
] as const

export const CTA_SUGGESTIONS = ['АНАЛІЗ', 'СТАРТ', 'ЗАПИС НА ZOOM', 'СПРОБУВАТИ 7 ДНІВ', 'ПЕРЕЙТИ В МІНІАП', 'ВІДКРИТИ STARWAY', 'ОТРИМАТИ ПЛАН', 'ОТРИМАТИ РОЗБІР', 'ПІДКЛЮЧИТИ AI МЕНТОРА', 'ОФОРМИТИ ПІДПИСКУ', 'ПЕРЕЙТИ ДО ОПЛАТИ', 'НАПИСАТИ МЕНЕДЖЕРУ'] as const
export const AD_MESSAGE_GOAL_OPTIONS = [
  { value: 'bofu', label: 'BOFU — Conversion (покупка)' },
  { value: 'mofu', label: 'MOFU — Прогрів / довіра' },
  { value: 'tofu', label: 'TOFU — Охоплення / впізнаваність' },
] as const
export const CTA_TYPE_OPTIONS = [
  { value: 'START', label: 'Старт', hint: 'Швидкий вхід у trial, bot або мініапку.' },
  { value: 'DM', label: 'У DM', hint: 'М’який вхід у діалог перед продажем.' },
  { value: 'GET_ACCESS', label: 'Отримати доступ', hint: 'Подача через доступ, активацію або відкриття системи.' },
  { value: 'TRY_NOW', label: 'Спробувати зараз', hint: 'Прямий перехід у тест або пробний період.' },
] as const
export const CTA_DESTINATION_OPTIONS = [
  { value: 'ad_banner', label: 'Рекламний банер', hint: 'CTA працює як банерний клік або рекламний креатив.' },
  { value: 'post', label: 'Пост', hint: 'CTA виводить у пост або feed-сторінку.' },
  { value: 'podcast', label: 'Подкаст', hint: 'CTA підкачує до подкаст-епізоду або аудіо-сценарію.' },
  { value: 'dm_script', label: 'DM-діалог', hint: 'CTA веде в direct messages або прогрів у приватному діалозі.' },
  { value: 'reels', label: 'Instagram Reels', hint: 'CTA прив’язаний до вертикального Reels-сценарію.' },
  { value: 'stories', label: 'Stories', hint: 'CTA працює через короткі stories-екрани.' },
  { value: 'telegram_bot', label: 'Telegram-бот', hint: 'Веде в бот або mini app через Telegram.' },
  { value: 'landing', label: 'Лендінг', hint: 'Веде на лендінг або checkout-сторінку.' },
] as const
export const CTA_ROUTING_OPTIONS = [
  { value: 'single', label: 'Один продукт', hint: 'CTA веде в конкретний офер без розгалуження.' },
  { value: 'ai', label: 'Автопідбір', hint: 'Система сама обирає кращий продукт за сегментом і поведінкою.' },
] as const

export const CAMPAIGN_PRODUCT_OPTIONS = ['ABsystem · 7-денний Trial та підписка', 'AI Assistant · системний запуск', 'Практикум · продажі через Reels'] as const
export const CAMPAIGN_CONTEXT_SAMPLE = 'Що сьогодні важливе? Який стан? Що хочеш сказати своїй аудиторії... Наприклад: зараз проблема не в контенті, а в тому, що продажі не ростуть, нові користувачі не доходять до продукту, і потрібно зібрати маршрут реклама → lead magnet → trial → підписка.'

export const FORMULA_CARDS: readonly FormulaCardUi[] = [
  { key: 'PAS', badge: 'PAS', accentClass: 'text-[rgb(255,113,124)]', badgeClass: 'border-[rgba(255,113,124,0.24)] bg-[rgba(255,113,124,0.12)] text-[rgb(255,113,124)]', title: 'Problem · Agitate · Solution', description: 'Найкраще для coaching. Спочатку людина впізнає себе, потім відчуває напругу, а далі бачить простий вихід.', bullets: [{ key: 'P', text: 'Ти стараєшся, але результат усе ще не приходить.' }, { key: 'A', text: 'Ще один день без ясного кроку — і все знову зависає.' }, { key: 'S', text: 'ABsystem збирає систему за тебе і дає перший рух.' }], footer: '🔥 Найкраще для BOFU', note: 'Сильний для прогріву і продажу' },
  { key: 'AIDA', badge: 'AIDA', accentClass: 'text-[rgb(117,145,255)]', badgeClass: 'border-[rgba(117,145,255,0.24)] bg-[rgba(117,145,255,0.12)] text-[rgb(117,145,255)]', title: 'Attention · Interest · Desire · Action', description: 'Класика для холодної аудиторії. Спершу зупиняє скрол, потім показує цінність і веде до дії.', bullets: [{ key: 'A', text: 'Стоп. Це про тебе, якщо день знову розсипається.' }, { key: 'I', text: 'Перший крок має бути простим і не перевантажувати.' }, { key: 'D', text: 'Уяви ранок, де ти дієш спокійно і по системі.' }, { key: 'A', text: 'Спробуй 7 днів і відчуй різницю сама.' }], footer: '📣 Топ для Meta Ads TOFU', note: 'Холодна аудиторія · awareness' },
  { key: 'BAB', badge: 'BAB', accentClass: 'text-[rgb(78,214,162)]', badgeClass: 'border-[rgba(78,214,162,0.24)] bg-[rgba(78,214,162,0.12)] text-[rgb(78,214,162)]', title: 'Before · After · Bridge', description: 'Показуємо трансформацію. Ідеально для Reels і Stories, де треба за 3 секунди показати зміни.', bullets: [{ key: 'B', text: 'Ще вчора: хаос, тривога і ручна тяганина.' }, { key: 'A', text: 'Через 7 днів: ритм, ясність і відчуття контролю.' }, { key: 'B', text: 'Міст між цими станами — ABsystem у Starway.' }], footer: '🎬 Ідеально для Reels', note: 'Трансформаційний storytelling' },
  { key: 'FAB', badge: 'FAB', accentClass: 'text-[rgb(231,190,71)]', badgeClass: 'border-[rgba(231,190,71,0.24)] bg-[rgba(231,190,71,0.12)] text-[rgb(231,190,71)]', title: 'Feature · Advantage · Benefit', description: 'Раціональний сценарій для офера, користі й конкретної вигоди для людини.', bullets: [{ key: 'F', text: 'AI аналізує твій стан і підбирає день під тебе.' }, { key: 'A', text: 'Тобі не треба думати, з чого почати: система веде покроково.' }, { key: 'B', text: 'Менше хаосу, більше завершених дій і стабільніший ритм.' }], footer: '💼 Для B2B / LinkedIn', note: 'Раціональний підхід' },
  { key: '4P', badge: '4P', accentClass: 'text-[rgb(154,111,255)]', badgeClass: 'border-[rgba(154,111,255,0.24)] bg-[rgba(154,111,255,0.12)] text-[rgb(154,111,255)]', title: 'Promise · Picture · Proof · Push', description: 'Обіцяємо → малюємо картину → доводимо → м’яко підштовхуємо до дії.', bullets: [{ key: 'P', text: 'Я покажу, як вийти із застою без зайвого шуму.' }, { key: 'P', text: 'Уяви ранок без тривоги, де є ясний план і фокус.' }, { key: 'P', text: 'Люди вже проходять цей маршрут і не починають з нуля.' }, { key: 'P', text: 'Зайди в trial і побач, як це працює на практиці.' }], footer: '🎯 BOFU з соціальним доказом', note: 'Обіцянка + доказ + push' },
  { key: 'STACK', badge: 'STACK', accentClass: 'text-[rgb(255,162,97)]', badgeClass: 'border-[rgba(255,162,97,0.24)] bg-[rgba(255,162,97,0.12)] text-[rgb(255,162,97)]', title: 'PAS + FAB + CTA (гібрид)', description: 'Елітніший варіант: PAS для хука → FAB для тіла → сильний CTA.', bullets: [{ key: 'P', text: 'Спочатку зачіпаємо біль так, щоб людина впізнала себе.' }, { key: 'F', text: 'Потім швидко показуємо, що система реально дає в житті.' }, { key: 'C', text: 'Закриваємо простим CTA з чіткою наступною дією.' }], footer: '⚡ Найвища конверсія', note: 'Гібридний сценарій' },
] as const

const BANNER_PROMPTS: Record<FormulaCardUi['key'], string> = {
  PAS: 'Premium liquid glass split-screen ad, dark background, left side chaos and manual operations, right side clean AI system dashboard, chatbot, website, mini app, blue glow, cinematic SaaS visual',
  AIDA: 'Premium dark hero portrait of confident coach with AI system, chatbot interface, website and mini app cards floating around, blue glow, luxury SaaS campaign',
  BAB: 'Close-up premium SaaS UI showcase, dark liquid glass interface, chatbot website mini app cards, glowing analytics, polished AI product marketing render',
  FAB: 'Premium dark dashboard-style ad, feature and benefit focused, elegant UI cards, clean light refractions, monochrome neon accents, cinematic SaaS render',
  '4P': 'Premium high-contrast storytelling ad, promise picture proof push composition, dark liquid glass cards, subtle glow, elegant marketing render',
  STACK: 'Premium layered product campaign visual, dark liquid glass interface, hook plus feature blocks, polished SaaS ad composition, cinematic glow',
}

export const BANNER_VARIANT_PRESETS: readonly BannerVariantPresetUi[] = FORMULA_CARDS.map((card, index) => ({
  key: card.key,
  title: `Банер ${index + 1} · ${card.badge}`,
  badge: card.badge,
  emoji: ['⚡', '◐', '⬢', '✦', '●', '✳'][index] ?? '◦',
  imagePrompt: BANNER_PROMPTS[card.key],
}))

export const RESEARCH_CAMPAIGN_CARDS: readonly ResearchCampaignCardUi[] = [
  { key: 'storytelling', eyebrow: 'Storytelling hook · Coaching niche · Meta Ads 2025', title: '"Тобі знайоме це відчуття о 23:58?"', body: 'Конкретний момент і стан користувача зупиняють скрол. Далі — коротке впізнавання, мікро-спокій і міст до рішення.', metrics: ['CTR +38%', 'ROAS 3.8x'] },
  { key: 'reframe', eyebrow: 'Reframe hook · Instagram Reels · Self-dev 2025', title: '"Ти не лінива. Ти просто тягнеш усе сама."', body: 'Спочатку знімаємо самозвинувачення, потім будуємо довіру і показуємо простий перший крок.', metrics: ['Watch time +42%', 'Viral'] },
  { key: 'data', eyebrow: 'Data hook · Health-tech meta campaign · 2025', title: '"Коли руху нема, цифри показують де саме ламається шлях."', body: 'Специфічна цифра зупиняє більше, ніж округлена. Дані працюють, коли вони ведуть до зрозумілого кроку для людини.', metrics: ['CTR +27%', '5000+ leads'] },
  { key: 'curiosity', eyebrow: 'Curiosity gap · Instagram Reels · Coaching 2025', title: '"Більшість здаються. Ось що допомагає не зірватися."', body: 'Open loop тримає увагу, коли всередині є знайоме впізнавання і обіцянка простого виходу.', metrics: ['Watch time +31%'] },
] as const

export const RESEARCH_HOOK_OPTIONS: readonly ResearchHookOptionUi[] = [
  { key: 'reframe', eyebrow: 'Reframe hook', title: '"Ти не лінива. Ти просто тримаєш усе на собі."', body: 'Спочатку знімаємо самозвинувачення, потім показуємо нову опору і перший зрозумілий крок.', footer: 'Watch time boost: +42%' },
  { key: 'story', eyebrow: 'Story hook', title: '"Увечері вона зрозуміла: проблема не в силі волі, а в хаосі."', body: 'Живий момент без штампів. Дає відчуття реальної людини і веде в зміну стану.', footer: 'Emotional engagement +38%' },
  { key: 'data', eyebrow: 'Data / stats hook', title: '"Коли руху нема, цифри показують де саме ламається шлях."', body: 'Цифра плюс причина звучать як корисний сигнал для людини, а не як суха статистика.', footer: 'CTR boost +27%' },
  { key: 'curiosity', eyebrow: 'Curiosity gap hook', title: '"Чому одні здаються, а інші все ж доходять до результату?"', body: 'Запит без води. Відкриває механізм і тримає увагу до наступного кроку.', footer: 'Watch time +31%' },
] as const

export const WIDTH_CLASS_BY_PROGRESS = ['w-0', 'w-[5%]', 'w-[10%]', 'w-[15%]', 'w-[20%]', 'w-[25%]', 'w-[30%]', 'w-[35%]', 'w-[40%]', 'w-[45%]', 'w-[50%]', 'w-[55%]', 'w-[60%]', 'w-[65%]', 'w-[70%]', 'w-[75%]', 'w-[80%]', 'w-[85%]', 'w-[90%]', 'w-[95%]', 'w-full'] as const
