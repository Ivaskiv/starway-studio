import { describe, expect, it } from 'vitest'

import { resolveAssistantDecision } from '../decision-engine.ts'

describe('resolveAssistantDecision', () => {
  it('recommends resuming the goal when the user asks for the next step with unfinished work', () => {
    const result = resolveAssistantDecision({
      message: 'Що мені робити далі?',
      messageType: 'QUESTION',
      userState: 'ACTIVE',
      lifecycleState: 'paid',
      subscription: {
        status: 'active',
        daysLeft: 12,
      },
      focusParticipation: {
        isActive: true,
        status: 'active',
      },
      primaryGoal: 'Стабільно вести клієнтів у оплату',
      unfinishedActions: [
        {
          title: 'Написати офер для Zoom-запрошення',
          status: 'active',
          why: 'це напряму веде до нових діалогів',
          createdAt: '2026-07-22T08:00:00.000Z',
        },
      ],
      nextZoom: null,
      latestWheel: {
        weakestSphere: 'гроші',
        focusSphere: 'продажі',
      },
      recentConversation: [],
      lastInteraction: null,
    })

    expect(result.decision).toMatchObject({
      primaryIntent: 'next_step_guidance',
      userState: 'active_focus_member',
      recommendedAction: 'resume_goal',
    })
    expect(result.decision.confidence).toBeGreaterThanOrEqual(0.7)
  })

  it('recommends subscription when the user asks about access without an active plan', () => {
    const result = resolveAssistantDecision({
      message: 'Покажи статус моєї підписки',
      messageType: 'QUESTION',
      userState: null,
      lifecycleState: 'onboarding',
      subscription: {
        status: 'inactive',
        daysLeft: null,
      },
      focusParticipation: {
        isActive: false,
        status: 'inactive',
      },
      primaryGoal: null,
      unfinishedActions: [],
      nextZoom: null,
      latestWheel: null,
      recentConversation: [],
      lastInteraction: null,
    })

    expect(result.decision).toMatchObject({
      primaryIntent: 'subscription_status',
      userState: 'buying',
      recommendedAction: 'recommend_subscription',
    })
  })

  it('recommends mentor help when the user is blocked inside an active context', () => {
    const result = resolveAssistantDecision({
      message: 'Я застряг і не можу рухатись далі',
      messageType: 'PERSONAL_SITUATION',
      userState: 'ACTIVE',
      lifecycleState: 'paid',
      subscription: {
        status: 'active',
        daysLeft: 2,
      },
      focusParticipation: {
        isActive: true,
        status: 'active',
      },
      primaryGoal: 'Запустити новий потік клієнтів',
      unfinishedActions: [],
      nextZoom: null,
      latestWheel: null,
      recentConversation: [
        {
          role: 'assistant',
          content: 'Спробуй звузити фокус до однієї дії',
          createdAt: '2026-07-20T08:00:00.000Z',
        },
      ],
      lastInteraction: {
        role: 'assistant',
        content: 'Спробуй звузити фокус до однієї дії',
        createdAt: '2026-07-20T08:00:00.000Z',
      },
    })

    expect(result.decision).toMatchObject({
      primaryIntent: 'emotional_support',
      userState: 'subscription_expiring',
      recommendedAction: 'recommend_mentor',
    })
  })
})
