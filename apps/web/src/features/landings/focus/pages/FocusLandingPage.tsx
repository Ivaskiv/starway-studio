import FirstPractice from '../components/FirstPractice'
import Footer from '../components/Footer'
import Hero from '../components/Hero'
import HowItWorks from '../components/HowItWorks'
import Included from '../components/Included'
import Difference from '../components/Difference'
import Problem from '../components/Problem'

import AboutFocus from '@/features/landings/focus/components/AboutFocus'
import Final from '@/features/landings/focus/components/Final'
import Fit from '@/features/landings/focus/components/Fit'
import GenericSection from '@/features/landings/focus/components/GenericSection'
import Mechanism from '@/features/landings/focus/components/Mechanism'
import Nav from '@/features/landings/focus/components/Nav'
import Subscription from '@/features/landings/focus/components/Subscription'
import { FOCUS_PAGE } from '@/features/landings/focus/content/focus.content'
import { useScrollReveal } from '../hooks/useScrollReveal'
import WelcomePractice from '@/features/landings/focus/components/WelcomePractice'

export default function FocusLandingPage() {
  const pageRef = useScrollReveal()

  return (
    <div ref={pageRef} className="focus-page focus-page-scroll">
      {/* <Nav /> */}
      <Hero />
      <AboutFocus />
      <GenericSection
        id="testimonials"
        {...FOCUS_PAGE.testimon_section}
        variant="testimonials"
      />
      <Problem />
      <Difference />
      <HowItWorks />
      <Included />
      {/* <Mechanism /> */}
      <Fit />
      <Subscription />
      <FirstPractice />
      <WelcomePractice />
      <GenericSection
        id="bonuses"
        {...FOCUS_PAGE.bonuses_section}
        variant="bonuses"
      />
      <GenericSection
        id="faq"
        {...FOCUS_PAGE.faq_section}
        variant="faq"
      />
      <Final />
      {/* <Pricing /> */}
      {/* <CTA /> */}
      <Footer />
    </div>
  )
}
