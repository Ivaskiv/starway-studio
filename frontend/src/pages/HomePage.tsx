// frontend/src/pages/HomePage.tsx
import { ROUTES } from '@/config/routes'
import AuthModal from '@/features/auth/components/AuthModal'
import { useAuth } from '@/features/auth/hooks/useAuth'
import {
  FeaturesSection,
  FinalCTASection,
  HeroSection,
  HowItWorksSection,
  PricingSection,
  TestimonialsSection,
  TrialBannerSection,
} from '@/pages/sections'
import StatsSection from '@/pages/sections/StatsSection'
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'


export default function HomePage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user } = useAuth()
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
    if (user) navigate(ROUTES.DASHBOARD ?? '/dashboard')
    else openAuth()
  }
  const handleLearnMore = () => { howItWorksRef.current?.scrollIntoView({ behavior: 'smooth' }) }
  const handleSelectPlan = () => {
    if (user) navigate('/dashboard/subscription')
    else openAuth()
  }

  return (
    <>
      <div className="min-h-screen bg-[color:var(--bg-primary)] text-[color:var(--text-primary)]">
        <TrialBannerSection user={user} />
        <HeroSection onGetStarted={handleGetStarted} onLearnMore={handleLearnMore} />
        <StatsSection />
        <FeaturesSection />
        <section ref={el => { howItWorksRef.current = el }}>
          <HowItWorksSection onGetStarted={handleGetStarted} />
        </section>
        <TestimonialsSection />
        <PricingSection onSelectPlan={handleSelectPlan} />
        <FinalCTASection onGetStarted={handleGetStarted} />
      </div>
      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} defaultMode={authMode} />
    </>
  )
}