//frontend/src/features/lead-magnet/pages/LeadMagnetLanding.tsx

import { HeroSection } from '../components/HeroSection'
import { WhySection } from '../components/WhySection'
import { HowItWorksSection } from '../components/HowItWorksSection'
import { FiveDaysSection } from '../components/FiveDaysSection'
import { FiveElementsSection } from '../components/FiveElementsSection'
import { WhatInsideSection } from '../components/WhatInsideSection'
import { BonusesSection } from '../components/BonusesSection'
import { PricingSection } from '../components/PricingSection'
import { CtaFormSection } from '../components/CtaFormSection'

export default function LeadMagnetLanding() {
  return (
    <main className="lm-page">
      <HeroSection />
      <WhySection />
      <HowItWorksSection />
      <FiveDaysSection />
      <FiveElementsSection />
      <WhatInsideSection />
      <BonusesSection />
      <PricingSection />
      <CtaFormSection />
    </main>
  )
}