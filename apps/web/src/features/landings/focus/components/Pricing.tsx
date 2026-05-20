import { FOCUS_PAGE } from '@/features/landings/focus/content/focus.content'
import { handleFocusPaymentClick } from '@/features/subscription/utils/openExternalPaymentUrl'

import { FOCUS_PAYMENT_URL } from '../content/constants'

type FocusPricingPlan = {
  name: string
  tier: string
  price: string
  period: string
  description: string
  features: string[]
  cta: string
  popular: boolean
  dayRate: string
  decision?: string
  trust?: string
  note?: string
  guarantee?: string
}

export default function Pricing() {
  const { subtitlesection, title, text, items, note, cta } = FOCUS_PAGE.pricing
  const titleLines = title.split('\n')

  return (
    // o-ambient--cinematic: wide-zoom, subtle tilt — premium feel for conversion section
    <section
      id="pricing"
      className="focus-section stack o-ambient o-ambient--cinematic"
      data-reveal
    >
      <div
        className="focus-container focus-pricing-header focus-reveal stack"
        data-reveal
        data-reveal-delay="1"
      >
        {/* SECTION CONTENT START */}
        <div className="focus-section-eyebrow">{subtitlesection}</div>

        <h2
          className="focus-section-title focus-section-title-centered"
          data-reveal
          data-reveal-delay="2"
        >
          {titleLines.map((line: string, i: number) => (
            <span key={i}>
              {line}
              {i < titleLines.length - 1 ? <br /> : null}
            </span>
          ))}
        </h2>

        <div className="stack" data-reveal data-reveal-delay="3">
          {text.map((paragraph: string, i: number) => (
            <p key={i} className="focus-body-copy">
              {paragraph}
            </p>
          ))}
        </div>
        {/* SECTION CONTENT END */}
      </div>

      {/* CARD ITEMS START */}
      {/* focus-pricing-grid keeps its specific max-width centering behavior */}
      <div
        className="focus-container focus-pricing-grid focus-reveal"
        data-reveal
        data-reveal-delay="2"
      >
        {items.map((plan: FocusPricingPlan) => (
          <div key={plan.tier} className="focus-pricing-item">
            <div
              className={`focus-pricing-card focus-card ${
                plan.popular ? 'focus-pricing-card-popular' : ''
              }`}
            >
              {plan.popular ? (
                <div className="focus-pricing-badge">ПОПУЛЯРНИЙ</div>
              ) : null}

              <div className="focus-card-content">
                <div className="focus-pricing-plan">{plan.name}</div>
                <div className="focus-pricing-tier">{plan.tier}</div>
                <div className="focus-pricing-price">{plan.price}</div>
                <div className="focus-pricing-period">{plan.period}</div>
                <div className="focus-pricing-day">{plan.dayRate}</div>

                {plan.decision ? (
                  <div className="focus-pricing-decision">{plan.decision}</div>
                ) : null}

                <div className="focus-pricing-description">
                  {plan.description}
                </div>

                <ul className="focus-pricing-features">
                  {plan.features.map((feature: string) => (
                    <li key={feature} className="focus-pricing-features-item">
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              <a
                className="focus-btn-primary focus-btn-full focus-card-cta focus-btn-glass"
                href={FOCUS_PAYMENT_URL}
                target="_blank"
                rel="noreferrer"
                onClick={(event) => handleFocusPaymentClick(event, FOCUS_PAYMENT_URL)}
              >
                {plan.cta}
              </a>
            </div>

            {plan.trust ? (
              <div className="focus-pricing-trust">{plan.trust}</div>
            ) : null}
          </div>
        ))}
      </div>
      {/* CARD ITEMS END */}

      <div
        className="focus-container focus-pricing-bottom focus-reveal stack"
        data-reveal
        data-reveal-delay="3"
      >
        <div className="stack">
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
        </div>

        <p className="focus-pricing-bottom-accent">{cta}</p>
      </div>
    </section>
  )
}
