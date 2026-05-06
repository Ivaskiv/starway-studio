import { FOCUS_PAGE } from "@/features/landings/focus/content/focus.content"
import { FOCUS_PAYMENT_URL } from "../utils/constants"

export default function Subscription() {
  const { subtitlesection, title, steps, note, cta } = FOCUS_PAGE.subscription

  return (
    <section id="subscription" className="focus-section stack">
      <div className="focus-container focus-reveal stack">
        <div className="focus-section-eyebrow">{subtitlesection}</div>
        <h2 className="focus-section-title">{title}</h2>
      </div>

      <div className="focus-container focus-problem-flow focus-reveal stack">
        {steps.map((step: string) => (
          <div key={step} className="focus-problem-line focus-glass-item">
            <span className="focus-problem-bullet">—</span>
            <p className="focus-problem-text">{step}</p>
          </div>
        ))}
      </div>

      <div className="focus-container focus-problem-core-wrap focus-reveal stack">
        <div className="focus-quote-glass focus-glass">
          <p>{note}</p>
        </div>

        <a
          className="focus-btn-primary"
          href={FOCUS_PAYMENT_URL}
          target="_blank"
          rel="noreferrer"
        >
          {cta}
        </a>
      </div>
    </section>
  )
}