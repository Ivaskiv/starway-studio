type Props = {
  activePreset: 'noise' | 'stuck' | 'battle' | 'tactic' | null
  onApplyPreset: (preset: 'noise' | 'stuck' | 'battle' | 'tactic') => void
}

const PRESET_CONTENT: Record<'noise' | 'stuck' | 'battle' | 'tactic', {
  title: string
  mode: string
  bullets: string[]
}> = {
  noise: {
    title: 'ШУМ',
    mode: 'Провокація / HIGH PRESSURE',
    bullets: [
      'підвищує тиск і контраст',
      'тисне на FOMO та дедлайни',
      'провокує швидку реакцію',
      'посилює конфлікт для дії',
    ],
  },
  stuck: {
    title: 'ЗАСТРЯГ',
    mode: 'Емпатія / LOW PRESSURE',
    bullets: [
      'знижує опір і тривогу',
      'підсвічує внутрішні блоки',
      'веде через коуч-запитання',
      'м’яко повертає до дії',
    ],
  },
  battle: {
    title: 'БАТЛ',
    mode: 'Азарт / MEDIUM PRESSURE',
    bullets: [
      'вмикає competitive mode',
      'додає лідерське фреймування',
      'використовує challenge-механіки',
      'тисне через «доведи» і дедлайни',
    ],
  },
  tactic: {
    title: 'ТАКТИКА',
    mode: 'План / ZERO PRESSURE',
    bullets: [
      'вимикає емоційний тиск',
      'будує сухий execution-план',
      'дає step-by-step пріоритети',
      'фіксує вимірювані дії та строки',
    ],
  },
}

export function PresetPanel({ activePreset, onApplyPreset }: Props) {
  const activeKey = activePreset ?? 'noise'
  const active = PRESET_CONTENT[activeKey]

  return (
    <div className="dna-preset-emphasis">
      <div className="dna-preset-emphasis__content">
        <div className="dna-preset-emphasis__title">ШВИДКІ AI ПРЕСЕТИ</div>
        <p className="dna-preset-emphasis__desc">
          Готові психолінгвістичні режими, які автоматично змінюють тон, тиск та логіку AI-генерації.
        </p>
        <div className="dna-preset-active-note" aria-live="polite">
          <div className="dna-preset-active-note__head">
            <span className="dna-preset-active-note__tag">{active.title}</span>
            <span className="dna-preset-active-note__mode">{active.mode}</span>
          </div>
          <div className="dna-preset-active-note__label">Що робить:</div>
          <ul className="dna-preset-active-note__list">
            {active.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}
          </ul>
        </div>
      </div>
      <div className="dna-preset-emphasis__actions">
        <button type="button" onClick={() => onApplyPreset('noise')} className={`dna-preset-hero-btn dna-btn-inline-content ${activePreset === 'noise' ? 'is-active' : ''}`}>
          ШУМ
        </button>
        <button type="button" onClick={() => onApplyPreset('stuck')} className={`dna-preset-hero-btn dna-btn-inline-content ${activePreset === 'stuck' ? 'is-active' : ''}`}>
          ЗАСТРЯГ
        </button>
        <button type="button" onClick={() => onApplyPreset('battle')} className={`dna-preset-hero-btn dna-btn-inline-content ${activePreset === 'battle' ? 'is-active' : ''}`}>
          БАТЛ
        </button>
        <button type="button" onClick={() => onApplyPreset('tactic')} className={`dna-preset-hero-btn dna-btn-inline-content ${activePreset === 'tactic' ? 'is-active' : ''}`}>
          ТАКТИКА
        </button>
      </div>
    </div>
  )
}
