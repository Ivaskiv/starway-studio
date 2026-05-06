import { FOCUS_PAGE } from '@/features/landings/focus/content/focus.content'
import { FOCUS_PAYMENT_URL } from '../utils/constants'

export default function Hero() {
  const raw = FOCUS_PAGE.hero.title

  const lines = (Array.isArray(raw) ? raw : [raw])
    .flatMap((c) => String(c).split('\n'))
    .map((l) => l.trim())
    .filter(Boolean)

  const titleMain = lines[0] ?? ''
  const titleRest = lines.slice(1).join(' ').trim()

  return (
    <section id="hero" className="focus-hero">

      {/* cinematic background */}
      <div
        className="focus-hero-bg"
        aria-hidden="true"
      />

      {/* top */}
      <div className="focus-hero-top">

        <h1 className="focus-hero-title-main">
          {titleMain}
        </h1>

        {titleRest && (
          <p className="focus-hero-title-accent">
            {titleRest}
          </p>
        )}

      </div>

      {/* spacer */}
      <div className="focus-hero-spacer" />

      {/* bottom */}
      <div className="focus-hero-bottom">

        <div
          className="focus-hero-sig"
          aria-label="ФОКУС by Надя"
        >
          ФОКУС <span>by</span> <strong>Надя</strong>
        </div>

        <div className="focus-hero-panel">

          <p className="focus-hero-subtitle">
            {FOCUS_PAGE.hero.subtitle}
          </p>

          <a
            className="focus-btn-primary focus-hero-cta-btn"
            href={FOCUS_PAYMENT_URL}
            target="_blank"
            rel="noreferrer"
          >
            {FOCUS_PAGE.hero.cta}
          </a>

        </div>

        <div className="focus-hero-trust">

          <span className="focus-hero-trust-item">
            <span className="focus-hero-trust-dot" />
            <strong>15 €</strong>&nbsp;/ місяць
          </span>

          <span className="focus-hero-trust-item">
            <span className="focus-hero-trust-dot" />
            <strong>4</strong>&nbsp;живі Zoom-практики
          </span>

          <span className="focus-hero-trust-item">
            <span className="focus-hero-trust-dot" />
            Старт&nbsp;<strong>11 травня</strong>
          </span>

        </div>
      </div>
    </section>
  )
}