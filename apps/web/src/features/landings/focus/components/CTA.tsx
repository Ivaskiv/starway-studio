import { FOCUS_PAGE } from '@/features/landings/focus/utils/focus.content'
import { FOCUS_PAYMENT_URL } from '../utils/constants'

export default function CTA() {
  const { subtitlesection, title, text, bullets, cta } = FOCUS_PAGE.final

  return (
    <section id="cta" className="focus-section focus-cta stack" data-reveal>
      <div className="focus-container focus-cta-card stack focus-reveal" data-reveal data-reveal-delay="1">
        <div className="focus-cta-glow" aria-hidden="true" />

        <div className="focus-cta-eyebrow focus-hero-tag-pill-text" data-reveal data-reveal-delay="1">
          {subtitlesection}
        </div>

        <h2 className="focus-cta-title focus-hero-title" data-reveal data-reveal-delay="2">
          {title}
        </h2>

        <div className="stack" data-reveal data-reveal-delay="2">
          {text.map((paragraph: string, i: number) => (
            <p key={i} className="focus-cta-copy">
              {paragraph}
            </p>
          ))}
        </div>

        <div className="focus-cta-actions" data-reveal data-reveal-delay="3">
          <a href={FOCUS_PAYMENT_URL}
            className="focus-btn-primary focus-cta-primary"
            target="_blank"
            rel="noreferrer"
          >
            {cta}
          </a>
        </div>

        <div className="focus-cta-meta" data-reveal data-reveal-delay="3">
          <p className="focus-cta-meta-line">
            {bullets.join(' · ')}
          </p>
        </div>
      </div>
    </section>
  )
}
