import { FOCUS_PAGE } from '@/features/landings/focus/content/focus.content'
import { handleFocusPaymentClick } from '@/features/subscription/utils/openExternalPaymentUrl'
import { FOCUS_PAYMENT_URL } from '../content/constants'

export default function Subscription() {
  const { subtitlesection, title, steps, note, cta } = FOCUS_PAGE.subscription

  return (
    // o-ambient--soft: lower-center, subtle — text-heavy section
    <section
      id="subscription"
      className="focus-section stack o-ambient o-ambient--soft"
    >
      <div
        className="focus-container focus-reveal stack"
        data-reveal
        data-reveal-delay="1"
      >
        {/* SECTION CONTENT START */}
        <div className="focus-section-eyebrow">{subtitlesection}</div>
        <h2 className="focus-section-title">{title}</h2>
        {/* SECTION CONTENT END */}
      </div>

      <div
        className="focus-container focus-reveal stack"
        data-reveal
        data-reveal-delay="2"
      >
        {/* CARD ITEMS START */}
        <ul className="focus-detail-list stack">
          {steps.map((item: string, i: number) => (
            <li key={i} className="focus-list-item focus-glass-item">
              <span className="focus-list-item__marker focus-list-item__marker--dot" />
              <span className="focus-list-item__text">{item}</span>
            </li>
          ))}
        </ul>
        {/* CARD ITEMS END */}
      </div>

      <div
        className="focus-container focus-reveal stack"
        data-reveal
        data-reveal-delay="3"
      >
          {note && (
            <div
              className="focus-about-note-row focus-reveal"
              data-reveal
              data-reveal-delay="4"
            >
              <div className="focus-quote-glass">
                <div className="focus-note">
                  <p className="focus-note-primary">
                    {note[0]}
                  </p>

                  {note[1] && (
                    <p className="focus-note-secondary">
                      {note[1]}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

        <a
          className="focus-btn-primary"
          href={FOCUS_PAYMENT_URL}
          target="_blank"
          rel="noreferrer"
          onClick={(event) => handleFocusPaymentClick(event, FOCUS_PAYMENT_URL)}
        >
          {cta}
        </a>
      </div>
    </section>
  )
}
