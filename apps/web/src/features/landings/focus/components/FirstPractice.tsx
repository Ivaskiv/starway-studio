import { FOCUS_PAGE } from '@/features/landings/focus/content/focus.content'
import { handleFocusPaymentClick } from '@/features/subscription/utils/openExternalPaymentUrl'
import { FOCUS_PAYMENT_URL } from '../content/constants'

export default function FirstPractice() {
  const { subtitlesection, title, text, items, cta } = FOCUS_PAGE.firstPractice

  return (
    // o-ambient--soft: lower-center, steep counter-clockwise — softest touch
    <section
      id="first-practice"
      className="focus-section stack o-ambient o-ambient--soft"
      data-reveal
    >
      <div
        className="focus-container focus-first-practice-wrap focus-reveal"
        data-reveal
        data-reveal-delay="1"
      >
        {/* CONTENT BLOCK START */}
        <div
          className="focus-first-practice-header stack"
          data-reveal
          data-reveal-delay="2"
        >
          <div className="focus-section-eyebrow">{subtitlesection}</div>
          <h2 className="focus-section-title">{title}</h2>
          {text.map((paragraph: string, i: number) => (
            <p key={i} className="focus-body-copy">
              {paragraph}
            </p>
          ))}
        </div>
        {/* CONTENT BLOCK END */}

        {/* CARD ITEMS START */}
        <div className="focus-first-practice-body stack">
          <ul className="focus-detail-list stack">
            {items.map((item: string) => (
              <li key={item} className="focus-first-practice-item">
                {item}
              </li>
            ))}
          </ul>

          <a
            className="focus-btn-primary focus-btn-full"
            href={FOCUS_PAYMENT_URL}
            target="_blank"
            rel="noreferrer"
            onClick={(event) => handleFocusPaymentClick(event, FOCUS_PAYMENT_URL)}
          >
            {cta}
          </a>
        </div>
        {/* CARD ITEMS END */}
      </div>
    </section>
  )
}
