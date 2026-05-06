import { FOCUS_PAGE } from '@/features/landings/focus/utils/focus.content'

type FocusStep = {
  title: string
  text: string
}

export default function HowItWorks() {
  const { subtitlesection, title, steps, note } = FOCUS_PAGE.how

  return (
    <section id="how" className="focus-section stack" data-reveal>
      <div className="focus-container focus-reveal stack" data-reveal data-reveal-delay="1">
        <div className="focus-section-eyebrow">{subtitlesection}</div>
        <h2 className="focus-section-title" data-reveal data-reveal-delay="2">
          {title}
        </h2>
      </div>

      <ul className="focus-container stack focus-reveal" data-reveal data-reveal-delay="2">
        {steps.map((step: FocusStep, i: number) => (
          <li key={step.title} className="focus-step">
            <span className="focus-step-number">{String(i + 1).padStart(2, '0')}</span>
            <div className="stack">
              <strong className="focus-step-title">{step.title}</strong>
              <span className="focus-step-copy">{step.text}</span>
            </div>
          </li>
        ))}
      </ul>

      <div className="focus-container focus-problem-core-wrap focus-reveal" data-reveal data-reveal-delay="3">
        <div className="focus-quote-glass focus-glass">
          <p>
            {note.map((line: string, i: number) => (
              <span key={i}>
                {line}
                {i < note.length - 1 ? <br /> : null}
              </span>
            ))}
          </p>
        </div>
      </div>
    </section>
  )
}
