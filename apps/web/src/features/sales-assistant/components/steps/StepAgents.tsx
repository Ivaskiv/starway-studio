import { useEffect, useMemo, useState } from 'react'

type PipelineState = 'idle' | 'running' | 'done'

type Props = {
  pipelineStatus: Record<string, PipelineState>
  onChange?: (payload: { model: 'gemini' | 'gpt' | 'claude'; agents: string[] }) => void
}

const MODELS = [
  { id: 'gemini', label: 'Fast / Gemini', price: '~$0.001' },
  { id: 'gpt', label: 'Balanced / GPT', price: '~$0.005' },
  { id: 'claude', label: 'Premium / Claude', price: '~$0.015' },
] as const

const AGENTS = [
  "Голос-в-контент",
  "CTA-зв'язист",
  'Лендинг-каркас',
  'Рілс-сценарист',
  'Сторітейл-серіал',
  'Прогрев-архітектор',
]

const PIPELINE = ['Parsing', 'Маппінг болю', 'Пошук тригерів', 'Побудова структури', 'Генерація результатів']

export default function StepAgents({ pipelineStatus, onChange }: Props) {
  const [model, setModel] = useState<'gemini' | 'gpt' | 'claude'>('gpt')
  const [agents, setAgents] = useState<string[]>([])

  useEffect(() => {
    onChange?.({ model, agents })
  }, [model, agents, onChange])

  const normalizedStatus = useMemo(() => {
    return PIPELINE.map((step) => ({
      step,
      status: pipelineStatus[step] ?? 'idle',
    }))
  }, [pipelineStatus])

  const toggleAgent = (agent: string) => {
    setAgents((prev) => (prev.includes(agent) ? prev.filter((a) => a !== agent) : [...prev, agent]))
  }

  return (
    <section className="dna-step-agents">
      <div className="dna-step-agents__main">
        <div className="dna-step-agents__models" role="radiogroup" aria-label="AI models">
          {MODELS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="radio"
              aria-checked={model === item.id}
              className={`dna-step-agents__model-btn${model === item.id ? ' is-active' : ''}`}
              onClick={() => setModel(item.id)}
            >
              <span>{item.label}</span>
              <small>{item.price}</small>
            </button>
          ))}
        </div>

        <div className="dna-step-agents__grid" aria-label="specialized agents">
          {AGENTS.map((agent) => (
            <button
              key={agent}
              type="button"
              aria-pressed={agents.includes(agent)}
              className={`dna-step-agents__agent-btn${agents.includes(agent) ? ' is-active' : ''}`}
              onClick={() => toggleAgent(agent)}
            >
              {agent}
            </button>
          ))}
        </div>
      </div>

      <aside className="dna-step-agents__sidebar" aria-label="pipeline status">
        {normalizedStatus.map((item) => (
          <div key={item.step} className={`dna-step-agents__pipe dna-step-agents__pipe--${item.status}`}>
            <span>{item.step}</span>
            <strong>{item.status}</strong>
          </div>
        ))}
      </aside>
    </section>
  )
}
