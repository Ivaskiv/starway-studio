import { useMemo, useState } from 'react'

type StepKey = 0 | 1 | 2 | 3

type StepComponent = () => JSX.Element

const StepInput: StepComponent = () => <section className="dna-step-shell" aria-label="Step Input" />
const StepAgents: StepComponent = () => <section className="dna-step-shell" aria-label="Step Agents" />
const StepArtifacts: StepComponent = () => <section className="dna-step-shell" aria-label="Step Artifacts" />
const StepResult: StepComponent = () => <section className="dna-step-shell" aria-label="Step Result" />

const STEP_BUTTON_LABELS: Record<StepKey, string> = {
  0: 'Генерувати',
  1: 'Запустити агентів',
  2: 'Підтвердити артефакти',
  3: 'Отримати результат',
}

export default function DnaGenerationPanel() {
  const [activeStep, setActiveStep] = useState<StepKey>(0)

  const stepMap = useMemo<Record<StepKey, JSX.Element>>(
    () => ({
      0: <StepInput />,
      1: <StepAgents />,
      2: <StepArtifacts />,
      3: <StepResult />,
    }),
    [],
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
        <aside className="dna-generation-shell__left-col" aria-label="DNA Left Column" />
        <main className="dna-generation-shell__main-col">{stepMap[activeStep]}</main>
      </div>

      <footer className="dna-generation-shell__bottom-bar">
        <button type="button" className="dna-generation-shell__action-btn">
          {STEP_BUTTON_LABELS[activeStep]}
        </button>
      </footer>
    </section>
  )
}
