type Protocol = {
  key: string
  label: string
  info: string
}

type Props = {
  protocols: readonly Protocol[]
  protocolIcons: Record<string, string>
  selectedProtocol: string
  onSelectProtocol: (key: string) => void
}

export function AiPositionSection({ protocols, protocolIcons, selectedProtocol, onSelectProtocol }: Props) {
  return (
    <div className="dna-step">
      <div className="dna-step__header">
        <h3 className="dna-step__title">КРОК 2. AI-СТРАТЕГІЯ</h3>
      </div>
      <p className="dna-step__sub">Обрана AI-стратегія визначає психологічний тиск, стиль аргументації та логіку впливу.</p>
      <div className="dna-position-cards">
        {protocols.map((item) => {
          const isActive = selectedProtocol === item.key
          return (
            <div key={item.key} className={`dna-position-card ${isActive ? 'is-active' : ''}`}>
              <div className="dna-position-card__title">{item.label}</div>
              <p className="dna-position-card__desc">{item.info}</p>
              <button type="button" onClick={() => onSelectProtocol(item.key)} className={`dna-position-card__btn ${isActive ? 'is-active' : ''}`}>
                {isActive ? 'АКТИВНО' : 'ОБРАТИ'}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
