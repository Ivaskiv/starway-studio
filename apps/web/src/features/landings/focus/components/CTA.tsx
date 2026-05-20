import { FOCUS_PAGE } from '@/features/landings/focus/content/focus.content'
import { handleFocusPaymentClick } from '@/features/subscription/utils/openExternalPaymentUrl'
import { FOCUS_PAYMENT_URL } from '../content/constants'

export default function CTA() {
  const { subtitlesection, title, text, bullets, cta } = FOCUS_PAGE.final

  return (
    // o-ambient--right: upper-right bias — subtle spotlight feel
    <section
      id="cta"
      className="focus-section focus-cta stack o-ambient o-ambient--right"
      data-reveal
    >
      <div
        className="focus-container focus-conversion-panel stack focus-reveal"
        data-reveal
        data-reveal-delay="1"
      >
        <div className="focus-cta-glow" aria-hidden="true" />

        {/* SECTION CONTENT START */}
        <div
          className="focus-section-eyebrow focus-hero-tag-pill-text"
          data-reveal
          data-reveal-delay="1"
        >
          {subtitlesection}
        </div>

        <h2
          className="focus-cta-title focus-hero-title"
          data-reveal
          data-reveal-delay="2"
        >
          {title}
        </h2>

        <div className="stack" data-reveal data-reveal-delay="2">
          {text.map((paragraph: string, i: number) => (
            <p key={i} className="focus-body-copy">
              {paragraph}
            </p>
          ))}
        </div>

        <div className="focus-cta-actions" data-reveal data-reveal-delay="3">
          <a
            href={FOCUS_PAYMENT_URL}
            className="focus-btn-primary focus-cta-primary"
            target="_blank"
            rel="noreferrer"
            onClick={(event) => handleFocusPaymentClick(event, FOCUS_PAYMENT_URL)}
          >
            {cta}
          </a>
        </div>

        <div className="focus-cta-meta" data-reveal data-reveal-delay="3">
          <p className="focus-cta-meta-line">{bullets.join(' · ')}</p>
        </div>
        {/* SECTION CONTENT END */}
      </div>
    </section>
  )
}
