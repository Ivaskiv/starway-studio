import { existsSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('abTest shared testimonial contract', () => {
  it('keeps semantic review header contracts for all five Focus segments', async () => {
    process.env.PUBLIC_API_URL = 'https://api.starway.test'

    const shared = await import('./abTest.shared.js')
    const results = await import('./abTest.results.js')
    const stateReview = results.getAbTestResultDefinition('state').msg2_review
    const goalReview = results.getAbTestResultDefinition('goal').msg2_review
    const choiceReview = results.getAbTestResultDefinition('choice').msg2_review
    const decisionReview = results.getAbTestResultDefinition('decision').msg2_review
    const actionReview = results.getAbTestResultDefinition('action').msg2_review

    expect(shared.AB_TEST_NEONILA_REVIEW_HEADER).toBeTruthy()
    expect(shared.AB_TEST_NEONILA_REVIEW_HEADER).toContain('Неоніли')
    expect(shared.AB_TEST_NEONILA_REVIEW_HEADER).toContain('ФОКУС')
    expect(shared.AB_TEST_NEONILA_REVIEW_HEADER).toContain('стан')
    expect(shared.AB_TEST_NEONILA_REVIEW_HEADER).not.toContain('написала після практики')
    expect(stateReview).toContain(shared.AB_TEST_NEONILA_REVIEW_HEADER)

    expect(shared.AB_TEST_NATALIIA_REVIEW_HEADER).toBeTruthy()
    expect(shared.AB_TEST_NATALIIA_REVIEW_HEADER).toContain('Неоніла')
    expect(shared.AB_TEST_NATALIIA_REVIEW_HEADER).toContain('ФОКУС')
    expect(shared.AB_TEST_NATALIIA_REVIEW_HEADER).toContain('Zoom-розбору')
    expect(shared.AB_TEST_NATALIIA_REVIEW_HEADER).not.toContain('Наталія написала')
    expect(goalReview).toContain(shared.AB_TEST_NATALIIA_REVIEW_HEADER)

    expect(shared.AB_TEST_VALENTYNA_REVIEW_HEADER).toBeTruthy()
    expect(shared.AB_TEST_VALENTYNA_REVIEW_HEADER).toContain('Валентина')
    expect(shared.AB_TEST_VALENTYNA_REVIEW_HEADER).toContain('ФОКУС')
    expect(shared.AB_TEST_VALENTYNA_REVIEW_HEADER).toContain('вибір')
    expect(shared.AB_TEST_VALENTYNA_REVIEW_HEADER).toContain('Zoom-розбору')
    expect(shared.AB_TEST_VALENTYNA_REVIEW_HEADER).not.toContain('Валентина написала')
    expect(choiceReview).toContain(shared.AB_TEST_VALENTYNA_REVIEW_HEADER)

    expect(shared.AB_TEST_YELYZAVETA_REVIEW_HEADER).toBeTruthy()
    expect(shared.AB_TEST_YELYZAVETA_REVIEW_HEADER).toContain('Єлизавети')
    expect(shared.AB_TEST_YELYZAVETA_REVIEW_HEADER).toContain('відгук')
    expect(shared.AB_TEST_YELYZAVETA_REVIEW_HEADER).not.toContain('після роботи зі мною')
    expect(decisionReview).toContain(shared.AB_TEST_YELYZAVETA_REVIEW_HEADER)

    expect(shared.AB_TEST_KSENIIA_REVIEW_HEADER).toBeTruthy()
    expect(shared.AB_TEST_KSENIIA_REVIEW_HEADER).toContain('Ксенія')
    expect(shared.AB_TEST_KSENIIA_REVIEW_HEADER).toContain('результат')
    expect(shared.AB_TEST_KSENIIA_REVIEW_HEADER).toContain('Zoom-розбору')
    expect(shared.AB_TEST_KSENIIA_REVIEW_HEADER).not.toContain('після роботи зі мною')
    expect(actionReview).toContain(shared.AB_TEST_KSENIIA_REVIEW_HEADER)
  })

  it('maps the five active Focus review screenshots to local deliverables and keeps files readable', async () => {
    process.env.PUBLIC_API_URL = 'https://api.starway.test'

    const shared = await import('./abTest.shared.js')
    const assetDir = resolve(process.cwd(), 'public/deliverables')
    const expectedAssets = {
      state_review: 'focus-review-state.png',
      goal_review: 'focus-review-goal.png',
      choice_review: 'focus-review-choice.png',
      decision_review: 'focus-review-decision.png',
      action_review_1: 'focus-review-action.png',
    } as const

    for (const [key, fileName] of Object.entries(expectedAssets)) {
      expect(shared.AB_TEST_SCREENSHOT_URLS[key as keyof typeof expectedAssets]).toBe(
        `https://api.starway.test/deliverables/${fileName}`
      )
      const assetPath = resolve(assetDir, fileName)
      expect(existsSync(assetPath)).toBe(true)
      expect(statSync(assetPath).size).toBeGreaterThan(0)
    }

    expect(expectedAssets.state_review).toBe('focus-review-state.png')
    expect(expectedAssets.goal_review).toBe('focus-review-goal.png')
    expect(expectedAssets.choice_review).toBe('focus-review-choice.png')
    expect(expectedAssets.decision_review).toBe('focus-review-decision.png')
    expect(expectedAssets.action_review_1).toBe('focus-review-action.png')

    expect(shared.AB_TEST_SCREENSHOT_URLS.state_review).not.toContain('14tPpJxqTUOtQC12kwQsJKeXrcnarQsXK')
    expect(shared.AB_TEST_SCREENSHOT_URLS.goal_review).not.toContain('1Pzdk83hFCUTWcDoXtRPOCRqtyp8mgJpu')
    expect(shared.AB_TEST_SCREENSHOT_URLS.choice_review).not.toContain('1vt4AWMTZiI20NN28cLYnV77ffVLC_5IY')
    expect(shared.AB_TEST_SCREENSHOT_URLS.decision_review).not.toContain('1aYFw1CKM7qFiTECP7x5R4MwPRHPcewpO')
    expect(shared.AB_TEST_SCREENSHOT_URLS.action_review_1).not.toContain('1a6ItYLMKfeDCerSkWqO38PQZCgT4SPA2')
  })
})
