import { useMemo } from 'react'

type Props = {
  strategy: string
  goal: string
  tone: string
  model: string
  artifacts: string[]
  tokens: number
  cost: string
  inputSource: 'ТЕКСТ' | 'АУДІО'
  wordCount?: number
  hookCount?: number
  ctaCount?: number
  score?: string
  state?: 'ОЧІКУВАННЯ' | 'ВИКОНУЄТЬСЯ' | 'ГОТОВО'
}

function callClickUpTask(taskKey: 'bannerTZ') {
  console.log('[DNA][clickup]', taskKey)
}

export default function StepResult({
  strategy,
  goal,
  tone,
  model,
  artifacts,
  tokens,
  cost,
  inputSource,
  wordCount = 0,
  hookCount = 0,
  ctaCount = 0,
  score = 'LOW',
  state = 'ОЧІКУВАННЯ',
}: Props) {
  const promptCards = useMemo(() => artifacts.slice(0, 3), [artifacts])

  return (
    <section className="dna-step-result">
      <div className="dna-step-result__metrics result-metrics">
        <Metric label="Позиція" value={strategy || '—'} />
        <Metric label="Ціль" value={goal || '—'} />
        <Metric label="Тон" value={tone || '—'} />
        <Metric label="Модель" value={model || '—'} />
        <Metric label="Типи" value={artifacts.length ? artifacts.join(', ') : '—'} />
      </div>

      {artifacts.includes('LANDING') ? (
        <div className="dna-step-result__banner">
          <button type="button" className="dna-generate-btn" onClick={() => callClickUpTask('bannerTZ')}>
            Згенерувати банери
          </button>
        </div>
      ) : null}

      <div className="dna-step-result__prompts">
        {promptCards.map((artifact, index) => (
          <article key={`${artifact}-${index}`} className="dna-step-result__card dna-card">
            <h4>{`0${index + 1} промпт`}</h4>
            <p>{artifact}</p>
            <textarea className="dna-textarea" placeholder="Встав фінальний промпт або редагуй перед генерацією" rows={5} />
            <button type="button" className="dna-generate-btn">Згенерувати</button>
          </article>
        ))}
      </div>

      <footer className="dna-step-result__footer">
        <div>
          AI Позиція: <strong className="dna-badge">{strategy || '—'}</strong> | Тон: <strong className="dna-badge">{tone || '—'}</strong> | Джерело: {inputSource}
        </div>
        <div>
          Вартість: ${cost} | Токени: {tokens} | Стан: {state}
        </div>
        <div>
          Слів: {wordCount} | Хуків: {hookCount} | CTA: {ctaCount} | Прогноз: {score}
        </div>
      </footer>
    </section>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="dna-step-result__metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}
