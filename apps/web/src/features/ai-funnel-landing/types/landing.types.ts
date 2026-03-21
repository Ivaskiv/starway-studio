export type LandingChoice = 'user' | 'builder';

export interface HeroContent {
  eyebrow: string;
  title: string;
  subtitle: string;
  bullets: string[];
}

export interface CardItem {
  title: string;
  text: string;
}

export interface ProgramStep {
  day: string;
  title: string;
  result: string;
}

export interface PlanTier {
  id: string;
  name: string;
  oldPrice: string;
  price: string;
  features: string[];
}
