import type { ProgramStep } from '../types/landing.types';

interface ProgramSectionProps {
  steps: ProgramStep[];
}

export function ProgramSection({ steps }: ProgramSectionProps) {
  return (
    <section className="space-y-4">
      <h2 className="liquid-h2">Що всередині практикуму за 5 днів</h2>
      <div className="liquid-grid-cards">
        {steps.map((step) => (
          <article key={step.day} className="glass-panel">
            <p className="liquid-eyebrow">{step.day}</p>
            <h3>{step.title}</h3>
            <p>{step.result}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
