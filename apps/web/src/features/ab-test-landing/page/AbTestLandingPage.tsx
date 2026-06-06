import { useCallback, useState } from 'react'

import HeroSection from '../sections/HeroSection'
import { buildAbTestLink } from '@/shared/telegram/telegramDeepLinks'

export default function AbTestLandingPage() {
  const [phone, setPhone] = useState('')

  const openTelegram = useCallback(() => {
    window.open(buildAbTestLink(), '_blank', 'noopener,noreferrer')
  }, [])

  return (
    <main className="ab-test-landing-page">
      <HeroSection
        phone={phone}
        onPhoneChange={setPhone}
        onPrimaryAction={openTelegram}
      />
    </main>
  )
}
