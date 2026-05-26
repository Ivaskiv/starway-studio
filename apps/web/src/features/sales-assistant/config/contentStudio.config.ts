import { type LexItem } from '@/features/sales-assistant/components/LexiconPanel'
import { ContentType, type ModelProvider } from '@ai/types/salesAssistant.types'

type ContentKey =
  | 'blog'
  | 'landing'
  | 'storytelling'
  | 'telegram_msg'
  | 'reels'
  | 'stories'
  | 'warmup'
  | 'webinar'
  | 'audit'
  | 'post'
  | 'email'
  | 'sales'
type ModelKey = ModelProvider
type ModelState = Record<ModelKey, boolean>
type DnaGenerationMode = 'FAST' | 'BALANCED' | 'PREMIUM'

// ==========================================
// TABS CONFIGURATION WITH TOOLTIPS
// ==========================================
export const AI_ASSISTANT_TABS = [
  { 
    id: 'dna', 
    label: 'ДНК STARWAY',
    info: 'Ядро психолінгвістичного аналізу. Використовується для деконструкції болю та розпакування автентичних сенсів без маркетингового шуму.'
  },
  { 
    id: 'content-machine', 
    label: 'Content Machine',
    info: 'Конвеєр швидкої дистрибуції. Генерує готові текстові та сценарні матриці під різні медіа-формати на основі затвердженого ДНК.'
  },
  { 
    id: 'control-center', 
    label: 'DNA Control Center',
    info: 'Інженерний пульт управління системою. Налаштування API-ключів, моніторинг лімітів витрат токенів та калібрування провайдерів.'
  },
] as const

// ==========================================
// GENERATION MODES CONFIGURATION
// ==========================================
export const AI_ASSISTANT_GENERATION_MODES = [
  { id: 'reels', label: 'Reels', contentType: ContentType.REELS_SCENARIO, output: 'reels' },
  { id: 'stories', label: 'Stories', contentType: ContentType.STORIES_CHECK, output: 'stories' },
  { id: 'warmup', label: 'Warmup', contentType: ContentType.WARMUP_3DAYS, output: 'warmup' },
  { id: 'webinar', label: 'Webinar', contentType: ContentType.WEBINAR_SALES, output: 'webinar' },
  { id: 'audit', label: 'Audit', contentType: ContentType.CONTENT_AUDIT, output: 'audit' },
] as const

// ==========================================
// PROTOCOLS CONFIGURATION WITH TOOLTIPS
// ==========================================
export const PROTOCOLS = [
  {
    key: 'SYSTEM',
    label: 'Оголена правда',
    desc: 'Провокативно, в лоб, зриває маски',
    info: 'Жорсткий режим ліквідації ілюзій. Модель повністю вирізає соціально схвалювані фрази, хорошу дівчинку та б\'є прямо у прихований, егоїстичний біль аудиторії.',
  },
  {
    key: 'AUTHOR',
    label: 'Головний Архітектор',
    desc: 'Сила, масштаб, жорсткий варіант А/Б',
    info: 'Транслює позицію абсолютної сили, структурного масштабу та домінування. Формує безальтернативний вибір для клієнта через жорстку логіку фактів.',
  },
  {
    key: 'PSYCH',
    label: 'Психологія Дії',
    desc: 'Глибокий психолінгвістичний audit без цензури',
    info: 'Глибокий психолінгвістичний розбір. Сфокусований на виявленні внутрішніх затиків, страхів та прихованого саботажу клієнта перед дією.',
  },
] as const

export const AI_ASSISTANT_PROTOCOL_LABELS = [
  { id: 'SYSTEM', label: 'Оголена правда', marker: '🔥' },
  { id: 'AUTHOR', label: 'Головний Архітектор', marker: '👑' },
  { id: 'PSYCH', label: 'Психологія Дії', marker: '🧠' },
] as const

