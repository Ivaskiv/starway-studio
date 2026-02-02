import { WheelConfigItem, WheelScore } from '../../wheel/wheel.types.js';

export interface MentorQuestion {
  id: string;
  text: string;
  type: 'text' | 'choice' | 'scale';
  options?: string[];
  createdAt: string;
}

export interface LandingConfig {
  heroTitle: string;
  heroSubtitle: string;
  ctaText: string;
  features: string[];
  testimonials: {
    name: string;
    text: string;
    avatar?: string;
  }[];
}

export interface MentorTemplate {
  id?: string;
  name: string;
  creatorId?: string;
  wheelConfig: WheelConfigItem[];
  morningQuestions: MentorQuestion[];
  eveningQuestions: MentorQuestion[];
  landingConfig: LandingConfig;
  createdAt?: string;
  updatedAt?: string;
}

export interface MentorMessage {
  role: 'user' | 'mentor' | 'system';
  text: string;
  timestamp: string;
}

export interface SessionContext {
  user_name?: string;
  streak_days?: number;
  focus_area?: string;
  wheel_scores?: WheelScore[];
  recent_wins?: string[];
  goals?: string[];
  tone?: string;
  morningQuestions?: MentorQuestion[];
  eveningQuestions?: MentorQuestion[];
}
