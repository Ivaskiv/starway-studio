import { useMemo, useState } from 'react'
import DnaLeftColumn from './DnaLeftColumn'
import StepInput from './steps/StepInput'
import StepAgents from './steps/StepAgents'
import StepArtifacts from './steps/StepArtifacts'
import StepResult from './steps/StepResult'

type StepKey = 0 | 1 | 2 | 3

type PipelineState = 'idle' | 'running' | 'done'

const STEP_BUTTON_LABELS: Record<StepKey, string> = {
  0: 'Генерувати',
  1: 'Запустити агентів',
  2: 'Підтвердити артефакти',
  3: 'Отримати результат',
}

export default function DnaGenerationPanel() {
  const [activeStep, setActiveStep] = useState<StepKey>(0)
  const [strategy, setStrategy] = useState<'truth' | 'architect' | 'psychology'>('truth')
  const [model, setModel] = useState<'gemini' | 'gpt' | 'claude'>('gpt')
  const [tone, setTone] = useState<'clear' | 'warm' | 'expert' | 'bold'>('expert')
  const [agents, setAgents] = useState<string[]>([])
  const [artifacts, setArtifacts] = useState<string[]>(['REELS', 'WARMUP'])
  const [stats, setStats] = useState({ wordCount: 0, hookCount: 0, ctaCount: 0, score: 'LOW', tokens: 817, cost: '0.0020' })

  const pipelineStatus = useMemo<Record<string, PipelineState>>(
    () => ({
      Parsing: activeStep > 0 ? 'done' : 'idle',
      'Маппінг болю': activeStep > 1 ? 'done' : activeStep === 1 ? 'running' : 'idle',
      'Пошук тригерів': activeStep > 2 ? 'done' : activeStep === 2 ? 'running' : 'idle',
      'Побудова структури': activeStep === 3 ? 'running' : 'idle',
      'Генерація результатів': activeStep === 3 ? 'running' : 'idle',
    }),
    [activeStep],
  )

  const stepMap = useMemo<Record<StepKey, JSX.Element>>(
    () => ({
      0: <StepInput onStatsChange={setStats} />,
      1: <StepAgents pipelineStatus={pipelineStatus} onChange={(p) => { setModel(p.model); setAgents(p.agents) }} />,
      2: <StepArtifacts onChange={(p) => { setArtifacts(p.artifacts); setTone(p.style) }} />,
      3: <StepResult strategy={strategy} goal="Продаж" tone={tone} model={model} artifacts={artifacts} tokens={stats.tokens} cost={stats.cost} inputSource="ТЕКСТ" wordCount={stats.wordCount} hookCount={stats.hookCount} ctaCount={stats.ctaCount} score={stats.score} state="ВИКОНУЄТЬСЯ" />,
    }),
    [artifacts, model, pipelineStatus, stats, strategy, tone],
  )

  return (
    <section className="dna-generation-shell" aria-label="DNA Generation Panel">
      <header className="dna-generation-shell__top-bar">
        <nav className="dna-generation-shell__steps" aria-label="DNA Steps">
          {[0, 1, 2, 3].map((step) => (
            <button
              key={step}
              type="button"
              className={`dna-generation-shell__step-btn${activeStep === step ? ' is-active' : ''}`}
              onClick={() => setActiveStep(step as StepKey)}
            >
              Крок {step + 1}
            </button>
          ))}
        </nav>
      </header>

      <div className="dna-generation-shell__content">
        <DnaLeftColumn onStrategyChange={setStrategy} />
        <main className="dna-generation-shell__main-col">{stepMap[activeStep]}</main>
      </div>

      <footer className="dna-generation-shell__bottom-bar">
        <div className="cost-info">${stats.cost} · {stats.tokens} ток.</div>
        <button type="button" className="dna-generation-shell__action-btn">
          {STEP_BUTTON_LABELS[activeStep]}{activeStep === 1 ? ` (${agents.length})` : ''}
        </button>
      </footer>
    </section>
  )
}
