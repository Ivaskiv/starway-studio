// apps/web/src/features/landings/focus/components/Hero.tsx

import { FOCUS_PAGE } from '@/features/landings/focus/content/focus.content'
import desktop from '../assets/img-focus/foto-mentor-desktop.webp'
import mobile from '../assets/img-focus/foto-mentor-mobile.webp'
import mobile2x from '../assets/img-focus/foto-mentor-mobile@2x.webp'
import tablet from '../assets/img-focus/foto-mentor-tablet.webp'
import tablet2x from '../assets/img-focus/foto-mentor-tablet@2x.webp'
import { handleFocusPaymentClick } from '@/features/subscription/utils/openExternalPaymentUrl'

import { FOCUS_PAYMENT_URL } from '../content/constants'
import FocusImage, { type FocusImageSrc } from './FocusImage'

const src: FocusImageSrc = {
  mobile,
  mobile2x,
  tablet,
  tablet2x,
  desktop,
}

export default function Hero() {
  const raw = FOCUS_PAGE.hero.title

  const lines = (Array.isArray(raw) ? raw : [raw])
    .flatMap((c) => String(c).split('\n'))
    .map((l) => l.trim())
    .filter(Boolean)

  const titleMain = lines[0] ?? ''
  const titleRest = lines.slice(1).join(' ').trim()

  return (
    <section id="hero" className="focus-hero o-ambient o-ambient--center">
      <div className="focus-container" focus-reveal>
        <div className="lp-split-hero">
          <div className="focus-hero-content">
            <div className="focus-hero-top">
              <h1 className="focus-hero-title-main">{titleMain}</h1>

              <div className="focus-hero-sig" aria-label="ФОКУС by Надя">
                Nadya <span>by</span> <strong>Starway</strong>
              </div>

              {titleRest && (
                <p className="focus-hero-title-accent">{titleRest}</p>
              )}
            </div>

            <div className="focus-hero-mobile-media">
              <div className="focus-hero-media-slot">
                <FocusImage src={src} className="focus-hero-img" priority />
              </div>
            </div>

            <div className="focus-hero-panel">
              <p className="focus-hero-subtitle">{FOCUS_PAGE.hero.subtitle}</p>

              <a
                className="focus-btn-primary focus-btn-full"
                href={FOCUS_PAYMENT_URL}
                target="_blank"
                rel="noreferrer"
                onClick={(event) => handleFocusPaymentClick(event, FOCUS_PAYMENT_URL)}
              >
                {FOCUS_PAGE.hero.cta}
              </a>
            </div>
          </div>

          <div className="focus-hero-media">
            <div className="focus-hero-media-slot">
              <FocusImage src={src} className="focus-hero-img" priority />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
