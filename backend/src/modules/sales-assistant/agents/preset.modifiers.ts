import { PresetType } from './agents.registry.js'

export const PRESET_MODIFIERS: Record<PresetType, string> = {
  [PresetType.NOISE]: `
PRESET: ШУМ (HIGH PRESSURE / Провокація)

Модифікатори:
- Підвищ емоційний тиск та контраст
- Тисни на FOMO та дедлайни
- Провокуй швидку реакцію
- Посилюй конфлікт для дії
- Короткі рубані речення (1-5 слів)
- Агресивні хуки
- Сильний CTA pressure

Lexicon boost: зараз, сьогодні, останній шанс, поки не пізно
Forbidden boost: можливо, коли-небудь, подумай
  `.trim(),

  [PresetType.STUCK]: `
PRESET: ЗАСТРЯГ (Mirror / Дзеркало)

Модифікатори:
- Виявляй зациклені паттерни думок
- Дзеркаль loop detection
- Руйнуй decision paralysis
- Глибока емпатія + чесність
- Повільніший темп, рефлексія
- Vulnerability-driven hooks

Lexicon boost: застрягла, третій рік, одна й та сама думка, тупняк
Forbidden boost: просто почни, все буде добре
  `.trim(),

  [PresetType.BATTLE]: `
PRESET: БАТЛ (Battle / Конфронтація)

Модифікатори:
- Прямий виклик аудиторії
- Ego trigger
- Порівняння з конкурентами
- Позиція домінування через силу
- Conflict-driven narrative
- Myth destruction

Lexicon boost: архітектор, масштаб, точка опори, сила
Forbidden boost: допоможу, разом, підтримка
  `.trim(),

  [PresetType.TACTIC]: `
PRESET: ТАКТИКА (Strategic Execution)

Модифікатори:
- Покроковий фреймворк
- Дерева рішень
- Конкретні метрики
- Виконання без рефлексії
- Аналітичний тон
- Expert positioning
- Structured logic

Lexicon boost: крок, система, метрика, результат
Forbidden boost: інтуїція, відчуття, можливо
  `.trim(),
}

export function getPresetInstructions(preset?: PresetType): string {
  if (!preset) return 'Стандартний режим генерації без preset modifiers.'
  return PRESET_MODIFIERS[preset] ?? ''
}
