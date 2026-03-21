// frontend/src/pages/HomePage.tsx
import { ROUTES } from '@/config/routes'
import AuthModal from '@/features/auth/components/AuthModal'
import { LandingAuthActions } from '@/features/auth/components/LandingAuthActions'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useUserState } from '@/features/auth/hooks/useUserState'
import {
  FeaturesSection,
  FinalCTASection,
  HeroSection,
  HowItWorksSection,
  PricingSection,
  TestimonialsSection
} from '@/pages/sections'
import StatsSection from '@/pages/sections/StatsSection'
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'


export default function HomePage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user } = useAuth()
  const { step, emailCompletionRequired, isAuthenticated } = useUserState()
  const [authOpen, setAuthOpen] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('register')
  const howItWorksRef = useRef<HTMLElement | null>(null)

  const openAuth = (mode: 'login' | 'register' = 'register') => {
    setAuthMode(mode)
    setAuthOpen(true)
  }

  useEffect(() => {
    if (searchParams.get('auth') === 'login') {
      openAuth('login')
      const next = new URLSearchParams(searchParams)
      next.delete('auth')
      setSearchParams(next, { replace: true })
    }
  }, [searchParams, setSearchParams])

  const handleGetStarted = () => {
    if (!user) {
      openAuth()
      return
    }

    if (emailCompletionRequired) {
      navigate(ROUTES.HOME)
      return
    }

    if (isAuthenticated && step === 'START_FLOW') {
      navigate(ROUTES.ONBOARDING_START)
      return
    }

    if (isAuthenticated && step === 'WHEEL') {
      navigate(ROUTES.WHEEL_START)
      return
    }

    navigate(ROUTES.DASHBOARD ?? '/dashboard')
  }
  const handleLearnMore = () => { howItWorksRef.current?.scrollIntoView({ behavior: 'smooth' }) }
  const handleSelectPlan = () => {
    if (user) navigate('/dashboard/subscription')
    else openAuth()
  }

  return (
    <>
      <div className=" min-h-screen bg-[color:var(--bg-primary)] text-[color:var(--text-primary)]">
        {/* <TrialBannerSection user={user} /> */}
        <HeroSection onGetStarted={handleGetStarted} onLearnMore={handleLearnMore} />
        {!user && (
          <div className="px-5 pb-6 sm:px-8">
            <LandingAuthActions onEmailLogin={() => openAuth('login')} />
          </div>
        )}

        <section ref={el => { howItWorksRef.current = el }}>
          <HowItWorksSection onGetStarted={handleGetStarted} />
        </section>

        <FeaturesSection />
        <TestimonialsSection />
        <StatsSection />
        <PricingSection onSelectPlan={handleSelectPlan} />
        <FinalCTASection onGetStarted={handleGetStarted} />
      </div>
      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} defaultMode={authMode} />
    </>
  )
}
