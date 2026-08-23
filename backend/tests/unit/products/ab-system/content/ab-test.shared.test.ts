import { existsSync, statSync } from 'node:fs'
import { basename } from 'node:path'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('abTest shared testimonial contract', () => {
  it('keeps semantic review header contracts for all five Focus segments', async () => {
    process.env.PUBLIC_API_URL = 'https://api.starway.test'

    const shared = await import('@/products/ab-system/content/abTest.shared.js')
    const results = await import('@/products/ab-system/content/abTest.results.js')
    const reviewHeaders = shared.AB_TEST_REVIEW_HEADERS
    const stateReview = results.getAbTestResultDefinition('state').msg2_review
    const goalReview = results.getAbTestResultDefinition('goal').msg2_review
    const choiceReview = results.getAbTestResultDefinition('choice').msg2_review
    const decisionReview = results.getAbTestResultDefinition('decision').msg2_review
    const actionReview = results.getAbTestResultDefinition('action').msg2_review

    expect(Object.keys(reviewHeaders)).toEqual([
      'state',
      'goal',
      'choice',
      'decision',
      'action',
    ])

    expect(reviewHeaders.state).toBeTruthy()
    expect(reviewHeaders.state).toContain('Неоніли')
    expect(reviewHeaders.state).toContain('перестала давати своєму стану керувати собою')
    expect(stateReview).toContain(reviewHeaders.state)

    expect(reviewHeaders.goal).toBeTruthy()
    expect(reviewHeaders.goal).toContain('Наталії')
    expect(reviewHeaders.goal).toContain('ціль стала ясною')
    expect(goalReview).toContain(reviewHeaders.goal)

    expect(reviewHeaders.choice).toBeTruthy()
    expect(reviewHeaders.choice).toContain('Валентина')
    expect(reviewHeaders.choice).toContain('вибір')
    expect(reviewHeaders.choice).toContain('Zoom-розбору')
    expect(choiceReview).toContain(reviewHeaders.choice)

    expect(reviewHeaders.decision).toBeTruthy()
    expect(reviewHeaders.decision).toContain('Єлизавети')
    expect(reviewHeaders.decision).toContain('відгук')
    expect(decisionReview).toContain(reviewHeaders.decision)

    expect(reviewHeaders.action).toBeTruthy()
    expect(reviewHeaders.action).toContain('Ксенії')
    expect(reviewHeaders.action).toContain('точний список')
    expect(actionReview).toContain(reviewHeaders.action)
  })

  it('maps the five active Focus review screenshots to local deliverables and keeps files readable', async () => {
    process.env.PUBLIC_API_URL = 'https://api.starway.test'

    const shared = await import('@/products/ab-system/content/abTest.shared.js')
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

  it('maps the customer-provided mp4 assets into canonical public deliverables', async () => {
    process.env.PUBLIC_API_URL = 'https://api.starway.test'

    const shared = await import('@/products/ab-system/content/abTest.shared.js')
    const assetDir = resolve(process.cwd(), 'public/deliverables')
    const expectedAssets = {
      nadya_intro: 'focus-nadya.mp4',
      focus_presentation: 'focus-presentation.mp4',
    } as const

    expect(shared.AB_TEST_VIDEO_URLS).toEqual({
      nadya_intro: '/deliverables/focus-nadya.mp4',
      focus_presentation: '/deliverables/focus-presentation.mp4',
    })

    for (const [key, fileName] of Object.entries(expectedAssets)) {
      const assetPath = resolve(assetDir, fileName)
      expect(existsSync(assetPath)).toBe(true)
      expect(statSync(assetPath).isFile()).toBe(true)
      expect(statSync(assetPath).size).toBeGreaterThan(0)
      expect(basename(shared.AB_TEST_VIDEO_URLS[key as keyof typeof expectedAssets])).toBe(fileName)
    }
  })

  it('keeps step 8 review assets canonical under the backend static deliverables root', async () => {
    process.env.PUBLIC_API_URL = 'https://api.starway.test'

    const [{ resolvePublicDeliverablesPath }, shared, results] =
      await Promise.all([
        import('@/lib/publicDeliverables.js'),
        import('@/products/ab-system/content/abTest.shared.js'),
        import('@/products/ab-system/content/abTest.results.js'),
      ])

    const staticRoot = resolvePublicDeliverablesPath(resolve(process.cwd(), 'backend/dist/src'))
    expect(staticRoot).toBe(resolve(process.cwd(), 'public/deliverables'))

    const expectedAssets = [
      'focus-review-state.png',
      'focus-review-goal.png',
      'focus-review-choice.png',
      'focus-review-decision.png',
      'focus-review-action.png',
    ] as const

    for (const fileName of expectedAssets) {
      const assetPath = resolve(staticRoot, fileName)
      expect(existsSync(assetPath)).toBe(true)
      expect(statSync(assetPath).isFile()).toBe(true)
      expect(statSync(assetPath).size).toBeGreaterThan(0)
      expect(
        basename(
          new URL(`https://api.starway.test/deliverables/${fileName}`).pathname,
        ),
      ).toBe(fileName)
    }

    const reviewBlocks = results.getAbTestResultDefinition('state').blocks?.review ?? []
    expect(reviewBlocks).toHaveLength(2)
    expect(reviewBlocks[1]).toEqual({
      type: 'image',
      assetKey: shared.AB_TEST_SCREENSHOT_URLS.state_review,
    })
    expect(shared.AB_TEST_SCREENSHOT_URLS.state_review).toBe(
      'https://api.starway.test/deliverables/focus-review-state.png'
    )
    expect(shared.AB_TEST_SCREENSHOT_URLS.state_review).not.toContain('drive.google.com')
    expect(basename(new URL(shared.AB_TEST_SCREENSHOT_URLS.state_review).pathname)).toBe(
      'focus-review-state.png'
    )
  })
})
