import { FOCUS_PAGE } from '@/features/landings/focus/utils/focus.content'
import { FOCUS_PAYMENT_URL } from '../utils/constants'

export default function Hero() {
  const rawTitle = FOCUS_PAGE.hero.title as string | readonly string[]

  const titleLines: string[] =
    typeof rawTitle === 'string'
      ? rawTitle.split('\n')
      : rawTitle.flatMap((text: string) => text.split('\n'))

  return (
    <section id="hero" className="focus-section focus-hero">
      <div className="focus-hero-inner focus-container">
        <div className="focus-hero-content stack">
          <h1 className="focus-hero-title" data-reveal data-reveal-delay="1">
            {titleLines.map((line: string, i: number) => (
              <span key={i}>{line.trim()}</span>
            ))}
          </h1>

          <p className="focus-hero-subtitle" data-reveal data-reveal-delay="2">
            {FOCUS_PAGE.hero.subtitle}
          </p>

          <div className="focus-hero-actions" data-reveal data-reveal-delay="3">
            <a
              className="focus-btn-primary"
              href={FOCUS_PAYMENT_URL}
              target="_blank"
              rel="noreferrer"
            >
              {FOCUS_PAGE.hero.cta}
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
