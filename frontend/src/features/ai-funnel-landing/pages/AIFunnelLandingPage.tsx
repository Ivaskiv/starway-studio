import '../styles/liquid-landing.scss';
import AuthModal from '@/features/auth/components/AuthModal';
import { useSmartNavigation } from '@/hooks/useSmartNavigation';
import { ROUTES } from '@/config/routes';
import { useLandingTheme } from '../hooks/useLandingTheme';
import {
  builderSteps,
  fiveElements,
  heroContent,
  planTiers,
  problemCards,
  programSteps,
} from '../services/landing.content';
import { BuilderGuideSection } from '../components/BuilderGuideSection';
import { CardsSection } from '../components/CardsSection';
import { ChoiceSection } from '../components/ChoiceSection';
import { HeroSection } from '../components/HeroSection';
import { PricingSection } from '../components/PricingSection';
import { ProgramSection } from '../components/ProgramSection';

export default function AIFunnelLandingPage() {
  const { navigateTo, authModalOpen, closeAuthModal } = useSmartNavigation();
  const styleVars = useLandingTheme();

  return (
    <main className="ai-funnel-page" >
      <div className="ai-funnel-wrap">
        <HeroSection
          content={heroContent}
          // fix code_x: unauthenticated CTA opens login modal.
          onPrimary={() => navigateTo(ROUTES.SUBSCRIPTION, { requiresAuth: true })}
          onSecondary={() => navigateTo('/dashboard/ai-generator', { requiresAuth: true })}
        />

        <ChoiceSection
          onChoose={(choice) =>
            navigateTo(choice === 'user' ? ROUTES.SUBSCRIPTION : '/dashboard/ai-generator', {
              requiresAuth: true,
            })
          }
        />

        <CardsSection title="Чому результат не зʼявляється" items={problemCards} />
        <CardsSection title="5 елементів нової опори" items={fiveElements} />
        <ProgramSection steps={programSteps} />
        <BuilderGuideSection steps={builderSteps} />
        <PricingSection plans={planTiers} onSelect={() => navigateTo(ROUTES.SUBSCRIPTION, { requiresAuth: true })} />
      </div>
      <AuthModal isOpen={authModalOpen} onClose={closeAuthModal} defaultMode="login" />
    </main>
  );
}