// ==========================================
// CONTENT & OUTPUT CONFIGURATION
// ==========================================
export const CONTENT_TYPES = [
  { key: 'blog', label: 'Blog', info: 'Розгорнутий експертний матеріал зі структурою та аргументацією.' },
  { key: 'landing', label: 'Landing', info: 'Контент під лендінг: блоки, офер, довіра, CTA.' },
  { key: 'storytelling', label: 'Storytelling', info: 'Наративний формат для емоційного включення і довіри.' },
  { key: 'telegram_msg', label: 'Telegram Msg', info: 'Коротке повідомлення/ланцюжок для Telegram-діалогу.' },
  { key: 'reels', label: 'Reels', info: 'Сценарій вертикального відео з hook/CTA.' },
  { key: 'stories', label: 'Stories', info: 'Серія сторіс для прогріву і переходу в дію.' },
  { key: 'warmup', label: 'Warmup', info: 'Кількаденний прогрів до trial/оплати.' },
  { key: 'webinar', label: 'Webinar', info: 'Структура продаючого вебінару.' },
  { key: 'audit', label: 'Audit', info: 'Аудит тексту на шум, ясність і конверсію.' },
  { key: 'post', label: 'Post', info: 'Соцмережевий пост під залучення і CTA.' },
  { key: 'email', label: 'Email', info: 'Лист з чітким офером і переходом у дію.' },
  { key: 'sales', label: 'Sales', info: 'Продажний скрипт/діалог для закриття.' },
] as const satisfies ReadonlyArray<{ key: ContentKey; label: string; info: string }>

export type ContentTypeRegistryKey =
  | 'blog'
  | 'landing'
  | 'storytelling'
  | 'telegram_msg'
  | 'reels'
  | 'stories'
  | 'warmup'
  | 'webinar'
  | 'audit'
  | 'post'
  | 'email'
  | 'sales'

export type ContentTypeOutputSchema =
  | 'blog'
  | 'landing'
  | 'storytelling'
  | 'telegram'
  | 'reels'
  | 'stories'
  | 'warmup'
  | 'webinar'
  | 'audit'
  | 'post'
  | 'email'
  | 'sales'

export type ContentTypePreviewMode =
  | 'article'
  | 'landing'
  | 'stories'
  | 'messenger'
  | 'video'
  | 'calendar'
  | 'dialog'
  | 'email'
  | 'feed'

export type ContentTypeRegistryItem = {
  key: ContentTypeRegistryKey
  label: string
  icon: string
  outputSchema: ContentTypeOutputSchema
  previewMode: ContentTypePreviewMode
  actions: string[]
  metrics: string[]
}

export const CONTENT_TYPE_REGISTRY: ReadonlyArray<ContentTypeRegistryItem> = [
  { key: 'blog', label: 'Blog', icon: 'IconArticle', outputSchema: 'blog', previewMode: 'article', actions: ['edit', 'regenerate', 'publish'], metrics: ['read_time', 'seo_score', 'ctr'] },
  { key: 'landing', label: 'Landing', icon: 'IconLayoutKanban', outputSchema: 'landing', previewMode: 'landing', actions: ['edit', 'preview', 'publish'], metrics: ['conversion', 'scroll_depth', 'cta_clicks'] },
  { key: 'storytelling', label: 'Storytelling', icon: 'IconSparkles', outputSchema: 'storytelling', previewMode: 'article', actions: ['edit', 'split', 'publish'], metrics: ['retention', 'hook_strength', 'emotion_score'] },
  { key: 'telegram_msg', label: 'Telegram Message', icon: 'IconBrandTelegram', outputSchema: 'telegram', previewMode: 'messenger', actions: ['edit', 'send_test', 'publish'], metrics: ['open_rate', 'reply_rate', 'click_rate'] },
  { key: 'reels', label: 'Reels', icon: 'IconVideo', outputSchema: 'reels', previewMode: 'video', actions: ['edit', 'voice', 'publish'], metrics: ['watch_time', 'retention_3s', 'shares'] },
  { key: 'stories', label: 'Stories', icon: 'IconCarouselHorizontal', outputSchema: 'stories', previewMode: 'stories', actions: ['edit', 'sequence', 'publish'], metrics: ['completion_rate', 'tap_forward', 'exits'] },
  { key: 'warmup', label: 'Warmup', icon: 'IconCalendarEvent', outputSchema: 'warmup', previewMode: 'calendar', actions: ['edit', 'schedule', 'publish'], metrics: ['day_completion', 'reply_rate', 'trial_entries'] },
  { key: 'webinar', label: 'Webinar', icon: 'IconPresentation', outputSchema: 'webinar', previewMode: 'dialog', actions: ['edit', 'outline', 'publish'], metrics: ['registration', 'attendance', 'sales_conversion'] },
  { key: 'audit', label: 'Audit', icon: 'IconFileSearch', outputSchema: 'audit', previewMode: 'feed', actions: ['scan', 'fix', 'export'], metrics: ['clarity_score', 'noise_score', 'offer_score'] },
  { key: 'post', label: 'Post', icon: 'IconMessageCircle2', outputSchema: 'post', previewMode: 'feed', actions: ['edit', 'shorten', 'publish'], metrics: ['engagement', 'saves', 'shares'] },
  { key: 'email', label: 'Email', icon: 'IconMail', outputSchema: 'email', previewMode: 'email', actions: ['edit', 'ab_test', 'publish'], metrics: ['open_rate', 'ctr', 'reply_rate'] },
  { key: 'sales', label: 'Sales', icon: 'IconCurrencyDollar', outputSchema: 'sales', previewMode: 'dialog', actions: ['edit', 'objections', 'publish'], metrics: ['close_rate', 'avg_deal', 'objection_clearance'] },
]

