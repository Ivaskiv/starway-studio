import { existsSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('abTest shared testimonial contract', () => {
  it('keeps the updated step 8 lead texts for all five Focus segments', async () => {
    process.env.PUBLIC_API_URL = 'https://api.starway.test'

    const shared = await import('./abTest.shared.js')
    const results = await import('./abTest.results.js')

    expect(shared.AB_TEST_NEONILA_REVIEW_HEADER).toBe(
      'Хочу показати тобі повідомлення від Неоніли.\nКоли вона прийшла у ФОКУС, її стан був дуже схожий на той, який зараз показав твій тест.'
    )
    expect(shared.AB_TEST_NATALIIA_REVIEW_HEADER).toBe(
      'Коли Неоніла прийшла у ФОКУС, їй теж було непросто зрозуміти, куди рухатися далі.\nОсь що вона написала після Zoom-розбору.'
    )
    expect(shared.AB_TEST_VALENTYNA_REVIEW_HEADER).toBe(
      'Коли Валентина прийшла у ФОКУС, їй теж було важко зробити вибір.\nОсь що вона написала після Zoom-розбору.'
    )
    expect(shared.AB_TEST_YELYZAVETA_REVIEW_HEADER).toBe(
      'Мені дуже відгукнувся цей відгук Єлизавети.'
    )
    expect(shared.AB_TEST_KSENIIA_REVIEW_HEADER).toBe(
      'Ксенія теж прийшла з відчуттям, що багато робить, але результат не змінюється.\nОсь що вона написала після Zoom-розбору.'
    )

    expect(results.getAbTestResultDefinition('state').msg2_review).toContain(shared.AB_TEST_NEONILA_REVIEW_HEADER)
    expect(results.getAbTestResultDefinition('goal').msg2_review).toContain(shared.AB_TEST_NATALIIA_REVIEW_HEADER)
    expect(results.getAbTestResultDefinition('choice').msg2_review).toContain(shared.AB_TEST_VALENTYNA_REVIEW_HEADER)
    expect(results.getAbTestResultDefinition('decision').msg2_review).toContain(shared.AB_TEST_YELYZAVETA_REVIEW_HEADER)
    expect(results.getAbTestResultDefinition('action').msg2_review).toContain(shared.AB_TEST_KSENIIA_REVIEW_HEADER)
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

    expect(shared.AB_TEST_SCREENSHOT_URLS.state_review).not.toContain('14tPpJxqTUOtQC12kwQsJKeXrcnarQsXK')
    expect(shared.AB_TEST_SCREENSHOT_URLS.goal_review).not.toContain('1Pzdk83hFCUTWcDoXtRPOCRqtyp8mgJpu')
    expect(shared.AB_TEST_SCREENSHOT_URLS.choice_review).not.toContain('1vt4AWMTZiI20NN28cLYnV77ffVLC_5IY')
    expect(shared.AB_TEST_SCREENSHOT_URLS.decision_review).not.toContain('1aYFw1CKM7qFiTECP7x5R4MwPRHPcewpO')
    expect(shared.AB_TEST_SCREENSHOT_URLS.action_review_1).not.toContain('1a6ItYLMKfeDCerSkWqO38PQZCgT4SPA2')
  })
})
