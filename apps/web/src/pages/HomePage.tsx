// frontend/src/pages/HomePage.tsx
import { ROUTES } from '@/config/routes'
import { useAppSelector } from '@/app/hooks'
import AuthModal from '@/features/auth/components/AuthModal'
import { LandingAuthActions } from '@/features/auth/components/LandingAuthActions'
import { resolvePreferredAuthMode } from '@/features/auth/services/token'
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
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'


export default function HomePage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const user = useAppSelector((state) => state.auth.user)
  const {
    emailCompletionRequired,
    isAuthenticated,
  } = useUserState()
  const [authOpen, setAuthOpen] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'register'>(resolvePreferredAuthMode())
  const howItWorksRef = useRef<HTMLElement | null>(null)

  const openAuth = (mode?: 'login' | 'register') => {
    setAuthMode(resolvePreferredAuthMode(mode))
    setAuthOpen(true)
  }

  useEffect(() => {
    const authParam = searchParams.get('auth')
    if (authParam === 'login' || authParam === 'register') {
      openAuth(authParam)
      const next = new URLSearchParams(searchParams)
      next.delete('auth')
      setSearchParams(next, { replace: true })
    }
  }, [searchParams, setSearchParams])

  const resolveResumeRoute = () => {
    if (!user?.id) {
      return ROUTES.HOME
    }

    return ROUTES.DASHBOARD
  }

  const handleGetStarted = () => {
    if (!user) {
      openAuth()
      return
    }

    if (emailCompletionRequired) {
      navigate(ROUTES.HOME)
      return
    }

    if (!isAuthenticated) {
      openAuth()
      return
    }

    navigate(resolveResumeRoute())
  }
  const handleLearnMore = () => { howItWorksRef.current?.scrollIntoView({ behavior: 'smooth' }) }
  const handleOpenTest = () => navigate(ROUTES.LEAD_AB_TEST)
  const handleSelectPlan = () => {
    if (user) navigate(ROUTES.SUBSCRIPTION)
    else openAuth()
  }

  if (isAuthenticated && !emailCompletionRequired) {
    return <Navigate to={resolveResumeRoute()} replace />
  }

  return (
    <>
      <div className="min-h-screen bg-[color:var(--bg-primary)] text-[color:var(--text-primary)]">
        {/* <TrialBannerSection user={user} /> */}
        <HeroSection
          onGetStarted={handleGetStarted}
          onLearnMore={handleLearnMore}
          onOpenTest={handleOpenTest}
        />

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