export const SECONDARY_LAYERS = ['banners', 'reels_engine'] as const

export const AI_ASSISTANT_OUTPUT_LABELS = [
  'Пост',
  'Сторіс',
  'Reels',
  'Email',
  'Скрипт продажу',
 ] as const

export const AI_ASSISTANT_AUDIT_LABELS = [
  'Чіткість офферу',
  'Контекст аудиторії',
  'Емоційна логіка',
  'Наступна дія',
] as const

export const AI_ASSISTANT_SECTION_INFO = {
  protocol:
    'Визначають фундаментальну позицію АІ-асистента: кут атаки, глибину провокації та тип аргументації у фінальному контенті.',
  lexicon:
    'Живий семантичний фільтр, який гарантує вживання впізнаваних маркерів та видалення маркетингового сміття.',
  formula:
    'Операційний блок перетворення сирого болю аудиторії у чіткий комерційний меседж і конкретну дію.',
} as const

// ==========================================
// TONE CONFIGURATION WITH TOOLTIPS
// ==========================================
export const AI_ASSISTANT_TONE_PRESETS = [
  { id: 'clear', label: 'Чітко', info: 'Максимально лаконічно, без прикметників та ліричних відступів. Тільки сухі факти, цифри та інструкції до дії.' },
  { id: 'warm', label: 'Тепло', info: 'Глибокий емпатичний контакт, створення безпечного простору, акцент на розумінні внутрішнього стану клієнта.' },
  { id: 'expert', label: 'Експертно', info: 'Використання професійної термінології платформи, жорстка інженерна архітектура логіки та демонстрація системного підходу.' },
  { id: 'bold', label: 'Сміливо', info: 'Зухвалий, безкомпромісний тон на межі фолу. Провокація аудиторії на вихід із зони комфорту.' },
] as const

// ==========================================
// MODELS CONFIGURATION WITH TOOLTIPS
// ==========================================
export const MODEL_LIST = [
  {
    key: 'claude',
    label: 'Claude Sonnet',
    spec: 'Ядро психолінгвістики',
    desc: 'Рубаний ритм, живі емоції',
    info: 'Преміальна модель для фінального пакування текстів. Найкраще розуміє натяки, контекст, психолінгвістичні пастки та пише живою людською мовою.',
  },
  {
    key: 'gpt',
    label: 'GPT-4.1 mini',
    spec: 'Архітектура & Структури',
    desc: 'Ідеальні конспект-карти та таймінг',
    info: 'Робоча конячка для побудови каркасів. Бездоганно структурує таблиці, розробляє технічні таймінги вебінарів та логічні схеми прогрівів.',
  },
  {
    key: 'gemini',
    label: 'Gemini Flash',
    spec: 'Валідатор & Аудит',
    desc: 'Безкоштовний No-bullshit фільтр',
    info: 'Швидкісний та безкоштовний сканер. Ідеальний для паралельного незалежного аудиту текстів на наявність штампів та перевірки логічних помилок.',
  },
] as const satisfies ReadonlyArray<{
  key: ModelKey
  label: string
  spec: string
  desc: string
  info: string
}>

export const AI_ASSISTANT_MODEL_OPTIONS = [
  { id: 'gpt', label: 'GPT-4.1 mini', specialization: 'Структури & Воронки' },
  { id: 'claude', label: 'Claude', specialization: 'Психолінгвістика' },
  { id: 'gemini', label: 'Gemini Flash', specialization: 'Аудит & Аналітика' },
] as const satisfies ReadonlyArray<{
  id: ModelProvider
  label: string
  specialization: string
}>

