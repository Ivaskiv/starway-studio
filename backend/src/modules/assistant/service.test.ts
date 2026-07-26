import { describe, expect, it } from 'vitest'

import { buildAssistantDecision } from './service.js'

type AssistantContext = Parameters<typeof buildAssistantDecision>[1]

function createContext(overrides: Partial<AssistantContext> = {}): AssistantContext {
  return {
    profile: {
      mentorState: 'ACTIVE',
      stage: 'FLOW',
      clarity: 'medium',
      pattern: null,
      insight: null,
      blocker: null,
      realGoal: 'Стабільно вести клієнтів у оплату',
      focus: 'продажі',
      subscribed: false,
      inTrial: false,
      streak: 4,
      hasWheel: true,
      leadCount: 2,
      lastAnalyzed: null,
    },
    nextProduct: { productId: 'trial', name: 'trial', reason: 'next step' },
    weeklyInsight: {},
    lifecycle: {
      state: 'onboarding',
      flow: 'onboarding',
      subscriptionStatus: 'inactive',
      subscriptionActive: false,
      currentStep: 'TRIAL_OFFER',
      leadStep: 1,
      hasLeadMagnetFlow: false,
      hasCompletedLeadMagnet: false,
      hasMentorAccess: false,
      hasExpiredAccess: false,
      hasWaitlistFlag: false,
      priority: 1,
    },
    engagement: {
      streak: 4,
      lastActivity: new Date('2026-07-22T10:00:00.000Z'),
      unfinishedSteps: 1,
      repeatedPatterns: false,
      hasProgress: true,
      memoryProfile: {
        goals: ['Стабільно вести клієнтів у оплату'],
        repeatedBlockers: [],
        emotionalPatterns: [],
        progressHistory: {
          completedDays: 3,
          completedTasks: 2,
          activeDaysLast7: 4,
        },
        updatedAt: '2026-07-22T10:00:00.000Z',
      },
    },
    primaryGoal: 'Стабільно вести клієнтів у оплату',
    activeTasks: [],
    bestTask: null,
    latestWheel: {
      weakestSphere: 'гроші',
      focusSphere: 'продажі',
      analysis: null,
      createdAt: new Date('2026-07-20T10:00:00.000Z'),
    },
    nextZoom: null,
    recentConversation: [],
    ...overrides,
  }
}

describe('buildAssistantDecision', () => {
  it('prioritizes an unfinished task as the canonical next action', () => {
    const decision = buildAssistantDecision('Що мені робити далі?', createContext({
      engagement: {
        ...createContext().engagement,
        unfinishedSteps: 2,
      },
      bestTask: {
        id: 'task-1',
        title: 'Написати офер для Zoom-запрошення',
        why: 'це напряму веде до нових діалогів',
        type: 'action',
        createdAt: new Date('2026-07-22T08:00:00.000Z'),
        overdueHours: 6,
      },
    }))

    expect(decision.recommendedAction).toContain('Написати офер для Zoom-запрошення')
    expect(decision.unfinishedWork).toBe('Написати офер для Zoom-запрошення')
  })

  it('uses wheel context when the user asks about the weak area', () => {
    const decision = buildAssistantDecision('Що у мене зараз найслабше?', createContext())

    expect(decision.recommendedAction).toContain('колесо балансу')
    expect(decision.supportingContext.join(' ')).toContain('гроші')
  })

  it('falls back to re-entry action for onboarding without active tasks', () => {
    const decision = buildAssistantDecision('Куди мені повернутися?', createContext({
      nextProduct: { productId: 'focus', name: 'focus', reason: 'resume' },
      engagement: {
        ...createContext().engagement,
        unfinishedSteps: 0,
      },
      latestWheel: null,
    }))

    expect(decision.recommendedAction).toContain('повернутися')
    expect(decision.recommendedAction).toContain('Focus')
  })
})
