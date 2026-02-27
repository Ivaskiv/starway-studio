/**
 * AI CONTEXT BUILDER
 * Збирає повний контекст користувача для AI
 */

import type {
  AIContext,
  DailyCycleEntry,
  OnboardingStage,
  PatternData,
  TrialDay,
  UserAccessLevel,
  WheelAssessment,
} from '../../ai-mentor/types/mentor.types';

// ============================================================================
// CONTEXT BUILDER CLASS
// ============================================================================

export class AIContextBuilder {
  private context: Partial<AIContext> = {};

  constructor(userId: string, accessLevel: UserAccessLevel) {
    this.context = {
      userId,
      accessLevel,
    };
  }

  /**
   * Додати trial інформацію
   */
  withTrialInfo(currentDay: TrialDay): this {
    this.context.trialDay = currentDay;
    return this;
  }

  /**
   * Додати onboarding інформацію
   */
  withOnboardingStage(stage: OnboardingStage): this {
    this.context.onboardingStage = stage;
    return this;
  }

  /**
   * Додати дані колеса балансу
   */
  withWheelData(assessment: WheelAssessment): this {
    this.context.wheelData = {
      scores: assessment.scores,
      weakestSphere: assessment.weakestSphere,
      focusSphere: assessment.focusSphere,
      imbalanceScore: assessment.imbalanceScore,
      lastUpdated: assessment.createdAt,
    };
    return this;
  }

  /**
   * Додати історію щоденних записів
   */
  withDailyHistory(entries: DailyCycleEntry[], limit: number = 7): this {
    // Беремо останні N записів
    this.context.dailyHistory = entries.slice(-limit);
    return this;
  }

  /**
   * Додати vision statement
   */
  withVision(visionStatement: string): this {
    this.context.visionStatement = visionStatement;
    return this;
  }

  /**
   * Додати головну ціль
   */
  withPrimaryGoal(goal: string): this {
    this.context.primaryGoal = goal;
    return this;
  }

  /**
   * Додати останні патерни (автоматичний розрахунок)
   */
  withPatterns(entries: DailyCycleEntry[]): this {
    if (entries.length === 0) {
      return this;
    }

    const patterns = this.calculatePatterns(entries);
    this.context.recentPatterns = patterns;
    return this;
  }

  /**
   * Побудувати фінальний контекст
   */
  build(): AIContext {
    if (!this.context.userId || !this.context.accessLevel) {
      throw new Error('userId and accessLevel are required');
    }

    return this.context as AIContext;
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private calculatePatterns(entries: DailyCycleEntry[]): PatternData {
    // Домінуючий стан
    const stateCounts = entries.reduce(
      (acc, entry) => {
        acc[entry.state] = (acc[entry.state] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const dominantState = Object.entries(stateCounts).sort(([, a], [, b]) => b - a)[0][0] as any;

    // Домінуючий злив
    const drainCounts = entries.reduce(
      (acc, entry) => {
        acc[entry.drain] = (acc[entry.drain] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const dominantDrain = Object.entries(drainCounts).sort(([, a], [, b]) => b - a)[0][0] as any;

    // Stability streak (послідовні дні stability або innerSupport)
    let currentStreak = 0;
    let maxStreak = 0;

    for (let i = entries.length - 1; i >= 0; i--) {
      if (entries[i].state === 'stability' || entries[i].state === 'innerSupport') {
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else {
        break;
      }
    }

    // Drain count (кількість днів з негативними станами)
    const drainCount = entries.filter(e => e.state === 'tension' || e.state === 'fear').length;

    // Support completion rate
    const completedSupports = entries.filter(e => e.microSupport.completed).length;
    const supportCompletionRate =
      entries.length > 0 ? Math.round((completedSupports / entries.length) * 100) : 0;

    return {
      dominantState,
      dominantDrain,
      stabilityStreak: currentStreak,
      drainCount,
      supportCompletionRate,
    };
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Швидке створення контексту для trial користувача
 */
export function buildTrialContext(
  userId: string,
  currentDay: TrialDay,
  dailyEntries: DailyCycleEntry[],
  wheelAssessment?: WheelAssessment,
): AIContext {
  const builder = new AIContextBuilder(userId, 'trial')
    .withTrialInfo(currentDay)
    .withDailyHistory(dailyEntries);

  if (wheelAssessment) {
    builder.withWheelData(wheelAssessment);
  }

  if (dailyEntries.length > 0) {
    builder.withPatterns(dailyEntries);
  }

  return builder.build();
}

/**
 * Швидке створення контексту для paid користувача
 */
export function buildPaidContext(
  userId: string,
  dailyEntries: DailyCycleEntry[],
  wheelAssessment?: WheelAssessment,
  visionStatement?: string,
  primaryGoal?: string,
  onboardingStage?: OnboardingStage,
): AIContext {
  const builder = new AIContextBuilder(userId, 'paid').withDailyHistory(dailyEntries);

  if (onboardingStage && onboardingStage !== 'COMPLETED') {
    builder.withOnboardingStage(onboardingStage);
  }

  if (wheelAssessment) {
    builder.withWheelData(wheelAssessment);
  }

  if (visionStatement) {
    builder.withVision(visionStatement);
  }

  if (primaryGoal) {
    builder.withPrimaryGoal(primaryGoal);
  }

  if (dailyEntries.length > 0) {
    builder.withPatterns(dailyEntries);
  }

  return builder.build();
}

/**
 * Створення контексту для дзеркал
 */
export function buildMirrorContext(
  userId: string,
  accessLevel: UserAccessLevel,
  periodEntries: DailyCycleEntry[],
  wheelAssessment?: WheelAssessment,
): AIContext {
  const builder = new AIContextBuilder(userId, accessLevel)
    .withDailyHistory(periodEntries)
    .withPatterns(periodEntries);

  if (wheelAssessment) {
    builder.withWheelData(wheelAssessment);
  }

  return builder.build();
}

/**
 * Оновлення контексту з новими даними
 */
export function updateContext(existingContext: AIContext, updates: Partial<AIContext>): AIContext {
  return {
    ...existingContext,
    ...updates,
  };
}

/**
 * Серіалізація контексту для збереження
 */
export function serializeContext(context: AIContext): string {
  return JSON.stringify(context);
}

/**
 * Десеріалізація контексту
 */
export function deserializeContext(serialized: string): AIContext {
  try {
    return JSON.parse(serialized);
  } catch (error) {
    throw new Error('Failed to deserialize AI context');
  }
}

export default AIContextBuilder;
