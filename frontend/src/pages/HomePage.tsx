// frontend/src/pages/HomePage.tsx
import { ROUTES } from '@/config/routes';
import AuthModal from '@/features/auth/components/AuthModal';
import { useAuth } from '@/features/auth/hooks/useAuth';
import {
  FeaturesSection,
  FinalCTASection,
  HeroSection,
  HowItWorksSection,
  PricingSection,
  TestimonialsSection,
  TrialBannerSection,
} from '@/pages/sections';
import { Star, TrendingUp, Users, Zap } from 'lucide-react';
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

// ── Stats ─────────────────────────────────────────────────────────────────────
const STATS = [
  { icon: Users, value: '2,400+', label: 'Активних користувачів' },
  { icon: TrendingUp, value: '89%', label: 'Досягають цілей' },
  { icon: Zap, value: '21 день', label: 'Середній результат' },
  { icon: Star, value: '4.9 / 5', label: 'Рейтинг платформи' },
];

function StatsSection() {
  return (
    <section className="py-14 border-y border-white/6">
      <div className="max-w-5xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {STATS.map(({ icon: Icon, value, label }) => (
            <div
              key={label}
              className="
              text-center px-4 py-6 rounded-2xl
              bg-white/4 backdrop-blur-md
              border border-white/8
              hover:bg-white/6 hover:border-white/12
              transition-all duration-200
            "
            >
              <Icon className="w-5 h-5 text-orange-400 mx-auto mb-3 opacity-80" />
              <p className="text-2xl font-bold text-white tracking-tight">{value}</p>
              <p className="text-xs text-white/35 mt-1 leading-snug">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── HomePage ──────────────────────────────────────────────────────────────────
export default function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const howItWorksRef = useRef<HTMLElement | null>(null);

  const openAuth = () => setAuthOpen(true);

  const handleGetStarted = () => {
    if (user) navigate(ROUTES.DASHBOARD ?? '/dashboard');
    else openAuth();
  };

  const handleLearnMore = () => {
    howItWorksRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSelectPlan = () => {
    if (user) navigate('/dashboard/subscription');
    else openAuth();
  };

  return (
    <>
      <div className="min-h-screen bg-black text-white">
        {/* ── 1. Trial banner — тільки для trial юзерів ── */}
        <TrialBannerSection user={user} />

        {/* ── 2. Hero — головний заклик, slider ─────────── */}
        <HeroSection onGetStarted={handleGetStarted} onLearnMore={handleLearnMore} />

        {/* ── 3. Stats — соціальний доказ ───────────────── */}
        <StatsSection />

        {/* ── 4. Features — що отримує користувач ────────── */}
        <FeaturesSection />

        {/* ── 5. How it works — 3 кроки ─────────────────── */}
        <section
          ref={el => {
            howItWorksRef.current = el;
          }}
        >
          <HowItWorksSection onGetStarted={handleGetStarted} />
        </section>

        {/* ── 6. Testimonials — відгуки ─────────────────── */}
        <TestimonialsSection />

        {/* ── 7. Pricing — тарифи ───────────────────────── */}
        <PricingSection onSelectPlan={handleSelectPlan} />

        {/* ── 8. Final CTA — останній заклик ────────────── */}
        <FinalCTASection onGetStarted={handleGetStarted} />
      </div>

      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} defaultMode="register" />
    </>
  );
}
