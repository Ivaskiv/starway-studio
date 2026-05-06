import { FOCUS_PAGE } from "@/features/landings/focus/content/focus.content"
import { FOCUS_PAYMENT_URL } from "../utils/constants"

export default function Final() {
  const { subtitlesection, title, text, bullets, cta } = FOCUS_PAGE.final

  return (
    <section id="final" className="focus-section stack">
      <div className="focus-container focus-final-wrap focus-reveal stack">
        <div className="focus-section-eyebrow">{subtitlesection}</div>
        <h2 className="focus-section-title">{title}</h2>

        <div className="focus-final-body stack">
          {text.map((line: string, i: number) => (
            <p key={i} className="focus-about-copy">{line}</p>
          ))}

          <div className="focus-problem-flow stack">
            {bullets.map((item: string) => (
              <div key={item} className="focus-problem-line focus-glass-item">
                <span className="focus-problem-bullet">—</span>
                <p className="focus-problem-text">{item}</p>
              </div>
            ))}
          </div>

          <div className="focus-final-cta">
            <a
              className="focus-btn-primary"
              href={FOCUS_PAYMENT_URL}
              target="_blank"
              rel="noreferrer"
            >
              {cta}
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
