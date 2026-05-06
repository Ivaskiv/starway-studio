import CTA from '../components/CTA'
import FirstPractice from '../components/FirstPractice'
import Footer from '../components/Footer'
import Hero from '../components/Hero'
import HowItWorks from '../components/HowItWorks'
import Included from '../components/Included'
import Pricing from '../components/Pricing'
import Problem from '../components/Problem'

import AboutFocus from '@/features/landings/focus/components/AboutFocus'
import Final from '@/features/landings/focus/components/Final'
import Fit from '@/features/landings/focus/components/Fit'
import Mechanism from '@/features/landings/focus/components/Mechanism'
import Nav from '@/features/landings/focus/components/Nav'
import Subscription from '@/features/landings/focus/components/Subscription'
import { FOCUS_PAGE } from '@/features/landings/focus/content/focus.content'
import { useScrollReveal } from '../hooks/useScrollReveal'

export default function FocusLandingPage() {
  const pageRef = useScrollReveal()
  const { subtitlesection, title, text } = FOCUS_PAGE.weeklyLoop

  return (
    <div ref={pageRef} className="focus-page focus-page-scroll">
      <Nav />
      <Hero />
      <AboutFocus />
      <Problem />
      <HowItWorks />
      <Included />
      <Mechanism />
      <Fit />
      <Subscription />
      <FirstPractice />
      <Final />

      <section id="weekly-loop" className="focus-section focus-reveal stack" data-reveal>
        <div className="focus-container stack">
          <div className="focus-section-eyebrow" data-reveal data-reveal-delay="1">
            {subtitlesection}
          </div>

          <h2 className="focus-section-title focus-section-title-centered" data-reveal data-reveal-delay="2">
            {title}
          </h2>

          <div className="stack" data-reveal data-reveal-delay="3">
            {text.map((paragraph: string, i: number) => (
              <p key={i} className="focus-how-visual-list-item">
                {paragraph}
              </p>
            ))}
          </div>
        </div>
      </section>

      <Pricing />

      <CTA />

      <Footer />
    </div>
  )
}
