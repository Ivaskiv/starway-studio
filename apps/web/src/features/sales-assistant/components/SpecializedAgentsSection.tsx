import { Info } from 'lucide-react'
import { useState } from 'react'

export type AgentKey = 'voice' | 'cta' | 'landing' | 'reels' | 'storytelling' | 'warmup'

interface AgentConfig {
  key: AgentKey
  title: string
  subtitle: string
  bullets: string[]
}

const AGENTS: AgentConfig[] = [
  {
    key: 'voice',
    title: 'Голос-в-Контент',
    subtitle: 'Audio → Content Atoms',
    bullets: [
      'транскрибує аудіо через Whisper',
      'витягує смислові атоми з мовлення',
      'генерує пости, цитати, тригери',
      'зберігає авторський голос та інтонацію',
    ],
  },
  {
    key: 'cta',
    title: 'CTA-Связист',
    subtitle: 'CTA Generator A/B/C',
    bullets: [
      'генерує A/B/C варіанти CTA',
      'адаптує під канали (TG/Reels/Landing)',
      'використовує тригери болю та дії',
      'підбирає тиск під обраний пресет',
    ],
  },
  {
    key: 'landing',
    title: 'Лендинг-Каркас',
    subtitle: 'Landing Page Architect',
    bullets: [
      'будує Hero/Pain/Solution/Proof блоки',
      'архітектура без зайвих слів',
      'CTA-блок з максимальним тиском',
      'FAQ та Blueprint секції',
    ],
  },
  {
    key: 'reels',
    title: 'Рілс-Сценарист',
    subtitle: 'Reels Script + Timing',
    bullets: [
      'hook-driven сценарій з 3 варіантами',
      'раскадровка з таймінгом по секундах',
      'візуальні директиви для монтажу',
      'CTA у фінальних 5 секундах',
    ],
  },
  {
    key: 'storytelling',
    title: 'Сторитейл-Серіал',
    subtitle: 'Story Arcs 5-7 Episodes',
    bullets: [
      'серія 5-7 епізодів з арками',
      'клиффхенгери між епізодами',
      'емоційна драматургія на продаж',
      "зв'язок між епізодами через тригери",
    ],
  },
  {
    key: 'warmup',
    title: 'Прогрев-Архітектор',
    subtitle: 'Warmup 3/5/7 Days',
    bullets: [
      '3/5/7-денний прогрів до продажу',
      'драматургія наростання інтересу',
      'кожен день зі своєю темою та CTA',
      'психологічна готовність до покупки',
    ],
  },
]

interface Props {
  selectedAgents: AgentKey[]
  onAgentsChange: (agents: AgentKey[]) => void
}

export function SpecializedAgentsSection({ selectedAgents, onAgentsChange }: Props) {
  const [focusedKey, setFocusedKey] = useState<AgentKey>('voice')

  const toggleAgent = (key: AgentKey) => {
    setFocusedKey(key)
    if (selectedAgents.includes(key)) {
      onAgentsChange(selectedAgents.filter((a) => a !== key))
    } else {
      onAgentsChange([...selectedAgents, key])
    }
  }

  const focused = AGENTS.find((a) => a.key === focusedKey) ?? AGENTS[0]

  return (
    <div className="dna-agents-section">
      <div className="dna-preset-emphasis dna-agents-emphasis">
        <div className="dna-preset-emphasis__content">
          <div className="dna-preset-emphasis__title">СПЕЦІАЛІЗОВАНІ АГЕНТИ</div>
          <p className="dna-preset-emphasis__desc">
            AI-модулі для глибокої обробки специфічних форматів контенту.
          </p>
          <div className="dna-agents-section__hint">
            <div className="dna-agents-section__hint-icon">
              <Info size={14} />
            </div>
            <div className="dna-agents-section__hint-text">
              <strong>Опціонально.</strong> Обирай агента, якщо потрібен конкретний формат контенту
              (Reels, Landing, CTA тощо). Якщо не обрано — DNA згенерує універсальний контент на
              базі твоїх сенсів.
            </div>
          </div>
          <div className="dna-preset-active-note" aria-live="polite">
            <div className="dna-preset-active-note__head">
              <span className="dna-preset-active-note__tag">{focused.title}</span>
              <span className="dna-preset-active-note__mode">{focused.subtitle}</span>
            </div>
            <div className="dna-preset-active-note__label">Що робить:</div>
            <ul className="dna-preset-active-note__list">
              {focused.bullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
          </div>
        </div>
        <div className="dna-preset-emphasis__actions dna-agents-emphasis__actions">
          {AGENTS.map((agent) => (
            <button
              key={agent.key}
              type="button"
              className={`dna-preset-hero-btn dna-btn-inline-content dna-agents-emphasis__btn${selectedAgents.includes(agent.key) ? ' is-active' : ''}`}
              onClick={() => toggleAgent(agent.key)}
              onMouseEnter={() => setFocusedKey(agent.key)}
            >
              {agent.title}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
