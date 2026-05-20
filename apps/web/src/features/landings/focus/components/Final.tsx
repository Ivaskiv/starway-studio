import { FOCUS_PAGE } from '@/features/landings/focus/content/focus.content'
import { handleFocusPaymentClick } from '@/features/subscription/utils/openExternalPaymentUrl'
import { FOCUS_PAYMENT_URL } from '../content/constants'

export default function Final() {
  const { subtitlesection, title, text, bullets, cta } = FOCUS_PAGE.final

  return (
    // o-ambient--cinematic: upper-right, gentle tilt, wide zoom — cinematic finale
    <section
      id="final"
      className="focus-section stack o-ambient o-ambient--cinematic"
    >
      <div className="focus-container focus-final-wrap focus-reveal stack">
        {/* SECTION CONTENT START */}
        <div className="focus-section-eyebrow">{subtitlesection}</div>
        <h2 className="focus-section-title">{title}</h2>

        <div className="focus-final-body stack">
          {text.map((line: string, i: number) => (
            <p key={i} className="focus-body-copy">
              {line}
            </p>
          ))}

          {/* CARD ITEMS START */}
          <div className="focus-flow-list stack">
            {bullets.map((item: string) => (
              <div key={item} className="focus-flow-item">
                <span className="focus-flow-item__bullet">—</span>
                <p className="focus-flow-item__text">{item}</p>
              </div>
            ))}
          </div>
          {/* CARD ITEMS END */}

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
        {/* SECTION CONTENT END */}
      </div>
    </section>
  )
}
