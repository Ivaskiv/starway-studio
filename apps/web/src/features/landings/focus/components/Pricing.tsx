import { FOCUS_PAGE } from '@/features/landings/focus/utils/focus.content'
import { FOCUS_PAYMENT_URL } from '../utils/constants'

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
  decision: string
  trust: string
  note: string
  guarantee?: string
}

export default function Pricing() {
  const { subtitlesection, title, text, items, note, cta } = FOCUS_PAGE.pricing
  const titleLines = title.split('\n')

  return (
    <section id="pricing" className="focus-section stack" data-reveal>
      <div className="focus-container focus-pricing-header focus-reveal stack" data-reveal data-reveal-delay="1">
        <div className="focus-section-eyebrow focus-hero-stat-top">{subtitlesection}</div>

        <h2 className="focus-section-title focus-section-title-centered" data-reveal data-reveal-delay="2">
          {titleLines.map((line: string, i: number) => (
            <span key={i}>
              {line}
              {i < titleLines.length - 1 ? <br /> : null}
            </span>
          ))}
        </h2>

        <div className="stack" data-reveal data-reveal-delay="3">
          {text.map((paragraph: string, i: number) => (
            <p key={i} className="focus-pricing-subtitle">
              {paragraph}
            </p>
          ))}
        </div>
      </div>

      <div className="focus-container focus-pricing-grid focus-reveal" data-reveal data-reveal-delay="2">
        {items.map((plan: FocusPricingPlan) => (
          <div
            key={plan.tier}
            className={`focus-pricing-card focus-card focus-glass ${
              plan.popular ? 'focus-pricing-card-popular focus-glass-strong' : ''
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
              <div className="focus-pricing-decision">{plan.decision}</div>
              <div className="focus-pricing-description">{plan.description}</div>
              <ul className="focus-pricing-features">
                {plan.features.map((feature: string) => (
                  <li key={feature} className="focus-pricing-features-item">
                    {feature}
                  </li>
                ))}
              </ul>
              <div className="focus-pricing-trust">{plan.trust}</div>
            </div>

            <a
              className="focus-btn-primary focus-btn-full focus-card-cta focus-btn-glass"
              href={FOCUS_PAYMENT_URL}
              target="_blank"
              rel="noreferrer"
            >
              {plan.cta}
            </a>
            <p className="focus-footer-copy text-center mt-2">{plan.note}</p>
            {plan.guarantee ? (
              <p className="focus-footer-copy text-center mt-3">
                {plan.guarantee}
              </p>
            ) : null}
          </div>
        ))}
      </div>

      <div className="focus-container focus-pricing-bottom focus-reveal stack" data-reveal data-reveal-delay="3">
        <div className="stack">
          {note.map((paragraph: string, i: number) => (
            <p key={i} className="focus-pricing-bottom-text">
              {paragraph}
            </p>
          ))}
        </div>

        <p className="focus-pricing-bottom-accent">{cta}</p>
      </div>
    </section>
  )
}
