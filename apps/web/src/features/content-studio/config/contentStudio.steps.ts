import type { ContentStudioStepDefinition } from './contentStudio.config'

const BASE_CONTENT_STUDIO_STEP_DEFINITIONS: ContentStudioStepDefinition[] = [
  { step: 0, title: 'Content Machine', heading: 'Content Machine', subtitle: 'Стартова сторінка машини', description: 'Огляд системи, AI-стратегії, launchpad і базового маршруту.', instruction: 'Почни тут: подивись на поточний стан, підтвердь стратегію або перейди далі в контекст, СТА і генерацію.' },
  { step: 1, title: 'Контекст', heading: 'Контекст кампанії', subtitle: 'Продукт, аудиторія, біль і AI інсайт', description: 'Стартова рамка для всієї машини.', instruction: 'Збери тільки те, що напряму працює на Content Machine: продукт, аудиторію, біль, платформу і AI інсайт.' },
  { step: 2, title: 'СТА', heading: 'СТА і шлях', subtitle: 'Контекст hook + тип CTA + куди ведемо + як ведемо далі', description: 'Крок з hook-контекстом і фінальною дією, куди ведемо людину і як ведемо її далі.', instruction: 'Спершу згенеруй hook-контекст, потім задай тип CTA, куди ведемо і режим маршруту.' },
  { step: 3, title: 'Hook', heading: 'Hook', subtitle: 'Тип входу в першу секунду', description: 'Обери найсильніший кут входу: reframe, story, data або curiosity.', instruction: 'Після дії зафіксуй тип хука, через який зайдеш у Reels, а вже потім підключай формулу.' },
  { step: 4, title: 'Дослідження', heading: 'Дослідження', subtitle: 'Топ hooks і вибір кута для Reels', description: 'AI-аналіз найдієвіших реклам і готові hook-шаблони під вашу нішу.', instruction: 'Подивись, що спрацювало на ринку, зафіксуй тип хука і вже після цього переходь до формули.' },
  { step: 5, title: 'Формула', heading: 'Формула', subtitle: 'PAS / AIDA / BAB / 4P / STACK', description: 'Вибір копірайт-фрейму для продажу, прогріву або трафіку.', instruction: 'Обери одну головну формулу на основі контексту, hook і результатів дослідження.' },
  { step: 6, title: 'API', heading: 'Налаштування API', subtitle: 'Налаштування голосу, OpenAI і Telegram', description: 'Ключі, label-профілі й куди ведемо для production flow.', instruction: 'Працюй через збережені label, а ручні ключі залишай лише для тестів.' },
  { step: 7, title: 'Текст × 3', heading: 'Текст × 3', subtitle: 'Редагуй кожен — перегенеруй окремо', description: 'Три основні текстові варіанти й preview усіх форматів.', instruction: 'Редагуй, підтверджуй і обирай найсильніші варіанти на основі hook, дослідження і формули.' },
  { step: 8, title: 'Банери × 3', heading: 'Банери × 3', subtitle: '6 формул = 6 банерів', description: 'Рекламні варіанти, image prompt і генерація зображень.', instruction: 'Перевір image prompt і згенеруй візуали для кожної формули перед переходом у Reels Engine.' },
  { step: 9, title: 'Reels Engine', heading: 'Reels Engine', subtitle: 'Контекст → СТА → Hook → Research → Формула → API → Text → Banners', description: 'Фінальний production flow: Reels pipeline, генерація форматів і публікація.', instruction: 'На фінальному кроці перевір pipeline і тільки тоді запускай пакет.' },
]

export function buildContentStudioStepDefinitions(includeLeadMagnetStep = false): ContentStudioStepDefinition[] {
  if (!includeLeadMagnetStep) return [...BASE_CONTENT_STUDIO_STEP_DEFINITIONS]

  return [
    BASE_CONTENT_STUDIO_STEP_DEFINITIONS[0],
    ...BASE_CONTENT_STUDIO_STEP_DEFINITIONS.slice(1),
    {
      step: 10,
      title: 'Lead magnet',
      heading: 'Lead magnet',
      subtitle: 'Лідмагніт, де ламається перехід і що виправити',
      description: 'Жовтий додатковий крок для lead magnet → wheel, коли інсайт показує розрив у вході.',
      instruction: 'Оціни проблему, вибери формат лідмагніту, підтвердь чекбокси і лише тоді переходь далі.',
      accent: 'gold',
    },
  ]
}

export const CONTENT_STUDIO_STEP_DEFINITIONS = buildContentStudioStepDefinitions(false)
