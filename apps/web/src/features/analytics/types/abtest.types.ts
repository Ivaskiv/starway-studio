// /Users/viravira/Documents/starway-studio/shared/types/abtest.types.ts
// # ABTest, ABVariant, ABTestResults

/* ======================================================
  AB TESTING
====================================================== */

export type ABTestStatus = 'draft' | 'running' | 'paused' | 'COMPLETED';

export interface ABTest {
  id: string;
  name: string;
  status: ABTestStatus;
  metric: string;
  traffic: number;
  variants: ABVariant[];
  startDate?: string;
  endDate?: string;
  results?: ABTestResults;
}

export interface ABVariant {
  id: string;
  name: string;
  isControl: boolean;
  traffic: number;
  visitors: number;
  conversions: number;
  revenue: number;
}

export interface ABTestResults {
  winnerId?: string;
  confidence: number;
  improvement: number;
}
