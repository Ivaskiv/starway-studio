// frontend/src/features/mirrors/types/mirror.types.ts
/**
 * Mirror Types
 */

export interface TrialMirror {
  id: string;
  userId: string;
  day: number;
  analysis: string;
  statePattern: string;
  mainDrain: string;
  sphereImbalance?: string;
  createdAt: string;
}

export interface MirrorAnalysis {
  repeatedStates: string[];
  mainDrain: string;
  sphereImbalance: string;
  insights: string[];
  recommendations: string[];
}