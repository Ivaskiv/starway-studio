import { FOCUS_PAGE } from '@/features/landings/focus/content/focus.content'
import { FOCUS_PAYMENT_URL } from '../utils/constants'

export default function FirstPractice() {
  const { subtitlesection, title, text, items, note, price, period, cta } = FOCUS_PAGE.firstPractice

  return (
    <section id="first-practice" className="focus-section focus-section-secondary stack" data-reveal>
      <div className="focus-container focus-first-practice-wrap focus-reveal" data-reveal data-reveal-delay="1">
        <div className="focus-first-practice-header stack" data-reveal data-reveal-delay="2">
          <div className="focus-section-eyebrow">{subtitlesection}</div>
          <h2 className="focus-section-title">
            {title}
          </h2>
          {text.map((paragraph: string, i: number) => (
            <p key={i} className="focus-first-practice-copy">
              {paragraph}
            </p>
          ))}
        </div>

        <div className="focus-first-practice-body stack">
          <ul className="focus-first-practice-list stack">
            {items.map((item: string) => (
              <li key={item} className="focus-first-practice-item">
                {item}
              </li>
            ))}
          </ul>

          <div className="focus-first-practice-cta" data-reveal data-reveal-delay="3">
            <div className="focus-first-practice-price">
              <span className="focus-price-amount">{price}</span>
              <span className="focus-price-period">{period}</span>
            </div>
            <a
              className="focus-btn-primary"
              href={FOCUS_PAYMENT_URL}
              target="_blank"
              rel="noreferrer"
            >
              {cta}
            </a>
            <p className="focus-first-practice-note">
              {note}
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