export const DEFAULT_MODEL_STATE: ModelState = {
  gpt: true,
  claude: true,
  gemini: true,
}

// ==========================================
// ESTIMATES & MODES WITH TOOLTIPS
// ==========================================
export const GENERATION_MODES: ReadonlyArray<{
  key: DnaGenerationMode
  label: string
  provider: ModelProvider
  note: string
  info: string
}> = [
  {
    key: 'FAST',
    label: 'FAST',
    provider: 'gemini',
    note: 'Мінімальна вартість, швидка перевірка гіпотез',
    info: 'Використовує Gemini Flash. Миттєва обробка великих об\'ємів інформації для чорнового накидання ідей за нульової вартості токенів.',
  },
  {
    key: 'BALANCED',
    label: 'BALANCED',
    provider: 'gpt',
    note: 'Стандартний production-шлях для більшості задач',
    info: 'Використовує GPT-4.1 mini. Оптимальне співвідношення швидкості, суворої логіки структури та вартості генерації фінального контенту.',
  },
  {
    key: 'PREMIUM',
    label: 'PREMIUM',
    provider: 'claude',
    note: 'Максимум емоційної глибини для high-stakes текстів',
    info: 'Використовує Claude Sonnet. Глибоке занурення в психотипи, складні мовні метафори та філігранна ліквідація маркетингової сухості.',
  },
]

export const COST_ESTIMATE = {
  claude: { tokensPerOutput: 800, costPer1k: 0.003 },
  gpt: { tokensPerOutput: 600, costPer1k: 0.001 },
  gemini: { tokensPerOutput: 500, costPer1k: 0.0 },
} as const

export const FREE_TOKEN_LIMITS: Record<ModelKey, number> = {
  gpt: 4_000,
  claude: 3_000,
  gemini: 8_000,
}

// ==========================================
// LEXICON DEFAULT DATA
// ==========================================
export const DEFAULT_LEX: LexItem[] = [
  { id: 'r1', word: 'тригер', type: 'REQUIRED' },
  { id: 'r3', word: 'застрягла', type: 'REQUIRED' },
  { id: 'r4', word: 'зливати', type: 'REQUIRED' },
  { id: 'r5', word: 'тупняк', type: 'REQUIRED' },
  { id: 'r6', word: 'внутрішній критик', type: 'REQUIRED' },
  { id: 'r7', word: 'точка опори', type: 'REQUIRED' },
  { id: 'f1', word: 'трансформація', type: 'FORBIDDEN' },
  { id: 'f2', word: 'унікальна можливість', type: 'FORBIDDEN' },
  { id: 'f3', word: 'успішний успех', type: 'FORBIDDEN' },
]

// ==========================================
// EXTERNAL LINKS CONFIGURATION
// ==========================================
export const AI_PROVIDER_LINKS = [
  {
    key: 'openai',
    provider: 'OpenAI',
    links: [
      { label: 'Usage & Tokens', url: 'https://platform.openai.com/usage', description: 'Графік токенів по днях' },
      { label: 'Billing & Balance', url: 'https://platform.openai.com/settings/organization/billing/overview', description: 'Баланс та ліміти витрат' },
      { label: 'API Keys', url: 'https://platform.openai.com/api-keys', description: 'Управління ключами' },
    ],
  },
  {
    key: 'anthropic',
    provider: 'Anthropic (Claude)',
    links: [
      { label: 'Usage & Tokens', url: 'https://console.anthropic.com/settings/usage', description: 'Токени цього місяця' },
      { label: 'Billing', url: 'https://console.anthropic.com/settings/billing', description: 'Баланс та витрати' },
      { label: 'API Keys', url: 'https://console.anthropic.com/settings/keys', description: 'Управління ключами' },
    ],
  },
  {
    key: 'google',
    provider: 'Google (Gemini)',
    links: [
      { label: 'Usage Metrics', url: 'https://console.cloud.google.com/apis/api/generativelanguage.googleapis.com/metrics', description: 'RPM та денні ліміти' },
      { label: 'AI Studio Keys', url: 'https://aistudio.google.com/app/apikey', description: 'API ключі та ліміти' },
      { label: 'Billing', url: 'https://console.cloud.google.com/billing', description: 'Google Cloud білінг' },
    ],
  },
] as const
